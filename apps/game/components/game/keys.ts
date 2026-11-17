"use client";
// Keyboard shortcuts, the same in every game. A key is skipped while you type in a box, and while a
// dialog is open it only reaches things inside that dialog.
import { type RefObject, useEffect, useRef } from "react";

const LABEL: Record<string, string> = { Enter: "↵", ArrowLeft: "←", ArrowRight: "→", " ": "Space" };
export const keyLabel = (key: string) => LABEL[key] ?? key.toUpperCase();

export function useHotkey(key: string | undefined, fn: () => void, inside?: RefObject<HTMLElement | null>) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (!key) return;
    const on = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== key.toLowerCase()) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
      // Enter on a focused button already clicks it; don't press it twice.
      if (e.key === "Enter" && t?.closest("button, a")) return;
      const dialog = document.querySelector('[aria-modal="true"]');
      if (dialog && !(inside?.current && dialog.contains(inside.current))) return;
      e.preventDefault();
      cb.current();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [key, inside]);
}

/** A shortcut with no button of its own, for use inside lists. */
export function Hotkey({ k, fn }: { k: string; fn: () => void }) {
  useHotkey(k, fn);
  return null;
}
