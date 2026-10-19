import { storage } from "../../core/storage.js";
import { bv_DEFAULTS } from "./defaults.js";
import { YF_CHART, proxiedFetch } from "../../core/network.js";

const bv_STORAGE = "bond_equity_v1";
let bvState = null,
  bv_fetching = false,
  bv_loaded = false;

function bv_loadState() {
  try {
    const s = storage.getItem(bv_STORAGE);
    if (s) {
      const p = JSON.parse(s);
      if ((p._v || 0) >= (bv_DEFAULTS._v || 0)) return p;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(bv_DEFAULTS));
}
function bv_saveState() {
  storage.setItem(bv_STORAGE, JSON.stringify(bvState));
}

function bv_verdict(y10, cpi, pe) {
  if (y10 == null) return "neutro";
  const real = y10 - cpi;
  if (pe != null && pe > 0) {
    const ey = 100 / pe,
      bp = y10 - ey;
    if (real > 1 && bp > 0) return "bond";
    if (real < 0 || bp < -1) return "equity";
    return "neutro";
  }
  if (real > 1.5) return "bond";
  if (real < -0.5) return "equity";
  return "neutro";
}
function bv_chip(v) {
  const L = { bond: "BOND", neutro: "NEUTRO", equity: "EQUITY" };
  return `<span class="bv-chip ${v}">${L[v] || v}</span>`;
}
function bv_pct(v, d = 2) {
  return v == null ? "—" : v.toFixed(d) + "%";
}
function bv_num(v, d = 2) {
  return v == null ? "—" : v.toFixed(d);
}

function bv_renderGlobal() {
  const s = bvState;
  const usC = s.countries.find((c) => c.id === "usa");
  const real = usC && usC.yield10y != null ? usC.yield10y - usC.cpi : null;
  const realColor =
    real != null
      ? real > 1
        ? "color:#388bfd"
        : real < 0
          ? "color:#3fb950"
          : ""
      : "";
  document.getElementById("bv-global-bar").innerHTML = `
    <div class="bv-glob-item">
      <span class="bv-glob-lbl">DXY</span>
      <span class="bv-glob-val">${s.dxy != null ? s.dxy.toFixed(2) : "—"}</span>
      <span class="bv-glob-sub">USD Index${s.dxy != null && s.dxy > 104 ? " · forte ↑" : s.dxy != null && s.dxy < 100 ? " · debole ↓" : ""}</span>
    </div>
    <div class="bv-glob-item">
      <span class="bv-glob-lbl">Real Rate USA</span>
      <span class="bv-glob-val" style="${realColor}">${real != null ? real.toFixed(2) + "%" : "—"}</span>
      <span class="bv-glob-sub">10Y − CPI${real != null ? (real > 1 ? " → bond attrattivi" : real < 0 ? " → bond perdono potere" : "") : ""}</span>
    </div>
    <div class="bv-glob-item">
      <span class="bv-glob-lbl">Gold</span>
      <span class="bv-glob-val">${s.gold != null ? "$" + (s.gold | 0).toLocaleString("it-IT") : "—"}</span>
      <span class="bv-glob-sub">$/oz</span>
    </div>`;
}

function bv_renderCountries() {
  const s = bvState;
  const html = s.countries
    .map((c) => {
      const v = bv_verdict(c.yield10y, c.cpi, null);
      const real = c.yield10y != null ? c.yield10y - c.cpi : null;
      const realColor =
        real != null
          ? real > 1.5
            ? "color:#388bfd"
            : real < -0.5
              ? "color:#3fb950"
              : ""
          : "";
      return `<div class="bv-country-card">
      <div class="bv-cc-head"><span class="bv-cc-name">${c.name}</span>${bv_chip(v)}</div>
      <div class="bv-cc-rows">
        <div class="bv-cc-row"><span>Tasso CB</span><b>${bv_pct(c.cbRate)}</b></div>
        <div class="bv-cc-row"><span>10Y yield</span><b>${c.yield10y != null ? bv_pct(c.yield10y) : '<span class="bv-loading">…</span>'}</b></div>
        <div class="bv-cc-row"><span>Inflazione</span><b>${bv_pct(c.cpi)}</b></div>
        <div class="bv-cc-row"><span>Real yield</span><b style="${realColor}">${real != null ? bv_pct(real) : "—"}</b></div>
      </div>
    </div>`;
    })
    .join("");
  document.getElementById("bv-country-grid").innerHTML = html;
}

function bv_renderItaly() {
  const it = bvState.italy;
  const deC = bvState.countries.find((c) => c.id === "de");
  const de10y = deC ? deC.yield10y : null;
  const spread =
    it.yield10y != null && de10y != null ? it.yield10y - de10y : null;
  const real = it.yield10y != null ? it.yield10y - it.cpi : null;
  const ey = it.pe > 0 ? 100 / it.pe : null;
  const bp = it.yield10y != null && ey != null ? it.yield10y - ey : null;
  const v = bv_verdict(it.yield10y, it.cpi, it.pe);
  const spreadColor =
    spread != null
      ? spread > 2
        ? "color:#f85149"
        : spread < 1
          ? "color:#3fb950"
          : ""
      : "";
  const realColor =
    real != null
      ? real > 1
        ? "color:#388bfd"
        : real < 0
          ? "color:#f85149"
          : ""
      : "";
  const bpColor =
    bp != null
      ? bp > 0
        ? "color:#388bfd"
        : bp < -1
          ? "color:#3fb950"
          : ""
      : "";
  document.getElementById("bv-italy-wrap").innerHTML = `
    <div class="bv-italy-card">
      <div class="bv-italy-head">
        <div><span class="bv-italy-title">Italia — analisi dettagliata</span></div>
        ${bv_chip(v)}
      </div>
      <div class="bv-italy-grid">
        <div class="bv-kv"><span>Tasso BCE</span><b>${bv_pct(it.cbRate)}</b></div>
        <div class="bv-kv"><span>BTP 10Y</span><b>${it.yield10y != null ? bv_pct(it.yield10y) : '<span class="bv-loading">…</span>'}</b></div>
        <div class="bv-kv"><span>Spread BTP-Bund</span><b style="${spreadColor}">${spread != null ? bv_num(spread) + "pp" : "—"}</b></div>
        <div class="bv-kv"><span>Inflazione CPI</span><b>${bv_pct(it.cpi)}</b><button class="bv-edit-btn" data-action="bv_openEdit" data-arg-0="cpi" data-arg-1="Inflazione CPI (%)" data-arg-2="0.1">modifica</button></div>
        <div class="bv-kv"><span>Real yield</span><b style="${realColor}">${real != null ? bv_pct(real) : "—"}</b></div>
        <div class="bv-kv"><span>FTSE MIB P/E</span><b>${bv_num(it.pe, 1)}×</b><button class="bv-edit-btn" data-action="bv_openEdit" data-arg-0="pe" data-arg-1="FTSE MIB P/E" data-arg-2="0.1">modifica</button></div>
        <div class="bv-kv"><span>Earnings yield</span><b>${ey != null ? bv_pct(ey) : "—"}</b></div>
        <div class="bv-kv"><span>Bond Premium</span><b style="${bpColor}">${bp != null ? bv_num(bp) + "pp" : "—"}</b></div>
        <div class="bv-kv"><span>Debito/PIL</span><b>${bv_num(it.debtGdp, 0)}%</b><button class="bv-edit-btn" data-action="bv_openEdit" data-arg-0="debtGdp" data-arg-1="Debito/PIL (%)" data-arg-2="1">modifica</button></div>
      </div>
      <div id="bv-italy-edit" class="bv-edit-panel" style="display:none"></div>
      ${it.note ? `<div class="bv-note" style="font-size: 1rem;color:var(--muted);margin-top:8px">${it.note}</div>` : ""}
    </div>`;
}

function bv_openEdit(field, label, step) {
  const it = bvState.italy;
  const panel = document.getElementById("bv-italy-edit");
  panel.style.display = "block";
  panel.innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <label style="font-size: 1rem;color:var(--muted)">${label}</label>
    <input id="bv-edit-inp" type="number" step="${step}" value="${it[field]}"
      style="width:90px;padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:.82rem">
    <button class="sm-btn" data-action="bv_saveEdit" data-arg-0="${field}">Salva</button>
    <button class="sm-btn sec" data-action="closeBondEdit">×</button>
  </div>`;
  setTimeout(() => {
    const i = document.getElementById("bv-edit-inp");
    if (i) i.focus();
  }, 50);
}
function bv_saveEdit(field) {
  const v = parseFloat(document.getElementById("bv-edit-inp").value);
  if (isNaN(v)) return;
  bvState.italy[field] = v;
  bv_saveState();
  bv_renderItaly();
}

async function bv_fetchOne(ticker) {
  // endpoint /v8/finance/quote dismesso da Yahoo (404): si usa /v8/finance/chart come nel resto dell'app
  const url = `${YF_CHART}${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const r = await proxiedFetch(url, {}, 10000);
  if (!r.ok) throw new Error(r.status);
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  const p = meta?.regularMarketPrice ?? meta?.chartPreviousClose;
  if (p == null) throw new Error("no price");
  return p;
}

async function bv_fetchAll() {
  if (bv_fetching) return;
  bv_fetching = true;
  const btn = document.getElementById("bv-refreshBtn");
  if (btn) btn.textContent = "⟳ …";
  const tickers = [
    ...bvState.countries.map((c) => c.yf),
    "^IT10YT=RR",
    "DX-Y.NYB",
    "GC=F",
  ];
  const res = await Promise.allSettled(tickers.map((t) => bv_fetchOne(t)));
  bvState.countries.forEach((c, i) => {
    if (res[i].status === "fulfilled") c.yield10y = res[i].value;
  });
  const n = bvState.countries.length;
  if (res[n].status === "fulfilled") bvState.italy.yield10y = res[n].value;
  if (res[n + 1].status === "fulfilled") bvState.dxy = res[n + 1].value;
  if (res[n + 2].status === "fulfilled") bvState.gold = res[n + 2].value;
  bvState.lastFetched = new Date().toISOString();
  bv_saveState();
  bv_render();
  if (btn) btn.textContent = "Aggiorna ora";
  bv_fetching = false;
  bv_loaded = true;
}

function bv_render() {
  bv_renderGlobal();
  bv_renderCountries();
  bv_renderItaly();
  const el = document.getElementById("bv-lastUpdate");
  if (el && bvState.lastFetched)
    el.textContent = new Date(bvState.lastFetched).toLocaleTimeString("it-IT");
}
function bv_onTabOpen() {
  if (!bvState) bvState = bv_loadState();
  bv_render();
  if (!bv_loaded) bv_fetchAll();
}

export { bvState, bv_fetchAll, bv_onTabOpen, bv_openEdit, bv_saveEdit };
