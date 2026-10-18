import { render } from "./features/etf/table.js";
import { sm_initialized, sm_onTabOpen } from "./features/semis/monitor.js";
import { mc_onTabOpen } from "./features/macro/monitor.js";
import { initActions } from "./ui/actions.js";
import { initAutocomplete } from "./ui/autocomplete.js";
import { initHelp } from "./ui/help.js";
import { state } from "./core/state.js";
import { WATCHLIST_DEFAULT } from "./features/etf/watchlist-store.js";
import { toast } from "./ui/toast.js";
import { applyI18n, t } from "./core/i18n.js";
import { renderSigLog } from "./features/etf/signal-log.js";
import { refreshAll, refreshSignals } from "./features/etf/refresh.js";
import { resetCountdown } from "./ui/refresh-timer.js";

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */

async function init() {
  document.addEventListener("dashboard:languagechange", () => {
    render();
    renderSigLog();
    if (state.currentTab === "semis" && sm_initialized) sm_onTabOpen();
    if (state.currentTab === "macro") mc_onTabOpen();
  });
  initActions();
  initAutocomplete();
  initHelp();
  // Carica watchlist da JSON esterno
  try {
    const res = await fetch(`watchlist.json?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("watchlist.json non è un array");
    state.WATCHLIST = data;
  } catch (e) {
    console.error("Errore caricamento watchlist.json", e);
    state.WATCHLIST = WATCHLIST_DEFAULT;
    toast(t("toast_wl_warn"));
  }
  // Restore scenario button active state from localStorage
  document
    .querySelectorAll(".scen-btn")
    .forEach((b) => b.classList.remove("active"));
  const initBtn = document.getElementById(`scen-${state.scenario}`);
  if (initBtn) initBtn.classList.add("active");
  // apply i18n translations
  applyI18n();
  // render signal log from localStorage (persists across sessions)
  renderSigLog();
  // start on signals tab
  refreshSignals();
  // fetch live data + macro (renders macro bar and detects regime)
  await refreshAll();
  // start auto-refresh
  resetCountdown();
}

init().catch((error) => {
  console.error("Dashboard initialization failed", error);
  toast("Impossibile inizializzare la dashboard", true);
});
