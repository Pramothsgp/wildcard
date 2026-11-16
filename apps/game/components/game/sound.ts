// Tiny synthesized sound effects, one pack per theme. No audio files.
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

/**
 * One sound: a tone that can slide (to), wobble (vib, like a reed instrument) and be filtered,
 * or a burst of noise (noise) for drum skins and hits. `at` is the start offset in seconds.
 */
type Note = { f: number; to?: number; len: number; type?: OscillatorType; at?: number; gain?: number; vib?: number; noise?: boolean; lp?: number };
export type SoundName = "play" | "draw" | "turn" | "win" | "react";
export type Pack = "classic" | "temple" | "action" | "space";

const seq = (notes: Note[], step: number) => notes.map((n, i) => ({ ...n, at: i * step }));

const PACKS: Record<Pack, Record<SoundName, Note[]>> = {
  classic: {
    play: [{ f: 520, len: 0.06, type: "triangle" }],
    draw: seq([{ f: 300, len: 0.05 }, { f: 360, len: 0.05 }], 0.045),
    turn: seq([{ f: 660, len: 0.08 }, { f: 880, len: 0.12 }], 0.07),
    win: seq([{ f: 523, len: 0.1, type: "triangle" }, { f: 659, len: 0.1, type: "triangle" }, { f: 784, len: 0.25, type: "triangle" }], 0.09),
    react: [{ f: 990, len: 0.05, type: "sine", gain: 0.06 }],
  },
  // Thavil-like drum strokes and a nadaswaram-like reed line (sawtooth, vibrato, soft filter).
  temple: {
    play: [{ f: 170, to: 60, len: 0.16, type: "sine", gain: 0.25 }, { f: 0, len: 0.03, noise: true, lp: 2500, gain: 0.08 }],
    draw: seq([{ f: 220, to: 120, len: 0.08, type: "sine", gain: 0.18 }, { f: 240, to: 130, len: 0.08, type: "sine", gain: 0.18 }], 0.07),
    turn: seq([{ f: 587, len: 0.14, type: "sawtooth", vib: 6, lp: 1800, gain: 0.07 }, { f: 659, len: 0.22, type: "sawtooth", vib: 6, lp: 1800, gain: 0.07 }], 0.13),
    win: [
      ...seq([{ f: 160, to: 60, len: 0.14, gain: 0.25 }, { f: 160, to: 60, len: 0.14, gain: 0.25 }, { f: 200, to: 70, len: 0.2, gain: 0.25 }], 0.12),
      ...seq([{ f: 587, len: 0.16, type: "sawtooth" as const, vib: 7, lp: 2000, gain: 0.07 }, { f: 740, len: 0.16, type: "sawtooth" as const, vib: 7, lp: 2000, gain: 0.07 }, { f: 880, len: 0.4, type: "sawtooth" as const, vib: 7, lp: 2000, gain: 0.07 }], 0.15).map((n) => ({ ...n, at: n.at + 0.36 })),
    ],
    react: [{ f: 1320, to: 1250, len: 0.25, type: "sine", gain: 0.05 }],
  },
  // Punchy: a noise smack with a dropping square under it.
  action: {
    play: [{ f: 0, len: 0.06, noise: true, lp: 1800, gain: 0.2 }, { f: 220, to: 90, len: 0.1, type: "square", gain: 0.06 }],
    draw: [{ f: 0, len: 0.08, noise: true, lp: 5000, gain: 0.08 }],
    turn: seq([{ f: 440, len: 0.06, type: "square", gain: 0.05 }, { f: 660, len: 0.1, type: "square", gain: 0.05 }], 0.06),
    win: seq([{ f: 392, len: 0.1, type: "square", gain: 0.06 }, { f: 523, len: 0.1, type: "square", gain: 0.06 }, { f: 659, len: 0.1, type: "square", gain: 0.06 }, { f: 784, len: 0.3, type: "square", gain: 0.06 }], 0.09),
    react: [{ f: 0, len: 0.04, noise: true, lp: 3000, gain: 0.08 }],
  },
  space: {
    play: [{ f: 900, to: 300, len: 0.14, type: "sine", gain: 0.1 }],
    draw: [{ f: 300, to: 700, len: 0.12, type: "sine", gain: 0.08 }],
    turn: seq([{ f: 520, to: 1040, len: 0.18, type: "triangle", gain: 0.08 }, { f: 780, len: 0.2, type: "sine", gain: 0.06 }], 0.12),
    win: seq([{ f: 400, to: 800, len: 0.2, type: "triangle" }, { f: 600, to: 1200, len: 0.2, type: "triangle" }, { f: 800, to: 1600, len: 0.45, type: "triangle" }], 0.16),
    react: [{ f: 1500, to: 1800, len: 0.08, type: "sine", gain: 0.05 }],
  },
};

let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

export function sound(name: SoundName, pack: Pack = "classic") {
  if (muted || typeof window === "undefined") return;
  ctx ??= new AudioContext();
  const c = ctx;
  const t0 = c.currentTime;
  for (const n of PACKS[pack][name]) {
    const t = t0 + (n.at ?? 0);
    const g = c.createGain();
    g.gain.setValueAtTime(n.gain ?? 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + n.len);
    let out: AudioNode = g;
    if (n.lp) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = n.lp;
      g.connect(f);
      out = f;
    }
    out.connect(c.destination);
    if (n.noise) {
      const src = noise(c);
      src.connect(g);
      src.start(t);
      src.stop(t + n.len);
      continue;
    }
    const o = c.createOscillator();
    o.type = n.type ?? "sine";
    o.frequency.setValueAtTime(n.f, t);
    if (n.to) o.frequency.exponentialRampToValueAtTime(n.to, t + n.len);
    if (n.vib) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = n.vib;
      depth.gain.value = n.f * 0.012;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + n.len);
    }
    o.connect(g);
    o.start(t);
    o.stop(t + n.len);
  }
}
