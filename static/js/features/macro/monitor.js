import { storage } from "../../core/storage.js";
import { mc_DEFAULTS } from "./defaults.js";
import {
  sm_fmtDate,
  sm_fmtVal,
  sm_shortDate,
  sm_timeAgo,
} from "../../core/format.js";
import { state } from "../../core/state.js";
import { LANG, t } from "../../core/i18n.js";
import { sm_fetchNews, sm_fetchYahoo } from "../../services/research-data.js";

const mc_TIMEOUT = 15000;
const mc_STORAGE = "macro_monitor_v1";
const mc_AUTO_H = 2;
let mc_initialized = false;
const mc_charts = {};

function mc_loadState() {
  try {
    const s = storage.getItem(mc_STORAGE);
    if (s) {
      const p = JSON.parse(s);
      p.indicators = p.indicators
        .filter((i) => mc_DEFAULTS.indicators.find((x) => x.id === i.id))
        .map((i) => {
          const d = mc_DEFAULTS.indicators.find((x) => x.id === i.id);
          return Object.assign({}, d, i);
        });
      const seen = new Set(p.indicators.map((i) => i.id));
      mc_DEFAULTS.indicators.forEach((d) => {
        if (!seen.has(d.id)) p.indicators.push(JSON.parse(JSON.stringify(d)));
      });
      return p;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(mc_DEFAULTS));
}
function mc_saveState() {
  mcState.lastUpdate = new Date().toISOString();
  storage.setItem(mc_STORAGE, JSON.stringify(mcState));
  document.getElementById("mc-lastUpdate").textContent = sm_fmtDate(
    mcState.lastUpdate,
  );
}
let mcState = mc_loadState();

// ── update copper from macroData (called on tab open) ──
function mc_updateCopperCard() {
  const ind = mcState.indicators.find((i) => i.id === "copper_copm");
  if (!ind) return;
  const cu = state.macroData.copper;
  if (cu?.price != null) {
    const p = Math.round(cu.price);
    ind.value = p;
    ind.history[ind.history.length - 1] = p;
    ind.unit = "$/t (LME · COMEX HG=F)";
    // Status basato sul prezzo assoluto $/t, non sulla variazione daily
    // GREEN > $10k (bull super-cycle AI + elettrificazione)
    // YELLOW $8k–$10k (range storico normale)
    // RED < $8k (crollo strutturale domanda)
    ind.status = p >= 10000 ? "green" : p >= 8000 ? "yellow" : "red";
    ind.lastFetched = new Date().toISOString();
  }
  const q = state.quotes["COPM"];
  if (q?.price != null) {
    ind.proxy = {
      name: "COPM.MI",
      v:
        q.price.toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " EUR",
      chg: q.pct != null ? (q.pct * 100).toFixed(2) : null,
    };
  }
}

// ── threshold gauge ──
function mc_renderGauge(ind) {
  if (!ind.gaugeMin && ind.gaugeMin !== 0) return "";
  const min = ind.gaugeMin,
    max = ind.gaugeMax,
    breaks = ind.gaugeBreaks || [];
  const range = max - min;
  const colors = { red: "#f85149", yellow: "#d29922", green: "#3fb950" };
  // build gradient stops: red until first break, yellow until second, green after
  const statuses = ["red", ...breaks.map((b) => b.status || "yellow"), "green"];
  // derive segment statuses from threshold logic
  const segs = [];
  let cur = "red";
  const bpPcts = breaks.map((b) =>
    (((b.value - min) / range) * 100).toFixed(2),
  );
  let stops = [`${colors.red} 0%`];
  breaks.forEach((b, i) => {
    const pct = bpPcts[i];
    stops.push(`${colors[cur]} ${pct}%`);
    cur = i === 0 ? "yellow" : "green";
    stops.push(`${colors[cur]} ${pct}%`);
  });
  stops.push(`${colors[cur]} 100%`);
  const gradient = `linear-gradient(to right,${stops.join(",")})`; // taste-skill-ignore: gauge zones
  // marker
  const markerPct = Math.max(
    1,
    Math.min(99, ((ind.value - min) / range) * 100),
  ).toFixed(2);
  const fmtV = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`);
  const valLabel =
    ind.value >= 1000 ? `$${(ind.value / 1000).toFixed(1)}k` : `$${ind.value}`;
  // scale labels
  const scaleLbls = breaks
    .map((b, i) => `<span style="left:${bpPcts[i]}%">${b.label}</span>`)
    .join("");
  return `<div class="mc-gauge">
    <div class="mc-gauge-track" style="background:${gradient}">
      <div class="mc-gauge-marker" style="left:${markerPct}%">
        <div class="mc-gauge-needle"></div>
        <div class="mc-gauge-val">${valLabel}</div>
      </div>
    </div>
    <div class="mc-gauge-scale"><span>${fmtV(min)}</span>${scaleLbls}<span>${fmtV(max)}</span></div>
  </div>`;
}

// ── render cards ──
function mc_renderCards() {
  const grid = document.getElementById("mc-cardGrid");
  grid.innerHTML = "";
  mcState.indicators.forEach((ind) => {
    const card = document.createElement("div");
    card.className =
      "sm-card st-" + ind.status + (ind.fetching ? " fetching" : "");
    const prev = ind.history[ind.history.length - 2],
      curr = ind.history[ind.history.length - 1];
    let dc = "flat",
      dt = "flat";
    if (typeof prev === "number" && prev !== 0) {
      const pct = ((curr - prev) / Math.abs(prev)) * 100;
      if (Math.abs(pct) < 1) {
        dc = "flat";
        dt = "flat";
      } else if (pct > 0) {
        dt = "+" + pct.toFixed(1) + "% q/q";
        dc = ind.direction === "watch_overshoot" ? "flat" : "up";
      } else {
        dt = pct.toFixed(1) + "% q/q";
        dc = ind.direction === "lower_is_signal" ? "up" : "down";
      }
    }
    const isAuto = ind.autoMode === "sec_edgar" || ind.autoMode === "github";
    const autoBadge = isAuto
      ? '<span class="sm-badge auto">AUTO</span>'
      : '<span class="sm-badge manual">SEMI-AUTO</span>';
    const stLbl = {
      green: t("sm_st_green"),
      yellow: t("sm_st_yellow"),
      red: t("sm_st_red"),
    }[ind.status];
    let proxyHtml = "";
    if (ind.proxy) {
      const chgPart =
        ind.proxy.chg !== null && ind.proxy.chg !== undefined
          ? ` <span class="ch ${parseFloat(ind.proxy.chg) >= 0 ? "up" : "dn"}">${parseFloat(ind.proxy.chg) >= 0 ? "+" : ""}${ind.proxy.chg}%</span>`
          : "";
      proxyHtml = `<div class="sm-chips"><div class="sm-chip"><span class="lbl">${ind.proxy.name}:</span><span class="v">${ind.proxy.v}</span>${chgPart}</div></div>`;
    }
    const headlinesHtml =
      ind.headlines && ind.headlines.length > 0
        ? `<details class="sm-headlines"><summary>${t("sm_headlines_lbl", { n: ind.headlines.length, q: ind.newsQuery })}</summary><ul>${ind.headlines.map((h) => `<li><a href="${h.link}" target="_blank" rel="noopener">${h.title}</a><span class="when">${sm_shortDate(h.pubDate)}</span></li>`).join("")}</ul></details>`
        : "";
    const errHtml = ind.fetchError
      ? `<div class="sm-fetch-err">${t("sm_fetch_err")} ${ind.fetchError}</div>`
      : "";
    card.innerHTML = `
      <div class="sm-card-hdr">
        <div><h3>${ind.title}</h3></div>
        <div class="sm-badges">${autoBadge}<span class="sm-badge ${ind.status}">${stLbl}</span></div>
      </div>
      <div style="font-size:.72rem;color:var(--muted);line-height:1.4">${ind.subtitle}</div>
      <div class="sm-reading">
        <span class="val">${sm_fmtVal(ind.value)}</span>
        <span class="unit">${ind.unit}</span>
        <span class="delta ${dc}">${dt}</span>
      </div>
      ${proxyHtml}
      ${mc_renderGauge(ind)}
      <div class="sm-spark"><canvas id="mc-spark-${ind.id}"></canvas></div>
      <div class="sm-signal">${ind.signal}</div>
      ${headlinesHtml}${errHtml}
      ${ind.note ? `<div class="sm-note">${ind.note}</div>` : ""}
      <div class="sm-card-footer">
        <div style="flex:1;min-width:0">
          <div class="next">${t("sm_next_update")} <b>${ind.next}</b></div>
          <div class="sources" style="margin-top:3px">${ind.sources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.name} ${t("sm_ir_link")}</a>`).join("")}</div>
          <div class="stamp">${t("sm_autofetch")} ${sm_timeAgo(ind.lastFetched)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px">
          <button class="sm-edit-trigger" data-action="mc_refreshOne" data-arg-0="${ind.id}">${t("sm_fetch_btn")}</button>
          <button class="sm-edit-trigger" data-action="mc_toggleEdit" data-arg-0="${ind.id}">Edit</button>
        </div>
      </div>
      <div class="sm-edit-form" id="mc-ef-${ind.id}">
        <div class="row">
          <div><label>${t("sm_ef_value")}</label><input type="number" step="any" id="mc-val-${ind.id}" value="${ind.value}"></div>
          <div><label>${t("sm_ef_status")}</label><select id="mc-st-${ind.id}">
            <option value="green" ${ind.status === "green" ? "selected" : ""}>${t("sm_ef_green")}</option>
            <option value="yellow" ${ind.status === "yellow" ? "selected" : ""}>${t("sm_ef_yellow")}</option>
            <option value="red" ${ind.status === "red" ? "selected" : ""}>${t("sm_ef_red")}</option>
          </select></div>
        </div>
        <div><label>${t("sm_ef_append")}</label><input type="number" step="any" id="mc-app-${ind.id}" placeholder="${t("sm_ef_append_ph")}"></div>
        <div><label>${t("sm_ef_label")}</label><input type="text" id="mc-lbl-${ind.id}" placeholder="${t("sm_ef_label_ph")}"></div>
        <div><label>${t("sm_ef_note")}</label><textarea id="mc-note-${ind.id}">${ind.note || ""}</textarea></div>
        <div class="sm-ef-actions">
          <button class="sm-btn sec" data-action="mc_toggleEdit" data-arg-0="${ind.id}">${t("sm_ef_cancel")}</button>
          <button class="sm-btn" data-action="mc_saveInd" data-arg-0="${ind.id}">${t("sm_ef_save")}</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  mcState.indicators.forEach((ind) => mc_drawSparkline(ind));
}

function mc_drawSparkline(ind) {
  const ctx = document.getElementById("mc-spark-" + ind.id);
  if (!ctx) return;
  if (mc_charts[ind.id]) {
    mc_charts[ind.id].destroy();
    delete mc_charts[ind.id];
  }
  const cmap = { green: "#3fb950", yellow: "#d29922", red: "#f85149" };
  const col = cmap[ind.status];
  mc_charts[ind.id] = new Chart(ctx, {
    type: "line",
    data: {
      labels: ind.labels,
      datasets: [
        {
          data: ind.history,
          borderColor: col,
          backgroundColor: col + "22",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          pointBackgroundColor: col,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, displayColors: false },
      },
      scales: {
        x: {
          display: true,
          ticks: { font: { size: 8 }, color: "#8b949e" },
          grid: { display: false },
        },
        y: { display: false },
      },
    },
  });
}

function mc_toggleEdit(id) {
  document.getElementById("mc-ef-" + id).classList.toggle("open");
}
function mc_saveInd(id) {
  const ind = mcState.indicators.find((i) => i.id === id);
  if (!ind) return;
  ind.value = parseFloat(document.getElementById("mc-val-" + id).value) || 0;
  ind.status = document.getElementById("mc-st-" + id).value;
  const app = document.getElementById("mc-app-" + id).value;
  if (app !== "" && !isNaN(parseFloat(app))) {
    ind.history.push(parseFloat(app));
    ind.labels.push(document.getElementById("mc-lbl-" + id).value || "new");
    if (ind.history.length > 12) {
      ind.history.shift();
      ind.labels.shift();
    }
  }
  ind.note = document.getElementById("mc-note-" + id).value || "";
  mc_saveState();
  mc_renderCards();
}
async function mc_refreshOne(id) {
  const ind = mcState.indicators.find((i) => i.id === id);
  if (!ind) return;
  await mc_refreshIndicator(ind);
  mc_saveState();
  mc_renderCards();
}
function mc_export() {
  const blob = new Blob(
    [
      JSON.stringify(
        { exported_at: new Date().toISOString(), state: mcState },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "macro_monitor_" + new Date().toISOString().split("T")[0] + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function mc_reset() {
  if (
    confirm("Resettare tutti i valori ai default? Le note saranno cancellate.")
  ) {
    storage.removeItem(mc_STORAGE);
    mcState = JSON.parse(JSON.stringify(mc_DEFAULTS));
    mc_renderCards();
    mc_refreshAll();
  }
}

async function mc_refreshIndicator(ind) {
  ind.fetching = true;
  ind.fetchError = null;
  mc_renderCards();
  try {
    const tasks = {};
    if (ind.newsQuery) tasks.news = sm_fetchNews(ind.newsQuery);
    if (ind.proxyTicker) tasks.proxy = sm_fetchYahoo(ind.proxyTicker);
    const keys = Object.keys(tasks);
    const results = await Promise.allSettled(Object.values(tasks));
    const out = {};
    keys.forEach((k, i) => {
      out[k] = results[i].status === "fulfilled" ? results[i].value : null;
    });
    if (out.news) ind.headlines = out.news;
    if (out.proxy) {
      const chg = ((out.proxy.price - out.proxy.prev) / out.proxy.prev) * 100;
      ind.proxy = {
        name: ind.proxyLabel || ind.proxyTicker,
        v: out.proxy.price.toFixed(2),
        chg: chg.toFixed(2),
      };
    }
    ind.lastFetched = new Date().toISOString();
  } catch (e) {
    ind.fetchError = e.message || String(e);
  } finally {
    ind.fetching = false;
  }
}

async function mc_refreshAll() {
  const btn = document.getElementById("mc-refreshBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="sm-spinner"></span> ${t("sm_refreshing")}`;
  for (const ind of mcState.indicators) await mc_refreshIndicator(ind);
  mc_saveState();
  mc_renderCards();
  btn.disabled = false;
  btn.innerHTML = t("sm_refresh_btn");
}

/* ═══════════════════════════════════════════════════════════ */
function mc_onTabOpen() {
  const todayFmt = new Date().toLocaleDateString(
    LANG === "it" ? "it-IT" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" },
  );
  document.getElementById("mc-todayDate").textContent =
    (LANG === "it" ? "Oggi: " : "Today: ") + todayFmt;
  document.getElementById("mc-lastUpdate").textContent = mcState.lastUpdate
    ? sm_fmtDate(mcState.lastUpdate)
    : LANG === "it"
      ? "mai (dati seed)"
      : "never (seed data)";
  mc_updateCopperCard();
  mc_renderCards();
  if (!mc_initialized) {
    mc_initialized = true;
    const oldest = mcState.indicators.reduce((min, i) => {
      if (!i.lastFetched) return 0;
      return Math.min(min, new Date(i.lastFetched).getTime());
    }, Date.now());
    const ageMs = oldest === 0 ? Infinity : Date.now() - oldest;
    if (ageMs > mc_AUTO_H * 3600000) setTimeout(mc_refreshAll, 400);
  }
}

export {
  mc_export,
  mc_onTabOpen,
  mc_refreshAll,
  mc_refreshOne,
  mc_reset,
  mc_saveInd,
  mc_toggleEdit,
};
