import { MACRO_TICKERS } from "../../data/market-config.js";
import { state } from "../../core/state.js";
import { t } from "../../core/i18n.js";
import { renderSignalsTable } from "./table.js";
import { storage } from "../../core/storage.js";

/* ─── renderMacroBar ─────────────────────────────────────── */
function renderMacroBar() {
  const container = document.getElementById("macro-items");
  if (!container) return;
  container.innerHTML = MACRO_TICKERS.map((m) => {
    const d = state.macroData[m.id];
    if (!d)
      return `<span class="macro-item"><span class="mi-label">${m.emoji} ${m.label}</span> <span class="mi-price mi-pct" style="color:var(--muted)">…</span></span>`;
    if (d.err || d.price == null)
      return `<span class="macro-item" title="Dato non disponibile o fuori range"><span class="mi-label">${m.emoji} ${m.label}</span> <span class="mi-price" style="color:var(--orange)">⚠️ N/D</span></span>`;
    const pctStr =
      d.pct != null
        ? ` <span class="mi-pct ${d.pct >= 0 ? "up" : "down"}">${d.pct >= 0 ? "+" : ""}${(d.pct * 100).toFixed(2)}%</span>`
        : "";
    const priceStr =
      m.id === "vix"
        ? d.price.toFixed(2)
        : d.price.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    const unitStr = d.unit ? ` <span class="mi-label">${d.unit}</span>` : "";
    return `<span class="macro-item"><span class="mi-label">${m.emoji} ${m.label}</span> <span class="mi-price">${priceStr}</span>${unitStr}${pctStr}</span>`;
  }).join("");
  const badge = document.getElementById("regime-badge");
  if (badge) {
    const MAP = {
      "risk-on": ["regime-risk-on", "📈 Risk-On"],
      "risk-off": ["regime-risk-off", "🛡️ Risk-Off"],
      volatile: ["regime-volatile", "😵 Volatile"],
    };
    const [cls, label] = MAP[state.macroRegime] || [
      "regime-unknown",
      t("regime_unknown"),
    ];
    badge.className = `regime-badge ${cls}`;
    badge.textContent = label;
  }
  // Auto-sync scenario al regime rilevato (solo se utente non ha fatto override manuale)
  if (
    !state.scenarioManualOverride &&
    state.macroRegime &&
    REGIME_TO_SCENARIO[state.macroRegime]
  ) {
    applyScenario(REGIME_TO_SCENARIO[state.macroRegime]);
  }
}

/* ─── setScenario ────────────────────────────────────────── */
const REGIME_TO_SCENARIO = {
  "risk-on": "neutro",
  "risk-off": "escalation",
  volatile: "volatile",
};

function applyScenario(s) {
  // applica senza settare l'override manuale (usato dall'auto-sync)
  state.scenario = s;
  document
    .querySelectorAll(".scen-btn")
    .forEach((b) => b.classList.remove("active"));
  const btn = document.getElementById(`scen-${state.scenario}`);
  if (btn) btn.classList.add("active");
  if (state.sigLoaded) renderSignalsTable();
}

function setScenario(s) {
  // Toggle: cliccando lo scenario attivo si torna a Neutro
  state.scenarioManualOverride = true;
  state.scenario = state.scenario === s && s !== "neutro" ? "neutro" : s;
  storage.setItem("fpb_scenario", state.scenario);
  document
    .querySelectorAll(".scen-btn")
    .forEach((b) => b.classList.remove("active"));
  const btn = document.getElementById(`scen-${state.scenario}`);
  if (btn) btn.classList.add("active");
  if (state.sigLoaded) renderSignalsTable();
}

export { renderMacroBar, setScenario };
