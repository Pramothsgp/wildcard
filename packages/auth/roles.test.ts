import { expect, test } from "bun:test";
import { roleForNewUser } from "./roles.ts";

const admins = new Set(["boss@example.com"]);

test("normal users get the user role", () => {
  expect(roleForNewUser({ email: "a@example.com", emailVerified: false }, admins)).toBe("user");
  expect(roleForNewUser({ email: "a@example.com", emailVerified: true }, admins)).toBe("user");
});

test("admin email gets admin only when verified", () => {
  expect(roleForNewUser({ email: "Boss@Example.com ", emailVerified: true }, admins)).toBe("admin");
});

test("unverified sign-up with an admin email is refused", () => {
  expect(roleForNewUser({ email: "boss@example.com", emailVerified: false }, admins)).toBe("refuse");
  expect(roleForNewUser({ email: "boss@example.com" }, admins)).toBe("refuse");
});

test("look-alike domains are not admins", () => {
  expect(roleForNewUser({ email: "boss@example.com.evil.io", emailVerified: true }, admins)).toBe(
    "user",
  );
});
