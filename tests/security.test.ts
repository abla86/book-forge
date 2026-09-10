import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PasswordService, BookAccessControl, type AuthUser } from "../src/lib/security";

const author: AuthUser = {
  id: "author-1",
  name: "Author",
  email: "author@example.test",
  role: "AUTHOR",
  subscriptionPlan: "PRO",
};

test("password hashing never stores plaintext and verifies correctly", () => {
  const password = "A-long-development-password-2026!";
  const hash = PasswordService.hash(password);
  assert.notEqual(hash, password);
  assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$/);
  assert.equal(hash.split("$").length, 6);
  assert.equal(PasswordService.verify(password, hash), true);
  assert.equal(PasswordService.verify("wrong-password", hash), false);
});

test("password verification rejects malformed hashes", () => {
  assert.equal(PasswordService.verify("A-long-development-password-2026!", "not-a-valid-hash"), false);
  assert.equal(PasswordService.verify("A-long-development-password-2026!", "scrypt$1$2$3$salt$hash"), false);
});

test("password hashing enforces the password length policy", () => {
  assert.throws(() => PasswordService.hash("too-short"));
  assert.equal(PasswordService.verify("too-short", PasswordService.hash("A-long-development-password-2026!")), false);
});

test("author cannot access another user's project", () => {
  const result = BookAccessControl.validateAccess(author, "author-2", "read");
  assert.equal(result.allowed, false);
});

test("author can access their own project", () => {
  const result = BookAccessControl.validateAccess(author, "author-1", "write");
  assert.equal(result.allowed, true);
});

test("admin functions are denied to ordinary authors", () => {
  const result = BookAccessControl.validateAccess(author, "author-1", "admin");
  assert.equal(result.allowed, false);
});

test("founder-only operations reject non-founder users", () => {
  const result = BookAccessControl.requireFounder(author);
  assert.equal(result.allowed, false);
});

test("API identity is session-derived and never trusted from x-user headers", () => {
  const server = fs.readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(server, /headers\[\s*["']x-user-id["']\s*\]/);
  assert.doesNotMatch(server, /headers\[\s*["']x-user-role["']\s*\]/);
  assert.doesNotMatch(server, /headers\[\s*["']x-user-name["']\s*\]/);
  assert.doesNotMatch(server, /headers\[\s*["']x-user-email["']\s*\]/);
  assert.match(server, /req\.authUser\s*=\s*sanitizeUser\(user\)/);
});

test("server has a single auth-me endpoint and no legacy token fallback", () => {
  const server = fs.readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.equal((server.match(/app\.get\("\/api\/auth\/me"/g) || []).length, 1);
  assert.doesNotMatch(server, /token\.startsWith\("token-"\)/);
  assert.doesNotMatch(server, /userId\s*=\s*token\.replace\("token-"/);
});
