import { btp_ytm, btp_netYield } from "../../core/bonds.js";
import { btpState } from "./portfolio.js";
import { state } from "../../core/state.js";
import { YF_CHART, proxiedFetch } from "../../core/network.js";
import { drawPriceChart } from "../../ui/price-chart.js";

// ── GRAFICO ANDAMENTO (riusa il modal detail + drawPriceChart degli ETF) ──
const btp_CHART_PERIODS = [
  { label: "1M", tf: "1m", range: "1m", yf: "1mo" },
  { label: "3M", tf: "3m", range: "3m", yf: "3mo" },
  { label: "6M", tf: "6m", range: "6m", yf: "6mo" },
  { label: "1A", tf: "1y", range: "1y", yf: "1y" },
  { label: "3A", tf: "3y", range: "3y", yf: "2y" },
];
let btp_chartBond = null,
  btp_chartPeriod = btp_CHART_PERIODS[1];

function btp_openChart(idx) {
  const b = btpState.bonds[idx];
  if (!b) return;
  btp_chartBond = b;
  state.detailCurrentItem = null; // evita interferenze con la logica ETF
  document.getElementById("detail-ticker").textContent = b.name;
  document.getElementById("detail-etfname").textContent =
    b.special === "etf" ? "ETF" : b.id;
  document.getElementById("detail-driver-badge").textContent = "";
  const price = b.price;
  document.getElementById("detail-price").textContent =
    price != null
      ? price.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";
  const pctEl = document.getElementById("detail-pct");
  if (b.pct != null) {
    pctEl.textContent = (b.pct >= 0 ? "+" : "") + b.pct.toFixed(2) + "%";
    pctEl.className = "detail-pct " + (b.pct >= 0 ? "up" : "down");
  } else {
    pctEl.textContent = "";
    pctEl.className = "detail-pct";
  }
  btp_renderChartStats(b);
  btp_renderChartPeriods();
  document.getElementById("detail-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  btp_loadChart();
}
function btp_renderChartStats(b) {
  const price = b.price;
  const ytm = btp_ytm(b),
    net = btp_netYield(b, price);
  const rows = [
    { l: "Cedola", v: b.coupon != null ? b.coupon.toFixed(2) + "%" : "—" },
    {
      l: "Scadenza",
      v: b.mat ? new Date(b.mat).toLocaleDateString("it-IT") : "—",
    },
    { l: "YTM lordo", v: ytm != null ? ytm.toFixed(2) + "%" : "—" },
    { l: "Rend. netto/a", v: net != null ? net.toFixed(2) + "%" : "—" },
  ];
  document.getElementById("detail-stats").innerHTML = rows
    .map(
      (r) =>
        `<div class="detail-stat"><span class="detail-stat-label">${r.l}</span><span class="detail-stat-val">${r.v}</span></div>`,
    )
    .join("");
}
function btp_renderChartPeriods() {
  document.getElementById("detail-periods").innerHTML = btp_CHART_PERIODS
    .map(
      (p) =>
        `<button class="detail-period-btn${p.tf === btp_chartPeriod.tf ? " active" : ""}" data-action="btp_setChartPeriod" data-arg-0="${p.tf}">${p.label}</button>`,
    )
    .join("");
}
function btp_setChartPeriod(tf) {
  btp_chartPeriod =
    btp_CHART_PERIODS.find((p) => p.tf === tf) || btp_chartPeriod;
  btp_renderChartPeriods();
  btp_loadChart();
}
async function btp_loadChart() {
  if (!btp_chartBond) return;
  const canvas = document.getElementById("detail-canvas");
  const loading = document.getElementById("detail-loading");
  const ctx = canvas.getContext("2d");
  loading.textContent = "Carico grafico…";
  loading.classList.remove("hidden");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.detailChartState = null;
  document.getElementById("detail-period-perf").innerHTML = "";
  canvas.onmousemove = null;
  canvas.onmouseleave = null;
  canvas.ontouchmove = null;

  const b = btp_chartBond,
    { tf, range, yf } = btp_chartPeriod;
  try {
    let pts;
    if (b.special === "etf") {
      // ETF cash: Yahoo Finance (stessa fonte del pannello ETF)
      const url = `${YF_CHART}${b.yf}?range=${yf}&interval=1d&_=${Date.now()}`;
      const res = await proxiedFetch(url, { cache: "no-store" });
      const rr = (await res.json())?.chart?.result?.[0];
      const ts = rr.timestamp || [],
        cl = rr.indicators?.quote?.[0]?.close || [],
        op = rr.indicators?.quote?.[0]?.open || [],
        vo = rr.indicators?.quote?.[0]?.volume || [];
      pts = ts
        .map((t, i) => ({ t, c: cl[i], o: op[i], v: vo[i] ?? null }))
        .filter((p) => p.c != null);
    } else {
      // BTP: Borsa Italiana ChartWService (OHLC giornaliero, close = colonna 2)
      const body = {
        request: {
          SampleTime: "1d",
          TimeFrame: tf,
          RequestedDataSetType: "ohlc",
          ChartPriceType: "price",
          Key: b.id + ".MOT",
          OffSet: 0,
          FromDate: null,
          ToDate: null,
          UseDelay: false,
          KeyType: "Topic",
          KeyType2: "Topic",
          Language: "it-IT",
        },
      };
      // NB: solo un proxy che inoltra il body regge questa POST (il Cloudflare Worker; i proxy pubblici no)
      const r = await proxiedFetch(
        "https://charts.borsaitaliana.it/charts/services/ChartWService.asmx/GetPrices",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        18000,
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const rows = (await r.json()).d || [];
      pts = rows
        .map((x) => ({ t: Math.floor(x[0] / 1000), c: x[2], o: x[1], v: null }))
        .filter((p) => p.c != null);
    }
    if (!pts.length) throw new Error("no data");
    loading.classList.add("hidden");
    // attende che il canvas sia dimensionato (il fixed-overlay va in layout dopo un frame)
    const drawReady = (tries = 0) => {
      if (canvas.getBoundingClientRect().width > 40)
        drawPriceChart(canvas, pts, range, null);
      else if (tries < 120) setTimeout(() => drawReady(tries + 1), 50);
    };
    drawReady();
    const perfEl = document.getElementById("detail-period-perf");
    if (pts.length >= 2) {
      const f = pts[0].c,
        l = pts[pts.length - 1].c,
        pct = (l / f - 1) * 100;
      const col = pct >= 0 ? "var(--green)" : "var(--red)",
        ar = pct >= 0 ? "▲" : "▼";
      perfEl.innerHTML = `<span style="color:${col};font-weight:700">${ar} ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% nel periodo</span>`;
    }
    const getIdx = (cx) => {
      const st = state.detailChartState;
      if (!st) return null;
      const rect = canvas.getBoundingClientRect();
      const raw =
        ((cx - rect.left - st.PAD.left) / st.cW) * (st.pts.length - 1);
      return Math.max(0, Math.min(st.pts.length - 1, Math.round(raw)));
    };
    canvas.onmousemove = (e) => {
      const i = getIdx(e.clientX);
      if (i !== null) drawPriceChart(canvas, pts, range, i);
    };
    canvas.onmouseleave = () => drawPriceChart(canvas, pts, range, null);
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      const i = getIdx(e.touches[0].clientX);
      if (i !== null) drawPriceChart(canvas, pts, range, i);
    };
  } catch (e) {
    loading.textContent = "Grafico non disponibile per questo titolo";
    loading.classList.remove("hidden");
  }
}

// fetch con fallback su lista proxy — prova ciascuno finché uno risponde (timeout 8s per tentativo)

export { btp_openChart, btp_setChartPeriod };
