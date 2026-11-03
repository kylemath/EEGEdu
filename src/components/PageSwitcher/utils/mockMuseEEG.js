import { customCount } from './chartUtils';

const { interval, from } = require('rxjs');
const { map, flatMap } = require('rxjs/operators');

const PACKET_SAMPLES = 12;
const pinkState = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0]
];

const generateChannelPacket = (electrode, packetIndex, sampleRate) => {
  const srate = sampleRate || 256;
  const out = new Array(PACKET_SAMPLES);
  const b = pinkState[electrode] || [0, 0, 0];
  const isPosterior = electrode === 0 || electrode === 3;
  const alphaAmp = isPosterior ? 12.0 : 5.0;

  for (let i = 0; i < PACKET_SAMPLES; i++) {
    const n = packetIndex * PACKET_SAMPLES + i;
    const t = n / srate;
    const white = (Math.random() - 0.5) * 2.0;

    // 3-pole 1/f pink noise filter (Paul Kellet approximation)
    b[0] = 0.99765 * b[0] + white * 0.099046;
    b[1] = 0.96300 * b[1] + white * 0.2965164;
    b[2] = 0.57000 * b[2] + white * 1.0526913;
    const pink = (b[0] + b[1] + b[2] + white * 0.1848) * 6.0;

    // Amplitude-modulated ~10 Hz alpha burst
    const burstEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t + electrode * 0.4);
    const alpha = alphaAmp * burstEnv * Math.sin(2 * Math.PI * 10.0 * t + electrode * 0.3);

    out[i] = pink + alpha;
  }
  return out;
};

const transform = (index, sampleRate) => {
  const timestamp = Date.now();
  const chanNums = customCount(0, window.nchans - 1);
  return from(chanNums).pipe(
    map(electrode => ({
      timestamp,
      electrode,
      index,
      samples: generateChannelPacket(electrode, index, sampleRate)
    }))
  );
};

export const mockMuseEEG = (sampleRate = 256) => {
  let index = 0;
  const packetIntervalMs = (PACKET_SAMPLES * 1000) / sampleRate;
  return interval(packetIntervalMs).pipe(
    map(() => (index += 1)),
    flatMap(idx => transform(idx, sampleRate))
  );
};
