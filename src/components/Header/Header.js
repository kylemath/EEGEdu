import React from "react";

export function Header() {
  return (
    <>
      <h3>EEGEdu</h3>
      <p>
        Welcome to the EEGEdu live EEG tutorial. This tutorial is designed to be
        used with the Muse and the Muse 2 headbands from Interaxon and will walk
        you through the basics of EEG signal generation, data collection, and
        analysis with a focus on live control based on physiological signals.
        All demos are done in this browser. The first step will be to turn on
        your Muse headband and click the connect button. This will open a screen
        and will list available Muse devices. Select the serial number written
        on your Muse.
      </p>
    </>
  );
}
