import { state } from "../../core/state.js";
import { compositeSignal } from "./signals.js";
import { allItems } from "./watchlist-store.js";
import { arrow, convertPrice, dirCls, fmtN } from "../../core/format.js";
import { toast } from "../../ui/toast.js";
import { t } from "../../core/i18n.js";
import { SIG_LEVEL, fmtSigLabel, loadSigLog } from "./signal-log.js";

/* ─── sortBy / getSortVal ────────────────────────────────── */
function sortBy(col) {
  if (state.sortCol === col) state.sortDir = -state.sortDir;
  else {
    state.sortCol = col;
    state.sortDir = 1;
  }
  renderSignalsTable();
}

function getSortVal(item, col) {
  const q = state.quotes[item.id];
  const s = state.signalCache[item.id];
  switch (col) {
    case "ticker":
      return item.id || "";
    case "name":
      return item.name || "";
    case "driver":
      return item.driver || "";
    case "price":
      return q?.price ?? -Infinity;
    case "pct":
      return q?.pct ?? -Infinity;
    case "signal": {
      if (!s) return -Infinity;
      const live = compositeSignal(
        s.rsiV,
        s.macdH,
        q?.price ?? 0,
        s.bb,
        s.sma50,
        s.pv?.PP,
        item.driver,
        item.regime,
        item.id,
      );
      return live?.score ?? -Infinity;
    }
    case "e1":
      return s?.pv?.S1 ?? -Infinity;
    case "e2":
      return s?.pv ? (s.pv.S1 + s.pv.S2) / 2 : -Infinity;
    case "e3":
      return s?.pv?.S2 ?? -Infinity;
    case "sell":
      return s?.pv?.R1 ?? -Infinity;
    case "target":
      return s?.pv?.R2 ?? -Infinity;
    case "rsi":
      return s?.rsiV ?? -Infinity;
    case "sma": {
      const p = q?.price,
        sma = s?.sma50;
      return p != null && sma != null ? p / sma - 1 : -Infinity;
    }
    case "macd":
      return s?.macdH ?? -Infinity;
    case "vol": {
      const vol = q?.vol,
        avg = s?.avgVol;
      return vol && avg ? vol / avg : -Infinity;
    }
    default:
      return "";
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER — CARDS
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   RENDER — SIGNALS TABLE
═══════════════════════════════════════════════════════════ */

function rsiCls(v) {
  if (v < 30) return "rsi-os2";
  if (v < 45) return "rsi-os1";
  if (v > 70) return "rsi-ob2";
  if (v > 55) return "rsi-ob1";
  return "rsi-neu";
}

function copyRow(id) {
  const item = [...state.WATCHLIST, ...state.extraItems].find(
    (i) => i.id === id,
  );
  if (!item) return;
  const q = state.quotes[id];
  const s = state.signalCache[id];
  const price = q?.price;
  const pct = q?.pct;
  const [cP, dispCcy] = q ? convertPrice(price, q.currency) : [null, "—"];
  const priceStr =
    cP != null
      ? `${cP.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${dispCcy}`
      : "—";
  const pctStr =
    pct != null ? `${pct >= 0 ? "+" : ""}${(pct * 100).toFixed(2)}%` : "—";
  const pv = s?.pv;
  const live =
    s && q
      ? compositeSignal(
          s.rsiV,
          s.macdH,
          price ?? 0,
          s.bb,
          s.sma50,
          pv?.PP ?? null,
          item.driver,
          item.regime,
          item.id,
        )
      : null;
  const vsSma =
    s?.sma50 != null && price != null
      ? `${(price / s.sma50 - 1) * 100 >= 0 ? "+" : ""}${((price / s.sma50 - 1) * 100).toFixed(1)}%`
      : "—";
  const macdStr =
    s?.macdH != null ? `${s.macdH > 0 ? "▲" : "▼"} ${s.macdH.toFixed(4)}` : "—";
  const lines = [
    `Ticker:   ${item.id}`,
    `ETF:      ${item.name}`,
    `Driver:   ${item.driver}`,
    `Prezzo:   ${priceStr}`,
    `Var%:     ${pctStr}`,
    `Segnale:  ${live?.label ?? "—"}`,
    `E1 (S1 30%):    ${pv ? fmtN(pv.S1) : "—"}`,
    `E2 (mid 30%):   ${pv ? fmtN((pv.S1 + pv.S2) / 2) : "—"}`,
    `E3 (S2 40%):    ${pv ? fmtN(pv.S2) : "—"}`,
    `R1 (vendi ≥):   ${pv ? fmtN(Math.min(pv.R1, pv.R2)) : "—"}`,
    `R2 (target):    ${pv ? fmtN(Math.max(pv.R1, pv.R2)) : "—"}`,
    `RSI(14):  ${s?.rsiV != null ? s.rsiV.toFixed(0) : "—"}`,
    `vs SMA50: ${vsSma}`,
    `MACD:     ${macdStr}`,
  ];
  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => toast(t("toast_copied", { id: item.id })))
    .catch(() => toast(t("toast_copy_fail")));
}

function renderSignalsTable() {
  const tbody = document.getElementById("sig-tbody");
  const spin = '<span class="cell-loading"></span>';

  // recent signal changes (last 24h) for ↗/↘ indicator
  const recentChanges = (() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const map = {};
    loadSigLog().forEach((e) => {
      if (e.ts > cutoff) map[e.id] = e;
    });
    return map;
  })();

  // ── Sort ──────────────────────────────────────────────────
  let items = allItems();
  if (state.sortCol) {
    items = [...items].sort((a, b) => {
      const va = getSortVal(a, state.sortCol);
      const vb = getSortVal(b, state.sortCol);
      if (va === vb) return 0;
      if (typeof va === "string") return va.localeCompare(vb) * state.sortDir;
      return (va - vb) * state.sortDir;
    });
  }

  // ── Update header sort indicators ────────────────────────
  const COLS = [
    "ticker",
    "name",
    "driver",
    "price",
    "pct",
    "signal",
    "e1",
    "e2",
    "e3",
    "sell",
    "target",
    "rsi",
    "sma",
    "macd",
  ];
  document
    .querySelectorAll(".signals-table thead th.sortable")
    .forEach((th) => {
      const col = th.dataset.sort;
      th.classList.remove("sort-asc", "sort-desc");
      const icon = th.querySelector(".th-sort-icon");
      if (col === state.sortCol) {
        th.classList.add(state.sortDir === 1 ? "sort-asc" : "sort-desc");
        if (icon) icon.textContent = state.sortDir === 1 ? "▲" : "▼";
      } else {
        if (icon) icon.textContent = "⇅";
      }
    });

  tbody.innerHTML = items
    .map((item) => {
      const q = state.quotes[item.id];
      const s = state.signalCache[item.id];
      const loading = !s;

      const price = q?.price;
      const pct = q?.pct;
      const [cP, dispCcy] = q ? convertPrice(price, q.currency) : [null, "—"];
      const pctStr =
        pct != null
          ? `<span class="${dirCls(pct)}">${arrow(pct)} ${Math.abs(pct * 100).toFixed(2)}%</span>`
          : "—";

      // ── Driver badge ─────────────────────────────────────────
      const drvCell = `<span class="drv-badge drv-${item.driver || ""}">${item.dEmoji || ""} ${item.driver || "—"}</span>`;

      // ── Signal (computed live — scenario/regime aware) ────────
      let sigCell;
      if (loading) {
        sigCell = `<span class="sig-badge sig-loading">${spin}</span>`;
      } else {
        const pv = s.pv;
        const live = compositeSignal(
          s.rsiV,
          s.macdH,
          price ?? 0,
          s.bb,
          s.sma50,
          pv ? pv.PP : null,
          item.driver,
          item.regime,
          item.id,
        );
        const rc = recentChanges[item.id];
        const changeArrow = rc
          ? (() => {
              const up =
                (SIG_LEVEL[rc.toCls] ?? 0) > (SIG_LEVEL[rc.fromCls] ?? 0);
              return `<span class="${up ? "sig-change-up" : "sig-change-dn"}" title="${fmtSigLabel(rc.fromCls)} → ${fmtSigLabel(rc.toCls)}">${up ? "↗" : "↘"}</span>`;
            })()
          : "";
        sigCell = live
          ? `<span class="sig-badge ${live.cls}" title="Score ${live.score.toFixed(2)}">${live.label}</span>${changeArrow}`
          : '<span class="sig-badge sig-hold">—</span>';
      }

      // ── Entry ladder E1/E2/E3 (S1, mid(S1,S2), S2) ───────────
      const pv = s?.pv;
      const curPrice = state.quotes[item.id]?.price ?? null;
      // Se prezzo < S2 (tutti i supporti rotti), mostra warning invece di valori
      const belowAll = pv && curPrice !== null && curPrice < pv.S2;
      const warnSpan = `<span title="${t("warn_below_supports")}" style="color:var(--orange);font-size:.75rem">⚠️</span>`;
      const e1Cell = loading
        ? spin
        : pv
          ? `<span class="e1" ${belowAll ? 'style="opacity:.45"' : ""}>${fmtN(pv.S1)}</span>${belowAll ? warnSpan : ""}`
          : "—";
      const e2Cell = loading
        ? spin
        : pv
          ? `<span class="e2" ${belowAll ? 'style="opacity:.45"' : ""}>${fmtN((pv.S1 + pv.S2) / 2)}</span>`
          : "—";
      const e3Cell = loading
        ? spin
        : pv
          ? `<span class="e3" ${belowAll ? 'style="opacity:.45"' : ""}>${fmtN(pv.S2)}</span>`
          : "—";

      // ── Sell / Target — garantisce R1 < R2 in display ─────────
      const pvR1 = pv ? Math.min(pv.R1, pv.R2) : null;
      const pvR2 = pv ? Math.max(pv.R1, pv.R2) : null;
      const sellCell = loading
        ? spin
        : pv
          ? `<span class="lvl-sell">${fmtN(pvR1)}</span>`
          : "—";
      const targetCell = loading
        ? spin
        : pv
          ? `<span class="lvl-target">${fmtN(pvR2)}</span>`
          : "—";

      // ── RSI ───────────────────────────────────────────────────
      const rsiCell = loading
        ? spin
        : s.rsiV != null
          ? `<span class="rsi-val ${rsiCls(s.rsiV)}">${s.rsiV.toFixed(0)}</span>`
          : "—";

      // ── vs SMA50 ──────────────────────────────────────────────
      const vsCell = loading
        ? spin
        : s.sma50 != null && price != null
          ? (() => {
              const p = (price / s.sma50 - 1) * 100;
              return `<span class="${p >= 0 ? "vs-pos" : "vs-neg"}">${p >= 0 ? "+" : ""}${p.toFixed(1)}%</span>`;
            })()
          : '<span class="vs-neu">—</span>';

      // ── MACD ──────────────────────────────────────────────────
      const macdCell = loading
        ? spin
        : s.macdH != null
          ? s.macdH > 0
            ? `<span class="macd-up" title="Hist ${s.macdH.toFixed(4)}">▲</span>`
            : `<span class="macd-dn" title="Hist ${s.macdH.toFixed(4)}">▼</span>`
          : "—";

      // ── Vol vs AvgVol-20 ──────────────────────────────────────
      const volCell = (() => {
        if (loading) return spin;
        const vol = q?.vol;
        const avg = s?.avgVol;
        if (!vol || !avg) return '<span class="vol-norm">—</span>';
        const ratio = vol / avg;
        const up = (q?.pct ?? 0) >= 0;
        let cls, tip;
        if (ratio >= 1.5) {
          cls = up ? "vol-hi-up" : "vol-hi-dn";
          tip = t("vol_hi_tip", { r: ratio.toFixed(1) });
        } else if (ratio < 0.7) {
          cls = "vol-lo";
          tip = t("vol_lo_tip", { r: ratio.toFixed(1) });
        } else {
          cls = "vol-norm";
          tip = t("vol_norm_tip", { r: ratio.toFixed(1) });
        }
        return `<span class="${cls}" title="${tip}">${ratio.toFixed(1)}×</span>`;
      })();

      const priceDisp =
        cP != null
          ? `${cP.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} <span style="font-size:.65rem;color:var(--muted)">${dispCcy}</span>`
          : "—";

      return `<tr>
      <td><span class="td-ticker" data-action="openDetail" data-arg-0="${item.id}" title="${t("detail_open", { id: item.id })}">${item.id}</span></td>
      <td><span class="td-name" title="${item.name}">${item.name}</span></td>
      <td class="c">${drvCell}</td>
      <td class="r td-price">${priceDisp}</td>
      <td class="r">${pctStr}</td>
      <td class="c">${sigCell}</td>
      <td class="r">${e1Cell}</td>
      <td class="r">${e2Cell}</td>
      <td class="r">${e3Cell}</td>
      <td class="r">${sellCell}</td>
      <td class="r">${targetCell}</td>
      <td class="c">${rsiCell}</td>
      <td class="r">${vsCell}</td>
      <td class="c">${macdCell}</td>
      <td class="c">${volCell}</td>
      <td class="c"><button class="sig-del-btn" data-action="removeItem" data-arg-0="${item.id}" title="Rimuovi ${item.id} dalla lista">✕</button></td>
    </tr>`;
    })
    .join("");
}

export { renderSignalsTable, sortBy };

function render() {
  if (state.currentTab === "signals") renderSignalsTable();
}
export { render };
