import { useCallback, useState, type FormEvent } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { AtSign, Clock3, LoaderCircle, Plus, Send, Sparkles, UserPlus, Users2 } from "lucide-react";
import { MinecraftAvatar } from "@/components/account/MinecraftAvatar";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface FriendProfile {
  id: string;
  gamertag: string;
  avatarUrl: string | null;
  status: "online" | "offline" | "pending";
  activity: string | null;
  lastSeenAt: string | null;
}

export const realFriends: FriendProfile[] = [];

const submitVariants: Variants = {
  idle: { scale: 1, y: 0 },
  hover: { scale: 1.025, y: -2, transition: { type: "spring", stiffness: 430, damping: 24 } },
  tap: { scale: 0.975, y: 0, transition: { duration: 0.08 } },
};

const GLINT_PARTICLES = [
  { x: -54, y: -20, delay: 0 },
  { x: -28, y: 24, delay: 0.03 },
  { x: 4, y: -28, delay: 0.06 },
  { x: 34, y: 22, delay: 0.09 },
  { x: 62, y: -13, delay: 0.12 },
] as const;

export function FriendsWidget() {
  const [friends, setFriends] = useState<FriendProfile[]>(realFriends);
  const [open, setOpen] = useState(false);
  const [gamertag, setGamertag] = useState("");
  const [sending, setSending] = useState(false);
  const [burst, setBurst] = useState(0);
  const valid = /^[A-Za-z0-9_]{3,16}$/.test(gamertag.trim());

  const handleOpenChange = useCallback((next: boolean) => {
    if (!sending) setOpen(next);
  }, [sending]);

  const submit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    const clean = gamertag.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(clean) || sending) return;
    setSending(true);
    setBurst((current) => current + 1);
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    setFriends((current) => [...current, { id: crypto.randomUUID(), gamertag: clean, avatarUrl: null, status: "pending", activity: null, lastSeenAt: null }]);
    setGamertag("");
    setSending(false);
    setOpen(false);
  }, [gamertag, sending]);

  return (
    <aside className="shadow-panel aaa-card relative flex min-h-80 min-w-0 flex-col overflow-hidden rounded-3xl border p-5">
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-accent-500/14 blur-[70px]" />
      <div className="relative flex items-center justify-between"><div><p className="section-kicker">Friends</p><h2 className="mt-1 font-display text-lg font-bold text-white">Social link</h2></div><span className="grid size-10 place-items-center rounded-xl border border-accent-400/20 bg-accent-500/10 text-accent-300 shadow-[0_0_22px_rgb(123_44_191_/_0.13)]"><Users2 size={18} /></span></div>
      {friends.length === 0 ? (
        <div className="relative my-5 grid flex-1 place-items-center rounded-2xl border border-dashed border-accent-400/18 bg-[radial-gradient(circle_at_50%_20%,rgb(123_44_191_/_0.1),transparent_55%),rgb(0_0_0_/_0.22)] p-6 text-center"><div><UserPlus className="mx-auto mb-3 text-accent-300 drop-shadow-[0_0_12px_rgb(123_44_191_/_0.6)]" /><h3 className="font-semibold text-white">Your squad starts here</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-ink-500">Add a Minecraft gamertag to create a local pending friend request.</p><Button onClick={() => setOpen(true)} className="mt-5 rounded-xl"><Plus size={15} /> Add Friend</Button></div></div>
      ) : (
        <div className="relative my-5 space-y-2">{friends.map((friend) => <div key={friend.id} className="flex items-center gap-3 rounded-xl border border-white/7 bg-black/25 p-3 backdrop-blur-xl transition hover:border-accent-400/24 hover:bg-accent-500/[0.055]"><MinecraftAvatar username={friend.gamertag} size={36} className="size-9 rounded-lg ring-1 ring-accent-400/20" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{friend.gamertag}</strong><small className="flex items-center gap-1 text-amber-300"><Clock3 size={11} /> Request pending</small></span></div>)}</div>
      )}
      {friends.length > 0 && <Button variant="outline" onClick={() => setOpen(true)} className="relative mt-auto rounded-xl"><Plus size={15} /> Add Friend</Button>}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md overflow-hidden border-accent-400/28 bg-[#09060e]/96 shadow-[0_40px_140px_rgb(0_0_0_/_0.86),0_0_80px_rgb(123_44_191_/_0.25)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgb(123_44_191_/_0.25),transparent_38%),radial-gradient(circle_at_100%_100%,rgb(38_63_146_/_0.16),transparent_42%)]" />
          <div className="shadow-energy-rail absolute inset-x-0 top-0 h-px" />
          <div className="relative p-6 pt-8 sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-accent-400/28 bg-accent-500/12 text-accent-200 shadow-[0_0_28px_rgb(123_44_191_/_0.2)]"><UserPlus size={21} /></span>
              <DialogHeader className="pr-10"><p className="section-kicker">Void social protocol</p><DialogTitle className="text-2xl">Add a friend</DialogTitle><DialogDescription>Send a local request using their exact Minecraft gamertag.</DialogDescription></DialogHeader>
            </div>

            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <label htmlFor="friend-gamertag" className="block text-[10px] font-black tracking-[0.16em] text-ink-300 uppercase">Minecraft gamertag</label>
              <div className="relative">
                <AtSign size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-accent-300" />
                <input
                  id="friend-gamertag"
                  autoFocus
                  value={gamertag}
                  onChange={(event) => setGamertag(event.target.value)}
                  disabled={sending}
                  className="h-13 w-full rounded-2xl border border-accent-400/20 bg-black/40 pr-4 pl-11 text-sm text-white outline-none transition duration-200 placeholder:text-ink-500 hover:border-accent-400/35 focus:border-[#7B2CBF] focus:ring-2 focus:ring-[#7B2CBF] focus:shadow-[0_0_15px_rgba(123,44,191,0.4)] disabled:opacity-60"
                  maxLength={16}
                  placeholder="e.g. DarkKnight_AT"
                  aria-describedby="gamertag-help"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p id="gamertag-help" className="text-xs text-ink-500">3–16 letters, numbers, or underscores.</p>
                <span className={`text-[10px] font-bold ${gamertag.length > 0 && !valid ? "text-red-300" : "text-ink-500"}`}>{gamertag.length}/16</span>
              </div>

              <motion.button
                type="submit"
                disabled={!valid || sending}
                variants={submitVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                className="group relative flex h-13 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl border border-accent-300/35 bg-gradient-to-r from-accent-700 via-accent-500 to-midnight-500 text-sm font-black tracking-[0.08em] text-white uppercase shadow-[inset_0_1px_0_rgb(255_255_255_/_0.2),0_0_32px_rgb(123_44_191_/_0.38)] disabled:pointer-events-none disabled:opacity-45"
              >
                <motion.span className="absolute inset-y-0 -left-16 w-12 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent" animate={sending ? { x: [0, 460], opacity: [0, 1, 0] } : { x: 0, opacity: 0 }} transition={{ duration: 0.48, ease: "easeOut" }} />
                <AnimatePresence>
                  {sending && GLINT_PARTICLES.map((particle, index) => (
                    <motion.span
                      key={`${burst}-${index}`}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{ x: particle.x, y: particle.y, scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.48, delay: particle.delay, ease: "easeOut" }}
                      className="pointer-events-none absolute left-1/2 top-1/2 size-1 rounded-full bg-white shadow-[0_0_10px_3px_rgb(216_180_254_/_0.8)]"
                    />
                  ))}
                </AnimatePresence>
                <span className="relative flex items-center gap-2">{sending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}{sending ? "Sending request..." : "Send friend request"}{!sending && <Sparkles size={13} className="text-accent-200" />}</span>
              </motion.button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
