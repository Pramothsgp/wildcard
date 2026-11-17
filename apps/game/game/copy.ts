// What each game calls things, so every page speaks in its own voice. Client-safe.
import type { GameKind } from "./party-meta.ts";

type Copy = {
  /** Tailwind gradient and ring for the game's cards and hero. */
  look: string;
  tagline: string;
  /** "How it plays" in three steps. */
  steps: [string, string][];
  startTitle: string;
  startHint: string;
  create: string;
  practice: (bots: number) => string;
  publicLabel: string;
  joinTitle: string;
  join: string;
  openTitle: string;
  openEmpty: string;
  openJoin: string;
  /** What the people at a table are called. */
  players: string;
  defaultName: (user: string) => string;
  shareHint: string;
  waiting: string;
  start: string;
  addBot: string;
  needMore: (n: number) => string;
  ready: string;
  topTitle: string;
  boardEmpty: string;
  firstGame: string;
};

export const COPY: Record<GameKind, Copy> = {
  wildcard: {
    look: "from-emerald-700/60 via-emerald-900/40 to-amber-700/30 ring-amber-300/40",
    tagline: "Match, stack, flip and race to an empty hand.",
    steps: [
      ["Match", "Play a card that matches the colour or number on the pile."],
      ["Strike", "Skips, reverses and draw cards turn the table on its head."],
      ["Shout", "Down to one card? Hit WILDCARD! before someone catches you."],
    ],
    startTitle: "Deal a new table",
    startHint: "Pick a mode. You can tweak every house rule once you sit down.",
    create: "Deal the cards",
    practice: (n) => `Warm up vs ${n} bots`,
    publicLabel: "List the table publicly so anyone can sit down",
    joinTitle: "Got a table code?",
    join: "Take a seat",
    openTitle: "Tables dealing now",
    openEmpty: "No tables are dealing right now. Deal one and the seats fill fast.",
    openJoin: "Sit down",
    players: "Players",
    defaultName: (u) => `${u}'s table`,
    shareHint: "Send the code or link and your friends can sit down.",
    waiting: "The host is shuffling. Cards out soon!",
    start: "Deal the cards",
    addBot: "Add a bot",
    needMore: (n) => `Need ${n} more to deal. Invite a friend or add a bot.`,
    ready: "Everyone's seated. Deal when ready!",
    topTitle: "Top card sharks",
    boardEmpty: "Nobody has scored yet. Win a round and the top spot is yours.",
    firstGame: "Your first hand is one click away.",
  },
  imposter: {
    look: "from-fuchsia-700/50 via-violet-950/60 to-black ring-fuchsia-400/40",
    tagline: "One word. One faker. Can you spot them before they blend in?",
    steps: [
      ["Get the word", "Everyone sees the secret word, except the imposter."],
      ["Drop a clue", "Take turns giving a short clue. Not too obvious, not too vague."],
      ["Point the finger", "Vote out the faker. Caught imposters get one guess to steal the win."],
    ],
    startTitle: "Host an interrogation",
    startHint: "Pick the word pack and timers once the room is open.",
    create: "Open the room",
    practice: (n) => `Practise with ${n} bot suspects`,
    publicLabel: "List the room publicly so anyone can walk in",
    joinTitle: "Got a room code?",
    join: "Walk in",
    openTitle: "Rooms looking for suspects",
    openEmpty: "No rooms are open right now. Open one and play detective.",
    openJoin: "Walk in",
    players: "Suspects",
    defaultName: (u) => `${u}'s interrogation`,
    shareHint: "Send the code to your friends. The more suspects, the better the bluffing.",
    waiting: "The host is setting up the interrogation. Get your poker face ready.",
    start: "Start the interrogation",
    addBot: "Add a bot suspect",
    needMore: (n) => `Need ${n} more suspect${n > 1 ? "s" : ""}. Invite a friend or add a bot.`,
    ready: "Enough suspects. Lock the doors when you're ready!",
    topTitle: "Sharpest detectives",
    boardEmpty: "No one has cracked a case yet. Be the first detective on the board.",
    firstGame: "Your first case is waiting.",
  },
  village: {
    look: "from-indigo-800/60 via-slate-950/70 to-orange-800/30 ring-indigo-300/40",
    tagline: "Night falls. The wolves hunt. Can the village find them in time?",
    steps: [
      ["Get a role", "Wolf, seer, healer or villager. Keep it secret."],
      ["Survive the night", "Wolves strike, the seer looks, the healer protects."],
      ["Vote by day", "Talk it out and send a suspect away. Find every wolf to win."],
    ],
    startTitle: "Gather a village",
    startHint: "Set the number of rounds and timers once your village is open.",
    create: "Found the village",
    practice: (n) => `Rehearse with ${n} bot villagers`,
    publicLabel: "List the village publicly so travellers can move in",
    joinTitle: "Got a village code?",
    join: "Move in",
    openTitle: "Villages gathering now",
    openEmpty: "No villages are gathering yet. Found one and call your friends.",
    openJoin: "Move in",
    players: "Villagers",
    defaultName: (u) => `${u}'s village`,
    shareHint: "Send the code to your friends. Bigger villages hide more wolves.",
    waiting: "The elder is about to call nightfall. Keep your wits about you.",
    start: "Let night fall",
    addBot: "Add a bot villager",
    needMore: (n) => `Need ${n} more villager${n > 1 ? "s" : ""}. Invite a friend or add a bot.`,
    ready: "The village is ready. Let night fall when you are!",
    topTitle: "Village legends",
    boardEmpty: "No legends yet. Survive a round and your name goes up first.",
    firstGame: "Your first night in the village awaits.",
  },
};
