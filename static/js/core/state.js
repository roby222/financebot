import { storage } from "./storage.js";

const state = {
  quotes: {},
  signalCache: {},
  macroData: {},
  macroRegime: null,
  scenario: ["escalation", "tregua", "neutro", "volatile"].includes(
    storage.getItem("fpb_scenario"),
  )
    ? storage.getItem("fpb_scenario")
    : "neutro",
  scenarioManualOverride: false,
  currentTab: "signals",
  countdown: 60,
  cdTimer: null,
  sigFetching: false,
  sigLoaded: false,
  sortCol: null,
  sortDir: 1,
  extraItems: storage.readJSON("fpb_extra", [], Array.isArray),
  hiddenIds: new Set(storage.readJSON("fpb_hidden", [], Array.isArray)),
  WATCHLIST: [],
  detailCurrentItem: null,
  detailChartState: null,
};

export { state };
