import React, {Component} from 'react';
<<<<<<< HEAD
import { channelNames, EEGReading, MuseClient } from 'muse-js';
import { bufferFFT, alphaPower } from 'eeg-pipes';
=======
import { zipSamples, channelNames, MuseClient } from 'muse-js';
import { powerByBand, epoch, fft } from "@neurosity/pipes";

import { Bar } from "react-chartjs-2";
>>>>>>> First working version

import './MuseFFT.css';

const chartSectionStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  padding: '20px'
};


export class MuseFFT extends Component {

<<<<<<< HEAD
  constructor(props) {
    super(props);
  }
=======
  state = {
    status: 'Disconnected',
    ch0: {
	     labels: ["Alpha", "Beta", "Delta", "Gamma", "Theta"],
	     datasets: [
    		{
    			fillColor: "rgba(220,220,220,0.2)",
    			strokeColor: "rgba(220,220,220,1)",
    			pointColor: "rgba(220,220,220,1)",
    			pointStrokeColor: "#fff",
    			pointHighlightFill: "#fff",
    			pointHighlightStroke: "rgba(220,220,220,1)",
    			data: [0,0,0,0,0]
    		}
      ]
    },
    ch1: {
       labels: ["Alpha", "Beta", "Delta", "Gamma", "Theta"],
       datasets: [
        {
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: [0,0,0,0,0]
        }
      ]
    },
    ch2: {
       labels: ["Alpha", "Beta", "Delta", "Gamma", "Theta"],
       datasets: [
        {
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: [0,0,0,0,0]
        }
      ]
    },
    ch3: {
       labels: ["Alpha", "Beta", "Delta", "Gamma", "Theta"],
       datasets: [
        {
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: [0,0,0,0,0]
        }
      ]
    }
  };
>>>>>>> First working version

  render() {
    return(
        <div className='MuseFFT'>
          <button onClick={this.connect}>Connect Muse Headband</button>
          <p>{this.state.status}</p>
          <div style={chartSectionStyle}>
            <Bar data={this.state.ch0} options={{title: {display: true, text: 'Channel: ' + channelNames[0]}, responsive: false, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch1} options={{title: {display: true, text: 'Channel: ' + channelNames[1]}, responsive: false, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch2} options={{title: {display: true, text: 'Channel: ' + channelNames[2]}, responsive: false, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch3} options={{title: {display: true, text: 'Channel: ' + channelNames[3]}, responsive: false, legend: {display: false}}} width={500} height={250}/>
          </div>
        </div>
    );
  }

  connect = async () => {

    const client = new MuseClient();

    client.connectionStatus.subscribe((status) => {
      this.setState({status: status ? 'Connected!' : 'Disconnected'});
      console.log(status ? 'Connected!' : 'Disconnected');
    });

    try {

      await client.connect();
      await client.start();

<<<<<<< HEAD
      // client.eegReadings.subscribe(reading => {
      //   console.log(reading);
      // });

      client.eegReadings.pipe(bufferFFT({ bins: 256 }), alphaPower())
        .subscribe(buffer => console.log(buffer));

=======
      zipSamples(client.eegReadings).pipe(
        epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
        fft({ bins: 256 }),
        powerByBand()
      ).subscribe(
        (data) => {
          this.setState(state => {

            state.ch0.datasets[0].data = [data.alpha[0], data.beta[0], data.delta[0], data.gamma[0], data.theta[0]];
            state.ch1.datasets[0].data = [data.alpha[1], data.beta[1], data.delta[1], data.gamma[1], data.theta[1]];
            state.ch2.datasets[0].data = [data.alpha[2], data.beta[2], data.delta[2], data.gamma[2], data.theta[2]];
            state.ch3.datasets[0].data = [data.alpha[3], data.beta[3], data.delta[3], data.gamma[3], data.theta[3]];

            return({
              ch0: state.ch0,
              ch1: state.ch1,
              ch2: state.ch2,
              ch3: state.ch3
            });

          });
          //console.log(data);
        }
      );
>>>>>>> First working version

    } catch (err) {
      console.error('Connection failed', err);
    }
  }
}

export default MuseFFT;
