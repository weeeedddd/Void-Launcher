import { useCallback, type KeyboardEvent } from "react";
import { ShadowGlyph } from "../../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../../stores/voidClient.store";
import type { NotificationKind, NotificationPosition } from "../../../../types";
import { voidClientStyles } from "../../void-client.styles";

const POSITIONS: readonly { id: NotificationPosition; label: string; short: string }[] = [
  { id: "top-left", label: "Top left", short: "TL" },
  { id: "top-center", label: "Top center", short: "TC" },
  { id: "top-right", label: "Top right", short: "TR" },
  { id: "bottom-left", label: "Bottom left", short: "BL" },
  { id: "bottom-center", label: "Bottom center", short: "BC" },
  { id: "bottom-right", label: "Bottom right", short: "BR" },
] as const;

const NOTIFICATIONS: readonly { id: NotificationKind; label: string; description: string; available: boolean }[] = [
  { id: "playing", label: "Playing", description: "Show the native process-start confirmation.", available: true },
  { id: "closing", label: "Closing", description: "No launcher-closing event source is available in this build.", available: false },
  { id: "update", label: "Updates", description: "No signed update event source is available in this build.", available: false },
  { id: "game-launching", label: "Game launch", description: "Show launch queue and launch-failure notices.", available: true },
  { id: "experimental-warning", label: "Runtime warnings", description: "Show warnings emitted by the native launch service.", available: true },
  { id: "content-installed", label: "Content installed", description: "Show successful native install and instance-creation notices.", available: true },
  { id: "modpack-installing", label: "Modpack installing", description: "Show native modpack import and provisioning activity.", available: true },
  { id: "opening-folder", label: "Storage actions", description: "Show confirmations for native folder and storage commands.", available: true },
  { id: "branch-change", label: "Branch changes", description: "No release-branch event source is available in this build.", available: false },
  { id: "game-closed", label: "Game closed", description: "Show a notice when the tracked Minecraft process exits.", available: true },
  { id: "new-content", label: "New content", description: "No trusted catalog announcement source is available in this build.", available: false },
  { id: "native-notifications", label: "Windows notifications", description: "No operating-system notification dispatcher is installed yet.", available: false },
] as const;

export function NotificationMatrix() {
  const selectedPosition = useVoidClientStore((state) => state.notificationPosition);
  const setPosition = useVoidClientStore((state) => state.setNotificationPosition);
  const selectPosition = useCallback((event: React.MouseEvent<HTMLButtonElement>) => setPosition(event.currentTarget.value as NotificationPosition), [setPosition]);
  const movePosition = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const current = POSITIONS.findIndex((position) => position.id === event.currentTarget.value);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 3 : event.key === "ArrowUp" ? -3 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = POSITIONS[(current + delta + POSITIONS.length) % POSITIONS.length];
    setPosition(next.id);
    document.getElementById(`notification-position-${next.id}`)?.focus();
  }, [setPosition]);

  return <section className={`${voidClientStyles.flatPanel} mt-4 p-5`} aria-labelledby="notification-matrix-title">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#21152B] text-[#C084FC]"><ShadowGlyph name="notification" size={18} /></span><div><h2 id="notification-matrix-title" className="text-base font-semibold text-[#F4F4F5]">Notification preferences</h2><p className="mt-1 text-sm leading-6 text-[#92929B]">These switches control real in-app notices from launcher logs, installs and storage actions. Native Windows notifications remain unavailable in this build.</p></div></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <fieldset><legend className="text-sm font-semibold text-[#F4F4F5]">Position</legend><p className="mt-1 text-xs text-[#92929B]">Controls where in-app notices appear.</p><div role="radiogroup" aria-label="Notification position" className="mt-3 grid grid-cols-3 gap-2">{POSITIONS.map((position) => { const selected = position.id === selectedPosition; return <button key={position.id} id={`notification-position-${position.id}`} type="button" role="radio" aria-checked={selected} aria-label={position.label} value={position.id} onClick={selectPosition} onKeyDown={movePosition} className={`grid min-h-14 cursor-pointer place-items-center rounded-lg border font-mono text-xs font-semibold transition-colors duration-150 ${voidClientStyles.focusRing} ${selected ? "border-[#7E22CE] bg-[#7E22CE] text-white" : "border-[#29292F] bg-[#111114] text-[#92929B] hover:border-[#46464F] hover:bg-[#202026] hover:text-white"}`}>{position.short}</button>; })}</div></fieldset>
      <div className="grid gap-2 md:grid-cols-2">{NOTIFICATIONS.map((notification) => <NotificationToggle key={notification.id} notification={notification} />)}</div>
    </div>
  </section>;
}

function NotificationToggle({ notification }: { notification: (typeof NOTIFICATIONS)[number] }) {
  const enabled = useVoidClientStore((state) => state.notifications[notification.id]);
  const toggle = useVoidClientStore((state) => state.toggleNotification);
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-[#29292F] bg-[#111114] p-3.5"><div className="min-w-0"><p className="text-sm font-medium text-[#F4F4F5]">{notification.label}</p><p className="mt-1 text-xs leading-5 text-[#85858E]">{notification.description}</p></div><button type="button" role="switch" aria-checked={notification.available ? enabled : false} aria-disabled={!notification.available} disabled={!notification.available} onClick={() => toggle(notification.id)} className={`grid min-h-9 min-w-20 shrink-0 place-items-center rounded-lg border px-2 text-xs font-semibold transition-colors duration-150 ${notification.available ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${notification.available && enabled ? "border-[#7E22CE] bg-[#7E22CE] text-white" : "border-[#34343A] bg-[#1A1A1F] text-[#92929B]"}`}>{notification.available ? (enabled ? "On" : "Off") : "Unavailable"}</button></div>;
}
