import { customCount } from "./chartUtils";


const { interval, from } = require('rxjs');
const { map, flatMap } = require('rxjs/operators');

const samples = () => {
 return Array(12)
  .fill()
  .map(_ => Math.random()).map(function(x) {return x * 100});
};

const transform = (index, enableAux) => {
 const timestamp = Date.now();
 let chans;
 if (enableAux) {
  chans = customCount(0, 4);
 } else {
  chans = customCount(0, 3);
 }
 return from(chans).pipe(
  map(electrode => ({
   timestamp,
   electrode,
   index,
   samples: samples()
  }))
 )
};

export const mockMuseEEG = (enableAux) => {
 let index = 0;
 let sampleRate = 256;
 return interval(1000 / sampleRate).pipe(
  map(() => index += 1),
  flatMap(transform),
 )
};
