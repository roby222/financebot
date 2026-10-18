import { storage } from "../../core/storage.js";
import { allItems } from "./watchlist-store.js";
import { state } from "../../core/state.js";
import { compositeSignal } from "./signals.js";
import { LANG, t } from "../../core/i18n.js";

/* ═══════════════════════════════════════════════════════════
   SIGNAL CHANGE LOG
═══════════════════════════════════════════════════════════ */
const SIGLOG_KEY = "fpb_siglog";
const SIGPREV_KEY = "fpb_sigs_prev";
const SIGLOG_MAX = 300;
const SIG_LEVEL = {
  "sig-sell-strong": -2,
  "sig-sell": -1,
  "sig-hold": 0,
  "sig-buy": 1,
  "sig-buy-strong": 2,
};

function loadSigLog() {
  try {
    return JSON.parse(storage.getItem(SIGLOG_KEY) || "[]");
  } catch {
    return [];
  }
}
function loadSigPrev() {
  try {
    return JSON.parse(storage.getItem(SIGPREV_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveSigLog(l) {
  try {
    storage.setItem(SIGLOG_KEY, JSON.stringify(l.slice(-SIGLOG_MAX)));
  } catch {}
}
function saveSigPrev(p) {
  try {
    storage.setItem(SIGPREV_KEY, JSON.stringify(p));
  } catch {}
}

function checkSignalChanges() {
  const prev = loadSigPrev();
  const log = loadSigLog();
  let anyNew = false;

  allItems().forEach((item) => {
    const q = state.quotes[item.id];
    const s = state.signalCache[item.id];
    if (!s || q?.price == null) return;
    const live = compositeSignal(
      s.rsiV,
      s.macdH,
      q.price,
      s.bb,
      s.sma50,
      s.pv?.PP ?? null,
      item.driver,
      item.regime,
      item.id,
    );
    if (!live) return;
    const p = prev[item.id];
    if (p && p.cls !== live.cls) {
      log.push({
        id: item.id,
        name: item.name,
        fromCls: p.cls,
        toCls: live.cls,
        ts: Date.now(),
      });
      anyNew = true;
    }
    prev[item.id] = { cls: live.cls };
  });

  saveSigPrev(prev);
  if (anyNew) {
    saveSigLog(log);
    renderSigLog();
  }
}

function fmtSigLabel(cls) {
  const map = {
    "sig-buy-strong": t("sig_buy_strong"),
    "sig-buy": t("sig_buy"),
    "sig-hold": t("sig_hold"),
    "sig-sell": t("sig_sell"),
    "sig-sell-strong": t("sig_sell_strong"),
  };
  return map[cls] ?? cls;
}

function fmtLogTs(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString(LANG === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isToday) return time;
  if (isYesterday) return (LANG === "it" ? "ieri " : "yest ") + time;
  return (
    d.toLocaleDateString(LANG === "it" ? "it-IT" : "en-GB", {
      day: "numeric",
      month: "short",
    }) +
    " " +
    time
  );
}

function renderSigLog() {
  const log = loadSigLog();
  const countEl = document.getElementById("siglog-count");
  const emptyEl = document.getElementById("siglog-empty");
  const tableEl = document.getElementById("siglog-table");
  const tbody = document.getElementById("siglog-tbody");
  if (!countEl) return;

  if (!log.length) {
    countEl.classList.remove("visible");
    emptyEl.classList.remove("hidden");
    tableEl.classList.add("hidden");
    return;
  }

  countEl.textContent = log.length;
  countEl.classList.add("visible");
  emptyEl.classList.add("hidden");
  tableEl.classList.remove("hidden");

  // show most recent first, max 50
  const rows = [...log].reverse().slice(0, 50);
  tbody.innerHTML = rows
    .map((e) => {
      const fromLbl = fmtSigLabel(e.fromCls);
      const toLbl = fmtSigLabel(e.toCls);
      const dir = (SIG_LEVEL[e.toCls] ?? 0) > (SIG_LEVEL[e.fromCls] ?? 0);
      const arrow = dir ? "↗" : "↘";
      const col = dir ? "var(--green)" : "var(--red)";
      return `<tr>
      <td class="siglog-ts">${fmtLogTs(e.ts)}</td>
      <td><strong>${e.id}</strong></td>
      <td class="siglog-from" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.name}">${e.name}</td>
      <td>
        <span class="sig-badge ${e.fromCls}" style="font-size:.62rem;padding:1px 5px">${fromLbl}</span>
        <span class="siglog-arrow" style="color:${col}">${arrow}</span>
        <span class="sig-badge ${e.toCls}" style="font-size:.62rem;padding:1px 5px">${toLbl}</span>
      </td>
    </tr>`;
    })
    .join("");
}

function toggleSigLog() {
  const body = document.getElementById("siglog-body");
  const chev = document.getElementById("siglog-chevron");
  const open = body.classList.toggle("open");
  chev.textContent = open ? "▲" : "▼";
}

function clearSigLog(e) {
  e.stopPropagation();
  saveSigLog([]);
  saveSigPrev({});
  renderSigLog();
}

export {
  SIG_LEVEL,
  checkSignalChanges,
  clearSigLog,
  fmtSigLabel,
  loadSigLog,
  renderSigLog,
  toggleSigLog,
};
