import { t } from "./i18n.js";

/* ═══════════════════════════════════════════════════════════
   CURRENCY
═══════════════════════════════════════════════════════════ */

function convertPrice(price, ccy) {
  if (price == null) return [null, "—"];
  // GBp → GBP normalisation only
  if (ccy === "GBp") return [price * 0.01, "GBP"];
  return [price, ccy || "—"];
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */

const fmt = (v, d = 2) =>
  v == null
    ? "—"
    : v.toLocaleString("it-IT", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
const fmtN = (v, d = 3) =>
  v == null
    ? "—"
    : v.toLocaleString("it-IT", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
function fmtVol(v) {
  if (v == null) return "—";
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
}
function mktCls(s) {
  return s === "REGULAR"
    ? "mkt-open"
    : s === "PRE" || s === "POST"
      ? "mkt-pre"
      : "mkt-closed";
}
function mktLbl(s) {
  return s === "REGULAR"
    ? t("mkt_open")
    : s === "PRE"
      ? t("mkt_pre")
      : s === "POST"
        ? t("mkt_post")
        : t("mkt_closed");
}
function dirCls(chg) {
  return chg == null ? "flat" : chg > 0 ? "up" : chg < 0 ? "down" : "flat";
}
function arrow(chg) {
  return chg > 0 ? "▲" : chg < 0 ? "▼" : "—";
}

export { arrow, convertPrice, dirCls, fmtN, fmtVol, mktCls, mktLbl };

function sm_fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );
}

function sm_timeAgo(iso) {
  if (!iso) return "mai";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "ora";
  if (m < 60) return m + "min fa";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h fa";
  return Math.floor(h / 24) + "g fa";
}

function sm_fmtVal(v) {
  if (typeof v !== "number") return v;
  if (v === 0) return "0";
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function sm_shortDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
export { sm_fmtDate, sm_timeAgo, sm_fmtVal, sm_shortDate };
