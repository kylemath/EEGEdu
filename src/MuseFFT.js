import React, {Component} from 'react';
import { zipSamples, channelNames, MuseClient } from 'muse-js';
import { powerByBand, epoch, fft, sliceFFT } from "@neurosity/pipes";

import { Bar, Line, Radar } from "react-chartjs-2";

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
      datasets: [
        {
        }
      ]
    },
    ch1: {
      datasets: [
        {
        }
      ]
    },
    ch2: {
      datasets: [
        {
        }
      ]
    },
    ch3: {
      datasets: [
        {
        }
      ]
    },
    options: {
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Frequency (Hz)'
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Power (\u03BCV\u00B2)'
          },
          ticks: {
            max:100
          } 
        }]
      }, 
      title: {
        display: true, 
        text: 'Channel: ' //+ channelNames[2]
      }, 
      responsive: false, 
      tooltips: {enabled: false}, 
      legend: {display: false}
    } 

  };

  render() {
    return(
        <div className='MuseFFT'>
          <button disabled={this.state.button_disabled} onClick={this.connect}>Connect Muse Headband</button>
          <p>{this.state.status}</p>
          <div style={chartSectionStyle}>
            <Line data={this.state.ch2} 
                  options={this.state.options}
                  width={500} height={250}
            />
            <Line data={this.state.ch1} 
                  options={this.state.options}
                  width={500} height={250}
            />
            <Line data={this.state.ch0} 
                  options={this.state.options}
                  width={500} height={250}
            />
            <Line data={this.state.ch3} 
                  options={this.state.options}
                  width={500} height={250}
            />
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
        sliceFFT([1, 30])
      ).subscribe(
        (data) => {
          this.setState(state => {

            state.ch0.datasets[0].data = data.psd[0];
            state.ch0.xLabels = data.freqs; // get data for x axis labels

            state.ch1.datasets[0].data = data.psd[1];
            state.ch1.xLabels = data.freqs;

            state.ch2.datasets[0].data = data.psd[2];
            state.ch2.xLabels = data.freqs;

            state.ch3.datasets[0].data = data.psd[3];
            state.ch3.xLabels = data.freqs;

            //console.log(data.freqs)


            return({
              ch0: state.ch0,
              ch1: state.ch1,
              ch2: state.ch2,
              ch3: state.ch3
            });

          });
        }
      );

    } catch (err) {
      console.error('Connection failed', err);
    }
  }
}

export default MuseFFT;
