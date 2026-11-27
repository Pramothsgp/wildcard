import { expect, test } from "bun:test";
import { cleanName } from "./names.ts";

test("names are trimmed and squashed, and must be 2 to 40 characters", () => {
  expect(cleanName("  Ada   Lovelace ")).toBe("Ada Lovelace");
  expect(cleanName("A\u0007b")).toBe("Ab");
  expect(cleanName("A")).toBe(null);
  expect(cleanName("   ")).toBe(null);
  expect(cleanName("x".repeat(41))).toBe(null);
  expect(cleanName(42)).toBe(null);
});
