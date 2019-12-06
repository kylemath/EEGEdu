export const chartAttributes = {
  wrapperStyle: {
    display: "flex",
    flexWrap: "wrap",
    padding: "20px"
  }
};

export const strings = {
  connected: "Connected",
  disconnected: "Disconnected",
  connectionFailed: "Connection failed",
  channel: "Channel: ",
  buttonToConnect: "Connect Muse Headband",
  buttonConnected: "Muse Headband Connected",
  rawTitle: "Raw Data",
  rawDescription:
    "                First we look at the raw voltage signals coming from each of the\n" +
    "                four sensors on the muse. TP9 and TP10 are on the ears, AF7 and\n" +
    "                AF8 are on the forehead. In general EEG electrodes are odd on\n" +
    "                the left hemisphere and even on the right, and have suffixed\n" +
    "                with z along the midline.",
  spectraTitle: "Spectra Data",
  spectraDescription:
    "                In the next demo we will look at the same signal in the\n" +
    "                frequency domain. We want to identify the magnitude of\n" +
    "                oscillations of different frequencies in our live signal. We use\n" +
    "                the fast fourier transform to convert the voltage values over\n" +
    "                time to the power at each frequency. To use the fft we pick a\n" +
    "                particular chunk of data and get an output called a spectra.\n" +
    "                Each time the chart updates a new window of data is selected."
};
