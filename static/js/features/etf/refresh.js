import { renderMacroBar } from "./macro-bar.js";
import {
  fetchHistorical,
  fetchLive,
  fetchMacro,
} from "../../services/market-data.js";
import { pMap } from "../../core/async.js";
import { allItems } from "./watchlist-store.js";
import { state } from "../../core/state.js";
import { render } from "./table.js";
import { renderSignalsTable } from "./table.js";
import { checkSignalChanges } from "./signal-log.js";

async function refreshAll() {
  await fetchMacro();
  renderMacroBar();
  const results = await pMap(allItems(), fetchLive, 5);
  const anyOk = results.some((q) => q != null);
  results.forEach((q) => {
    if (q) state.quotes[q.id] = q;
  });
  if (anyOk) {
    document.getElementById("last-upd").textContent =
      "Agg. " + new Date().toLocaleTimeString("it-IT");
  }
  render();
}

async function refreshSignals(force = false) {
  if (state.sigFetching) return;
  if (state.sigLoaded && !force) return;
  state.sigFetching = true;
  const bar = document.getElementById("sig-load-bar");
  bar.classList.add("active");
  document.getElementById("sig-status").textContent =
    "Recupero dati storici (3 mesi)…";
  renderSignalsTable(); // show spinners

  const items = allItems();
  let done = 0;
  await pMap(
    items,
    async (item) => {
      const h = await fetchHistorical(item);
      // Always write to cache — even if null — so the row exits loading state
      state.signalCache[item.id] = h || {
        pv: null,
        rsiV: null,
        macdH: null,
        bb: null,
        sma50: null,
      };
      done++;
      document.getElementById("sig-status").textContent =
        `Caricamento ${done}/${items.length}…`;
      renderSignalsTable();
    },
    5,
  );

  state.sigLoaded = true;
  state.sigFetching = false;
  bar.classList.remove("active");
  document.getElementById("sig-status").textContent =
    `RSI(14) · MACD(12/26/9) · Bollinger(20/2σ) · SMA50 · Pivot Points — ${new Date().toLocaleTimeString("it-IT")}`;
  checkSignalChanges();
}

export { refreshAll, refreshSignals };
