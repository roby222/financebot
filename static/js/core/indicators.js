/* ═══════════════════════════════════════════════════════════
   TECHNICAL INDICATORS
═══════════════════════════════════════════════════════════ */

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d;
    else losses -= d;
  }
  let avgG = gains / period,
    avgL = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

function calcEMA(arr, span) {
  const k = 2 / (span + 1);
  return arr.reduce((acc, v, i) => {
    if (i === 0) return [v];
    acc.push(v * k + acc[acc.length - 1] * (1 - k));
    return acc;
  }, []);
}

function calcMACD(closes) {
  if (closes.length < 35) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = calcEMA(macdLine.slice(25), 9);
  return macdLine[macdLine.length - 1] - signal[signal.length - 1];
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcBollinger(closes, period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period);
  return { upper: mid + 2 * std, mid, lower: mid - 2 * std };
}

function pivotPoints(H, L, C) {
  const PP = (H + L + C) / 3;
  return {
    PP,
    R1: 2 * PP - L,
    R2: PP + (H - L),
    R3: H + 2 * (PP - L),
    S1: 2 * PP - H,
    S2: PP - (H - L),
    S3: L - 2 * (H - PP),
  };
}

export { calcBollinger, calcEMA, calcMACD, calcRSI, calcSMA, pivotPoints };
