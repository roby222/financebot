import { state } from "../core/state.js";
import { render } from "../features/etf/table.js";
import { refreshSignals } from "../features/etf/refresh.js";
import { sm_onTabOpen } from "../features/semis/monitor.js";
import { mc_onTabOpen } from "../features/macro/monitor.js";
import { bv_onTabOpen } from "../features/bonds/valuation.js";
import { btp_onTabOpen } from "../features/btp/portfolio.js";

/* ═══════════════════════════════════════════════════════════
   RENDER DISPATCHER
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════════ */

function switchTab(tab) {
  state.currentTab = tab;
  const tabs = ["signals", "btp", "semis", "macro", "bond"];
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    b.classList.toggle("active", tabs[i] === tab);
  });
  tabs.forEach((t) => {
    document.getElementById(`view-${t}`).classList.toggle("active", t === tab);
  });
  // La barra di ricerca globale (+ Aggiungi) opera sulla watchlist ETF: nascosta sulla
  // tab BTP per evitare di aggiungere per sbaglio un ISIN BTP alla lista ETF invece
  // che con il pulsante dedicato "＋ Aggiungi BTP" dentro la scheda.
  const addWrap = document.querySelector(".add-wrap");
  if (addWrap) addWrap.style.display = tab === "btp" ? "none" : "";
  if (tab === "signals" && !state.sigLoaded && !state.sigFetching)
    refreshSignals();
  else if (tab === "semis") sm_onTabOpen();
  else if (tab === "macro") mc_onTabOpen();
  else if (tab === "bond") bv_onTabOpen();
  else if (tab === "btp") btp_onTabOpen();
  else render();
}

export { switchTab };
