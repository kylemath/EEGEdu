import React, {Component} from 'react';
import { channelNames, EEGReading, MuseClient } from 'muse-js';
import { bufferFFT, alphaPower } from 'eeg-pipes';

import './MuseFFT.css';

export class MuseFFT extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return(
        <div className='MuseFFT'>
          <button onClick={this.connect}>Connect Muse Headband</button>
        </div>
    );
  }

  async connect() {

    const client = new MuseClient();

    client.connectionStatus.subscribe((status) => {
        console.log(status ? 'Connected!' : 'Disconnected');
    });

    try {

      await client.connect();
      await client.start();

      // client.eegReadings.subscribe(reading => {
      //   console.log(reading);
      // });

      client.eegReadings.pipe(bufferFFT({ bins: 256 }), alphaPower())
        .subscribe(buffer => console.log(buffer));


    } catch (err) {
      console.error('Connection failed', err);
    }
  }
}

export default MuseFFT;
