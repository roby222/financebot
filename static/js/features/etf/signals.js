import { state } from "../../core/state.js";
import { SCENARIO_WEIGHTS } from "../../data/market-config.js";
import { t } from "../../core/i18n.js";

/* driver regime: how much boost/penalty based on macro regime vs ETF's ideal regime */
function calcRegimeBoost(itemRegime) {
  if (!state.macroRegime || !itemRegime) return 0;
  const aligns = {
    "risk-on": { "risk-on": +0.2, "risk-off": -0.2, neutro: 0, conflict: -0.1 },
    "risk-off": {
      "risk-off": +0.2,
      "risk-on": -0.2,
      neutro: 0,
      conflict: +0.1,
    },
    volatile: {
      neutro: +0.05,
      "risk-off": +0.1,
      "risk-on": -0.1,
      conflict: +0.05,
    },
  };
  return aligns[state.macroRegime]?.[itemRegime] ?? 0;
}

/* ─── Fix 1: Hysteresis ─────────────────────────────────────
   Il segnale cambia solo se lo score si sposta di almeno
   HYSTERESIS oltre la soglia precedente (evita flip falsi).    */
const prevScores = {}; // itemId → { score, label }
const HYSTERESIS = 0.08;

/* ─── Fix 4: Boost diretto macro → driver ───────────────────
   Gold >+1%  → METALLI/PAURA +0.15   Gold <-1%  → -0.15
   Oil  <-2%  → ENERGIA -0.15         Oil  >+2%  → +0.15     */
function macroDriverBoost(driver) {
  const goldPct = state.macroData.gold?.pct ?? 0;
  const brentPct = state.macroData.brent?.pct ?? 0;
  let boost = 0;
  if (driver === "METALLI" || driver === "PAURA") {
    if (goldPct > 0.01) boost += 0.15;
    else if (goldPct < -0.01) boost -= 0.15;
  }
  if (driver === "ENERGIA") {
    if (brentPct < -0.02) boost -= 0.15;
    else if (brentPct > 0.02) boost += 0.15;
  }
  return boost;
}

function compositeSignal(
  rsiV,
  macdH,
  price,
  bb,
  sma50,
  PP,
  driver,
  itemRegime,
  itemId,
) {
  const votes = [];
  if (rsiV !== null) {
    if (rsiV < 30) votes.push(2);
    else if (rsiV < 45) votes.push(1);
    else if (rsiV > 70) votes.push(-2);
    else if (rsiV > 55) votes.push(-1);
    else votes.push(0);
  }
  // Fix 3: MACD peso ridotto (±0.5 invece di ±1) — indicatore lagging, non deve dominare
  if (macdH !== null) votes.push(macdH > 0 ? 0.5 : -0.5);
  if (bb !== null) {
    if (price <= bb.lower) votes.push(2);
    else if (price >= bb.upper) votes.push(-2);
    else if (price < bb.mid) votes.push(1);
    else votes.push(-1);
  }
  if (sma50 !== null) votes.push(price > sma50 ? 1 : -1);
  if (PP !== null) votes.push(price < PP ? 1 : -1);

  if (!votes.length) return null;
  const techScore = votes.reduce((a, b) => a + b, 0) / votes.length;
  const scenAdj = SCENARIO_WEIGHTS[state.scenario]?.[driver] ?? 0;
  const regimeAdj = calcRegimeBoost(itemRegime);
  const macroBoost = macroDriverBoost(driver);
  // Cap totale aggiustamenti non-tecnici: ±0.20
  // Evita che scenario/regime da soli capovolgano un segnale tecnico chiaramente negativo
  const adjRaw = scenAdj + regimeAdj + macroBoost;
  const adj = Math.max(-0.2, Math.min(0.2, adjRaw));
  const finalScore = techScore + adj;

  // Fix 2: thresholds più larghi in regime Volatile → zona HOLD più ampia
  const isVol = state.macroRegime === "volatile";
  const tHigh = isVol ? 0.85 : 0.7;
  const tLow = isVol ? 0.35 : 0.25;

  function labelFrom(sc) {
    if (sc >= tHigh)
      return { label: t("sig_buy_strong"), cls: "sig-buy-strong", score: sc };
    if (sc >= tLow) return { label: t("sig_buy"), cls: "sig-buy", score: sc };
    if (sc <= -tHigh)
      return { label: t("sig_sell_strong"), cls: "sig-sell-strong", score: sc };
    if (sc <= -tLow)
      return { label: t("sig_sell"), cls: "sig-sell", score: sc };
    return { label: t("sig_hold"), cls: "sig-hold", score: sc };
  }

  // Downtrend estremo: se prezzo è >12% sotto SMA50, cap a HOLD
  // (RSI oversold + BB inferiore non bastano a giustificare ACCUM in crollo strutturale)
  let cappedScore = finalScore;
  if (sma50 !== null && price < sma50 * 0.88) {
    cappedScore = Math.min(finalScore, tLow - 0.001); // forza al più HOLD
  }

  const newSig = labelFrom(cappedScore);

  // Hysteresis — non cambiare etichetta se variazione < soglia
  if (itemId !== undefined) {
    const prev = prevScores[itemId];
    if (
      prev &&
      prev.label !== newSig.label &&
      Math.abs(cappedScore - prev.score) < HYSTERESIS
    ) {
      return { ...labelFrom(prev.score), score: prev.score };
    }
    prevScores[itemId] = { score: cappedScore, label: newSig.label };
  }

  return { ...newSig, score: cappedScore };
}

export { compositeSignal };
