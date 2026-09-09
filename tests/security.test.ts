import test from "node:test";
import assert from "node:assert/strict";
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
  assert.match(hash, /^scrypt\$/);
  assert.equal(PasswordService.verify(password, hash), true);
  assert.equal(PasswordService.verify("wrong-password", hash), false);
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
