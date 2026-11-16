import { expect, test } from "bun:test";
import { parseServices } from "./scaffold.ts";

test("parses service lines, skipping comments and blanks", () => {
  expect(parseServices("# services\ngame web realtime\n\nadmin admin\nsite\n")).toEqual([
    { name: "game", kind: "web" },
    { name: "admin", kind: "admin" },
    { name: "site", kind: "web" },
  ]);
});
