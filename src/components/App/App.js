import React from "react";
import { PageSwitcher } from "../PageSwitcher/PageSwitcher";
import { AppProvider, Card, Page } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

const header = {
  title: "EEGEdu",
  subtitle:
    "        Welcome to the EEGEdu live EEG tutorial. This tutorial is designed to be\n" +
    "        used with the Muse and the Muse 2 headbands from Interaxon and will walk\n" +
    "        you through the basics of EEG signal generation, data collection, and\n" +
    "        analysis with a focus on live control based on physiological signals.\n" +
    "        All demos are done in this browser. The first step will be to turn on\n" +
    "        your Muse headband and click the connect button. This will open a screen\n" +
    "        and will list available Muse devices. Select the serial number written\n" +
    "        on your Muse."
};

export function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <Page title={header.title} subtitle={header.subtitle}>
        <PageSwitcher />
        <Card sectioned>
          <p>
            EEGEdu - An Interactive Electrophysiology Tutorial with the Muse
            brought to you by Mathewson Sons
          </p>
        </Card>
      </Page>
    </AppProvider>
  );
}
