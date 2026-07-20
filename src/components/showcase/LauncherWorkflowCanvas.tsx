import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ClientWorkflowPanel } from "./ClientWorkflowPanel";
import { InstallerWorkflowPanel, LoadingWorkflowPanel } from "./OnboardingWorkflowPanels";
import { WorkflowGlyph } from "./WorkflowGlyph";

export function LauncherWorkflowCanvas() {
  const [activeStage, setActiveStage] = useState<"installer" | "loading" | "client">("client");

  const handlePrepare = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveStage("loading");
  }, []);

  useEffect(() => {
    if (activeStage !== "loading") return undefined;
    const completionTimer = window.setTimeout(() => setActiveStage("client"), 1800);
    return () => window.clearTimeout(completionTimer);
  }, [activeStage]);

  return (
    <main className="wf-canvas" data-active-stage={activeStage} aria-label="Void Ascension Minecraft client launcher complete workflow mockup">
      <div className="wf-canvas-grid" aria-hidden="true" />
      <div className="wf-canvas-ambient wf-canvas-ambient-one" aria-hidden="true" />
      <div className="wf-canvas-ambient wf-canvas-ambient-two" aria-hidden="true" />

      <header className="wf-canvas-header">
        <div className="wf-canvas-title-lockup">
          <span className="wf-canvas-logo"><WorkflowGlyph name="logo" /></span>
          <span>
            <span className="wf-canvas-kicker">Premium client experience // End-to-end sequence</span>
            <h1 className="wf-canvas-title">VOID // SHADOW ASCENSION</h1>
          </span>
        </div>
        <div className="wf-canvas-meta">
          <span className="wf-canvas-meta-chip"><WorkflowGlyph name="shield" /> Anti-Cheat Active</span>
          <span className="wf-canvas-meta-chip"><WorkflowGlyph name="spark" /> AAA Concept Build</span>
          <span className="wf-canvas-index">WORKFLOW 01—03</span>
        </div>
      </header>

      <div className="wf-flow">
        <InstallerWorkflowPanel onPrepare={handlePrepare} />
        <FlowConnector label="Identity verified" detail="Prepare runtime" />
        <LoadingWorkflowPanel isActive={activeStage === "loading"} />
        <FlowConnector label="Runtime ready" detail="Enter client" />
        <ClientWorkflowPanel />
      </div>

      <footer className="wf-canvas-footer">
        <span>Original SVG icon language</span>
        <span className="wf-footer-rule" />
        <span>Obsidian #050505</span>
        <span>Shadow Panel #110D17</span>
        <span>Arcane Purple #7B2CBF</span>
        <span className="wf-footer-code">VOID_BUILD // CONCEPT_07</span>
      </footer>
    </main>
  );
}

function FlowConnector({ label, detail }: { label: string; detail: string }) {
  return (
    <aside className="wf-connector" aria-label={`${label}: ${detail}`}>
      <span className="wf-connector-line" aria-hidden="true" />
      <span className="wf-connector-node" aria-hidden="true"><WorkflowGlyph name="check" /></span>
      <span className="wf-connector-arrow" aria-hidden="true"><WorkflowGlyph name="arrow-right" /></span>
      <span className="wf-connector-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </aside>
  );
}
