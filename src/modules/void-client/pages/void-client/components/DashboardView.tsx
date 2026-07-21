import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAccountStore } from "@/stores/account";
import { useLauncherInstance } from "../../../hooks/useLauncherInstance";
import { CLIENT_COPY } from "../../../i18n";
import { useVoidClientStore } from "../../../stores/voidClient.store";
import type { IFriendEntry, ITelemetrySnapshot } from "../../../types";
import type { Instance } from "@/types";
import { ShadowGlyph } from "../../../components/ShadowGlyph";
import { TelemetryPanel } from "./TelemetryPanel";
import { voidClientStyles } from "../void-client.styles";

const FRIEND_NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const STREAK_STORAGE_KEY = "void-client-play-streak-v1";

interface IPlayStreakState {
  days: number;
  lastPlayedDate: string | null;
}

const EMPTY_STREAK: IPlayStreakState = { days: 0, lastPlayedDate: null };

export function DashboardView({ snapshot }: { snapshot: ITelemetrySnapshot }) {
  const [friendModalOpen, setFriendModalOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<IFriendEntry[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [playStreak, recordLaunchDay] = usePlayStreak();
  const { profile, instance, instances, isLoadingInstances, launchMutation } = useLauncherInstance(selectedInstanceId);
  const login = useAccountStore((state) => state.login);
  const language = useVoidClientStore((state) => state.language);
  const copy = CLIENT_COPY[language];
  const reducedMotion = useReducedMotion();

  const launch = useCallback(() => launchMutation.mutate(), [launchMutation]);
  const signIn = useCallback(() => void login(), [login]);
  const openFriendModal = useCallback(() => setFriendModalOpen(true), []);
  const closeFriendModal = useCallback(() => setFriendModalOpen(false), []);
  const recordFriendRequest = useCallback((username: string) => {
    setFriendsList((current) => current.some((friend) => friend.username.toLowerCase() === username.toLowerCase())
      ? current
      : [...current, { id: `request-${username.toLowerCase()}`, username, status: "Friend request pending", online: false }]);
  }, []);

  useEffect(() => {
    if (launchMutation.isSuccess) recordLaunchDay();
  }, [launchMutation.isSuccess, launchMutation.submittedAt, recordLaunchDay]);

  useEffect(() => {
    if (selectedInstanceId && !instances.some((candidate) => candidate.id === selectedInstanceId)) {
      setSelectedInstanceId(null);
    }
  }, [instances, selectedInstanceId]);

  const launchDisabled = launchMutation.isPending || isLoadingInstances || !instance || !profile;
  const launcherReady = Boolean(profile && instance && !isLoadingInstances);

  return (
    <div className={voidClientStyles.page}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={voidClientStyles.sectionKicker}>Void Launcher</p>
          <h1 className={voidClientStyles.pageTitle}>{copy.welcome}{profile ? `, ${profile.name}` : ""}</h1>
          <p className="mt-2 text-sm text-[#a79bad]">Step beyond the ordinary client.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black tracking-[0.12em] uppercase ${launcherReady ? "border-[#4cff9a]/20 bg-[#00e676]/[0.05] text-[#4cff9a]" : "border-amber-300/18 bg-amber-300/[0.045] text-amber-200"}`}>
          <motion.span animate={reducedMotion ? undefined : { opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className={`size-1.5 rounded-full ${launcherReady ? "bg-[#4cff9a]" : "bg-amber-300"}`} />
          {launcherReady ? "Ready to launch" : profile ? "Select an instance" : "Sign in required"}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(350px,0.75fr)]">
        <section className={`${voidClientStyles.glassCard} group min-h-[360px] p-6 sm:p-8`}>
          <img src="/shadow-key-art.png" alt="Stylized hooded Shadow figure" width={900} height={900} className="pointer-events-none absolute right-[-4%] bottom-[-18%] h-[122%] max-w-[62%] object-contain object-bottom opacity-58 mix-blend-screen saturate-75 transition duration-700 group-hover:scale-[1.025] group-hover:opacity-70" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.78)_45%,rgba(5,5,5,0.1)_78%)]" />
          <div className="pointer-events-none absolute right-[15%] bottom-[12%] size-60 rounded-full border border-[#a855f7]/15 shadow-[0_0_80px_rgba(123,44,191,0.2),inset_0_0_80px_rgba(123,44,191,0.08)]" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#7B2CBF]/28 bg-[#7B2CBF]/10 px-3 py-1.5 text-[10px] font-black tracking-[0.13em] text-[#d8b4fe] uppercase"><ShadowGlyph name="spark" size={13} /> Void Launcher</span>
              <h2 className="font-display mt-5 text-[clamp(2rem,5vw,4.3rem)] leading-[0.92] font-black tracking-[-0.065em]">STEP BEYOND<br /><span className="bg-[linear-gradient(90deg,#d8b4fe,#a855f7_48%,#86a8ff)] bg-clip-text text-transparent">THE ORDINARY</span></h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#a79bad]">A fast, focused Minecraft launcher for verified players.</p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {profile ? (
                <motion.button type="button" onClick={launch} disabled={launchDisabled} whileHover={!reducedMotion && !launchDisabled ? { scale: 1.025, y: -2 } : undefined} whileTap={!reducedMotion && !launchDisabled ? { scale: 0.975 } : undefined} className={`${voidClientStyles.primaryButton} min-h-14 min-w-64 px-6`}>
                  {launchMutation.isPending ? <motion.span animate={reducedMotion ? undefined : { rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><ShadowGlyph name="spark" size={19} /></motion.span> : <ShadowGlyph name="play" size={20} className="filter drop-shadow-[0_0_8px_currentColor]" />}
                  {launchMutation.isPending ? "PREPARING CLIENT…" : "LAUNCH VOID"}
                </motion.button>
              ) : (
                <button type="button" onClick={signIn} className={`${voidClientStyles.primaryButton} min-h-14 min-w-64 px-6`}><ShadowGlyph name="account" size={19} /> SIGN IN TO LAUNCH</button>
              )}
              <span className="text-[11px] leading-5 text-[#9f92a8]">{instance ? `${instance.name} · ${instance.gameVersion} · ${instance.loader}` : "Create an instance before launch"}</span>
            </div>
            {launchMutation.isError && <p role="alert" className="mt-3 max-w-xl rounded-xl border border-red-400/15 bg-red-400/[0.055] px-3 py-2 text-xs text-red-300">{String(launchMutation.error)}</p>}
            {launchMutation.isSuccess && <p role="status" className="mt-3 text-xs text-[#4cff9a]">Launch command accepted. Minecraft is starting.</p>}
          </div>
        </section>

        <div className="grid gap-5">
          <InstanceStatus name={instance?.name} version={instance?.gameVersion} loader={instance?.loader} signedIn={Boolean(profile)} />
          <FriendsPanel friendsList={friendsList} onAddFriend={openFriendModal} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <TelemetryPanel snapshot={snapshot} />
        <PlayStreakCard streak={playStreak} />
      </div>

      <InstanceQuickSelect
        instances={instances}
        activeInstanceId={instance?.id ?? null}
        loading={isLoadingInstances}
        onSelect={setSelectedInstanceId}
      />

      <AnimatePresence>{friendModalOpen && <FriendModal onClose={closeFriendModal} onRequested={recordFriendRequest} />}</AnimatePresence>
    </div>
  );
}

function InstanceQuickSelect({ instances, activeInstanceId, loading, onSelect }: { instances: Instance[]; activeInstanceId: string | null; loading: boolean; onSelect: (instanceId: string) => void }) {
  const visibleInstances = instances.slice(0, 7);
  return (
    <section className={`${voidClientStyles.glassCard} mt-5 p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className={voidClientStyles.sectionKicker}>Quick launch</p><h2 className="font-display mt-1 text-lg font-black">Your instances</h2></div>
        <span className="text-[11px] text-[#91859b]">{loading ? "Loading…" : `${instances.length} available`}</span>
      </div>
      {visibleInstances.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
          {visibleInstances.map((candidate) => {
            const active = candidate.id === activeInstanceId;
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelect(candidate.id)}
                aria-pressed={active}
                className={`min-h-16 cursor-pointer rounded-xl border p-2.5 text-left transition ${active ? "border-[#c084fc]/58 bg-[#7B2CBF]/18 text-white shadow-[0_0_20px_rgba(123,44,191,.14)]" : "border-white/[0.08] bg-black/22 text-[#a79bad] hover:border-[#9d5ce0]/35 hover:text-white"}`}
              >
                <span className="block truncate text-[11px] font-black">{candidate.name}</span>
                <span className="mt-1 block truncate text-[10px] text-[#8f8199]">{candidate.gameVersion} · {candidate.loader}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] bg-black/20 px-4 py-5 text-center">
          <p className="text-xs font-bold text-white">No instances yet</p>
          <p className="mt-1 text-[10px] text-[#9f92a8]">Create one in Instances to enable quick launch.</p>
        </div>
      )}
    </section>
  );
}

function InstanceStatus({ name, version, loader, signedIn }: { name?: string; version?: string; loader?: string; signedIn: boolean }) {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl border border-[#9d5ce0]/24 bg-[#7B2CBF]/10 text-[#d8b4fe]"><ShadowGlyph name="vault" size={19} /></span><span className={`size-2 rounded-full ${name && signedIn ? "bg-[#4cff9a] shadow-[0_0_14px_currentColor]" : "bg-amber-300"}`} /></div>
      <p className="mt-4 text-[9px] font-black tracking-[0.15em] text-[#9a8da3] uppercase">Selected instance</p>
      <h2 className="font-display mt-1 truncate text-base font-black text-white">{name ?? "No instance selected"}</h2>
      <div className="mt-4 flex items-center justify-between text-[10px] text-[#a79bad]"><span>{version ?? "Create a profile"}</span><strong className={name && signedIn ? "text-[#4cff9a]" : "text-amber-200"}>{name ? loader : signedIn ? "Missing" : "Sign in"}</strong></div>
    </section>
  );
}

function FriendsPanel({ friendsList, onAddFriend }: { friendsList: IFriendEntry[]; onAddFriend: () => void }) {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center justify-between">
        <div><p className={voidClientStyles.sectionKicker}>Friends</p><h2 className="font-display mt-1 text-base font-black">Friends Online</h2></div>
        <button type="button" onClick={onAddFriend} className={`grid size-11 cursor-pointer place-items-center rounded-xl border border-[#7B2CBF]/25 bg-[#7B2CBF]/10 text-[#d8b4fe] transition hover:bg-[#7B2CBF]/20 ${voidClientStyles.focusRing}`} aria-label="Add a friend"><ShadowGlyph name="addFriend" size={17} /></button>
      </div>
      <div className="mt-4 space-y-2.5">
        {friendsList.slice(0, 3).map((friend) => (
          <div key={friend.id} className="flex items-center gap-2.5">
            <div className="relative"><img src={`https://mc-heads.net/avatar/${encodeURIComponent(friend.username)}/32`} alt={`${friend.username} Minecraft avatar`} width={32} height={32} loading="lazy" className="size-8 rounded-lg bg-[#110D17] [image-rendering:pixelated]" /><span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[#110D17] ${friend.online ? "bg-[#4cff9a]" : "bg-[#493258]"}`} /></div>
            <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-white">{friend.username}</strong><small className="block truncate text-[9px] text-[#a79bad]">{friend.status}</small></span>
          </div>
        ))}
        {friendsList.length === 0 && <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 px-4 py-5 text-center"><ShadowGlyph name="account" size={23} className="mx-auto text-[#725f80]" /><p className="mt-2 text-[11px] font-bold text-white">No friends added</p><p className="mt-1 text-[9px] leading-4 text-[#a79bad]">Your verified friend network starts empty.</p></div>}
      </div>
    </section>
  );
}

function PlayStreakCard({ streak }: { streak: IPlayStreakState }) {
  return (
    <section className={`${voidClientStyles.glassCard} p-5`}>
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-orange-300/18 bg-orange-400/[0.055] text-orange-300"><ShadowGlyph name="spark" size={19} /></span><div><p className={voidClientStyles.sectionKicker}>Play streak</p><h2 className="font-display mt-1 text-base font-black">{streak.days} Day Streak</h2></div></div>
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => <motion.span key={day} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: day * 0.045 }} className={`h-10 origin-bottom rounded-lg border ${day <= Math.min(streak.days, 7) ? "border-[#d8b4fe]/35 bg-[#7B2CBF]/30 shadow-[0_0_18px_rgba(123,44,191,0.2)]" : "border-white/[0.06] bg-white/[0.035]"}`} />)}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] text-[#a79bad]"><span>Last verified launch</span><strong className="text-white">{streak.lastPlayedDate ?? "Not played yet"}</strong></div>
    </section>
  );
}

function FriendModal({ onClose, onRequested }: { onClose: () => void; onRequested: (username: string) => void }) {
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

  const submit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = username.trim();
    if (!FRIEND_NAME_PATTERN.test(normalized)) {
      setError("Enter a valid Minecraft username using 3–16 letters, numbers or underscores.");
      return;
    }
    setStatus("sending");
    sendTimerRef.current = window.setTimeout(() => {
      setStatus("sent");
      onRequested(normalized);
      sendTimerRef.current = null;
    }, 650);
  }, [onRequested, username]);

  return (
    <motion.div className="fixed inset-0 z-[300] grid place-items-center bg-black/75 p-5 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="presentation" onMouseDown={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-labelledby="friend-dialog-title" onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.24 }} className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#9d5ce0]/38 bg-[#050505]/95 p-6 shadow-[0_38px_120px_rgba(0,0,0,0.9),0_0_60px_rgba(123,44,191,0.22)] backdrop-blur-2xl">
        <button type="button" onClick={onClose} className={`absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-xl border border-white/[0.08] bg-black/25 text-[#a79bad] transition hover:text-white ${voidClientStyles.focusRing}`} aria-label="Close friend dialog"><ShadowGlyph name="close" size={15} /></button>
        <span className="grid size-12 place-items-center rounded-2xl border border-[#a855f7]/30 bg-[#7B2CBF]/14 text-[#d8b4fe] shadow-[0_0_28px_rgba(123,44,191,0.25)]"><ShadowGlyph name="addFriend" size={23} /></span>
        <h2 id="friend-dialog-title" className="font-display mt-5 text-xl font-black">Add a Friend</h2>
        <p className="mt-2 text-xs leading-5 text-[#a79bad]">Enter an exact Minecraft gamer tag. Until the native friend service is connected, requests remain visibly pending.</p>
        <form onSubmit={submit} className="mt-5">
          <label htmlFor="friend-username" className="text-[9px] font-black tracking-[0.14em] text-[#c796ff] uppercase">Minecraft username</label>
          <input id="friend-username" value={username} onChange={(event) => { setUsername(event.target.value.slice(0, 16)); setError(null); }} autoFocus autoComplete="off" placeholder="Minecraft username" className={`${voidClientStyles.input} mt-2 shadow-[0_0_15px_rgba(123,44,191,0.12)] focus:ring-2 focus:ring-[#7B2CBF] focus:shadow-[0_0_22px_rgba(123,44,191,0.4)]`} />
          {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
          <motion.button type="submit" disabled={status !== "idle"} whileHover={{ scale: status === "idle" ? 1.02 : 1 }} whileTap={{ scale: 0.98 }} className={`${voidClientStyles.primaryButton} mt-4 h-12 w-full`}>
            <ShadowGlyph name={status === "sent" ? "check" : status === "sending" ? "spark" : "addFriend"} size={16} />
            {status === "idle" ? "Send friend request" : status === "sending" ? "Sending through the Void…" : "Request pending"}
          </motion.button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function usePlayStreak(): [IPlayStreakState, () => void] {
  const [streak, setStreak] = useState<IPlayStreakState>(() => readStoredStreak());

  const recordLaunch = useCallback(() => {
    setStreak((current) => {
      const today = localDateKey(new Date());
      if (current.lastPlayedDate === today) return current;
      const gap = current.lastPlayedDate ? dayDifference(current.lastPlayedDate, today) : Number.POSITIVE_INFINITY;
      const next = { days: gap === 1 ? current.days + 1 : 1, lastPlayedDate: today };
      try { window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(next)); } catch { /* local persistence is optional */ }
      return next;
    });
  }, []);

  return [streak, recordLaunch];
}

function readStoredStreak(): IPlayStreakState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STREAK_STORAGE_KEY) ?? "null") as Partial<IPlayStreakState> | null;
    if (!parsed || !Number.isInteger(parsed.days) || parsed.days! < 0 || (parsed.lastPlayedDate !== null && typeof parsed.lastPlayedDate !== "string")) return EMPTY_STREAK;
    return { days: Math.min(10_000, parsed.days!), lastPlayedDate: parsed.lastPlayedDate ?? null };
  } catch {
    return EMPTY_STREAK;
  }
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDifference(from: string, to: string) {
  const fromParts = from.split("-").map(Number);
  const toParts = to.split("-").map(Number);
  if (fromParts.length !== 3 || toParts.length !== 3 || [...fromParts, ...toParts].some((value) => !Number.isFinite(value))) return Number.POSITIVE_INFINITY;
  return Math.round((Date.UTC(toParts[0], toParts[1] - 1, toParts[2]) - Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2])) / 86_400_000);
}

export default DashboardView;
