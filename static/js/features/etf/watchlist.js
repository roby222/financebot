import { allItems } from "./watchlist-store.js";
import { storage } from "../../core/storage.js";
import { state } from "../../core/state.js";
import { toast } from "../../ui/toast.js";
import { t } from "../../core/i18n.js";
import { YF_SRCH, proxiedFetch } from "../../core/network.js";
import { fetchLive } from "../../services/market-data.js";
import { render } from "./table.js";
import { resetCountdown } from "../../ui/refresh-timer.js";
import { refreshAll } from "./refresh.js";

/* ═══════════════════════════════════════════════════════════
   WATCHLIST  (18 titoli pre-caricati)
═══════════════════════════════════════════════════════════ */
// Watchlist caricata da watchlist.json all'avvio (fallback hardcodato se fetch non disponibile)
/* ═══════════════════════════════════════════════════════════
   SYMBOL MANAGEMENT
═══════════════════════════════════════════════════════════ */

async function addCustom(sym, displayName = "") {
  const s = sym.trim().toUpperCase();
  if (!s) return;
  if (allItems().find((i) => i.id === s || i.yf === s)) {
    toast(t("toast_already", { id: s }));
    return;
  }
  const item = { id: s, name: displayName || s, yf: s };
  state.extraItems.push(item);
  storage.setItem("fpb_extra", JSON.stringify(state.extraItems));
  toast(t("toast_added", { id: s }));
  document.getElementById("add-btn").disabled = true;
  // Se il nome non è noto (inserimento manuale), prova a risolverlo via search
  if (!displayName) {
    try {
      const r = await proxiedFetch(YF_SRCH + encodeURIComponent(s));
      const j = await r.json();
      const match = (j.quotes || []).find((q) => q.symbol === s);
      if (match) {
        item.name = match.longname || match.shortname || s;
        storage.setItem("fpb_extra", JSON.stringify(state.extraItems));
      }
    } catch {}
  }
  const q = await fetchLive(item);
  if (q) state.quotes[item.id] = q;
  document.getElementById("add-btn").disabled = false;
  render();
  resetCountdown();
}

function removeItem(id) {
  // Se è un extra, eliminalo dall'array; se è in watchlist, nascondilo
  const isExtra = state.extraItems.find((i) => i.id === id);
  if (isExtra) {
    state.extraItems = state.extraItems.filter((i) => i.id !== id);
    storage.setItem("fpb_extra", JSON.stringify(state.extraItems));
  } else {
    state.hiddenIds.add(id);
    storage.setItem("fpb_hidden", JSON.stringify([...state.hiddenIds]));
  }
  delete state.quotes[id];
  delete state.signalCache[id];
  render();
  toast(t("toast_removed", { id }));
}

/* ═══════════════════════════════════════════════════════════
   EXPORT / IMPORT LISTA
═══════════════════════════════════════════════════════════ */

function exportList() {
  const data = {
    version: 2,
    watchlist: allItems().map(({ id, name, yf, driver, dEmoji, regime }) => ({
      id,
      name,
      yf,
      ...(driver ? { driver } : {}),
      ...(dEmoji ? { dEmoji } : {}),
      ...(regime ? { regime } : {}),
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `financebot-lista-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(t("toast_exported"));
}

function importList(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (
        !data.version ||
        (!Array.isArray(data.watchlist) && !Array.isArray(data.extra))
      )
        throw new Error("Formato non riconosciuto");

      const existingIds = new Set(allItems().map((i) => i.id));
      const defaultIds = new Set(state.WATCHLIST.map((i) => i.id));
      const items = data.version >= 2 ? data.watchlist : data.extra || [];
      let added = 0;
      items.forEach((item) => {
        if (!item.id) return;
        if (existingIds.has(item.id)) return; // già presente → salta
        if (defaultIds.has(item.id)) {
          state.hiddenIds.delete(item.id); // era stato rimosso → ripristina
        } else {
          state.extraItems.push(item); // nuovo → aggiungi
        }
        existingIds.add(item.id);
        added++;
      });
      storage.setItem("fpb_extra", JSON.stringify(state.extraItems));
      storage.setItem("fpb_hidden", JSON.stringify([...state.hiddenIds]));
      Object.keys(state.quotes).forEach((id) => {
        delete state.quotes[id];
        delete state.signalCache[id];
      });
      render();
      refreshAll();
      toast(t("toast_imported", { n: added }));
    } catch {
      toast(t("toast_invalid"), true);
    }
    e.target.value = ""; // reset input per permettere reimport dello stesso file
  };
  reader.readAsText(file);
}

export { addCustom, removeItem, exportList, importList };
