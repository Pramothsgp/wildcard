// Brand panel and phone header for the sign-in and sign-up pages.

const CARDS = [
  { bg: "#e5383b", sym: "7", rot: -16, x: -70, y: 12 },
  { bg: "#1f7ae0", sym: "+2", rot: -4, x: -18, y: -4 },
  { bg: "#f4b400", sym: "⇄", rot: 9, x: 34, y: 0 },
  { bg: "#17171c", sym: "W", rot: 21, x: 84, y: 18, wild: true },
];

function Card({ bg, sym, rot, x, y, wild }: (typeof CARDS)[number]) {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-48 w-32 rounded-2xl border-[6px] border-[#fbfaf6] shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${bg}, color-mix(in srgb, ${bg} 70%, black))`, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)` }}
    >
      <span className="absolute left-2 top-1 text-sm font-black text-white">{wild ? "★" : sym}</span>
      <div className="absolute inset-0 grid place-items-center">
        {wild ? (
          <div className="size-20 rounded-full border-4 border-white" style={{ background: "conic-gradient(#e5383b 0 25%, #1f7ae0 0 50%, #f4b400 0 75%, #2fa84f 0)" }} />
        ) : (
          <div className="grid size-20 place-items-center rounded-full bg-white text-3xl font-black" style={{ color: bg }}>{sym}</div>
        )}
      </div>
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`w-fit bg-gradient-to-r from-amber-300 via-pink-400 to-sky-400 bg-clip-text font-black tracking-tight text-transparent ${className}`}>
      WILDCARD
    </span>
  );
}

export function GameAside() {
  return (
    <div className="relative flex w-full flex-col justify-between bg-[#0b1020] p-12 text-white">
      <div aria-hidden className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-pink-600/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-sky-500/20 blur-3xl" />
      <Wordmark className="relative text-3xl" />
      <div aria-hidden className="relative h-72">
        {CARDS.map((c) => <Card key={c.sym} {...c} />)}
      </div>
      <div className="relative space-y-4">
        <h2 className="text-4xl font-black leading-tight">Match it. Stack it.<br />Empty your hand first.</h2>
        <ul className="flex flex-wrap gap-2 text-sm text-white/75">
          {["2 to 10 players", "8 game modes", "Play bots or friends", "Rejoin any time"].map((t) => (
            <li key={t} className="rounded-full border border-white/15 bg-white/5 px-3 py-1">{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
