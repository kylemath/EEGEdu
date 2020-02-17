import React from "react";
import { PageSwitcher } from "../PageSwitcher/PageSwitcher";
import { AppProvider, Card, Page, Link } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

export function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <Page title={"EEGEdu"} 
            subtitle={[
              "Welcome to the EEGEdu live EEG tutorial. "
            ]}
        >
        <PageSwitcher />
        <Card sectioned>
          <p>{"EEGEdu - An Interactive Electrophysiology Tutorial with the Muse brought to you by Mathewson Sons."}
          A  
          <Link url="http://kylemathewson.com"> Ky</Link>
          <Link url="http://korymathewson.com">Kor</Link>
          <Link url="http://keyfer.ca">Key </Link>
          Production.
          <Link url="https://github.com/kylemath/EEGEdu/"> Github source code </Link>
        </p>
        </Card>
      </Page>
    </AppProvider>
  );
}
