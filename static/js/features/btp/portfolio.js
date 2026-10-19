import { btp_ytmAt, btp_ytm, btp_netYield } from "../../core/bonds.js";
import { storage } from "../../core/storage.js";
import { btp_DEFAULTS, btp_STORAGE } from "./defaults.js";
import { PROXY_CUSTOM, PROXY_LAST_ERROR } from "../../core/network.js";
import { bvState } from "../bonds/valuation.js";
import {
  btp_fetchBI,
  btp_fetchSpread,
  btp_fetchYF,
} from "../../services/btp-data.js";
import { toast } from "../../ui/toast.js";
import { pMap } from "../../core/async.js";

let btpState = null,
  btp_fetching = false,
  btp_loaded = false;
let btpSort = { col: null, dir: 1 }; // col=chiave, dir 1 asc / -1 desc

function btp_loadState() {
  try {
    const s = storage.getItem(btp_STORAGE);
    if (s) {
      const p = JSON.parse(s);
      // Stato salvato = fonte di verità (l'utente può aver aggiunto/rimosso titoli)
      if ((p._v || 0) >= (btp_DEFAULTS._v || 0) && Array.isArray(p.bonds)) {
        if (p.sort) btpSort = p.sort;
        return p;
      }
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(btp_DEFAULTS));
}
function btp_saveState() {
  btpState.sort = btpSort;
  storage.setItem(btp_STORAGE, JSON.stringify(btpState));
}

// YTM lordo a un prezzo dato (formula lineare)

// YTM al prezzo di mercato corrente (mp override se presente)

function btp_fmtMat(mat) {
  if (!mat) return "—";
  return new Date(mat).toLocaleDateString("it-IT", {
    month: "short",
    year: "numeric",
  });
}

// Rendimento netto annuo (YTM × 0.875) al prezzo indicato; null per IDX/STEP/ETF

// ── ORDINAMENTO ──────────────────────────────────────────────
function btp_sortKey(b, col) {
  const price = b.price;
  switch (col) {
    case "name":
      return b.name.toLowerCase();
    case "coupon":
      return b.coupon;
    case "mat":
      return b.mat ? new Date(b.mat).getTime() : null;
    case "price":
      return price;
    case "pct":
      return b.pct;
    case "ytm":
      return btp_ytm(b);
    case "spread": {
      const y = btp_ytm(b),
        bn = btp_benchmark10Y();
      return y != null && bn != null ? y - bn : null;
    }
    case "netora":
      return btp_netYield(b, price);
    case "netacq":
      return b.ap != null ? btp_netYield(b, b.ap) : null;
    default:
      return null;
  }
}
function btp_setSort(col) {
  if (btpSort.col === col) btpSort.dir *= -1;
  else {
    btpSort.col = col;
    btpSort.dir = 1;
  }
  const { col: c, dir } = btpSort;
  btpState.bonds.sort((a, b) => {
    let ka = btp_sortKey(a, c),
      kb = btp_sortKey(b, c);
    if (ka == null && kb == null) return 0;
    if (ka == null) return 1; // valori mancanti in fondo
    if (kb == null) return -1;
    if (typeof ka === "string") return dir * ka.localeCompare(kb);
    return dir * (ka - kb);
  });
  btp_saveState();
  btp_renderTable();
}

// Benchmark BTP 10Y: interpola la curva YTM dai BTP a cedola fissa con prezzo live
function btp_benchmark10Y() {
  const pts = [];
  btpState.bonds.forEach((b) => {
    if (b.special || !b.coupon || !b.mat) return;
    const price = b.price;
    if (price == null) return;
    const years =
      (new Date(b.mat) - new Date()) / (1000 * 60 * 60 * 24 * 365.25);
    const y = btp_ytmAt(b, price);
    if (y != null && years > 0.5) pts.push({ years, y });
  });
  if (pts.length < 2) return null;
  pts.sort((a, b) => a.years - b.years);
  const T = 10;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i].years <= T && pts[i + 1].years >= T) {
      const f = (T - pts[i].years) / (pts[i + 1].years - pts[i].years);
      return pts[i].y + f * (pts[i + 1].y - pts[i].y);
    }
  }
  return T < pts[0].years ? pts[0].y : pts[pts.length - 1].y;
}

function btp_renderInfoBar() {
  // banner proxy: distingue "proxy giu'" da "dato assente"
  const warnEl = document.getElementById("btp-proxy-warn");
  if (warnEl) {
    if (btpState.fetchError) {
      warnEl.style.display = "";
      warnEl.innerHTML =
        "<b>Prezzi non scaricabili — il proxy CORS non risponde.</b><br>" +
        "Nessun prezzo e' stato recuperato (" +
        btpState.fetchError +
        "). I proxy pubblici gratuiti " +
        "non sono piu' affidabili: corsproxy.io richiede una API key e allorigins limita le richieste.<br>" +
        "Soluzione: deploya il Cloudflare Worker in <code>proxy-worker/worker.js</code> e impostalo con<br>" +
        "<code>localStorage.setItem('fpb_proxy','https://TUO-WORKER.workers.dev/?url=')</code>" +
        (PROXY_CUSTOM
          ? "<br>Proxy attualmente configurato: <code>" +
            PROXY_CUSTOM +
            "</code>"
          : "<br>Nessun proxy personale configurato: in uso solo i fallback pubblici.");
    } else {
      warnEl.style.display = "none";
    }
  }
  const bench10y = btp_benchmark10Y();
  const spread = btpState.spreadBund; // scrapato da Teleborsa (bps)
  let cpi =
    typeof bvState !== "undefined" && bvState ? bvState.italy?.cpi : null;

  const benchEl = document.getElementById("btp-bench-val");
  if (benchEl)
    benchEl.textContent = bench10y != null ? bench10y.toFixed(2) + "%" : "—";

  const spreadEl = document.getElementById("btp-spread-bund");
  if (spreadEl) {
    if (spread != null) {
      spreadEl.textContent = Math.round(spread) + " bps";
      spreadEl.style.color =
        spread > 200 ? "#f85149" : spread < 130 ? "#3fb950" : "";
    } else {
      spreadEl.textContent = "—";
      spreadEl.style.color = "";
    }
  }

  const cpiEl = document.getElementById("btp-cpi-val");
  if (cpiEl) cpiEl.textContent = cpi != null ? cpi.toFixed(1) + "%" : "—";

  const cntEl = document.getElementById("btp-count");
  if (cntEl) cntEl.textContent = btpState.bonds.length;

  // Riepilogo posizioni: titoli con prezzo di acquisto impostato + P&L medio mark-to-market
  const owned = btpState.bonds.filter((b) => b.ap != null && b.price != null);
  const posValEl = document.getElementById("btp-pos-val");
  const posSubEl = document.getElementById("btp-pos-sub");
  if (posValEl) {
    if (owned.length) {
      const avgPnl =
        owned.reduce((s, b) => s + ((b.price - b.ap) / b.ap) * 100, 0) /
        owned.length;
      posValEl.innerHTML = `${owned.length} <span style="font-size: 1rem;font-weight:600;color:${avgPnl >= 0 ? "#3fb950" : "#f85149"}">${avgPnl >= 0 ? "+" : ""}${avgPnl.toFixed(2)}%</span>`;
      if (posSubEl) posSubEl.textContent = "P&L medio vs acquisto";
    } else {
      posValEl.textContent = "—";
      if (posSubEl) posSubEl.textContent = "imposta un prezzo di acquisto (modifica)";
    }
  }
}

function btp_renderTable() {
  const bench10y = btp_benchmark10Y();

  const rows = btpState.bonds
    .map((b, idx) => {
      const price = b.price;
      const priceStr =
        price != null
          ? `${price.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '<span style="color:var(--muted);font-style:italic;font-size: 0.82rem">…</span>';
      const pctStr =
        b.pct != null
          ? `<span class="${b.pct >= 0 ? "btp-pct-up" : "btp-pct-dn"}">${b.pct >= 0 ? "+" : ""}${b.pct.toFixed(2)}%</span>`
          : "—";

      const ytm = btp_ytm(b);
      let ytmStr;
      if (b.special === "etf") ytmStr = '<span class="btp-ytm-nd">ETF</span>';
      else if (b.special === "idx")
        ytmStr = '<span class="btp-ytm-nd">indicizzato</span>';
      else if (b.special === "step")
        ytmStr = '<span class="btp-ytm-nd">step-up</span>';
      else if (ytm != null)
        ytmStr = `<span class="btp-ytm-val">${ytm.toFixed(2)}%</span>`;
      else ytmStr = "—";

      let spreadStr = "—";
      if (ytm != null && bench10y != null) {
        const spBps = (ytm - bench10y) * 100;
        spreadStr = `<span class="${spBps >= 0 ? "btp-spread-pos" : "btp-spread-neg"}">${spBps >= 0 ? "+" : ""}${Math.round(spBps)} bps</span>`;
      }

      let badgeHtml = "";
      if (b.special === "idx")
        badgeHtml = '<span class="btp-badge idx">IDX</span>';
      else if (b.special === "step")
        badgeHtml = '<span class="btp-badge step">STEP</span>';
      else if (b.special === "etf")
        badgeHtml = '<span class="btp-badge etf">ETF</span>';

      // Rendimento netto annuo comprando ORA al prezzo di mercato (YTM × 0.875)
      let netoraStr = "—";
      if (b.special === "etf")
        netoraStr = '<span class="btp-ytm-nd">n.a.</span>';
      else if (b.special === "idx" || b.special === "step")
        netoraStr = '<span class="btp-ytm-nd">variabile</span>';
      else if (price == null)
        netoraStr =
          '<span style="color:var(--muted);font-style:italic;font-size: 0.82rem">…</span>';
      else {
        const ny = btp_netYield(b, price);
        if (ny != null) {
          const cls = ny >= 0 ? "btp-pct-up" : "btp-pct-dn";
          netoraStr = `<span class="btp-net-val ${cls}">${ny.toFixed(2)}%/anno</span>`;
        }
      }

      // Rendimento netto annuo in base al PREZZO DI ACQUISTO impostato dall'utente
      // + P&L mark-to-market (quotazione attuale vs prezzo di acquisto)
      let acqStr =
        '<span style="color:var(--muted);font-size: 0.82rem">imposta P.acq.</span>';
      if (b.ap != null) {
        const pnl = price != null ? ((price - b.ap) / b.ap) * 100 : null;
        const pnlStr =
          pnl != null
            ? ` · <span style="color:${pnl >= 0 ? "#3fb950" : "#f85149"}">${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%</span>`
            : "";
        const subAcq = `<span style="font-size: 0.82rem;color:var(--muted)">acq. ${b.ap.toFixed(2)}${pnlStr}</span>`;
        if (b.special === "etf") {
          acqStr =
            (pnl != null
              ? `<span class="btp-net-val ${pnl >= 0 ? "btp-pct-up" : "btp-pct-dn"}">${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%</span><br>`
              : "") +
            `<span style="font-size: 0.82rem;color:var(--muted)">acq. ${b.ap.toFixed(2)}</span>`;
        } else if (b.special === "idx" || b.special === "step") {
          acqStr = `<span class="btp-ytm-nd">variabile</span><br>${subAcq}`;
        } else {
          const ny = btp_netYield(b, b.ap);
          if (ny != null) {
            const cls = ny >= 0 ? "btp-pct-up" : "btp-pct-dn";
            acqStr = `<span class="btp-net-val ${cls}">${ny.toFixed(2)}%/anno</span><br>${subAcq}`;
          } else acqStr = subAcq;
        }
      }

      const clearApBtn =
        b.ap != null
          ? `<button class="sm-btn sec" style="font-size: 0.82rem;padding:2px 6px" data-action="btp_clearAp" data-arg-0="${idx}">× Rimuovi</button>`
          : "";

      return `<tr class="btp-data-row${b.ap != null ? " btp-owned" : ""}">
      <td><span class="btp-name" data-action="btp_openChart" data-arg-0="${idx}" title="Mostra andamento ${b.name}">${b.name}</span>${badgeHtml}${b.special === "etf" ? "" : `<div class="btp-isin">${b.id}</div>`}</td>
      <td class="r">${b.coupon != null ? b.coupon.toFixed(2) + "%" : "—"}</td>
      <td>${btp_fmtMat(b.mat)}</td>
      <td class="r">${priceStr}<button class="btp-edit-btn" data-action="btp_openEdit" data-arg-0="${idx}" title="Imposta prezzo di acquisto">modifica</button></td>
      <td class="r">${pctStr}</td>
      <td class="r">${ytmStr}</td>
      <td class="r">${spreadStr}</td>
      <td class="r">${netoraStr}</td>
      <td class="r">${acqStr}</td>
      <td class="c"><button class="btp-del-btn" data-action="btp_removeBond" data-arg-0="${idx}" title="Elimina ${b.name}">×</button></td>
    </tr>
    <tr id="btp-edit-row-${idx}" style="display:none"><td colspan="10" class="btp-edit-row">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span style="font-size: 1rem;color:var(--muted);white-space:nowrap">Prezzo di acquisto:</span>
        <input id="btp-ap-inp-${idx}" type="number" step="0.01" min="50" max="150" class="btp-edit-inp"
          value="${b.ap != null ? b.ap : ""}" placeholder="es. 97.00">
        <button class="sm-btn" data-action="btp_saveAp" data-arg-0="${idx}">Salva</button>
        ${clearApBtn}
        <button class="sm-btn sec" data-action="btp_closeEdit" data-arg-0="${idx}" style="margin-left:auto">×</button>
      </div>
    </td></tr>`;
    })
    .join("");
  document.getElementById("btp-tbody").innerHTML = rows;
  // frecce ordinamento
  document.querySelectorAll(".btp-sort-arr").forEach((el) => {
    el.textContent =
      btpSort.col === el.dataset.col ? (btpSort.dir > 0 ? "▲" : "▼") : "";
  });
}

function btp_openEdit(idx) {
  btpState.bonds.forEach((_, i) => {
    if (i !== idx) {
      const r = document.getElementById(`btp-edit-row-${i}`);
      if (r) r.style.display = "none";
    }
  });
  const row = document.getElementById(`btp-edit-row-${idx}`);
  if (!row) return;
  const isOpen = row.style.display !== "none";
  row.style.display = isOpen ? "none" : "";
  if (!isOpen)
    setTimeout(() => {
      const i = document.getElementById(`btp-ap-inp-${idx}`);
      if (i) i.focus();
    }, 50);
}
function btp_saveAp(idx) {
  const v = parseFloat(document.getElementById(`btp-ap-inp-${idx}`)?.value);
  if (isNaN(v) || v < 50 || v > 150) return;
  btpState.bonds[idx].ap = v;
  btp_saveState();
  btp_renderTable();
}
function btp_clearAp(idx) {
  btpState.bonds[idx].ap = null;
  btp_saveState();
  btp_renderTable();
}
function btp_closeEdit(idx) {
  const r = document.getElementById(`btp-edit-row-${idx}`);
  if (r) r.style.display = "none";
}

// ── AGGIUNGI / RIMUOVI TITOLI ────────────────────────────────
function btp_toggleAddForm() {
  const f = document.getElementById("btp-add-form");
  if (!f) return;
  f.style.display = f.style.display === "none" ? "flex" : "none";
  const err = document.getElementById("btp-add-err");
  if (err) err.style.display = "none";
  if (f.style.display !== "none")
    setTimeout(() => document.getElementById("btp-add-isin")?.focus(), 50);
}
function btp_addBond() {
  const err = document.getElementById("btp-add-err");
  const showErr = (m) => {
    if (err) {
      err.textContent = m;
      err.style.display = "block";
    }
  };
  const isin = document
    .getElementById("btp-add-isin")
    .value.trim()
    .toUpperCase();
  const name = document.getElementById("btp-add-name").value.trim();
  const coupon = parseFloat(document.getElementById("btp-add-coupon").value);
  const mat = document.getElementById("btp-add-mat").value || null;
  const type = document.getElementById("btp-add-type").value || undefined;
  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin) && type !== "etf")
    return showErr("ISIN non valido (12 caratteri, es. IT0005668238).");
  if (!name) return showErr("Inserisci un nome per il titolo.");
  if (btpState.bonds.some((b) => b.id === isin))
    return showErr("Titolo già presente in lista.");
  const bond = {
    id: isin,
    name,
    coupon: isNaN(coupon) ? null : coupon,
    mat,
    yf: type === "etf" ? isin : isin + ".TI",
    price: null,
    pct: null,
    ap: null,
  };
  if (type) bond.special = type;
  btpState.bonds.push(bond);
  btp_saveState();
  document.getElementById("btp-add-isin").value = "";
  document.getElementById("btp-add-name").value = "";
  document.getElementById("btp-add-coupon").value = "";
  document.getElementById("btp-add-mat").value = "";
  document.getElementById("btp-add-type").value = "";
  btp_toggleAddForm();
  btp_renderTable();
  // fetch subito il prezzo del nuovo titolo
  const idx = btpState.bonds.length - 1;
  (async () => {
    try {
      const v =
        bond.special === "etf"
          ? await btp_fetchYF(bond.yf)
          : await btp_fetchBI(bond.id);
      btpState.bonds[idx].price = v.price;
      btpState.bonds[idx].pct = v.pct;
      btp_saveState();
      btp_render();
    } catch (e) {
      toast &&
        toast(
          "Prezzo non trovato per " + isin + " — inseriscilo manualmente (modifica)",
        );
    }
  })();
}
function btp_removeBond(idx) {
  const b = btpState.bonds[idx];
  if (!b) return;
  if (!confirm(`Rimuovere "${b.name}" dalla lista?`)) return;
  btpState.bonds.splice(idx, 1);
  btp_saveState();
  btp_render();
}

async function btp_fetchAll() {
  if (btp_fetching) return;
  btp_fetching = true;
  const btn = document.getElementById("btp-refreshBtn");
  if (btn) btn.textContent = "⟳ …";

  // ETF usa Yahoo Finance, BTP usa Borsa Italiana.
  // Concorrenza 5 (corsproxy è ~200ms/pagina). Snapshot dell'array e assegnazione per
  // RIFERIMENTO all'oggetto: un ordinamento/aggiunta/rimozione durante il fetch non scombina i prezzi.
  const snapshot = btpState.bonds.slice();
  let done = 0,
    failed = 0;
  const total = snapshot.length;
  await pMap(
    snapshot,
    async (b) => {
      try {
        const v =
          b.special === "etf"
            ? await btp_fetchYF(b.yf)
            : await btp_fetchBI(b.id);
        b.price = v.price;
        b.pct = v.pct;
      } catch (e) {
        failed++; /* mantiene ultimo prezzo noto */
      }
      done++;
      if (btn) btn.textContent = `⟳ ${done}/${total}`;
      if (done % 3 === 0) btp_renderTable(); // progressivo
    },
    5,
  );
  // se falliscono tutti e' il proxy, non il dato: dillo invece di lasciare "..." all'infinito
  btpState.fetchError =
    failed === total ? PROXY_LAST_ERROR || "proxy non raggiungibile" : null;

  // Spread BTP-Bund 10Y da Teleborsa (il rendimento 10Y è interpolato dai bond)
  try {
    btpState.spreadBund = await btp_fetchSpread();
  } catch (e) {}

  btpState.lastFetched = new Date().toISOString();
  btp_saveState();
  btp_render();
  if (btn) btn.textContent = "Aggiorna ora";
  btp_fetching = false;
  btp_loaded = true;
}

function btp_render() {
  btp_renderInfoBar();
  btp_renderTable();
  const el = document.getElementById("btp-lastUpdate");
  if (el && btpState.lastFetched)
    el.textContent = new Date(btpState.lastFetched).toLocaleTimeString("it-IT");
}

function btp_onTabOpen() {
  if (!btpState) btpState = btp_loadState();
  btp_render();
  if (!btp_loaded) btp_fetchAll();
}

export {
  btpState,
  btp_addBond,
  btp_clearAp,
  btp_closeEdit,
  btp_fetchAll,
  btp_netYield,
  btp_onTabOpen,
  btp_openEdit,
  btp_removeBond,
  btp_saveAp,
  btp_setSort,
  btp_toggleAddForm,
  btp_ytm,
};
