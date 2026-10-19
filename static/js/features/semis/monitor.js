import {
  sm_fmtDate,
  sm_timeAgo,
  sm_fmtVal,
  sm_shortDate,
} from "../../core/format.js";
import { storage } from "../../core/storage.js";
import { sm_DEFAULTS, sm_THESIS } from "./defaults.js";
import {
  sm_fetchGithub,
  sm_fetchNews,
  sm_fetchSecConcept,
  sm_fetchYahoo,
} from "../../services/research-data.js";
import { LANG, t } from "../../core/i18n.js";
import { sm_refreshTickers } from "./tickers.js";

const sm_STORAGE = "semis_ai_monitor_v2";
const sm_AUTO_H = 2;
let sm_initialized = false;
const sm_charts = {}; // canvas id → Chart instance

// ── state ──
function sm_loadState() {
  try {
    const s = storage.getItem(sm_STORAGE);
    if (s) {
      const p = JSON.parse(s);
      const stale = (p._v || 0) < (sm_DEFAULTS._v || 0);
      p.indicators = p.indicators
        .filter((i) => sm_DEFAULTS.indicators.find((x) => x.id === i.id))
        .map((i) => {
          const d = sm_DEFAULTS.indicators.find((x) => x.id === i.id);
          // Se i defaults sono più nuovi, usa i valori aggiornati dal codice; preserva solo la nota utente
          if (stale) return Object.assign({}, d, { note: i.note || "" });
          return Object.assign({}, d, i);
        });
      // Aggiunge indicatori nuovi dai defaults non ancora in localStorage
      const seen = new Set(p.indicators.map((i) => i.id));
      sm_DEFAULTS.indicators.forEach((d) => {
        if (!seen.has(d.id)) p.indicators.push(JSON.parse(JSON.stringify(d)));
      });
      // Il calendario viene sempre dal codice, non da localStorage
      p.calendar = sm_DEFAULTS.calendar;
      p._v = sm_DEFAULTS._v;
      return p;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(sm_DEFAULTS));
}
function sm_saveState() {
  smState.lastUpdate = new Date().toISOString();
  storage.setItem(sm_STORAGE, JSON.stringify(smState));
  document.getElementById("sm-lastUpdate").textContent = sm_fmtDate(
    smState.lastUpdate,
  );
}
let smState = sm_loadState();

// ── per-indicator refresh ──
async function sm_refreshIndicator(ind) {
  ind.fetching = true;
  ind.fetchError = null;
  sm_renderCards();
  try {
    const tasks = {};
    if (ind.newsQuery) tasks.news = sm_fetchNews(ind.newsQuery);
    if (ind.proxyTicker) tasks.proxy = sm_fetchYahoo(ind.proxyTicker);
    if (ind.basket)
      tasks.basket = Promise.all(
        ind.basket.map((s) => sm_fetchYahoo(s).catch(() => null)),
      ).then((a) => a.filter(Boolean));
    if (ind.autoMode === "sec_edgar" && ind.secCik) {
      tasks.inv = sm_fetchSecConcept(ind.secCik, "InventoryNet").catch(
        () => null,
      );
      tasks.cogs = sm_fetchSecConcept(ind.secCik, "CostOfRevenue").catch(
        () => null,
      );
    }
    if (ind.autoMode === "github" && ind.githubRepos)
      tasks.github = Promise.all(
        ind.githubRepos.map((r) =>
          sm_fetchGithub(r.owner, r.repo)
            .then((d) => ({ ...r, data: d }))
            .catch(() => null),
        ),
      ).then((a) => a.filter(Boolean));

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
    if (out.basket && out.basket.length > 0) {
      const avg =
        out.basket
          .map((b) => ((b.price - b.prev) / b.prev) * 100)
          .reduce((a, b) => a + b, 0) / out.basket.length;
      ind.proxy = {
        name: ind.basketLabel || "Basket",
        v: (avg >= 0 ? "+" : "") + avg.toFixed(2) + "%",
        chg: null,
      };
    }
    if (ind.autoMode === "sec_edgar" && out.inv && out.cogs) {
      const srt = (a, b) => new Date(b.end) - new Date(a.end);
      const invU = out.inv.units?.USD || [];
      const cogsU = out.cogs.units?.USD || [];
      const lastInv = invU.sort(srt)[0];
      const lastCogs =
        cogsU
          .filter((c) => c.fp && (c.fp.startsWith("Q") || c.fp === "FY"))
          .sort(srt)
          .find((c) => c.end === lastInv?.end && c.fp?.startsWith("Q")) ||
        cogsU.sort(srt)[0];
      if (lastInv && lastCogs) {
        const days = Math.round((lastInv.val / lastCogs.val) * 90);
        const lbl =
          "Q" +
          lastCogs.fp.replace("Q", "") +
          " " +
          lastInv.end.substring(2, 4);
        if (!ind.labels.includes(lbl) && Math.abs(days - ind.value) > 0) {
          ind.history.push(days);
          ind.labels.push(lbl);
          if (ind.history.length > 8) {
            ind.history.shift();
            ind.labels.shift();
          }
        }
        ind.value = days;
        ind.unit = `giorni · as of ${lastInv.end} (${lastCogs.fp})`;
        ind.status = days >= 75 ? "red" : days >= 60 ? "yellow" : "green";
      }
    }
    if (out.github && out.github.length > 0) {
      ind.github = out.github.map((g) => ({
        label: g.label,
        stars: g.data.stargazers_count,
        forks: g.data.forks_count,
      }));
      const rocm = ind.github.find((g) => g.label === "ROCm");
      if (rocm)
        ind.proxy = ind.proxy || {
          name: "ROCm stars",
          v: rocm.stars.toLocaleString(),
          chg: null,
        };
    }
    ind.lastFetched = new Date().toISOString();
  } catch (e) {
    ind.fetchError = e.message || String(e);
  } finally {
    ind.fetching = false;
  }
}

async function sm_refreshAll() {
  const btn = document.getElementById("sm-refreshBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="sm-spinner"></span> ${t("sm_refreshing")}`;
  const tickerTask = sm_refreshTickers();
  for (const ind of smState.indicators) await sm_refreshIndicator(ind);
  await tickerTask;
  sm_saveState();
  sm_renderAll();
  btn.disabled = false;
  btn.innerHTML = t("sm_refresh_btn");
}

// ── composite ──
function sm_composite() {
  const c = { green: 0, yellow: 0, red: 0 };
  smState.indicators.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
  const raw = c.yellow * 1 + c.red * 2;
  let label, color, narrative;
  if (raw <= 2) {
    label = t("sm_comp_expansion");
    color = "var(--sc-green)";
    narrative = t("sm_narr_expansion");
  } else if (raw <= 6) {
    label = t("sm_comp_latecycle");
    color = "var(--sc-yellow)";
    narrative = t("sm_narr_latecycle");
  } else {
    label = t("sm_comp_digestion");
    color = "var(--sc-red)";
    narrative = t("sm_narr_digestion");
  }
  return { c, raw, label, color, narrative };
}

function sm_renderComposite() {
  const comp = sm_composite();
  const circle = document.getElementById("sm-scoreCircle");
  circle.style.background = comp.color;
  document.getElementById("sm-scoreValue").textContent = comp.raw + "/12";
  document.getElementById("sm-scoreStatus").textContent = comp.label;
  document.getElementById("sm-narrative").textContent = comp.narrative;
  const pills = document.getElementById("sm-breakdown");
  pills.innerHTML = "";
  const cfg = {
    green: {
      bg: "var(--sc-green-bg)",
      c: "var(--sc-green)",
      l: t("sm_col_green"),
    },
    yellow: {
      bg: "var(--sc-yellow-bg)",
      c: "var(--sc-yellow)",
      l: t("sm_col_yellow"),
    },
    red: { bg: "var(--sc-red-bg)", c: "var(--sc-red)", l: t("sm_col_red") },
  };
  ["green", "yellow", "red"].forEach((s) => {
    const d = document.createElement("div");
    d.className = "sm-pill";
    d.style.background = cfg[s].bg;
    d.style.color = cfg[s].c;
    d.innerHTML = `<span class="dot" style="background:${cfg[s].c}"></span>${comp.c[s] || 0} ${cfg[s].l}`;
    pills.appendChild(d);
  });
}

function sm_renderCards() {
  const grid = document.getElementById("sm-cardGrid");
  grid.innerHTML = "";
  smState.indicators.forEach((ind) => {
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
    if (ind.github && ind.github.length > 0) {
      proxyHtml =
        '<div class="sm-chips">' +
        ind.github
          .map(
            (g) =>
              `<div class="sm-chip"><span class="lbl">${g.label}:</span><span class="v">${g.stars.toLocaleString()} stelle</span></div>`,
          )
          .join("") +
        "</div>";
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
      <div style="font-size: 1rem;color:var(--muted);line-height:1.4">${ind.subtitle}</div>
      <div class="sm-reading">
        <span class="val">${sm_fmtVal(ind.value)}</span>
        <span class="unit">${ind.unit}</span>
        <span class="delta ${dc}">${dt}</span>
      </div>
      ${proxyHtml}
      <div class="sm-spark"><canvas id="sm-spark-${ind.id}"></canvas></div>
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
          <button class="sm-edit-trigger" data-action="sm_refreshOne" data-arg-0="${ind.id}">${t("sm_fetch_btn")}</button>
          <button class="sm-edit-trigger" data-action="sm_toggleEdit" data-arg-0="${ind.id}">Edit</button>
        </div>
      </div>
      <div class="sm-edit-form" id="sm-ef-${ind.id}">
        <div class="row">
          <div><label>${t("sm_ef_value")}</label><input type="number" step="any" id="sm-val-${ind.id}" value="${ind.value}"></div>
          <div><label>${t("sm_ef_status")}</label><select id="sm-st-${ind.id}">
            <option value="green" ${ind.status === "green" ? "selected" : ""}>${t("sm_ef_green")}</option>
            <option value="yellow" ${ind.status === "yellow" ? "selected" : ""}>${t("sm_ef_yellow")}</option>
            <option value="red" ${ind.status === "red" ? "selected" : ""}>${t("sm_ef_red")}</option>
          </select></div>
        </div>
        <div><label>${t("sm_ef_append")}</label><input type="number" step="any" id="sm-app-${ind.id}" placeholder="${t("sm_ef_append_ph")}"></div>
        <div><label>${t("sm_ef_label")}</label><input type="text" id="sm-lbl-${ind.id}" placeholder="${t("sm_ef_label_ph")}"></div>
        <div><label>${t("sm_ef_note")}</label><textarea id="sm-note-${ind.id}">${ind.note || ""}</textarea></div>
        <div class="sm-ef-actions">
          <button class="sm-btn sec" data-action="sm_toggleEdit" data-arg-0="${ind.id}">${t("sm_ef_cancel")}</button>
          <button class="sm-btn" data-action="sm_saveInd" data-arg-0="${ind.id}">${t("sm_ef_save")}</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  smState.indicators.forEach((ind) => sm_drawSparkline(ind));
}

function sm_drawSparkline(ind) {
  const ctx = document.getElementById("sm-spark-" + ind.id);
  if (!ctx) return;
  if (sm_charts[ind.id]) {
    sm_charts[ind.id].destroy();
    delete sm_charts[ind.id];
  }
  const cmap = { green: "#3fb950", yellow: "#d29922", red: "#f85149" };
  const col = cmap[ind.status];
  sm_charts[ind.id] = new Chart(ctx, {
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

function sm_renderCalendar() {
  const tbody = document.querySelector("#sm-calTable tbody");
  tbody.innerHTML = "";
  const today = new Date();
  const months = {
    gen: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    mag: 4,
    giu: 5,
    lug: 6,
    ago: 7,
    set: 8,
    ott: 9,
    nov: 10,
    dic: 11,
  };
  smState.calendar.forEach((row) => {
    const tr = document.createElement("tr");
    const m = row.date.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
    if (m) {
      const mo = months[m[2].toLowerCase().substring(0, 3)];
      if (mo !== undefined) {
        const ev = new Date(parseInt(m[3]), mo, parseInt(m[1]));
        const diff = (ev - today) / 86400000;
        if (diff >= 0 && diff <= 14) tr.classList.add("imminent");
      }
    }
    tr.innerHTML = `<td class="date">${row.date}</td><td class="ticker">${row.ticker}<div style="font-weight:400;color:var(--muted);font-size: 0.82rem">${row.what}</div></td><td class="matters">${row.matters}</td><td><a href="${row.url}" target="_blank" rel="noopener">IR →</a></td>`;
    tbody.appendChild(tr);
  });
}

function sm_renderThesis() {
  const dash = document.getElementById("sm-thDash");
  if (!dash) return;
  dash.innerHTML = "";
  sm_THESIS.dashboard.forEach((row) => {
    let st = row.status || "green";
    if (row.indId) {
      const ind = smState.indicators.find((i) => i.id === row.indId);
      if (ind) st = ind.status;
    }
    const r = document.createElement("div");
    r.className = "sm-th-row";
    r.innerHTML = `<span class="th-dot ${st}"></span><span class="th-lbl">${row.label}</span><span class="th-red">RED: ${row.redIf}</span>`;
    dash.appendChild(r);
  });
  // update verdict badge class
  const vEl = document.getElementById("sm-thVerdict");
  if (vEl) {
    vEl.className = "sm-verdict " + sm_THESIS.verdict;
  }
  const vr = document.getElementById("sm-thVer");
  if (vr) {
    vr.textContent = sm_THESIS.version + " · " + sm_THESIS.date;
  }
}
function sm_renderAll() {
  sm_renderComposite();
  sm_renderThesis();
  sm_renderCards();
  sm_renderCalendar();
}

function sm_toggleEdit(id) {
  document.getElementById("sm-ef-" + id).classList.toggle("open");
}
function sm_saveInd(id) {
  const ind = smState.indicators.find((i) => i.id === id);
  if (!ind) return;
  ind.value = parseFloat(document.getElementById("sm-val-" + id).value) || 0;
  ind.status = document.getElementById("sm-st-" + id).value;
  const app = document.getElementById("sm-app-" + id).value;
  if (app !== "" && !isNaN(parseFloat(app))) {
    ind.history.push(parseFloat(app));
    ind.labels.push(document.getElementById("sm-lbl-" + id).value || "new");
    if (ind.history.length > 12) {
      ind.history.shift();
      ind.labels.shift();
    }
  }
  ind.note = document.getElementById("sm-note-" + id).value || "";
  sm_saveState();
  sm_renderAll();
}
async function sm_refreshOne(id) {
  const ind = smState.indicators.find((i) => i.id === id);
  if (!ind) return;
  await sm_refreshIndicator(ind);
  sm_saveState();
  sm_renderAll();
}
function sm_export() {
  const blob = new Blob(
    [
      JSON.stringify(
        { exported_at: new Date().toISOString(), state: smState },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "semis_monitor_" + new Date().toISOString().split("T")[0] + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function sm_reset() {
  if (
    confirm("Resettare tutti i valori ai default? Le note saranno cancellate.")
  ) {
    storage.removeItem(sm_STORAGE);
    smState = JSON.parse(JSON.stringify(sm_DEFAULTS));
    sm_renderAll();
    sm_refreshAll();
  }
}

// ── lazy init (called on first tab open) ──
function sm_onTabOpen() {
  const todayFmt = new Date().toLocaleDateString(
    LANG === "it" ? "it-IT" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" },
  );
  document.getElementById("sm-todayDate").textContent =
    (LANG === "it" ? "Oggi: " : "Today: ") + todayFmt;
  document.getElementById("sm-lastUpdate").textContent = smState.lastUpdate
    ? sm_fmtDate(smState.lastUpdate)
    : LANG === "it"
      ? "mai (dati seed)"
      : "never (seed data)";
  sm_renderAll();
  if (!sm_initialized) {
    sm_initialized = true;
    const oldest = smState.indicators.reduce((min, i) => {
      if (!i.lastFetched) return 0;
      return Math.min(min, new Date(i.lastFetched).getTime());
    }, Date.now());
    const ageMs = oldest === 0 ? Infinity : Date.now() - oldest;
    if (ageMs > sm_AUTO_H * 3600000) setTimeout(sm_refreshAll, 400);
    else sm_refreshTickers();
  }
}

export {
  sm_export,
  sm_initialized,
  sm_onTabOpen,
  sm_refreshAll,
  sm_refreshOne,
  sm_reset,
  sm_saveInd,
  sm_toggleEdit,
};
