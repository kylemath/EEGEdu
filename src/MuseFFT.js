import React, {Component} from 'react';
import { channelNames, EEGReading, MuseClient } from 'muse-js';

import './MuseFFT.css';

export class MuseFFT extends Component {

  constructor(props) {
    super(props);
    // this.state = {
    //   client: new MuseClient()
    // };
    //this.connect = this.connect.bind(this)
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
    } catch (err) {
      console.error('Connection failed', err);
    }
  }
}

export default MuseFFT;
