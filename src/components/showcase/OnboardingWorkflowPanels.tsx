import { WorkflowGlyph } from "./WorkflowGlyph";
import type { FormEventHandler } from "react";

const CONSENT_ITEMS = [
  { id: "workflow-terms", label: "I accept the Terms of Service" },
  { id: "workflow-privacy", label: "I accept the Privacy Policy" },
  { id: "workflow-age", label: "I confirm I am at least 18 years old" },
] as const;

/** Static installer frame for the full launcher workflow storyboard. */
interface InstallerWorkflowPanelProps {
  onPrepare: FormEventHandler<HTMLFormElement>;
}

export function InstallerWorkflowPanel({ onPrepare }: InstallerWorkflowPanelProps) {
  return (
    <section className="wf-panel wf-installer-panel" aria-labelledby="wf-installer-title">
      <header className="wf-panel-header">
        <div className="wf-brand-lockup">
          <span className="wf-brand-mark" aria-hidden="true"><WorkflowGlyph name="shadow" /></span>
          <span className="wf-brand-copy">
            <strong className="wf-brand-name">VOID // ASCENSION</strong>
            <small className="wf-brand-subtitle">Shadow Garden Protocol</small>
          </span>
        </div>
        <ol className="wf-stage-list" aria-label="Launcher setup progress">
          <li className="wf-stage wf-stage-active" aria-current="step"><span className="wf-stage-number">01</span> Installer</li>
          <li className="wf-stage"><span className="wf-stage-number">02</span> Loading</li>
          <li className="wf-stage"><span className="wf-stage-number">03</span> Client</li>
        </ol>
      </header>

      <div className="wf-installer-layout">
        <figure className="wf-shadow-art">
          <div className="wf-art-ambient" aria-hidden="true" />
          <div className="wf-art-sigil wf-art-sigil-outer" aria-hidden="true" />
          <div className="wf-art-sigil wf-art-sigil-inner" aria-hidden="true" />
          <div className="wf-shadow-silhouette" role="img" aria-label="Original artwork placeholder of a mysterious shadow operative">
            <span className="wf-silhouette-aura" aria-hidden="true" />
            <span className="wf-silhouette-cloak" aria-hidden="true" />
            <span className="wf-silhouette-head" aria-hidden="true" />
            <span className="wf-silhouette-eye" aria-hidden="true" />
            <span className="wf-silhouette-blade" aria-hidden="true" />
            <span className="wf-silhouette-glyph" aria-hidden="true"><WorkflowGlyph name="shadow" /></span>
          </div>
          <figcaption className="wf-art-caption">
            <span className="wf-art-caption-kicker">Original concept artwork</span>
            <strong className="wf-art-caption-title">Operate beyond the ordinary.</strong>
            <span className="wf-art-caption-copy">A secure, performance-tuned client forged in the shadows.</span>
          </figcaption>
          <div className="wf-anticheat-badge" role="status" aria-label="Integrated anti-cheat is active">
            <span className="wf-anticheat-icon" aria-hidden="true"><WorkflowGlyph name="shield" /></span>
            <span className="wf-anticheat-copy"><small className="wf-anticheat-label">Integrated Anti-Cheat</small><strong className="wf-anticheat-status">Active</strong></span>
            <span className="wf-anticheat-pulse" aria-hidden="true" />
          </div>
        </figure>

        <div className="wf-installer-content">
          <div className="wf-section-heading">
            <span className="wf-eyebrow"><span className="wf-eyebrow-icon" aria-hidden="true"><WorkflowGlyph name="spark" /></span> Secure deployment</span>
            <h2 id="wf-installer-title" className="wf-panel-title">Enter the Shadow.</h2>
            <p className="wf-panel-description">Choose the client location, confirm the required agreements, and connect your Minecraft identity.</p>
          </div>

          <form className="wf-setup-form" aria-label="Void Client installation setup" onSubmit={onPrepare}>
            <div className="wf-setup-card">
              <div className="wf-card-heading">
                <span className="wf-card-heading-icon" aria-hidden="true"><WorkflowGlyph name="lock" /></span>
                <span className="wf-card-heading-copy"><strong className="wf-card-title">Client setup</strong><small className="wf-card-subtitle">Local files remain on this device</small></span>
                <span className="wf-card-step">Step 01</span>
              </div>

              <div className="wf-field-group">
                <label className="wf-field-label" htmlFor="wf-installation-directory">Installation directory</label>
                <div className="wf-directory-control">
                  <span className="wf-directory-icon" aria-hidden="true"><WorkflowGlyph name="folder" /></span>
                  <input
                    id="wf-installation-directory"
                    className="wf-directory-input"
                    type="text"
                    value="C:\\Games\\Void Client"
                    readOnly
                    aria-describedby="wf-directory-hint"
                  />
                  <button className="wf-browse-button" type="button"><span className="wf-button-icon" aria-hidden="true"><WorkflowGlyph name="folder" /></span> Browse</button>
                </div>
                <small id="wf-directory-hint" className="wf-field-hint">42.8 GB available · NTFS · Recommended location</small>
              </div>

              <fieldset className="wf-consent-fieldset">
                <legend className="wf-field-label">Required agreements</legend>
                <div className="wf-consent-list">
                  {CONSENT_ITEMS.map((item) => (
                    <label className="wf-consent-row" htmlFor={item.id} key={item.id}>
                      <input id={item.id} className="wf-consent-input" type="checkbox" defaultChecked required />
                      <span className="wf-consent-box" aria-hidden="true"><WorkflowGlyph name="check" /></span>
                      <span className="wf-consent-label">{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="wf-auth-card">
              <div className="wf-auth-meta">
                <span className="wf-auth-lock" aria-hidden="true"><WorkflowGlyph name="lock" /></span>
                <span className="wf-auth-copy"><strong className="wf-auth-title">Minecraft account</strong><small className="wf-auth-subtitle">Secure OAuth device authorization</small></span>
              </div>
              <button className="wf-microsoft-button" type="button">
                <span className="wf-microsoft-icon" aria-hidden="true"><WorkflowGlyph name="microsoft" /></span>
                <span className="wf-microsoft-label">Sign in with Microsoft</span>
                <span className="wf-microsoft-arrow" aria-hidden="true"><WorkflowGlyph name="arrow-right" /></span>
              </button>
            </div>

            <button className="wf-prepare-button" type="submit">
              <span className="wf-prepare-shine" aria-hidden="true" />
              <span className="wf-prepare-label">Accept &amp; Prepare Client</span>
              <span className="wf-prepare-arrow" aria-hidden="true"><WorkflowGlyph name="arrow-right" /></span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/** Static loading frame for the full launcher workflow storyboard. */
export function LoadingWorkflowPanel({ isActive }: { isActive: boolean }) {
  return (
    <section className={`wf-panel wf-loading-panel ${isActive ? "wf-loading-panel-active" : ""}`} aria-labelledby="wf-loading-title" aria-describedby="wf-loading-status">
      <header className="wf-loading-header">
        <div className="wf-brand-lockup">
          <span className="wf-brand-mark" aria-hidden="true"><WorkflowGlyph name="shadow" /></span>
          <span className="wf-brand-copy"><strong className="wf-brand-name">VOID // ASCENSION</strong><small className="wf-brand-subtitle">Protected runtime</small></span>
        </div>
        <span className="wf-secure-state"><span className="wf-secure-state-icon" aria-hidden="true"><WorkflowGlyph name="shield" /></span> Secure boot</span>
      </header>

      <div className="wf-loading-ambient" aria-hidden="true">
        <span className="wf-loading-orbit wf-loading-orbit-one" />
        <span className="wf-loading-orbit wf-loading-orbit-two" />
        <span className="wf-loading-ray wf-loading-ray-horizontal" />
        <span className="wf-loading-ray wf-loading-ray-vertical" />
      </div>

      <div className="wf-loading-content">
        <div className="wf-spinner-composition" aria-hidden="true">
          <span className="wf-spinner-ring wf-spinner-ring-outer"><WorkflowGlyph name="spinner" /></span>
          <span className="wf-spinner-ring wf-spinner-ring-inner"><WorkflowGlyph name="spinner" /></span>
          <span className="wf-spinner-core"><WorkflowGlyph name="shadow" /></span>
          <span className="wf-spinner-spark wf-spinner-spark-one"><WorkflowGlyph name="spark" /></span>
          <span className="wf-spinner-spark wf-spinner-spark-two"><WorkflowGlyph name="spark" /></span>
        </div>

        <span className="wf-loading-eyebrow">Void Client Initialization</span>
        <h2 id="wf-loading-title" className="wf-loading-title">Entering the shadows</h2>
        <p id="wf-loading-status" className="wf-loading-status" aria-live="polite">Calibrating graphics pipeline</p>

        <div className="wf-progress-group">
          <div className="wf-progress-track" role="progressbar" aria-label="Client initialization progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={72}>
            <span className="wf-progress-fill" />
            <span className="wf-progress-glow" aria-hidden="true" />
          </div>
          <div className="wf-progress-meta"><span className="wf-progress-security"><span className="wf-progress-security-icon" aria-hidden="true"><WorkflowGlyph name="shield" /></span> Runtime verified</span><strong className="wf-progress-value">072%</strong></div>
        </div>

        <blockquote className="wf-voice-line">
          <span className="wf-voice-icon" aria-hidden="true"><WorkflowGlyph name="audio" /></span>
          <em className="wf-voice-copy">[Voice Audio: &ldquo;I... am... Atomic.&rdquo;]</em>
        </blockquote>
      </div>

      <footer className="wf-loading-footer"><span className="wf-loading-footer-lock" aria-hidden="true"><WorkflowGlyph name="lock" /></span> Encrypted local runtime // Build 0.1.0</footer>
    </section>
  );
}
