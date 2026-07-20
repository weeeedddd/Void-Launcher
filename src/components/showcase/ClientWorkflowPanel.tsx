import { useCallback, useMemo, useState } from "react";
import { WorkflowGlyph } from "./WorkflowGlyph";

const friends = [
  {
    name: "KittenSlayer99",
    status: "Playing Bedwars",
    emblem: "flame" as const,
    tone: "violet",
  },
  {
    name: "DarkKnight_AT",
    status: "In a Shadow SMP",
    emblem: "spark" as const,
    tone: "blue",
  },
  {
    name: "EnderVow_47",
    status: "Building a modpack",
    emblem: "cube" as const,
    tone: "magenta",
  },
  {
    name: "RedstoneReaper",
    status: "In Menu",
    emblem: "gauge" as const,
    tone: "crimson",
  },
] as const;

const installedMods = [
  { name: "Fabric API", version: "0.116.1+1.21.1", category: "Core library" },
  { name: "Sodium", version: "0.6.13", category: "Rendering" },
  { name: "Lithium", version: "0.14.8", category: "Game logic" },
  { name: "Iris Shaders", version: "1.8.8", category: "Visuals" },
  { name: "Mod Menu", version: "11.0.3", category: "Interface" },
  { name: "FerriteCore", version: "7.0.2-hotfix", category: "Memory" },
  { name: "Entity Culling", version: "1.7.4", category: "Rendering" },
  { name: "ImmediatelyFast", version: "1.3.3", category: "Rendering" },
  { name: "Dynamic FPS", version: "3.9.4", category: "Utility" },
  { name: "Continuity", version: "3.0.0-beta.5", category: "Visuals" },
  { name: "Indium", version: "1.0.35", category: "Rendering" },
  { name: "Krypton", version: "0.2.8", category: "Network" },
  { name: "C2ME", version: "0.3.0+alpha.0.321", category: "Generation" },
  { name: "Noisium", version: "2.3.0", category: "Generation" },
  { name: "Memory Leak Fix", version: "1.1.5", category: "Memory" },
  { name: "LambDynamicLights", version: "3.1.4", category: "Visuals" },
  { name: "AppleSkin", version: "3.0.6", category: "Interface" },
  { name: "Zoomify", version: "2.14.2", category: "Utility" },
] as const;

const MODS_PER_PAGE = 6;
const MOD_PAGE_COUNT = Math.ceil(installedMods.length / MODS_PER_PAGE);

const navItems = [
  { label: "Home", icon: "home" as const, active: true },
  { label: "Mods", icon: "mods" as const, active: false },
  { label: "Performance", icon: "gauge" as const, active: false },
  { label: "Settings", icon: "settings" as const, active: false },
] as const;

const streakDays = [
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
  { id: "sun", label: "S" },
] as const;

export function ClientWorkflowPanel() {
  const [isInstanceOpen, setIsInstanceOpen] = useState(true);
  const [isPartyCreated, setIsPartyCreated] = useState(true);
  const [modPage, setModPage] = useState(1);
  const [sidebarDock, setSidebarDock] = useState<"left" | "right">("left");
  const visibleMods = useMemo(() => {
    const pageStart = (modPage - 1) * MODS_PER_PAGE;
    return installedMods.slice(pageStart, pageStart + MODS_PER_PAGE);
  }, [modPage]);

  const handleCreateParty = useCallback(() => setIsPartyCreated(true), []);
  const handleToggleSidebarDock = useCallback(() => {
    setSidebarDock((current) => current === "left" ? "right" : "left");
  }, []);
  const handleOpenInstance = useCallback(() => setIsInstanceOpen(true), []);
  const handleCloseInstance = useCallback(() => setIsInstanceOpen(false), []);
  const handlePreviousPage = useCallback(() => setModPage((current) => Math.max(1, current - 1)), []);
  const handlePageOne = useCallback(() => setModPage(1), []);
  const handlePageTwo = useCallback(() => setModPage(2), []);
  const handlePageThree = useCallback(() => setModPage(3), []);
  const handleNextPage = useCallback(() => setModPage((current) => Math.min(MOD_PAGE_COUNT, current + 1)), []);
  const handleLastPage = useCallback(() => setModPage(MOD_PAGE_COUNT), []);

  return (
    <section className="wf-panel wf-client-panel" aria-label="Shadow Client dashboard storyboard">
      <div className="wf-ambient wf-ambient-primary" />
      <div className="wf-ambient wf-ambient-secondary" />

      <div className="wf-client-surface" inert={isInstanceOpen} aria-hidden={isInstanceOpen}>
      <header className="wf-titlebar">
        <div className="wf-brand-lockup">
          <span className="wf-brand-mark"><WorkflowGlyph name="logo" /></span>
          <div className="wf-brand-copy">
            <strong className="wf-brand-name">VOID</strong>
            <span className="wf-brand-edition">Shadow Client</span>
          </div>
        </div>

        <div className="wf-titlebar-status">
          <span className="wf-titlebar-status-dot" />
          Shadow network online
        </div>

        <div className="wf-profile-chip">
          <span className="wf-profile-emblem"><WorkflowGlyph name="spark" /></span>
          <span className="wf-profile-copy">
            <strong className="wf-profile-name">Dominic</strong>
            <small className="wf-profile-tier">Eminence tier</small>
          </span>
        </div>

        <div className="wf-window-controls" aria-label="Window controls">
          <button type="button" className="wf-window-control" aria-label="Minimize window"><WorkflowGlyph name="minimize" /></button>
          <button type="button" className="wf-window-control" aria-label="Maximize window"><WorkflowGlyph name="maximize" /></button>
          <button type="button" className="wf-window-control wf-window-control-close" aria-label="Close window"><WorkflowGlyph name="close" /></button>
        </div>
      </header>

      <div className={`wf-client-shell ${sidebarDock === "right" ? "wf-client-shell-right" : ""}`} data-sidebar-dock={sidebarDock}>
        <aside className="wf-client-sidebar" aria-label="Client navigation">
          <div className="wf-sidebar-top">
            <span className="wf-sidebar-label">Command</span>
            <button type="button" className="wf-dock-button" aria-label={`Dock sidebar on the ${sidebarDock === "left" ? "right" : "left"}`} onClick={handleToggleSidebarDock}>
              <span className="wf-dock-icon"><WorkflowGlyph name={sidebarDock === "left" ? "arrow-right" : "arrow-left"} /></span>
            </button>
          </div>

          <nav className="wf-sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`wf-nav-item ${item.active ? "wf-nav-item-active" : ""}`}
              >
                <span className="wf-nav-icon"><WorkflowGlyph name={item.icon} /></span>
                <span className="wf-nav-label">{item.label}</span>
                {item.active && <span className="wf-nav-active-rail" />}
              </button>
            ))}
          </nav>

          <div className="wf-sidebar-footer">
            <span className="wf-sidebar-footer-icon"><WorkflowGlyph name="check" /></span>
            <span className="wf-sidebar-footer-copy">
              <strong className="wf-sidebar-footer-title">Client ready</strong>
              <small className="wf-sidebar-footer-note">All systems nominal</small>
            </span>
          </div>
        </aside>

        <main className="wf-dashboard">
          <div className="wf-dashboard-heading">
            <div className="wf-dashboard-heading-copy">
              <span className="wf-eyebrow">Shadow Garden operations</span>
              <h1 className="wf-dashboard-title">Welcome back, Dominic.</h1>
              <p className="wf-dashboard-subtitle">Your private command center is synchronized and combat ready.</p>
            </div>
            <div className="wf-session-badge">
              <span className="wf-session-icon"><WorkflowGlyph name="check" /></span>
              Microsoft session secured
            </div>
          </div>

          <div className="wf-dashboard-grid">
            <section className="wf-widget wf-streak-widget">
              <div className="wf-widget-heading">
                <span className="wf-widget-icon wf-widget-icon-hot"><WorkflowGlyph name="flame" /></span>
                <div className="wf-widget-copy">
                  <span className="wf-widget-kicker">Play streak</span>
                  <h2 className="wf-widget-title">7 Day Streak</h2>
                </div>
              </div>
              <div className="wf-streak-content">
                <div className="wf-streak-days" aria-label="Seven active days">
                  {streakDays.map((day) => (
                    <div key={day.id} className="wf-streak-day">
                      <span className={`wf-streak-bar ${day.id === "sun" ? "wf-streak-bar-current" : ""}`} />
                      <small className="wf-streak-label">{day.label}</small>
                    </div>
                  ))}
                </div>
                <div className="wf-peak-time">
                  <span className="wf-peak-label">Peak Time</span>
                  <strong className="wf-peak-value">12h</strong>
                </div>
              </div>
            </section>

            <section className="wf-widget wf-music-widget">
              <div className="wf-widget-heading wf-music-heading">
                <span className="wf-widget-icon"><WorkflowGlyph name="music" /></span>
                <div className="wf-widget-copy">
                  <span className="wf-widget-kicker">Spotify / YouTube Music</span>
                  <h2 className="wf-widget-title">Shadow Frequencies</h2>
                </div>
                <span className="wf-linked-badge"><WorkflowGlyph name="check" /> Linked</span>
              </div>
              <div className="wf-now-playing">
                <div className="wf-album-art">
                  <span className="wf-album-ring" />
                  <WorkflowGlyph name="music" />
                </div>
                <div className="wf-track-copy">
                  <strong className="wf-track-title">Moonlit Oath</strong>
                  <span className="wf-track-artist">Shadow Garden Radio</span>
                  <div className="wf-track-progress"><span className="wf-track-progress-fill" /></div>
                  <div className="wf-track-meta">
                    <small className="wf-track-time">01:42</small>
                    <small className="wf-track-source">Spotify + YouTube Music</small>
                    <small className="wf-track-time">03:58</small>
                  </div>
                </div>
                <button type="button" className="wf-pause-button" aria-label="Pause Moonlit Oath">
                  <WorkflowGlyph name="pause" />
                </button>
              </div>
            </section>

            <section className="wf-widget wf-friends-widget">
              <div className="wf-widget-heading">
                <span className="wf-widget-icon"><WorkflowGlyph name="friends" /></span>
                <div className="wf-widget-copy">
                  <span className="wf-widget-kicker">Shadow network</span>
                  <h2 className="wf-widget-title">Friends online</h2>
                </div>
                <span className="wf-online-count">4 online</span>
              </div>
              <div className="wf-friend-list">
                {friends.map((friend) => (
                  <div key={friend.name} className="wf-friend-row">
                    <div className={`wf-friend-emblem wf-friend-emblem-${friend.tone}`}>
                      <WorkflowGlyph name={friend.emblem} />
                      <span className="wf-friend-online-dot" />
                    </div>
                    <div className="wf-friend-copy">
                      <strong className="wf-friend-name">{friend.name}</strong>
                      <small className="wf-friend-status">{friend.status}</small>
                    </div>
                    <span className="wf-friend-presence">Online</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="wf-widget wf-party-widget">
              <div className="wf-widget-heading">
                <span className="wf-widget-icon"><WorkflowGlyph name="party" /></span>
                <div className="wf-widget-copy">
                  <span className="wf-widget-kicker">Squad channel</span>
                  <h2 className="wf-widget-title">Party</h2>
                </div>
              </div>
              <p className="wf-party-description">Keep your squad synchronized from launcher to server.</p>
              <button type="button" className="wf-create-party-button" onClick={handleCreateParty}>
                <WorkflowGlyph name="party" /> Create Party
              </button>
              {isPartyCreated && <div className="wf-party-success" role="status">
                <span className="wf-party-success-icon"><WorkflowGlyph name="check" /></span>
                <span className="wf-party-success-copy">
                  <strong className="wf-party-success-title">Party created</strong>
                  <small className="wf-party-success-note">Invite channel ready · 2 / 5 members</small>
                </span>
              </div>}
            </section>

            <section className="wf-widget wf-instance-manager">
              <div className="wf-instance-manager-heading">
                <div className="wf-widget-heading">
                  <span className="wf-widget-icon"><WorkflowGlyph name="instance" /></span>
                  <div className="wf-widget-copy">
                    <span className="wf-widget-kicker">Local profiles</span>
                    <h2 className="wf-widget-title">Instance Manager</h2>
                  </div>
                </div>
                <label className="wf-api-select-wrap">
                  <span className="wf-api-select-icon"><WorkflowGlyph name="api" /></span>
                  <span className="wf-api-select-label">Mod API</span>
                  <select className="wf-api-select" defaultValue="curseforge" aria-label="Select mod API source">
                    <option value="curseforge">CurseForge</option>
                    <option value="modrinth">Modrinth</option>
                  </select>
                </label>
              </div>

              <button type="button" className="wf-instance-card" aria-label="Open Eminence Protocol instance details" onClick={handleOpenInstance}>
                <div className="wf-instance-art">
                  <span className="wf-instance-art-glow" />
                  <WorkflowGlyph name="cube" />
                </div>
                <div className="wf-instance-copy">
                  <span className="wf-instance-local"><WorkflowGlyph name="check" /> Local instance</span>
                  <strong className="wf-instance-name">Eminence Protocol</strong>
                  <span className="wf-instance-description">Optimized combat profile with six curated performance and visual mods.</span>
                  <div className="wf-instance-tags">
                    <span className="wf-instance-tag">Minecraft 1.21.1</span>
                    <span className="wf-instance-tag wf-instance-tag-accent">Fabric 0.16.9</span>
                    <span className="wf-instance-tag">6 mods</span>
                  </div>
                </div>
                <span className="wf-instance-open"><WorkflowGlyph name="arrow-right" /></span>
              </button>
            </section>
          </div>

          <button type="button" className="wf-play-button">
            <span className="wf-play-button-aura" />
            <span className="wf-play-button-icon"><WorkflowGlyph name="play" /></span>
            <span className="wf-play-button-copy">
              <strong className="wf-play-button-title">PLAY</strong>
              <small className="wf-play-button-note">Launch Eminence Protocol</small>
            </span>
          </button>
        </main>
      </div>
      </div>

      {isInstanceOpen && <>
      <button type="button" className="wf-modal-backdrop" aria-label="Close instance details" onClick={handleCloseInstance} />
      <section className="wf-instance-modal" role="dialog" aria-modal="true" aria-labelledby="wf-instance-dialog-title">
        <header className="wf-modal-header">
          <div className="wf-modal-brand">
            <span className="wf-modal-icon"><WorkflowGlyph name="instance" /></span>
            <div className="wf-modal-title-copy">
              <span className="wf-modal-kicker">Local instance dossier</span>
              <h2 id="wf-instance-dialog-title" className="wf-modal-title">Eminence Protocol</h2>
              <p className="wf-modal-subtitle">Exact runtime configuration and complete installed content.</p>
            </div>
          </div>
          <button type="button" className="wf-modal-close" onClick={handleCloseInstance}><WorkflowGlyph name="close" /> Close</button>
        </header>

        <div className="wf-modal-body">
          <div className="wf-instance-specs">
            <div className="wf-spec-card">
              <span className="wf-spec-icon"><WorkflowGlyph name="cube" /></span>
              <span className="wf-spec-label">Minecraft Version</span>
              <strong className="wf-spec-value">1.21.1</strong>
            </div>
            <div className="wf-spec-card">
              <span className="wf-spec-icon"><WorkflowGlyph name="loader" /></span>
              <span className="wf-spec-label">Mod Loader</span>
              <strong className="wf-spec-value">Fabric 0.16.9</strong>
            </div>
            <div className="wf-spec-card">
              <span className="wf-spec-icon"><WorkflowGlyph name="gauge" /></span>
              <span className="wf-spec-label">Allocated Memory</span>
              <strong className="wf-spec-value">8,192 MB</strong>
            </div>
          </div>

          <div className="wf-mods-heading">
            <div className="wf-mods-heading-copy">
              <span className="wf-modal-kicker">Installed content</span>
              <h3 className="wf-mods-title">Complete mod manifest</h3>
            </div>
            <span className="wf-mod-count">{installedMods.length} installed</span>
          </div>

          <div className="wf-mod-list" role="list">
            {visibleMods.map((mod, index) => (
              <div key={mod.name} className="wf-mod-row" role="listitem">
                <span className="wf-mod-number">{String((modPage - 1) * MODS_PER_PAGE + index + 1).padStart(2, "0")}</span>
                <span className="wf-mod-icon"><WorkflowGlyph name="mods" /></span>
                <span className="wf-mod-copy">
                  <strong className="wf-mod-name">{mod.name}</strong>
                  <small className="wf-mod-category">{mod.category}</small>
                </span>
                <span className="wf-mod-version">v{mod.version}</span>
                <span className="wf-mod-installed"><WorkflowGlyph name="check" /> Installed</span>
              </div>
            ))}
          </div>

          <nav className="wf-pagination" aria-label="Installed mods pages">
            <button type="button" className="wf-page-button" onClick={handlePreviousPage} disabled={modPage === 1}>Previous</button>
            <button type="button" className={`wf-page-button ${modPage === 1 ? "wf-page-button-active" : ""}`} aria-current={modPage === 1 ? "page" : undefined} onClick={handlePageOne}>1</button>
            <button type="button" className={`wf-page-button ${modPage === 2 ? "wf-page-button-active" : ""}`} aria-current={modPage === 2 ? "page" : undefined} onClick={handlePageTwo}>2</button>
            <button type="button" className={`wf-page-button ${modPage === 3 ? "wf-page-button-active" : ""}`} aria-current={modPage === 3 ? "page" : undefined} onClick={handlePageThree}>3</button>
            <button type="button" className="wf-page-button" onClick={handleNextPage} disabled={modPage === MOD_PAGE_COUNT}>Next</button>
            <button type="button" className="wf-page-button" onClick={handleLastPage} disabled={modPage === MOD_PAGE_COUNT}>Last</button>
          </nav>
        </div>
      </section>
      </>}
    </section>
  );
}
