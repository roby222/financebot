import {
  closeDetail,
  closeDetailIfBg,
  openDetail,
  setDetailPeriod,
} from "./detail.js";
import {
  exportList,
  importList,
  removeItem,
} from "../features/etf/watchlist.js";
import { pickAC } from "./autocomplete.js";
import {
  sm_export,
  sm_refreshAll,
  sm_refreshOne,
  sm_reset,
  sm_saveInd,
  sm_toggleEdit,
} from "../features/semis/monitor.js";
import {
  mc_export,
  mc_refreshAll,
  mc_refreshOne,
  mc_reset,
  mc_saveInd,
  mc_toggleEdit,
} from "../features/macro/monitor.js";
import {
  bv_fetchAll,
  bv_openEdit,
  bv_saveEdit,
} from "../features/bonds/valuation.js";
import {
  btp_addBond,
  btp_clearAp,
  btp_closeEdit,
  btp_fetchAll,
  btp_openEdit,
  btp_removeBond,
  btp_saveAp,
  btp_setSort,
  btp_toggleAddForm,
} from "../features/btp/portfolio.js";
import { btp_openChart, btp_setChartPeriod } from "../features/btp/chart.js";
import { switchTab } from "./navigation.js";
import { manualRefresh } from "./refresh-timer.js";
import { closeHelp, closeHelpIfBg, openHelp, showSection } from "./help.js";
import { toggleLang } from "../core/i18n.js";
import { setScenario } from "../features/etf/macro-bar.js";
import { refreshSignals } from "../features/etf/refresh.js";
import { sortBy } from "../features/etf/table.js";
import { clearSigLog, toggleSigLog } from "../features/etf/signal-log.js";
import { toast } from "./toast.js";

function chooseImport() {
  document.getElementById("import-input").click();
}
function closeBondEdit() {
  document.getElementById("bv-italy-edit").style.display = "none";
}
const handlers = {
  openDetail,
  removeItem,
  pickAC,
  setDetailPeriod,
  sm_refreshOne,
  sm_toggleEdit,
  sm_saveInd,
  mc_refreshOne,
  mc_toggleEdit,
  mc_saveInd,
  bv_openEdit,
  bv_saveEdit,
  closeBondEdit,
  btp_clearAp,
  btp_openChart,
  btp_openEdit,
  btp_removeBond,
  btp_saveAp,
  btp_closeEdit,
  btp_setChartPeriod,
  switchTab,
  manualRefresh,
  openHelp,
  toggleLang,
  exportList,
  chooseImport,
  importList,
  setScenario,
  refreshSignals,
  sortBy,
  toggleSigLog,
  clearSigLog,
  sm_refreshAll,
  sm_export,
  sm_reset,
  mc_refreshAll,
  mc_export,
  mc_reset,
  bv_fetchAll,
  btp_toggleAddForm,
  btp_fetchAll,
  btp_addBond,
  btp_setSort,
  closeHelpIfBg,
  closeHelp,
  showSection,
  closeDetailIfBg,
  closeDetail,
};
const argumentTypes = {
  openDetail: ["string"],
  removeItem: ["string"],
  pickAC: ["number"],
  setDetailPeriod: ["string", "string"],
  sm_refreshOne: ["string"],
  sm_toggleEdit: ["string"],
  sm_saveInd: ["string"],
  mc_refreshOne: ["string"],
  mc_toggleEdit: ["string"],
  mc_saveInd: ["string"],
  bv_openEdit: ["string", "string", "number"],
  bv_saveEdit: ["string"],
  closeBondEdit: [],
  btp_clearAp: ["number"],
  btp_openChart: ["number"],
  btp_openEdit: ["number"],
  btp_removeBond: ["number"],
  btp_saveAp: ["number"],
  btp_closeEdit: ["number"],
  btp_setChartPeriod: ["string"],
  switchTab: ["string"],
  manualRefresh: [],
  openHelp: [],
  toggleLang: [],
  exportList: [],
  chooseImport: [],
  importList: ["event"],
  setScenario: ["string"],
  refreshSignals: ["boolean"],
  sortBy: ["string"],
  toggleSigLog: [],
  clearSigLog: ["event"],
  sm_refreshAll: [],
  sm_export: [],
  sm_reset: [],
  mc_refreshAll: [],
  mc_export: [],
  mc_reset: [],
  bv_fetchAll: [],
  btp_toggleAddForm: [],
  btp_fetchAll: [],
  btp_addBond: [],
  btp_setSort: ["string"],
  closeHelpIfBg: ["event"],
  closeHelp: [],
  showSection: ["string"],
  closeDetailIfBg: ["event"],
  closeDetail: [],
};
function initActions() {
  for (const eventName of ["click", "change", "mousedown"]) {
    document.addEventListener(eventName, (event) => {
      let element =
        event.target instanceof Element
          ? event.target.closest("[data-action]")
          : null;
      while (element) {
        if ((element.dataset.event || "click") === eventName) {
          const name = element.dataset.action;
          if (Object.hasOwn(handlers, name)) {
            const args = argumentTypes[name].map((type, index) => {
              const value = element.getAttribute("data-arg-" + index);
              return type === "event"
                ? event
                : type === "number"
                  ? Number(value)
                  : type === "boolean"
                    ? value === "true"
                    : value;
            });
            try {
              Promise.resolve(handlers[name](...args)).catch((error) => {
                console.error(error);
                toast("Operazione non riuscita", true);
              });
            } catch (error) {
              console.error(error);
              toast("Operazione non riuscita", true);
            }
          }
        }
        if (event.cancelBubble) break;
        element = element.parentElement?.closest("[data-action]");
      }
    });
  }
}

export { initActions };
