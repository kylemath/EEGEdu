import React, {Component} from 'react';
import { zipSamples, channelNames, MuseClient } from 'muse-js';
import { powerByBand, epoch, fft } from "@neurosity/pipes";

import { Bar } from "react-chartjs-2";

import './MuseFFT.css';

const chartSectionStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  padding: '20px'
};


export class MuseFFT extends Component {

  state = {
    status: 'Disconnected',
    button_disabled: false,
    ch0: {
	     labels: ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
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
       labels: ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
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
       labels: ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
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
       labels: ["Delta", "Theta", "Alpha", "Beta", "Gamma"],
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

  render() {
    return(
        <div className='MuseFFT'>
          <button disabled={this.state.button_disabled} onClick={this.connect}>Connect Muse Headband</button>
          <p>{this.state.status}</p>
          <div style={chartSectionStyle}>
            <Bar data={this.state.ch2} options={{title: {display: true, text: 'Channel: ' + channelNames[2]}, responsive: false, tooltips: {enabled: false}, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch1} options={{title: {display: true, text: 'Channel: ' + channelNames[1]}, responsive: false, tooltips: {enabled: false}, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch0} options={{title: {display: true, text: 'Channel: ' + channelNames[0]}, responsive: false, tooltips: {enabled: false}, legend: {display: false}}} width={500} height={250}/>
            <Bar data={this.state.ch3} options={{title: {display: true, text: 'Channel: ' + channelNames[3]}, responsive: false, tooltips: {enabled: false}, legend: {display: false}}} width={500} height={250}/>
          </div>
        </div>
    );
  }

  connect = async () => {

    const client = new MuseClient();

    client.connectionStatus.subscribe((status) => {
      this.setState({
        status: status ? 'Connected!' : 'Disconnected',
        button_disabled: status
      });
      console.log(status ? 'Connected!' : 'Disconnected');
    });

    try {

      await client.connect();
      await client.start();

      zipSamples(client.eegReadings).pipe(
        epoch({ duration: 1024, interval: 100, samplingRate: 256 }),
        fft({ bins: 256 }),
        powerByBand()
      ).subscribe(
        (data) => {
          this.setState(state => {

            state.ch0.datasets[0].data = [data.delta[0], data.theta[0], data.alpha[0], data.beta[0], data.gamma[0]];
            state.ch1.datasets[0].data = [data.delta[1], data.theta[1], data.alpha[1], data.beta[1], data.gamma[1]];
            state.ch2.datasets[0].data = [data.delta[2], data.theta[2], data.alpha[2], data.beta[2], data.gamma[2]];
            state.ch3.datasets[0].data = [data.delta[3], data.theta[3], data.alpha[3], data.beta[3], data.gamma[3]];

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

    } catch (err) {
      console.error('Connection failed', err);
    }
  }
}

export default MuseFFT;
