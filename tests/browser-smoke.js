import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";

const root = resolve("static");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  const relative = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  ).replace(/^\/financebot\//, "");
  const file = resolve(root, relative || "index.html");
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/financebot/`;
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {},
);
const errors = [];
const prices = Array.from(
  { length: 90 },
  (_, i) => 100 + i * 0.2 + Math.sin(i),
);
const timestamps = prices.map(
  (_, i) => Math.floor(Date.now() / 1000) - (90 - i) * 86400,
);
const market = {
  chart: {
    result: [
      {
        meta: {
          currency: "EUR",
          regularMarketPrice: 118,
          chartPreviousClose: 117,
          previousClose: 117,
          regularMarketVolume: 150000,
          regularMarketDayHigh: 119,
          regularMarketDayLow: 116,
          regularMarketOpen: 117,
        },
        timestamp: timestamps,
        indicators: {
          quote: [
            {
              close: prices,
              open: prices,
              high: prices.map((x) => x + 1),
              low: prices.map((x) => x - 1),
              volume: prices.map(() => 100000),
            },
          ],
        },
      },
    ],
    error: null,
  },
};
async function fixture(route) {
  const url = new URL(route.request().url());
  if (url.origin === new URL(base).origin) return route.continue();
  const target = url.searchParams.get("url") || url.href;
  let body = market,
    type = "application/json";
  if (url.searchParams.has("btp"))
    body = { isin: url.searchParams.get("btp"), price: 98.25, pct: 0.54 };
  else if (url.searchParams.has("spread")) body = { spread: 105 };
  else if (target.includes("/finance/search"))
    body = {
      quotes: [
        {
          symbol: "TEST.MI",
          longname: "Test ETF",
          quoteType: "ETF",
          exchange: "MIL",
        },
      ],
    };
  else if (target.includes("ChartWService"))
    body = {
      d: timestamps.map((t, i) => [
        t * 1000,
        prices[i],
        prices[i],
        prices[i] + 1,
        prices[i] - 1,
      ]),
    };
  else if (target.includes("news.google.com")) {
    body =
      "<rss><channel><item><title>Fixture market update</title><link>https://example.org/news</link><pubDate>Sun, 18 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>";
    type = "application/xml";
  } else if (target.includes("data.sec.gov"))
    body = {
      units: {
        USD: [{ form: "10-Q", fp: "Q1", end: "2026-06-30", val: 1000000 }],
      },
    };
  else if (target.includes("api.github.com"))
    body = { stargazers_count: 5000, forks_count: 500 };
  await route.fulfill({
    status: 200,
    contentType: type,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
async function makePage({
  storage = {},
  blocked = false,
  mobile = false,
  live = false,
} = {}) {
  const context = await browser.newContext({
    locale: "it-IT",
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    ({ storage, blocked }) => {
      if (blocked)
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Blocked", "SecurityError");
          },
        });
      else if (!sessionStorage.getItem("fixtureSeeded")) {
        for (const [key, value] of Object.entries(storage))
          localStorage.setItem(key, value);
        sessionStorage.setItem("fixtureSeeded", "1");
      }
    },
    { storage, blocked },
  );
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      errors.push(message.text());
  });
  if (!live) await page.route("**/*", fixture);
  await page.goto(base);
  return { page, context };
}
const action = (page, name, arg) =>
  page.locator(
    `[data-action="${name}"]${arg === undefined ? "" : `[data-arg-0="${arg}"]`}`,
  );
async function ready(page) {
  await page.locator("#sig-tbody tr").first().waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#sig-load-bar").classList.contains("active"),
  );
}
async function selectTab(page, tab) {
  await action(page, "switchTab", tab).click();
  await page.locator(`#view-${tab}.active`).waitFor();
}
try {
  const { page, context } = await makePage();
  await ready(page);
  const initialRows = await page.locator("#sig-tbody tr").count();
  assert.ok(initialRows >= 18);
  await action(page, "sortBy", "price").click();
  await action(page, "setScenario", "volatile").click();
  await action(page, "openDetail").first().click();
  await page.locator("#detail-overlay:not(.hidden)").waitFor();
  await page.locator("#detail-loading.hidden").waitFor({ state: "attached" });
  await action(page, "setDetailPeriod", "3mo").click();
  await action(page, "closeDetail").click();
  await action(page, "openHelp").click();
  await action(page, "showSection", "rsi").click();
  await page.locator("#sec-rsi.active").waitFor();
  await page.keyboard.press("Escape");
  await action(page, "toggleLang").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("fpb_lang")),
    "en",
  );
  await action(page, "toggleLang").click();
  // Autocomplete must act before blur removes its dynamic items.
  await page.locator("#sym-input").fill("TEST");
  await page.locator(".ac-item").first().waitFor();
  await page.locator(".ac-item").first().click();
  await page.waitForFunction(() =>
    JSON.parse(localStorage.getItem("fpb_extra") || "[]").some(
      (i) => i.id === "TEST.MI",
    ),
  );
  await action(page, "removeItem", "TEST.MI").click();
  assert.equal(await page.locator("#sig-tbody tr").count(), initialRows);
  const download = page.waitForEvent("download");
  await action(page, "exportList").click();
  assert.ok((await download).suggestedFilename().endsWith(".json"));
  await page.locator("#import-input").setInputFiles({
    name: "watchlist.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        watchlist: [{ id: "IMPORTED.MI", yf: "IMPORTED.MI", name: "Imported" }],
      }),
    ),
  });
  await page.waitForFunction(() =>
    JSON.parse(localStorage.getItem("fpb_extra") || "[]").some(
      (i) => i.id === "IMPORTED.MI",
    ),
  );
  assert.equal(await page.locator("#sig-tbody tr").count(), initialRows + 1);
  // Every lazy feature opens and renders from the same fixture transport.
  for (const [tab, prefix, key] of [
    ["semis", "sm", "semis_ai_monitor_v2"],
    ["macro", "mc", "macro_monitor_v1"],
  ]) {
    await selectTab(page, tab);
    await page.waitForFunction(
      (key) =>
        Boolean(JSON.parse(localStorage.getItem(key) || "{}").lastUpdate),
      key,
    );
    const edit = action(page, `${prefix}_toggleEdit`).first();
    const id = await edit.getAttribute("data-arg-0");
    await edit.click();
    await page
      .locator(`#${prefix}-note-${id}`)
      .fill("Persisted smoke-test note");
    await action(page, `${prefix}_saveInd`, id).click();
    assert.equal(
      await page.evaluate(
        ({ key, id }) =>
          JSON.parse(localStorage.getItem(key)).indicators.find(
            (i) => i.id === id,
          ).note,
        { key, id },
      ),
      "Persisted smoke-test note",
    );
  }
  await selectTab(page, "bond");
  await action(page, "bv_openEdit", "cpi").click();
  await page.locator("#bv-edit-inp").fill("2.1");
  await action(page, "bv_saveEdit", "cpi").click();
  await selectTab(page, "btp");
  await page.waitForFunction(
    () =>
      document.querySelector("#btp-refreshBtn").textContent === "Aggiorna ora",
  );
  assert.equal(await page.locator(".btp-data-row").count(), 13);
  await action(page, "btp_toggleAddForm").first().click();
  await page.locator("#btp-add-isin").fill("IT0000000000");
  await page.locator("#btp-add-name").fill("Regression test bond");
  await page.locator("#btp-add-coupon").fill("4");
  await page.locator("#btp-add-mat").fill("2036-10-18");
  await action(page, "btp_addBond").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".btp-data-row").length === 14,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await action(page, "btp_removeBond", "13").click();
  assert.equal(await page.locator(".btp-data-row").count(), 13);
  await action(page, "btp_setSort", "price").click();
  await action(page, "btp_openEdit", "0").click();
  await page.locator("#btp-ap-inp-0").fill("97.5");
  await action(page, "btp_saveAp", "0").click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("btp_italia_v1")).bonds[0].ap,
    ),
    97.5,
  );
  await action(page, "btp_openChart", "0").click();
  await page.locator("#detail-loading.hidden").waitFor({ state: "attached" });
  await action(page, "btp_setChartPeriod", "1y").click();
  await action(page, "closeDetail").click();
  await page.reload();
  await ready(page);
  await selectTab(page, "btp");
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("btp_italia_v1")).bonds[0].ap,
    ),
    97.5,
  );
  await mkdir("output/playwright", { recursive: true });
  await page.screenshot({
    path: "output/playwright/btp-desktop.png",
    fullPage: true,
  });
  await context.close();
  console.log(
    "PASS desktop: tabs, signals, charts, help, language, watchlist, BTP persistence",
  );
  for (const config of [
    {
      storage: {
        fpb_extra: "{",
        fpb_hidden: "{}",
        semis_ai_monitor_v2: "{",
        macro_monitor_v1: "{",
        btp_italia_v1: "{",
      },
    },
    { blocked: true },
    { mobile: true },
  ]) {
    const { page, context } = await makePage(config);
    await ready(page);
    for (const tab of ["btp", "semis", "macro", "bond", "signals"])
      await selectTab(page, tab);
    if (config.mobile) {
      await page.screenshot({
        path: "output/playwright/etf-mobile.png",
        fullPage: true,
      });
      assert.ok(await page.locator(".tab-btn").first().isVisible());
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        "mobile page must not overflow horizontally",
      );
    }
    await context.close();
    console.log(
      "PASS",
      config.blocked
        ? "blocked storage"
        : config.mobile
          ? "mobile"
          : "malformed storage",
    );
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("All browser smoke checks passed.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
