import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../static/js/core/storage.js";

test("corrupt or wrong-shaped JSON returns the supplied fallback", () => {
  const data = new Map([
    ["broken", "{"],
    ["wrong", "{}"],
  ]);
  const storage = createStorage(() => ({
    getItem: (key) => data.get(key) ?? null,
  }));
  assert.deepEqual(storage.readJSON("broken", [], Array.isArray), []);
  assert.deepEqual(storage.readJSON("wrong", [], Array.isArray), []);
});
test("blocked browser storage remains usable for the current session", () => {
  const storage = createStorage(() => {
    throw new Error("SecurityError");
  });
  storage.setItem("saved", "hello");
  assert.equal(storage.getItem("saved"), "hello");
  storage.removeItem("saved");
  assert.equal(storage.getItem("saved"), null);
});
test("storage preserves existing formats and keys", () => {
  const data = new Map([["fpb_extra", '[{"id":"TEST"}]']]);
  const storage = createStorage(() => ({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  }));
  assert.deepEqual(storage.readJSON("fpb_extra", [], Array.isArray), [
    { id: "TEST" },
  ]);
  storage.setItem("btp_italia_v1", '{"_v":2}');
  assert.equal(data.get("btp_italia_v1"), '{"_v":2}');
});
