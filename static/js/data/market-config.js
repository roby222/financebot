/* ═══════════════════════════════════════════════════════════
   MACRO BENCHMARK TICKERS
═══════════════════════════════════════════════════════════ */
// Calcola il ticker ICE Brent front-month su Yahoo Finance (es. BZM26.NYM per giugno 2026)
// Il front-month Brent è solitamente 2 mesi in avanti rispetto al mese corrente
function brentFrontMonth() {
  const codes = ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"];
  const now = new Date();
  let m = now.getMonth() + 3; // 0-based +1 per mese reale +2 per front-month
  let y = now.getFullYear();
  if (m > 12) {
    m -= 12;
    y++;
  }
  return `BZ${codes[m - 1]}${String(y).slice(2)}.NYM`;
}

const MACRO_TICKERS = [
  { id: "brent", yf: brentFrontMonth(), label: "Brent" },
  { id: "gold", yf: "GC=F", label: "Gold" },
  {
    id: "copper",
    yf: "HG=F",
    label: "Rame",
    scale: 2204.62,
    unit: "$/t",
  }, // HG=F in $/lb → ×2204.62 = $/t
  { id: "spy", yf: "^GSPC", label: "S&P500" },
  { id: "vix", yf: "^VIX", label: "VIX" },
];

// Sanity bounds [min, max] — se il prezzo è fuori range, il dato è spazzatura
const MACRO_BOUNDS = {
  brent: [20, 300], // USD/barile
  gold: [500, 8000], // USD/oz
  copper: [3000, 25000], // USD/t (HG=F $/lb × 2204.62)
  spy: [500, 20000], // livello indice S&P500
  vix: [5, 150], // livello VIX
};

/* ═══════════════════════════════════════════════════════════
   SCENARIO WEIGHTS  driver → score adjustment per scenario
   Range: -0.5 (bearish) to +0.5 (bullish)
═══════════════════════════════════════════════════════════ */
// Calibrato sul contesto Iran-USA: il driver chiave è ENERGIA (Stretto di Hormuz)
const SCENARIO_WEIGHTS = {
  // Attacco militare, chiusura Hormuz, escalation Iran-USA
  escalation: {
    PAURA: +0.45,
    METALLI: +0.25,
    FOOD: +0.1,
    ENERGIA: +0.5,
    GEO: +0.2,
    CICLO: -0.25,
    EQUITY: -0.4,
    TECH: -0.4,
    INFRA: -0.1,
  },
  // Diplomazia, accordo nucleare, de-tensione
  tregua: {
    PAURA: -0.35,
    METALLI: -0.15,
    FOOD: -0.1,
    ENERGIA: -0.3,
    GEO: +0.15,
    CICLO: +0.3,
    EQUITY: +0.4,
    TECH: +0.3,
    INFRA: +0.15,
  },
  // Tensione latente, notizie contraddittorie, mercato nervoso
  volatile: {
    PAURA: +0.15,
    METALLI: +0.1,
    FOOD: +0.05,
    ENERGIA: +0.2,
    GEO: +0.05,
    CICLO: -0.15,
    EQUITY: -0.15,
    TECH: -0.2,
    INFRA: 0,
  },
  // Nessun aggiustamento: segnale puramente tecnico
  neutro: {
    PAURA: 0,
    METALLI: 0,
    FOOD: 0,
    ENERGIA: 0,
    GEO: 0,
    CICLO: 0,
    EQUITY: 0,
    TECH: 0,
    INFRA: 0,
  },
};

export { MACRO_BOUNDS, MACRO_TICKERS, SCENARIO_WEIGHTS };
