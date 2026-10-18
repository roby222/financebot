let toastTmr = null;
function toast(msg, err = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "show" + (err ? " err" : "");
  clearTimeout(toastTmr);
  toastTmr = setTimeout(() => (el.className = ""), 3000);
}

export { toast };
