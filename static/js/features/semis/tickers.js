import { proxiedFetch } from "../../core/network.js";
import { sm_TIMEOUT } from "../../core/network.js";
import { storage } from "../../core/storage.js";
import { sm_fetchYahoo } from "../../services/research-data.js";

// ── ticker bar — reference date performance ──
const sm_REF_TS = Math.floor(new Date("2026-04-03T00:00:00Z").getTime() / 1000);
const sm_REF_LBL = "3 apr";
const sm_REF_KEY = "sm_ref_apr3_v1";

async function sm_fetchClose(sym, ts) {
  // fetch 5-day window starting 1 day before target to catch the right session
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?period1=${ts - 86400}&period2=${ts + 86400 * 4}&interval=1d`;
  const r = await proxiedFetch(url, {}, sm_TIMEOUT);
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  const result = j.chart?.result?.[0];
  if (!result) throw new Error("no result");
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  // first session on or after ts
  let idx = timestamps.findIndex((t) => t >= ts);
  if (idx === -1) idx = closes.length - 1;
  const c = closes[idx];
  if (c == null) throw new Error("null close");
  return c;
}

async function sm_loadRefPrices(tickers) {
  const cached = storage.getItem(sm_REF_KEY);
  if (cached) {
    try {
      const p = JSON.parse(cached);
      if (p && Object.keys(p).length >= tickers.length) return p;
    } catch (e) {}
  }
  // fetch all ref closes in parallel
  const results = await Promise.allSettled(
    tickers.map((t) => sm_fetchClose(t.yahoo, sm_REF_TS)),
  );
  const prices = {};
  tickers.forEach((t, i) => {
    if (results[i].status === "fulfilled") prices[t.yahoo] = results[i].value;
  });
  if (Object.keys(prices).length > 0)
    storage.setItem(sm_REF_KEY, JSON.stringify(prices));
  return prices;
}

async function sm_refreshTickers() {
  const tickers = [
    { sym: "NVDA", yahoo: "NVDA" },
    { sym: "AMD", yahoo: "AMD" },
    { sym: "TSM", yahoo: "TSM" },
    { sym: "MU", yahoo: "MU" },
    { sym: "AVGO", yahoo: "AVGO" },
    { sym: "ASML", yahoo: "ASML" },
    { sym: "SK Hynix", yahoo: "000660.KS" },
    { sym: "Samsung", yahoo: "005930.KS" },
  ];
  const host = document.getElementById("sm-tickers");
  // fetch live prices and ref prices in parallel
  const [liveResults, refPrices] = await Promise.all([
    Promise.allSettled(tickers.map((t) => sm_fetchYahoo(t.yahoo))),
    sm_loadRefPrices(tickers).catch(() => ({})),
  ]);
  host.innerHTML = "";
  tickers.forEach((t, i) => {
    const r = liveResults[i];
    const div = document.createElement("div");
    div.className = "sm-tick";
    if (r.status === "fulfilled") {
      const { price, prev } = r.value;
      const chg = ((price - prev) / prev) * 100;
      const cls = chg > 0.1 ? "up" : chg < -0.1 ? "dn" : "flat";
      const sign = chg >= 0 ? "+" : "";
      // ref performance
      let refHtml = "";
      const ref = refPrices[t.yahoo];
      if (ref) {
        const rchg = ((price - ref) / ref) * 100;
        const rcls = rchg > 0.1 ? "up" : rchg < -0.1 ? "dn" : "flat";
        const rsign = rchg >= 0 ? "+" : "";
        refHtml = `<span class="chg-ref ${rcls}" title="dal ${sm_REF_LBL}">${rsign}${rchg.toFixed(1)}%</span>`;
      }
      div.innerHTML = `<span class="sym">${t.sym}</span><span class="px">${price.toFixed(2)}</span><span class="chg ${cls}">${sign}${chg.toFixed(2)}%</span>${refHtml}`;
    } else {
      div.innerHTML = `<span class="sym">${t.sym}</span><span class="px" style="opacity:.4">—</span>`;
    }
    host.appendChild(div);
  });
}

export { sm_refreshTickers };
