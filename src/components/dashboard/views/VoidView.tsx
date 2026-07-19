import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Ghost,
  Hash,
  Headphones,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Users,
  Volume2,
} from "lucide-react";
import {
  DISCORD_DMS,
  ME,
  TEXT_CHANNELS,
  VOICE_CHANNELS,
  type ChatMessage,
  type DiscordMessage,
} from "@/lib/voidData";
import { useInterval } from "@/hooks/useInterval";
import { cn } from "@/lib/utils";

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const initials = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";

/** Square gradient avatar (or a hash tile for #channels). */
function VoidAvatar({ name, color, size = 34 }: { name: string; color: string; size?: number }) {
  const isChannel = name.startsWith("#");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg border border-white/10 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${color}, #050505)` }}
    >
      {isChannel ? <Hash style={{ width: size * 0.5, height: size * 0.5 }} /> : initials(name)}
    </span>
  );
}

/**
 * VIEW 3 — "The Void" communications hub (browser-only).
 *
 * Dual-pane: the left "Void Chat" pane bundles a channel rail (text + joinable
 * voice channels) with the global message stream + composer; the right pane is
 * the shadow-themed Discord Integration wrapper. Everything is local state:
 * sending appends to the channel, joining voice adds "You" to the roster, and
 * a timer fakes who's talking / typing. No file-share buttons, per spec.
 */
export function VoidView() {
  // Text chat
  const [activeChannelId, setActiveChannelId] = useState(TEXT_CHANNELS[0].id);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>(() =>
    Object.fromEntries(TEXT_CHANNELS.map((c) => [c.id, c.seed])),
  );
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<string | null>(null);

  // Voice
  const [voiceJoined, setVoiceJoined] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);

  // Discord bridge
  const [activeDmId, setActiveDmId] = useState(DISCORD_DMS[0].id);
  const [threads, setThreads] = useState<Record<string, DiscordMessage[]>>(() =>
    Object.fromEntries(DISCORD_DMS.map((d) => [d.id, d.seed])),
  );
  const [dmDraft, setDmDraft] = useState("");

  const activeChannel = TEXT_CHANNELS.find((c) => c.id === activeChannelId)!;
  const activeDm = DISCORD_DMS.find((d) => d.id === activeDmId)!;
  const messages = messagesByChannel[activeChannelId];

  // Roster of the joined voice channel, with "You" appended.
  const voiceRoster = useMemo(() => {
    const ch = VOICE_CHANNELS.find((v) => v.id === voiceJoined);
    if (!ch) return [];
    return [...ch.members, { name: "You", color: ME.color }];
  }, [voiceJoined]);

  // Simulate who's talking (only when connected & not deafened).
  useInterval(
    () => {
      if (deafened || voiceRoster.length === 0) return setSpeaking(null);
      const candidates = voiceRoster.filter((m) => !(m.name === "You" && muted));
      const pick = Math.random() < 0.6 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
      setSpeaking(pick?.name ?? null);
    },
    voiceJoined ? 1600 : null,
  );

  // Simulate someone typing in the active channel.
  useInterval(() => {
    const others = activeChannel.seed.map((m) => m.author).filter((a, i, arr) => arr.indexOf(a) === i);
    setTyping(Math.random() < 0.5 && others.length ? others[Math.floor(Math.random() * others.length)] : null);
  }, 4200);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: ChatMessage = { id: `${Date.now()}`, author: ME.name, color: ME.color, role: "Owner", text, time: now() };
    setMessagesByChannel((prev) => ({ ...prev, [activeChannelId]: [...prev[activeChannelId], msg] }));
    setDraft("");
  };

  const sendDm = () => {
    const text = dmDraft.trim();
    if (!text) return;
    setThreads((prev) => ({ ...prev, [activeDmId]: [...prev[activeDmId], { from: "me", text, time: now() }] }));
    setDmDraft("");
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-[880px]">
        {/* ══════════ PANE 1 — VOID CHAT (rail + messages) ══════════ */}
        <div className="flex flex-1 border-r border-[#7B2CBF]/20">
          {/* Channel rail */}
          <aside className="flex w-56 shrink-0 flex-col bg-[#080610]/70">
            <div className="flex items-center gap-2 border-b border-[#7B2CBF]/15 px-4 py-4">
              <Ghost className="h-4 w-4 text-[#C77DFF]" />
              <span className="font-serif text-sm font-bold tracking-[0.15em] text-[#EAE4F4]">THE VOID</span>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3">
              {/* Text channels */}
              <div className="mb-1 px-2 text-[10px] font-semibold tracking-[0.2em] text-[#5f5878] uppercase">Text Realms</div>
              {TEXT_CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannelId(c.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    c.id === activeChannelId ? "bg-[#7B2CBF]/15 text-[#C77DFF]" : "text-[#9A90B2] hover:bg-[#110D17]/80 hover:text-[#EAE4F4]",
                  )}
                >
                  <Hash className="h-4 w-4 opacity-70" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}

              {/* Voice channels */}
              <div className="mt-4 mb-1 px-2 text-[10px] font-semibold tracking-[0.2em] text-[#5f5878] uppercase">Voice Channels</div>
              {VOICE_CHANNELS.map((v) => {
                const joined = voiceJoined === v.id;
                const roster = joined ? voiceRoster : v.members;
                return (
                  <div key={v.id}>
                    <button
                      onClick={() => setVoiceJoined(joined ? null : v.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        joined ? "text-[#46E0A8]" : "text-[#9A90B2] hover:bg-[#110D17]/80 hover:text-[#EAE4F4]",
                      )}
                    >
                      <Volume2 className="h-4 w-4 opacity-70" />
                      <span className="truncate">{v.name}</span>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-[#5f5878]">
                        <Users className="h-3 w-3" />
                        {roster.length}
                      </span>
                    </button>
                    {/* Roster */}
                    {roster.map((m) => (
                      <div key={m.name} className="flex items-center gap-2 py-1 pr-2 pl-8 text-[12px]">
                        <span className="relative">
                          <VoidAvatar name={m.name} color={m.color} size={18} />
                          {speaking === m.name && (
                            <motion.span
                              className="absolute -inset-0.5 rounded-lg"
                              style={{ boxShadow: "0 0 0 2px #46E0A8" }}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.9, repeat: Infinity }}
                            />
                          )}
                        </span>
                        <span className={cn(m.name === "You" ? "font-semibold text-[#C77DFF]" : "text-[#9A90B2]")}>{m.name}</span>
                        {m.name === "You" && muted && <MicOff className="ml-auto h-3 w-3 text-[#FF4D6D]" />}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Voice control bar (only when connected) */}
            <AnimatePresence>
              {voiceJoined && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="border-t border-[#7B2CBF]/20 bg-[#050505]/70 p-3"
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#46E0A8] uppercase">
                    <motion.span className="h-2 w-2 rounded-full bg-[#46E0A8]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                    Voice Connected
                  </div>
                  <div className="flex items-center gap-2">
                    <VoiceBtn active={!muted} danger={muted} onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}>
                      {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </VoiceBtn>
                    <VoiceBtn active={!deafened} danger={deafened} onClick={() => setDeafened((d) => !d)} title={deafened ? "Undeafen" : "Deafen"}>
                      <Headphones className="h-4 w-4" />
                    </VoiceBtn>
                    <button
                      onClick={() => {
                        setVoiceJoined(null);
                        setMuted(false);
                        setDeafened(false);
                      }}
                      title="Disconnect"
                      className="ml-auto grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-[#FF4D6D]/40 bg-[#FF4D6D]/10 text-[#FF4D6D] transition-colors hover:bg-[#FF4D6D]/20"
                    >
                      <PhoneOff className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>

          {/* Messages + composer */}
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-[#7B2CBF]/15 px-5 py-3.5">
              <Hash className="h-4 w-4 text-[#9D4EDD]" />
              <span className="font-serif font-bold text-[#EAE4F4]">{activeChannel.name}</span>
              <span className="hidden border-l border-[#7B2CBF]/20 pl-3 text-[12px] text-[#5f5878] sm:inline">{activeChannel.topic}</span>
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#5f5878]">
                <span className="h-2 w-2 rounded-full bg-[#46E0A8]" /> 1,204 online
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <VoidAvatar name={m.author} color={m.color} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#EAE4F4]">{m.author}</span>
                      {m.role && (
                        <span className="rounded border border-[#7B2CBF]/30 px-1.5 text-[10px] tracking-wide text-[#C77DFF] uppercase">{m.role}</span>
                      )}
                      <span className="text-[11px] text-[#5f5878]">{m.time}</span>
                    </div>
                    <p className="text-[13px] break-words text-[#c9c2d8]">{m.text}</p>
                  </div>
                </motion.div>
              ))}

              {/* typing indicator */}
              <div className="h-4">
                <AnimatePresence>
                  {typing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[12px] text-[#5f5878]">
                      <span className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span key={i} className="h-1 w-1 rounded-full bg-[#9D4EDD]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </span>
                      {typing} is typing…
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Composer — text only, no file/quick-share controls */}
            <div className="border-t border-[#7B2CBF]/15 p-4">
              <div className="flex items-center gap-3 rounded-xl border border-[#7B2CBF]/25 bg-[#050505]/60 px-4 py-2.5 focus-within:border-[#9D4EDD]/60">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Message #${activeChannel.name}`}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#EAE4F4] outline-none placeholder:text-[#5f5878]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim()}
                  className="cursor-pointer text-[#9D4EDD] transition-colors hover:text-[#C77DFF] disabled:cursor-not-allowed disabled:text-[#5f5878]"
                  title="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ══════════ PANE 2 — DISCORD INTEGRATION ══════════ */}
        <aside className="flex w-80 shrink-0 flex-col bg-[#080610]/70">
          <div className="flex items-center gap-2 border-b border-[#7B2CBF]/15 px-4 py-3.5">
            <Ghost className="h-4 w-4 text-[#C77DFF]" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#EAE4F4]">Discord Bridge</div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#5f5878]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#46E0A8]" /> Connected as Shadow#0001
              </div>
            </div>
            <span className="ml-auto rounded border border-[#7B2CBF]/25 px-1.5 py-0.5 text-[10px] tracking-wide text-[#9A90B2] uppercase">Wrapped</span>
          </div>

          {/* DM list */}
          <div className="max-h-52 overflow-y-auto border-b border-[#7B2CBF]/15 p-2">
            {DISCORD_DMS.map((dm) => (
              <button
                key={dm.id}
                onClick={() => setActiveDmId(dm.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors",
                  dm.id === activeDmId ? "bg-[#7B2CBF]/12" : "hover:bg-[#110D17]/80",
                )}
              >
                <span className="relative">
                  <VoidAvatar name={dm.name} color={dm.color} size={32} />
                  <span
                    className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#080610]"
                    style={{ background: { online: "#46E0A8", idle: "#E0B646", dnd: "#FF4D6D", offline: "#5f5878" }[dm.presence] }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#EAE4F4]">{dm.name}</div>
                  <div className="truncate text-[11px] text-[#5f5878]">{threads[dm.id].at(-1)?.text}</div>
                </div>
                {dm.unread && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#7B2CBF] px-1.5 text-[10px] font-bold text-white">{dm.unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* Active thread */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-[#9A90B2]">
              <VoidAvatar name={activeDm.name} color={activeDm.color} size={22} />
              <span className="font-semibold text-[#EAE4F4]">{activeDm.name}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
              {threads[activeDmId].map((msg, i) => (
                <div key={i} className={cn("flex", msg.from === "me" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-1.5 text-[12px]",
                      msg.from === "me" ? "bg-[#7B2CBF] text-white" : "border border-[#7B2CBF]/20 bg-[#110D17] text-[#c9c2d8]",
                    )}
                  >
                    {msg.text}
                    <span className={cn("ml-2 text-[9px]", msg.from === "me" ? "text-white/60" : "text-[#5f5878]")}>{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#7B2CBF]/15 p-3">
              <div className="flex items-center gap-2 rounded-lg border border-[#7B2CBF]/25 bg-[#050505]/60 px-3 py-2 focus-within:border-[#9D4EDD]/60">
                <input
                  value={dmDraft}
                  onChange={(e) => setDmDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendDm()}
                  placeholder={`Message ${activeDm.name}`}
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-[#EAE4F4] outline-none placeholder:text-[#5f5878]"
                />
                <button onClick={sendDm} disabled={!dmDraft.trim()} className="cursor-pointer text-[#9D4EDD] hover:text-[#C77DFF] disabled:text-[#5f5878]" title="Send">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Toggle button used in the voice control bar. */
function VoiceBtn({
  active,
  danger,
  onClick,
  title,
  children,
}: {
  active: boolean;
  danger: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "grid h-9 w-9 cursor-pointer place-items-center rounded-lg border transition-colors",
        danger
          ? "border-[#FF4D6D]/40 bg-[#FF4D6D]/10 text-[#FF4D6D]"
          : active
            ? "border-[#7B2CBF]/30 bg-[#110D17] text-[#C77DFF]"
            : "border-[#7B2CBF]/20 text-[#9A90B2]",
      )}
    >
      {children}
    </button>
  );
}
