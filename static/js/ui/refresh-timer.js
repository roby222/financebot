import { REFRESH } from "../core/network.js";
import { state } from "../core/state.js";
import { refreshAll, refreshSignals } from "../features/etf/refresh.js";
import { toast } from "./toast.js";
import { t } from "../core/i18n.js";

/* ═══════════════════════════════════════════════════════════
   COUNTDOWN
═══════════════════════════════════════════════════════════ */

const CIRC = 47.1;
function setRing(sec) {
  const offset = CIRC * (1 - sec / REFRESH);
  document.getElementById("ring-prog").style.strokeDashoffset = offset;
  document.getElementById("cd-lbl").textContent = sec + "s";
}

function resetCountdown() {
  clearInterval(state.cdTimer);
  state.countdown = REFRESH;
  setRing(state.countdown);
  state.cdTimer = setInterval(() => {
    state.countdown--;
    setRing(state.countdown);
    if (state.countdown <= 0) {
      refreshAll();
      state.countdown = REFRESH;
    }
  }, 1000);
}

async function manualRefresh() {
  clearInterval(state.cdTimer);
  state.countdown = REFRESH;
  setRing(state.countdown);
  toast(t("toast_refreshing"));
  await refreshAll();
  if (state.currentTab === "signals" && state.sigLoaded) refreshSignals(true);
  resetCountdown();
}

export { manualRefresh, resetCountdown };
