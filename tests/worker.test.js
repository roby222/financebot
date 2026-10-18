import test from "node:test";
import assert from "node:assert/strict";
import worker, { biCell, itNum } from "../proxy-worker/worker.js";

test("Italian prices and signed variations are parsed without losing their sign", () => {
  assert.equal(itNum("1.234,56"), 1234.56);
  for (const [raw, expected] of [
    ["+0,54", 0.54],
    ["-0,54", -0.54],
    ["0,00", 0],
  ]) {
    assert.equal(
      biCell(
        `Var %</strong></td><td><span class="t-text -right">${raw}</span>`,
        "Var %",
      ),
      expected,
    );
  }
  assert.equal(biCell("missing", "Var %"), null);
});
test("worker rejects unsupported hosts and handles preflight without network", async () => {
  assert.equal(
    (
      await worker.fetch(
        new Request("https://worker.test/?url=https://example.com"),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://worker.test/", { method: "OPTIONS" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await worker.fetch(new Request("https://worker.test/"))).status,
    400,
  );
});
