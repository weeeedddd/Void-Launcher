import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/space-grotesk";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/900.css";
import { VoidInstallerApp } from "./VoidInstallerApp";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Void Bootstrapper could not locate its root element.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <VoidInstallerApp />
  </React.StrictMode>,
);
