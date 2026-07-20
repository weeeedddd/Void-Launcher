import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LauncherWorkflowCanvas } from "@/components/showcase/LauncherWorkflowCanvas";
import "@fontsource-variable/space-grotesk";
import "@fontsource/orbitron/600.css";
import "@fontsource/orbitron/700.css";
import "@fontsource/orbitron/900.css";
import "./styles/theme.css";
import "./styles/workflow-showcase.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LauncherWorkflowCanvas />
    </ErrorBoundary>
  </React.StrictMode>,
);
