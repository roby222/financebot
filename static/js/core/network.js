import { storage } from "./storage.js";

/* ═══════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
// ⬇ CATENA PROXY CORS — unica per tutte le schede (ETF, BTP, Semis, Macro, Bond/Equity)
// Non esistono piu' proxy pubblici gratuiti affidabili: corsproxy.io richiede una API key
// (risponde 401 senza chiave) e allorigins regge poche richieste in parallelo. Per un
// funzionamento stabile configura il tuo Cloudflare Worker (vedi proxy-worker/worker.js):
//   localStorage.setItem('fpb_proxy','https://TUO-WORKER.workers.dev/?url=')
const PROXY_CUSTOM =
  storage.getItem("fpb_proxy") ||
  "https://fpb-proxy.robe-pisu.workers.dev/?url=";
// Ogni anello e' una funzione url->url perche' i proxy NON concordano sul formato:
// cors.sh vuole il target grezzo, allorigins e il Worker lo vogliono urlencoded.
// api.codetabs.com e corsproxy.io sono stati rimossi: il primo non risponde piu'
// (CORS fallito dopo ~20s), il secondo richiede una API key (401 senza chiave).
const PROXY_FALLBACKS = [
  (u) => "https://proxy.cors.sh/" + u, // target GREZZO — veloce (~250ms per 15 richieste)
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u), // ripiego: regge poche richieste in parallelo
];
const PROXY_CHAIN = [
  ...(PROXY_CUSTOM ? [(u) => PROXY_CUSTOM + encodeURIComponent(u)] : []),
  ...PROXY_FALLBACKS,
];

// Ultimo errore di rete, per distinguere "proxy giu'" da "nessun dato" nella UI
let PROXY_LAST_ERROR = null;

// fetch attraverso la catena: vince il primo proxy che risponde ok
async function proxiedFetch(url, opts = {}, timeoutMs = 12000) {
  let lastErr;
  for (const mk of PROXY_CHAIN) {
    try {
      const r = await fetch(mk(url), {
        ...opts,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) {
        lastErr = new Error("HTTP " + r.status);
        continue;
      }
      PROXY_LAST_ERROR = null;
      return r;
    } catch (e) {
      lastErr = e;
    }
  }
  PROXY_LAST_ERROR = lastErr
    ? lastErr.message || lastErr.name
    : "tutti i proxy hanno fallito";
  throw lastErr || new Error("tutti i proxy hanno fallito");
}
const YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";
const YF_SRCH =
  "https://query2.finance.yahoo.com/v1/finance/search?quotesCount=8&newsCount=0&q=";
const REFRESH = 60;

export {
  PROXY_CUSTOM,
  PROXY_LAST_ERROR,
  REFRESH,
  YF_CHART,
  YF_SRCH,
  proxiedFetch,
};

export const sm_TIMEOUT = 15000;
