import { storage } from "./storage.js";
import { STRINGS } from "../data/translations.js";

/* ═══════════════════════════════════════════════════════════
   I18N
═══════════════════════════════════════════════════════════ */
const BROWSER_LANG = (globalThis.navigator?.language || "en")
  .toLowerCase()
  .startsWith("it")
  ? "it"
  : "en";
let LANG = (() => {
  try {
    return ["it", "en"].includes(storage.getItem("fpb_lang"))
      ? storage.getItem("fpb_lang")
      : BROWSER_LANG;
  } catch (e) {
    return BROWSER_LANG;
  }
})();

function t(key, vars) {
  const s = STRINGS[LANG] || STRINGS.en;
  let str = s[key] ?? STRINGS.en[key] ?? key;
  if (vars)
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll("{" + k + "}", v);
    });
  return str;
}

function applyI18n() {
  // text nodes
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    const s = STRINGS[LANG]?.[k] ?? STRINGS.en[k];
    if (s != null) el.textContent = s;
  });
  // placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const k = el.dataset.i18nPlaceholder;
    const s = STRINGS[LANG]?.[k] ?? STRINGS.en[k];
    if (s != null) el.placeholder = s;
  });
  // title attribute
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const k = el.dataset.i18nTitle;
    const s = STRINGS[LANG]?.[k] ?? STRINGS.en[k];
    if (s != null) el.title = s;
  });
  // innerHTML (help sections)
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const k = el.dataset.i18nHtml;
    const s = STRINGS[LANG]?.[k] ?? STRINGS.en[k];
    if (s != null) el.innerHTML = s;
  });
  // help title (has inner span)
  const helpTitle = document.querySelector('[data-i18n="help_title"]');
  if (helpTitle) helpTitle.innerHTML = t("help_title");
  // lang button flag
  const langBtn = document.getElementById("lang-btn");
  if (langBtn) langBtn.textContent = LANG === "it" ? "🇬🇧" : "🇮🇹";
  langBtn.title = LANG === "it" ? "Switch to English" : "Passa all'italiano";
  // help button title
  const helpBtn = document.getElementById("help-btn");
  if (helpBtn) helpBtn.title = LANG === "it" ? "Guida completa" : "Full guide";
  document.documentElement.lang = LANG;
  document.dispatchEvent(new Event("dashboard:languagechange"));
}

function toggleLang() {
  LANG = LANG === "it" ? "en" : "it";
  try {
    storage.setItem("fpb_lang", LANG);
  } catch (e) {}
  applyI18n();
}

export { LANG, applyI18n, t, toggleLang };
