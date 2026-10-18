import { addCustom } from "../features/etf/watchlist.js";
import { YF_SRCH, proxiedFetch } from "../core/network.js";

/* ═══════════════════════════════════════════════════════════
   AUTOCOMPLETE
═══════════════════════════════════════════════════════════ */

const inp = document.getElementById("sym-input");
const acDrop = document.getElementById("ac-drop");
let acResults = [],
  acIdx = -1,
  acDebounce = null;

function closeAC() {
  acDrop.classList.remove("open");
  acDrop.innerHTML = "";
  acResults = [];
  acIdx = -1;
}

function renderAC(items) {
  acResults = items;
  acIdx = -1;
  if (!items.length) {
    closeAC();
    return;
  }
  acDrop.innerHTML = items
    .map(
      (r, i) => `
    <div class="ac-item" data-i="${i}" data-action="pickAC" data-event="mousedown" data-arg-0="${i}">
      <div class="ac-left">
        <span class="ac-sym">${r.symbol}</span>
        <span class="ac-name">${r.name || "—"}</span>
      </div>
      <div class="ac-tags">
        ${r.type ? `<span class="ac-tag">${r.type}</span>` : ""}
        ${r.exchange ? `<span class="ac-tag ex">${r.exchange}</span>` : ""}
      </div>
    </div>`,
    )
    .join("");
  acDrop.classList.add("open");
}

function focusAC(idx) {
  acDrop
    .querySelectorAll(".ac-item")
    .forEach((el, i) => el.classList.toggle("focused", i === idx));
  acIdx = idx;
  if (idx >= 0) inp.value = acResults[idx].symbol;
}

function pickAC(i) {
  const r = acResults[i];
  if (!r) return;
  inp.value = "";
  closeAC();
  addCustom(r.symbol, r.name);
}

function initAutocomplete() {
  inp.addEventListener("input", () => {
    clearTimeout(acDebounce);
    const q = inp.value.trim();
    if (!q) {
      closeAC();
      return;
    }
    acDebounce = setTimeout(async () => {
      try {
        const url = YF_SRCH + encodeURIComponent(q);
        const r = await proxiedFetch(url);
        const j = await r.json();
        renderAC(
          (j.quotes || []).map((x) => ({
            symbol: x.symbol,
            name: x.longname || x.shortname || "",
            type: x.quoteType || "",
            exchange: x.exchDisp || x.exchange || "",
          })),
        );
      } catch {
        closeAC();
      }
    }, 260);
  });

  inp.addEventListener("keydown", (e) => {
    if (!acDrop.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusAC(Math.min(acIdx + 1, acResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusAC(Math.max(acIdx - 1, -1));
      if (acIdx < 0) inp.value = "";
    } else if (e.key === "Escape") closeAC();
  });
  inp.addEventListener("blur", () => setTimeout(closeAC, 120));

  document.getElementById("add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = inp.value.trim().toUpperCase();
    if (!v) return;
    inp.value = "";
    closeAC();
    addCustom(v);
  });
}

export { initAutocomplete, pickAC };
