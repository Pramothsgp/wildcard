// Tiny synthesized sound effects. No audio files.
let ctx: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && safeGet() === "1";

function safeGet() {
  try {
    return localStorage.getItem("wildcard-muted");
  } catch {
    return null;
  }
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("wildcard-muted", m ? "1" : "0");
  } catch {
    // storage blocked; keep the in-memory value
  }
}

const NOTES: Record<string, [number, number, OscillatorType][]> = {
  play: [[520, 0.06, "triangle"]],
  draw: [[300, 0.05, "sine"], [360, 0.05, "sine"]],
  turn: [[660, 0.08, "sine"], [880, 0.12, "sine"]],
  win: [[523, 0.1, "triangle"], [659, 0.1, "triangle"], [784, 0.2, "triangle"]],
};

export function sound(name: keyof typeof NOTES) {
  if (muted || typeof window === "undefined") return;
  ctx ??= new AudioContext();
  let t = ctx.currentTime;
  for (const [freq, len, type] of NOTES[name]) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + len);
    t += len * 0.9;
  }
}
