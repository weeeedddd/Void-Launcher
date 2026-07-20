import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAccountStore } from "@/stores/account";
import { FRIENDS } from "../../../constants";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import type { ITelemetrySnapshot } from "../../../types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { TelemetryPanel } from "./TelemetryPanel";
import { voidClientStyles } from "../void-client.styles";

const FRIEND_NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export function DashboardView({ snapshot }: { snapshot: ITelemetrySnapshot }) {
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const { profile, instance, isOffline, isSimulation, isLoadingInstances, launchMutation } = useLauncherInstance();
  const login = useAccountStore((state) => state.login);
  const reducedMotion = useReducedMotion();

  const launch = useCallback(() => launchMutation.mutate(), [launchMutation]);
  const signIn = useCallback(() => void login(), [login]);
  const openFriendModal = useCallback(() => setFriendModalOpen(true), []);
  const closeFriendModal = useCallback(() => setFriendModalOpen(false), []);

  const launchLabel = isOffline ? "LAUNCH SINGLEPLAYER" : isSimulation ? "SIMULATE CLIENT" : "LAUNCH CLIENT";
  const launchDisabled = launchMutation.isPending || isLoadingInstances || !instance || !profile;

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>Command center // operational</p>
          <h1 className={voidClientStyles.pageTitle}>Welcome to the Void{profile ? `, ${profile.name}` : ""}</h1>
          <p className="mt-2 text-sm text-[#8d8198]">Step beyond the ordinary client.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[9px] font-black tracking-[0.13em] uppercase ${isOffline ? "border-amber-300/22 bg-amber-300/[0.055] text-amber-300" : "border-[#4cff9a]/20 bg-[#00e676]/[0.05] text-[#4cff9a]"}`}>
          <motion.span animate={reducedMotion ? undefined : { opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className={`size-1.5 rounded-full ${isOffline ? "bg-amber-300" : "bg-[#4cff9a]"}`} />
          {isOffline ? "Multiplayer Disabled" : "Native services online"}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(350px,0.75fr)]">
        <section className={`${voidClientStyles.glassCard} group min-h-[360px] p-6 sm:p-8`}>
          <img src="/shadow-key-art.png" alt="Stylized hooded Shadow figure" className="pointer-events-none absolute right-[-4%] bottom-[-18%] h-[122%] max-w-[62%] object-contain object-bottom opacity-58 mix-blend-screen saturate-75 transition duration-700 group-hover:scale-[1.025] group-hover:opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.78)_45%,rgba(5,5,5,0.1)_78%)]" />
          <div className="pointer-events-none absolute right-[15%] bottom-[12%] size-60 rounded-full border border-[#a855f7]/15 shadow-[0_0_80px_rgba(123,44,191,0.2),inset_0_0_80px_rgba(123,44,191,0.08)]" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#7B2CBF]/28 bg-[#7B2CBF]/10 px-3 py-1.5 text-[9px] font-black tracking-[0.14em] text-[#d8b4fe] uppercase">
                <ShadowGlyph name="spark" size={13} className="filter drop-shadow-[0_0_8px_currentColor]" /> Shadow protocol 7.2
              </span>
              <h2 className="font-display mt-5 text-[clamp(2rem,5vw,4.3rem)] leading-[0.92] font-black tracking-[-0.065em]">STEP BEYOND<br /><span className="bg-[linear-gradient(90deg,#d8b4fe,#a855f7_48%,#86a8ff)] bg-clip-text text-transparent">THE ORDINARY</span></h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#9a8da6]">A performance-tuned command layer forged for players who operate from the shadows.</p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {profile ? (
                <motion.button type="button" onClick={launch} disabled={launchDisabled} whileHover={{ scale: 1.025, y: -2 }} whileTap={{ scale: 0.975 }} className={`${voidClientStyles.primaryButton} min-h-14 min-w-64 px-6`}>
                  {launchMutation.isPending ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><ShadowGlyph name="spark" size={19} /></motion.span> : <ShadowGlyph name="play" size={20} className="filter drop-shadow-[0_0_8px_currentColor]" />}
                  {launchMutation.isPending ? "PREPARING CLIENT…" : launchLabel}
                </motion.button>
              ) : (
                <button type="button" onClick={signIn} className={`${voidClientStyles.primaryButton} min-h-14 min-w-64 px-6`}><ShadowGlyph name="account" size={19} /> SIGN IN TO LAUNCH</button>
              )}
              <span className="text-[10px] leading-4 text-[#655a70]">{instance ? `${instance.name} · ${instance.gameVersion} · ${instance.loader}` : "Create an instance before launch"}</span>
            </div>
            {launchMutation.isError && <p role="alert" className="mt-3 max-w-xl rounded-xl border border-red-400/15 bg-red-400/[0.055] px-3 py-2 text-xs text-red-300">{String(launchMutation.error)}</p>}
            {launchMutation.isSuccess && <p role="status" className={`mt-3 text-xs ${isSimulation ? "text-amber-300" : "text-[#4cff9a]"}`}>{isSimulation ? "Simulation completed. No Minecraft process was started." : "Launch command accepted. Minecraft is starting."}</p>}
          </div>
        </section>

        <div className="grid gap-5">
          <ServerStatus offline={isOffline} ping={snapshot.ping} />
          <FriendsPanel onAddFriend={openFriendModal} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <TelemetryPanel snapshot={snapshot} />
        <DailyProtocol />
      </div>

      <AnimatePresence>
        {friendModalOpen && <FriendModal onClose={closeFriendModal} />}
      </AnimatePresence>
    </div>
  );
}

function ServerStatus({ offline, ping }: { offline: boolean; ping: number }) {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center justify-between">
        <span className={`grid size-10 place-items-center rounded-xl border ${offline ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-300" : "border-[#4cff9a]/18 bg-[#00e676]/[0.05] text-[#4cff9a]"}`}><ShadowGlyph name={offline ? "offline" : "server"} size={19} /></span>
        <span className={`size-2 rounded-full ${offline ? "bg-amber-300" : "bg-[#4cff9a]"} shadow-[0_0_14px_currentColor]`} />
      </div>
      <p className="mt-4 text-[9px] font-black tracking-[0.17em] text-[#655a70] uppercase">Live server status</p>
      <h2 className={`mt-1 font-display text-base font-black ${offline ? "text-amber-200" : "text-white"}`}>{offline ? "Multiplayer Disabled" : "Hypixel Network"}</h2>
      <div className="mt-4 flex items-center justify-between text-[10px] text-[#776c82]"><span>{offline ? "Offline Mode" : "EU Central"}</span><strong className={offline ? "text-amber-300" : "text-[#4cff9a]"}>{offline ? "LOCKED" : `${ping} ms`}</strong></div>
    </section>
  );
}

function FriendsPanel({ onAddFriend }: { onAddFriend: () => void }) {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center justify-between">
        <div><p className={voidClientStyles.sectionKicker}>Shadow network</p><h2 className="mt-1 font-display text-base font-black">Friends Online</h2></div>
        <button type="button" onClick={onAddFriend} className={`grid size-9 cursor-pointer place-items-center rounded-xl border border-[#7B2CBF]/25 bg-[#7B2CBF]/10 text-[#d8b4fe] transition hover:scale-105 hover:bg-[#7B2CBF]/20 ${voidClientStyles.focusRing}`} aria-label="Add a friend"><ShadowGlyph name="addFriend" size={17} /></button>
      </div>
      <div className="mt-4 space-y-2.5">
        {FRIENDS.slice(0, 3).map((friend) => (
          <div key={friend.id} className="flex items-center gap-2.5">
            <div className="relative"><img src={`https://mc-heads.net/avatar/${encodeURIComponent(friend.username)}/32`} alt="" className="size-8 rounded-lg bg-[#110D17] [image-rendering:pixelated]" /><span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[#110D17] ${friend.online ? "bg-[#4cff9a]" : "bg-[#493258]"}`} /></div>
            <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-white">{friend.username}</strong><small className="block truncate text-[9px] text-[#776c82]">{friend.status}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyProtocol() {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-orange-300/18 bg-orange-400/[0.055] text-orange-300"><ShadowGlyph name="spark" size={19} /></span><div><p className={voidClientStyles.sectionKicker}>Play streak</p><h2 className="mt-1 font-display text-base font-black">7 Day Ascension</h2></div></div>
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => <motion.span key={day} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: day * 0.045 }} className={`h-10 origin-bottom rounded-lg border ${day === 7 ? "border-[#d8b4fe]/35 bg-[#7B2CBF]/30 shadow-[0_0_18px_rgba(123,44,191,0.25)]" : "border-white/[0.06] bg-white/[0.035]"}`} />)}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] text-[#776c82]"><span>Peak time</span><strong className="text-white">12h 08m</strong></div>
    </section>
  );
}

function FriendModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const sendTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
    };
  }, [onClose]);

  const changeUsername = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value.slice(0, 16));
    setError(null);
  }, []);

  const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = username.trim();
    if (!FRIEND_NAME_PATTERN.test(normalized)) {
      setError("Enter a valid Minecraft username using 3–16 letters, numbers or underscores.");
      return;
    }
    setStatus("sending");
    if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
    sendTimerRef.current = window.setTimeout(() => {
      setStatus("sent");
      sendTimerRef.current = null;
    }, 650);
  }, [username]);

  return (
    <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-black/72 p-5 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation" onMouseDown={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="friend-dialog-title" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 360, damping: 29 }} className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#9d5ce0]/32 bg-[radial-gradient(circle_at_82%_0%,rgba(123,44,191,0.26),transparent_35%),rgba(12,8,16,0.97)] p-6 shadow-[0_38px_120px_rgba(0,0,0,0.82),0_0_60px_rgba(123,44,191,0.2)]">
        <button type="button" onClick={onClose} className={`absolute top-4 right-4 grid size-9 cursor-pointer place-items-center rounded-xl border border-white/[0.08] bg-black/25 text-[#776c82] transition hover:text-white ${voidClientStyles.focusRing}`} aria-label="Close friend dialog"><ShadowGlyph name="close" size={15} /></button>
        <span className="grid size-12 place-items-center rounded-2xl border border-[#a855f7]/30 bg-[#7B2CBF]/14 text-[#d8b4fe] shadow-[0_0_28px_rgba(123,44,191,0.25)]"><ShadowGlyph name="addFriend" size={23} /></span>
        <h2 id="friend-dialog-title" className="font-display mt-5 text-xl font-black">Add a Friend</h2>
        <p className="mt-2 text-xs leading-5 text-[#8d8198]">Send a request through the Shadow Network using an exact Minecraft gamer tag.</p>
        <form onSubmit={submit} className="mt-5">
          <label htmlFor="friend-username" className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Minecraft username</label>
          <input id="friend-username" value={username} onChange={changeUsername} autoFocus autoComplete="off" placeholder="DarkKnight_AT" className={`${voidClientStyles.input} mt-2 shadow-[0_0_15px_rgba(123,44,191,0.12)] focus:ring-2 focus:ring-[#7B2CBF] focus:shadow-[0_0_22px_rgba(123,44,191,0.4)]`} />
          {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
          <motion.button type="submit" disabled={status !== "idle"} whileHover={{ scale: status === "idle" ? 1.025 : 1 }} whileTap={{ scale: 0.98 }} className={`${voidClientStyles.primaryButton} mt-4 h-12 w-full`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={status} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex items-center gap-2">
                <ShadowGlyph name={status === "sent" ? "check" : status === "sending" ? "spark" : "addFriend"} size={16} />
                {status === "idle" ? "Send friend request" : status === "sending" ? "Sending through the Void…" : "Request sent"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </form>
      </motion.section>
    </motion.div>
  );
}
