import { useCallback, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { ShadowGlyph } from "../../../../components/ShadowGlyph";
import { useVoidClientStore } from "../../../../stores/voidClient.store";
import type { NotificationKind, NotificationPosition } from "../../../../types";
import { voidClientStyles } from "../../void-client.styles";
import { MatrixPanel, ShadowToggle } from "./SettingsPrimitives";

const POSITIONS: readonly { id: NotificationPosition; label: string; short: string }[] = [
  { id: "top-left", label: "Top Left", short: "TL" },
  { id: "top-center", label: "Top Center", short: "TC" },
  { id: "top-right", label: "Top Right", short: "TR" },
  { id: "bottom-left", label: "Bottom Left", short: "BL" },
  { id: "bottom-center", label: "Bottom Center", short: "BC" },
  { id: "bottom-right", label: "Bottom Right", short: "BR" },
] as const;

const NOTIFICATIONS: readonly { id: NotificationKind; label: string; description: string }[] = [
  { id: "playing", label: "Playing", description: "Instance entered the active play state." },
  { id: "closing", label: "Closing", description: "The launcher is preparing to close or hide." },
  { id: "update", label: "Update", description: "A verified client update is available." },
  { id: "game-launching", label: "Game Launching", description: "Java and game libraries are being prepared." },
  { id: "experimental-warning", label: "Experimental Branch Warning", description: "Canary or experimental stream integrity warning." },
  { id: "content-installed", label: "Content Installed", description: "A mod, shader or resource pack finished installing." },
  { id: "modpack-installing", label: "Modpack Installing", description: "Show major modpack preparation milestones." },
  { id: "opening-folder", label: "Opening Folder", description: "Confirm when a managed folder is revealed." },
  { id: "branch-change", label: "Branch Change", description: "The update stream moved between Stable and Canary." },
  { id: "game-closed", label: "Game Closed", description: "Minecraft exited normally and returned control." },
  { id: "new-content", label: "New Content Indicators", description: "Highlight newly discovered archive entries." },
  { id: "native-notifications", label: "Native Notifications", description: "Permit Windows notifications when the native bridge is available." },
] as const;

export function NotificationMatrix() {
  const selectedPosition = useVoidClientStore((state) => state.notificationPosition);
  const setPosition = useVoidClientStore((state) => state.setNotificationPosition);

  const selectPosition = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setPosition(event.currentTarget.value as NotificationPosition);
  }, [setPosition]);

  const movePosition = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    const current = POSITIONS.findIndex((position) => position.id === event.currentTarget.value);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 3 : event.key === "ArrowUp" ? -3 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (current + delta + POSITIONS.length) % POSITIONS.length;
    const position = POSITIONS[next];
    setPosition(position.id);
    document.getElementById(`notification-position-${position.id}`)?.focus();
  }, [setPosition]);

  return (
    <MatrixPanel className="mt-5">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center border border-[#a855f7]/25 bg-[#7B2CBF]/10 text-[#d8b4fe] [clip-path:polygon(12%_0,100%_0,88%_100%,0_82%)]"><ShadowGlyph name="notification" size={21} /></span><div><p className={voidClientStyles.sectionKicker}>Advanced notification engine</p><h3 className="font-display mt-1 text-lg font-black">Spatial Signal Matrix</h3></div></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <fieldset>
          <legend className="text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Notification position</legend>
          <p className="mt-1 text-[10px] leading-4 text-[#776c82]">Choose a monitor sector. Arrow keys move through the six positions.</p>
          <div role="radiogroup" aria-label="Notification position" className="relative mt-4 grid grid-cols-3 gap-2 border border-[#6f4a87]/25 bg-[radial-gradient(circle_at_center,rgba(123,44,191,0.12),transparent_65%),rgba(0,0,0,0.32)] p-4 [clip-path:polygon(4%_0,96%_0,100%_12%,100%_88%,96%_100%,4%_100%,0_88%,0_12%)]">
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[#7B2CBF]/18" />
            <div className="pointer-events-none absolute inset-y-8 left-1/3 w-px bg-[#7B2CBF]/12" />
            <div className="pointer-events-none absolute inset-y-8 right-1/3 w-px bg-[#7B2CBF]/12" />
            {POSITIONS.map((position) => {
              const selected = position.id === selectedPosition;
              return (
                <button key={position.id} id={`notification-position-${position.id}`} type="button" role="radio" aria-checked={selected} aria-label={position.label} value={position.id} onClick={selectPosition} onKeyDown={movePosition} className={`relative z-10 grid min-h-16 cursor-pointer place-items-center border text-[10px] font-black tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8b4fe] ${selected ? "border-[#c084fc]/55 bg-[#7B2CBF]/30 text-white shadow-[inset_0_0_18px_rgba(123,44,191,0.18),0_0_20px_rgba(123,44,191,0.28)]" : "border-white/[0.07] bg-black/30 text-[#655a70] hover:border-[#a855f7]/28 hover:text-[#c9b6d7]"} [clip-path:polygon(9%_0,100%_0,91%_100%,0_84%)]`}>
                  {selected && <motion.span layoutId="notification-sector" className="absolute inset-1 border border-[#d8b4fe]/22" />}
                  <span>{position.short}</span><span className="sr-only">{position.label}</span>{selected && <ShadowGlyph name="check" size={12} className="absolute right-1.5 bottom-1.5 text-[#d8b4fe]" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <p className="text-[9px] font-black tracking-[0.15em] text-[#c796ff] uppercase">Signal permissions</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {NOTIFICATIONS.map((notification) => <NotificationToggle key={notification.id} notification={notification} />)}
          </div>
        </div>
      </div>
    </MatrixPanel>
  );
}

function NotificationToggle({ notification }: { notification: (typeof NOTIFICATIONS)[number] }) {
  const enabled = useVoidClientStore((state) => state.notifications[notification.id]);
  const toggle = useVoidClientStore((state) => state.toggleNotification);
  const handleToggle = useCallback(() => toggle(notification.id), [notification.id, toggle]);
  return <ShadowToggle title={notification.label} description={notification.description} enabled={enabled} onToggle={handleToggle} />;
}
