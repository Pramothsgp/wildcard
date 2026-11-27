// Draw it: the shared board for one room. Steps from the drawer are checked, kept and passed on.
// ponytail: memory only, not saved with the room. A server restart mid-drawing starts the board blank;
// save it with the room if that ever matters.
import { type DrawCmd, MAX_OPS, type Op } from "./sketch-ops.ts";
import type { ServerMsg } from "./protocol.ts";

/** `key` is the word the board belongs to (the game's turn number); a new word means a blank board. */
export type Board = { key: number; ops: Op[]; redo: Op[] };

export const blankBoard = (key = 0): Board => ({ key, ops: [], redo: [] });

/** The board for this word, wiping it first if it belongs to an earlier one. */
export function boardFor(b: Board, key: number): Board {
  if (b.key !== key) Object.assign(b, blankBoard(key));
  return b;
}

export const boardMsg = (b: Board): ServerMsg => ({ t: "board", key: b.key, ops: b.ops });

/**
 * Apply one command from the drawer. `others` goes to everyone but the drawer (who already sees it);
 * `all` goes to everyone, the drawer included (undo and redo change what's on their screen too).
 */
export function apply(b: Board, cmd: DrawCmd): { others?: ServerMsg; all?: ServerMsg } {
  switch (cmd.k) {
    case "ink":
      return { others: { t: "ink", key: b.key, ink: cmd } };
    case "op":
      if (b.ops.length >= MAX_OPS) return { all: boardMsg(b) };
      b.ops.push(cmd.op);
      b.redo = [];
      return { others: { t: "op", key: b.key, op: cmd.op } };
    case "undo":
    case "redo": {
      const [from, to] = cmd.k === "undo" ? [b.ops, b.redo] : [b.redo, b.ops];
      const op = from.pop();
      if (op) to.push(op);
      return { all: boardMsg(b) };
    }
  }
}
