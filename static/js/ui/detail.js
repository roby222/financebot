import { state } from "../core/state.js";
import { convertPrice } from "../core/format.js";
import { t } from "../core/i18n.js";
import { YF_CHART, proxiedFetch } from "../core/network.js";
import { drawPriceChart } from "./price-chart.js";

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════════════ */
const DETAIL_PERIODS = [
  { label: "1G", range: "1d", interval: "5m" },
  { label: "1S", range: "5d", interval: "30m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "3M", range: "3mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1A", range: "1y", interval: "1wk" },
  { label: "3A", range: "3y", interval: "1mo" },
  { label: "5A", range: "5y", interval: "1mo" },
  { label: "MAX", range: "max", interval: "1mo" },
];

let detailCurrentPeriod = DETAIL_PERIODS[2]; // default 1M

function openDetail(id) {
  const item = [...state.WATCHLIST, ...state.extraItems].find(
    (i) => i.id === id,
  );
  if (!item) return;
  state.detailCurrentItem = item;
  const q = state.quotes[id];
  const s = state.signalCache[id];

  // header
  document.getElementById("detail-ticker").textContent = item.id;
  document.getElementById("detail-etfname").textContent = item.name;
  document.getElementById("detail-driver-badge").textContent =
    (item.dEmoji || "") + " " + item.driver;

  const [cP, dispCcy] = q ? convertPrice(q.price, q.currency) : [null, ""];
  const priceEl = document.getElementById("detail-price");
  const pctEl = document.getElementById("detail-pct");
  if (cP != null) {
    priceEl.textContent =
      cP.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }) +
      " " +
      dispCcy;
  } else {
    priceEl.textContent = "—";
  }
  if (q?.pct != null) {
    const pct = q.pct;
    const sign = pct >= 0 ? "+" : "";
    pctEl.textContent = sign + (pct * 100).toFixed(2) + "%";
    pctEl.className = "detail-pct " + (pct >= 0 ? "up" : "down");
  } else {
    pctEl.textContent = "";
    pctEl.className = "detail-pct";
  }

  // stats
  renderDetailStats(item, q, s);

  // periods
  renderDetailPeriods();

  document.getElementById("detail-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // load chart
  loadDetailChart();
}

function closeDetail() {
  document.getElementById("detail-overlay").classList.add("hidden");
  document.body.style.overflow = "";
  state.detailCurrentItem = null;
}

function closeDetailIfBg(e) {
  if (e.target === document.getElementById("detail-overlay")) closeDetail();
}

function renderDetailPeriods() {
  const el = document.getElementById("detail-periods");
  el.innerHTML = DETAIL_PERIODS.map(
    (p) =>
      `<button class="detail-period-btn${p === detailCurrentPeriod ? " active" : ""}"
       data-action="setDetailPeriod" data-arg-0="${p.range}" data-arg-1="${p.interval}">${p.label}</button>`,
  ).join("");
}

function setDetailPeriod(range, interval) {
  detailCurrentPeriod =
    DETAIL_PERIODS.find((p) => p.range === range && p.interval === interval) ||
    detailCurrentPeriod;
  renderDetailPeriods();
  loadDetailChart();
}

function renderDetailStats(item, q, s) {
  const el = document.getElementById("detail-stats");
  if (!s && !q) {
    el.innerHTML = "";
    return;
  }

  const pv = s?.pv;
  const price = q?.price;
  const [cP] = q ? convertPrice(price, q.currency) : [null];

  const fmt = (v, dec = 2) =>
    v != null
      ? v.toLocaleString("it-IT", {
          minimumFractionDigits: dec,
          maximumFractionDigits: dec,
        })
      : "—";
  const fmtPct = (v) =>
    v != null ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%` : "—";

  const vsSma =
    s?.sma50 != null && price != null ? (price / s.sma50 - 1) * 100 : null;

  const stats = [
    { label: t("stat_rsi"), val: s?.rsiV != null ? s.rsiV.toFixed(1) : "—" },
    {
      label: t("stat_macd"),
      val:
        s?.macdH != null
          ? `${s.macdH > 0 ? "▲" : "▼"} ${s.macdH.toFixed(4)}`
          : "—",
    },
    {
      label: t("stat_sma"),
      val: vsSma != null ? `${vsSma >= 0 ? "+" : ""}${vsSma.toFixed(1)}%` : "—",
    },
    {
      label: t("stat_vol"),
      val: q?.vol && s?.avgVol ? `${(q.vol / s.avgVol).toFixed(1)}×` : "—",
    },
    { label: t("stat_pivot"), val: pv?.PP != null ? fmt(pv.PP) : "—" },
    { label: t("stat_r1"), val: pv?.R1 != null ? fmt(pv.R1) : "—" },
    { label: t("stat_s1"), val: pv?.S1 != null ? fmt(pv.S1) : "—" },
  ];

  el.innerHTML = stats
    .map(
      (s) =>
        `<div class="detail-stat">
       <span class="detail-stat-label">${s.label}</span>
       <span class="detail-stat-val">${s.val}</span>
     </div>`,
    )
    .join("");
}

async function loadDetailChart() {
  if (!state.detailCurrentItem) return;
  const canvas = document.getElementById("detail-canvas");
  const loading = document.getElementById("detail-loading");
  const ctx = canvas.getContext("2d");

  loading.textContent = t("chart_loading");
  loading.classList.remove("hidden");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.detailChartState = null;
  document.getElementById("detail-period-perf").innerHTML = "";

  // remove old listeners
  canvas.onmousemove = null;
  canvas.onmouseleave = null;
  canvas.ontouchmove = null;

  const { range, interval } = detailCurrentPeriod;
  const yf = state.detailCurrentItem.yf;

  try {
    const url = `${YF_CHART}${yf}?range=${range}&interval=${interval}&_=${Date.now()}`;
    const res = await proxiedFetch(url, { cache: "no-store" });
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("no data");

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const opens = result.indicators?.quote?.[0]?.open || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];

    const pts = timestamps
      .map((t, i) => ({ t, c: closes[i], o: opens[i], v: volumes[i] ?? null }))
      .filter((p) => p.c != null);

    loading.classList.add("hidden");
    drawPriceChart(canvas, pts, range, null);

    // period performance
    const perfEl = document.getElementById("detail-period-perf");
    if (pts.length >= 2) {
      const first = pts[0].c,
        last = pts[pts.length - 1].c;
      const pct = (last / first - 1) * 100;
      const sign = pct >= 0 ? "+" : "";
      const col = pct >= 0 ? "var(--green)" : "var(--red)";
      const arrow = pct >= 0 ? "▲" : "▼";
      perfEl.innerHTML = `<span style="color:${col};font-weight:700">${arrow} ${sign}${pct.toFixed(2)}% ${t("period_perf_in")}</span>`;
    } else {
      perfEl.innerHTML = "";
    }

    // crosshair interaction
    const getIdx = (clientX) => {
      const st = state.detailChartState;
      if (!st) return null;
      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const raw = ((mouseX - st.PAD.left) / st.cW) * (st.pts.length - 1);
      return Math.max(0, Math.min(st.pts.length - 1, Math.round(raw)));
    };
    canvas.onmousemove = (e) => {
      const idx = getIdx(e.clientX);
      if (idx !== null) drawPriceChart(canvas, pts, range, idx);
    };
    canvas.onmouseleave = () => drawPriceChart(canvas, pts, range, null);
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      const idx = getIdx(e.touches[0].clientX);
      if (idx !== null) drawPriceChart(canvas, pts, range, idx);
    };
  } catch (e) {
    loading.textContent = t("chart_error");
    loading.classList.remove("hidden");
  }
}

export { closeDetail, closeDetailIfBg, openDetail, setDetailPeriod };
