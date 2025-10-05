import { BrandVariants, createDarkTheme, createLightTheme, FluentProvider, Theme } from "@fluentui/react-components";
import { editor } from "monaco-editor";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ContentProvider, SettingsProvider } from "./store";
import { NavigationProvider } from "./store/navigation";

const myNewTheme: BrandVariants = {
    10: "#040204",
    20: "#1D1420",
    30: "#311E37",
    40: "#41264A",
    50: "#522F5E",
    60: "#643873",
    70: "#764189",
    80: "#894A9F",
    90: "#9C53B6",
    100: "#AF5CCD",
    110: "#C366E5",
    120: "#D86FFE",
    130: "#E086FF",
    140: "#E79DFF",
    150: "#EDB3FF",
    160: "#F3C8FF",
};

const lightTheme: Theme = {
    ...createLightTheme(myNewTheme),
};

const darkTheme: Theme = {
    ...createDarkTheme(myNewTheme),
};

darkTheme.colorBrandForeground1 = myNewTheme[110];
darkTheme.colorBrandForeground2 = myNewTheme[120];
darkTheme.colorBrandForeground1 = myNewTheme[110];
darkTheme.colorBrandForeground2 = myNewTheme[120];

editor.setTheme("vs-dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <FluentProvider theme={darkTheme}>
            <NavigationProvider initialPageName="Home">
                <SettingsProvider>
                    <ContentProvider>
                        <App />
                    </ContentProvider>
                </SettingsProvider>
            </NavigationProvider>
        </FluentProvider>
    </React.StrictMode>,
);
