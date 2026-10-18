import { closeDetail } from "./detail.js";

/* ═══════════════════════════════════════════════════════════
   HELP MODAL
═══════════════════════════════════════════════════════════ */
function openHelp() {
  document.getElementById("help-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeHelp() {
  document.getElementById("help-overlay").classList.add("hidden");
  document.body.style.overflow = "";
}
function closeHelpIfBg(e) {
  if (e.target === document.getElementById("help-overlay")) closeHelp();
}
function showSection(id) {
  document
    .querySelectorAll(".help-section")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(".help-nav a")
    .forEach((a) => a.classList.remove("active"));
  const sec = document.getElementById("sec-" + id);
  if (sec) sec.classList.add("active");
  const nav = document.querySelector(
    `.help-nav a[data-action="showSection"][data-arg-0="${id}"]`,
  );
  if (nav) nav.classList.add("active");
  document.querySelector(".help-content").scrollTop = 0;
}
function initHelp() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeHelp();
      closeDetail();
    }
  });
}

export { closeHelp, closeHelpIfBg, initHelp, openHelp, showSection };
