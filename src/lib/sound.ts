import { useUiStore } from "@/stores/ui";

/**
 * Tiny WebAudio synth for UI feedback — no audio files shipped.
 *
 * Every sound is a short gain envelope on a plain oscillator, deliberately
 * quiet and low-key. This is also the pattern for the "immersive installer"
 * feel: because the first-run/bootstrap experience runs inside the WebView,
 * we get animations *and* sound from web APIs instead of fighting NSIS
 * (see docs/DISTRIBUTION.md).
 */
let ctx: AudioContext | null = null;

function context(): AudioContext {
  ctx ??= new AudioContext();
  // Autoplay policies start contexts suspended until a user gesture —
  // our sounds are always triggered by clicks, so resuming here is safe.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  /** Delay relative to "now" in seconds. */
  at?: number;
  duration: number;
  /** Peak gain 0..1 — keep ≤ 0.06 to stay subtle. */
  peak: number;
  type?: OscillatorType;
}

function tone(frequency: number, { at = 0, duration, peak, type = "sine" }: ToneOptions) {
  const audio = context();
  const start = audio.currentTime + at;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;

  // Fast attack, exponential decay — reads as a soft "tick", not a beep.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

const soundOn = () => useUiStore.getState().soundEnabled;

/** Soft tick on button presses (wired centrally in components/ui/Button). */
export function playClick() {
  if (!soundOn()) return;
  tone(1800, { duration: 0.045, peak: 0.035, type: "triangle" });
}

/** Two-note chime for completed actions (optimization done, mod installed). */
export function playSuccess() {
  if (!soundOn()) return;
  tone(523.25, { duration: 0.14, peak: 0.05 }); // C5
  tone(783.99, { at: 0.1, duration: 0.18, peak: 0.05 }); // G5
}
