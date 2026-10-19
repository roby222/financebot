import { YF_CHART, proxiedFetch } from "../core/network.js";
import {
  calcBollinger,
  calcMACD,
  calcRSI,
  calcSMA,
  pivotPoints,
} from "../core/indicators.js";
import { MACRO_BOUNDS, MACRO_TICKERS } from "../data/market-config.js";
import { state } from "../core/state.js";

async function fetchChart(ticker, range = "1d", interval = "1m", attempt = 0) {
  // piccolo jitter casuale per distribuire i burst
  if (attempt === 0)
    await new Promise((r) => setTimeout(r, Math.random() * 400));
  try {
    const url = `${YF_CHART}${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&_=${Date.now()}`;
    const r = await proxiedFetch(url, { cache: "no-store" });
    const j = await r.json();
    return j?.chart?.result?.[0] ?? null;
  } catch (e) {
    // proxiedFetch solleva su qualsiasi non-ok: il 429 va riconosciuto dal messaggio
    const is429 = /\b429\b/.test(e.message || "");
    const delay = is429
      ? 3000 + Math.random() * 2000 // 429 → aspetta 3-5s
      : 800 * (attempt + 1); // altro errore → back-off normale
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, delay));
      return fetchChart(ticker, range, interval, attempt + 1);
    }
    return null;
  }
}

function marketState(result) {
  if (!result?.meta) return "CLOSED";
  const now = Math.floor(Date.now() / 1000);
  const tp = result.meta.currentTradingPeriod;
  if (!tp) return "CLOSED";
  if (tp.regular && now >= tp.regular.start && now <= tp.regular.end)
    return "REGULAR";
  if (tp.pre && now >= tp.pre.start && now <= tp.pre.end) return "PRE";
  if (tp.post && now >= tp.post.start && now <= tp.post.end) return "POST";
  return "CLOSED";
}

/* GBp (pence) → GBP normaliser: Yahoo Finance returns some LSE ETFs in pence */
function normalise(value, currency) {
  return currency === "GBp" ? value * 0.01 : value;
}
function displayCcy(currency) {
  return currency === "GBp" ? "GBP" : currency || "—";
}

async function fetchLive(item) {
  try {
    const res = await fetchChart(item.yf, "1d", "1m");
    if (!res) return null;
    const m = res.meta;
    const ccy = m.currency || "—";
    const sc = (v) => (v != null ? normalise(v, ccy) : null);
    const price = sc(m.regularMarketPrice);
    const prev = sc(m.previousClose ?? m.chartPreviousClose);
    const chg = price != null && prev != null ? price - prev : null;
    const pct = prev ? chg / prev : null;
    return {
      id: item.id,
      yf: item.yf,
      name: item.name,
      price,
      prev,
      change: chg,
      pct,
      currency: displayCcy(ccy),
      mktState: marketState(res),
      high: sc(m.regularMarketDayHigh),
      low: sc(m.regularMarketDayLow),
      open: sc(m.regularMarketOpen),
      vol: m.regularMarketVolume,
      w52h: sc(m.fiftyTwoWeekHigh),
      w52l: sc(m.fiftyTwoWeekLow),
    };
  } catch {
    return null;
  }
}

async function fetchHistoricalRaw(ticker, range) {
  try {
    const res = await fetchChart(ticker, range, "1d");
    if (!res) return null;
    const ccy = res.meta?.currency || "—";
    const q = res.indicators?.quote?.[0];
    // Allinea closes/highs/lows per indice: filtra solo le barre dove TUTTI e tre sono presenti
    // (closes filtrato e highs/lows non filtrati causano offset → pivot sbagliati)
    const rawC = q?.close || [],
      rawH = q?.high || [],
      rawL = q?.low || [],
      rawV = q?.volume || [];
    const closes = [],
      highs = [],
      lows = [],
      volumes = [];
    for (let i = 0; i < rawC.length; i++) {
      if (rawC[i] != null && rawH[i] != null && rawL[i] != null) {
        closes.push(normalise(rawC[i], ccy));
        highs.push(normalise(rawH[i], ccy));
        lows.push(normalise(rawL[i], ccy));
        volumes.push(rawV[i] ?? 0);
      }
    }
    if (closes.length < 10) return null;
    return { closes, highs, lows, volumes };
  } catch {
    return null;
  }
}

async function fetchHistorical(item) {
  const ranges = ["3mo", "6mo", "1mo"];
  let raw = null;
  for (const range of ranges) {
    raw = await fetchHistoricalRaw(item.yf, range);
    if (raw) break;
  }
  if (!raw) return null;

  const { closes, highs, lows, volumes } = raw;
  const price = closes[closes.length - 1];
  const prevH = highs[highs.length - 2];
  const prevL = lows[lows.length - 2];
  const prevC = closes[closes.length - 2];

  let pv = null;
  if (prevH && prevL && prevC) pv = pivotPoints(prevH, prevL, prevC);

  const rsiV = calcRSI(closes);
  const macdH = calcMACD(closes);
  const bb = calcBollinger(closes);
  const sma50 = calcSMA(closes, 50);

  // avg volume — ultimi 20 giorni con volume > 0 (esclusa sessione corrente)
  const recentVols = (volumes || []).filter((v) => v > 0).slice(-21, -1);
  const avgVol =
    recentVols.length > 0
      ? recentVols.reduce((a, b) => a + b, 0) / recentVols.length
      : null;

  // Note: sig is NOT stored here — recalculated live in renderSignalsTable
  // so scenario changes update signals instantly
  return { pv, rsiV, macdH, bb, sma50, avgVol };
}

async function fetchMacro() {
  await Promise.all(
    MACRO_TICKERS.map(async (m) => {
      try {
        const res = await fetchChart(m.yf, "1d", "1m");
        if (!res?.meta) return;
        const rawPrice = res.meta.regularMarketPrice;
        const rawPrev = res.meta.previousClose ?? res.meta.chartPreviousClose;
        const pct = rawPrev ? (rawPrice - rawPrev) / rawPrev : null;
        const price = m.scale ? rawPrice * m.scale : rawPrice; // scala (es. HG=F $/lb → $/t)
        // Sanity check sui bounds (tutti in unità scalata)
        const bounds = MACRO_BOUNDS[m.id];
        if (bounds && (price < bounds[0] || price > bounds[1])) {
          console.warn(
            `[macro] ${m.id}: prezzo ${price} fuori bounds [${bounds}] — scartato`,
          );
          state.macroData[m.id] = {
            price: null,
            pct: null,
            label: m.label,
            err: true,
          };
          return;
        }
        state.macroData[m.id] = {
          price,
          pct,
          label: m.label,
          unit: m.unit,
        };
      } catch {}
    }),
  );
  // Detect regime from macro data
  const goldPct = state.macroData.gold?.pct ?? 0;
  const spyPct = state.macroData.spy?.pct ?? 0;
  const vix = state.macroData.vix?.price ?? 20;
  if (vix > 25 || Math.abs(spyPct) * 100 > 1.5) state.macroRegime = "volatile";
  else if (goldPct > 0.005 && spyPct < 0) state.macroRegime = "risk-off";
  else if (goldPct < 0 && spyPct > 0.005) state.macroRegime = "risk-on";
  else state.macroRegime = "volatile";
}

export { fetchHistorical, fetchLive, fetchMacro };
