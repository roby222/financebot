import test from "node:test";
import assert from "node:assert/strict";
import { proxiedFetch, PROXY_LAST_ERROR } from "../static/js/core/network.js";
import { pMap } from "../static/js/core/async.js";
import { btp_fetchBI } from "../static/js/services/btp-data.js";

test("proxy failover preserves POST method, body, and headers", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    calls.push({ url, opts });
    return new Response("{}", { status: calls.length === 1 ? 503 : 200 });
  });
  const response = await proxiedFetch("https://charts.borsaitaliana.it/test", {
    method: "POST",
    body: '{"request":1}',
    headers: { "Content-Type": "application/json" },
  });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].opts.method, "POST");
  assert.equal(calls[1].opts.body, '{"request":1}');
  assert.equal(PROXY_LAST_ERROR, null);
});
test("exhausted proxies expose the error and recover on the next request", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 502 }),
  );
  await assert.rejects(
    proxiedFetch("https://query1.finance.yahoo.com/test"),
    /502/,
  );
  assert.equal(PROXY_LAST_ERROR, "HTTP 502");
  globalThis.fetch = async () => new Response("{}");
  await proxiedFetch("https://query1.finance.yahoo.com/test");
  assert.equal(PROXY_LAST_ERROR, null);
});
test("bounded concurrency preserves order and never exceeds its limit", async () => {
  let active = 0,
    peak = 0;
  const results = await pMap(
    [1, 2, 3, 4, 5],
    async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 6 - n));
      active--;
      return n * 2;
    },
    2,
  );
  assert.deepEqual(results, [2, 4, 6, 8, 10]);
  assert.equal(peak, 2);
  assert.deepEqual(await pMap([], () => assert.fail("no calls")), []);
});
test("BTP HTML fallback recognizes explicit positive changes when the JSON endpoint is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) =>
    url.includes("?btp=")
      ? new Response("", { status: 404 })
      : new Response(
          'Prezzo Ultimo Contratto</strong><span class="t-text -right">98,25</span> Var %</strong><span class="t-text -right">+0,54</span>',
        ),
  );
  assert.deepEqual(await btp_fetchBI("IT0005668238"), {
    price: 98.25,
    pct: 0.54,
  });
});
