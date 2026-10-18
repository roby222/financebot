import { state } from "../core/state.js";

function drawPriceChart(canvas, pts, range, hoverIdx) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const VOL_H = 48; // height of volume section
  const VOL_GAP = 10; // gap between price chart and volume bars
  const PAD = { top: 16, right: 16, bottom: 30 + VOL_GAP + VOL_H, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  if (!pts.length) {
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Nessun dato", W / 2, H / 2);
    return;
  }

  const closes = pts.map((p) => p.c);
  const minV = Math.min(...closes);
  const maxV = Math.max(...closes);
  const spread = maxV - minV || maxV * 0.01;
  const yScale = cH / (spread * 1.1);
  const yBase = minV - spread * 0.05;

  const toX = (i) => PAD.left + (i / (pts.length - 1)) * cW;
  const toY = (v) => PAD.top + cH - (v - yBase) * yScale;

  // volume layout (used in both volume bars and crosshair sections)
  const volY0 = PAD.top + cH + VOL_GAP;
  const vols = pts.map((p) => p.v ?? 0);
  const maxVol = Math.max(...vols, 1);
  const barW = Math.max(1, cW / pts.length - 1);

  const isDown = closes[closes.length - 1] < closes[0];
  const lineColor = isDown ? "#f85149" : "#3fb950";

  // save state for hover hit-testing
  state.detailChartState = {
    pts,
    PAD,
    cW,
    cH,
    W,
    H,
    range,
    lineColor,
    yBase,
    yScale,
  };

  // gradient fill
  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
  grad.addColorStop(0, isDown ? "rgba(248,81,73,.22)" : "rgba(63,185,80,.22)");
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = toX(i),
      y = toY(p.c);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(toX(pts.length - 1), PAD.top + cH);
  ctx.lineTo(toX(0), PAD.top + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = toX(i),
      y = toY(p.c);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Y axis
  ctx.fillStyle = "#8b949e";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const v = yBase + spread * 1.1 * (i / yTicks);
    const y = toY(v);
    ctx.fillText(
      v.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      PAD.left - 4,
      y + 4,
    );
    ctx.beginPath();
    ctx.strokeStyle = "#21262d";
    ctx.lineWidth = 1;
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + cW, y);
    ctx.stroke();
  }

  // X axis
  ctx.textAlign = "center";
  ctx.fillStyle = "#8b949e";
  const xTicks = Math.min(5, pts.length - 1);
  for (let i = 0; i <= xTicks; i++) {
    const idx = Math.round((i / xTicks) * (pts.length - 1));
    const x = toX(idx);
    const d = new Date(pts[idx].t * 1000);
    let label;
    if (range === "1d")
      label = d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    else if (range === "5d")
      label = d.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
      });
    else if (
      range === "1y" ||
      range === "3y" ||
      range === "5y" ||
      range === "max"
    )
      label = d.toLocaleDateString("it-IT", {
        month: "short",
        year: "numeric",
      });
    else
      label = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    ctx.fillText(label, x, H - 8);
  }

  // last price dot (only when no hover)
  if (hoverIdx === null || hoverIdx === undefined) {
    const lastX = toX(pts.length - 1);
    const lastY = toY(closes[closes.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }

  // ── volume bars ──
  pts.forEach((p, i) => {
    if (!p.v) return;
    const bh = (p.v / maxVol) * VOL_H;
    const bx = toX(i) - barW / 2;
    const up = p.c >= (p.o ?? p.c);
    ctx.fillStyle = up ? "rgba(63,185,80,.45)" : "rgba(248,81,73,.45)";
    ctx.fillRect(bx, volY0 + VOL_H - bh, barW, bh);
  });
  // volume average line
  const validVols = vols.filter((v) => v > 0);
  if (validVols.length) {
    const avgVol = validVols.reduce((a, b) => a + b, 0) / validVols.length;
    const avgY = volY0 + VOL_H - (avgVol / maxVol) * VOL_H;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(88,166,255,.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(PAD.left, avgY);
    ctx.lineTo(PAD.left + cW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    // avg label on right
    ctx.fillStyle = "rgba(88,166,255,.85)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "right";
    const avgLabel =
      avgVol >= 1e6
        ? `avg ${(avgVol / 1e6).toFixed(1)}M`
        : `avg ${(avgVol / 1e3).toFixed(0)}K`;
    ctx.fillText(avgLabel, PAD.left + cW, avgY - 2);
  }

  // volume label
  ctx.fillStyle = "#8b949e";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("VOL", PAD.left, volY0 + 9);

  // ── crosshair ──
  if (hoverIdx != null && hoverIdx >= 0 && hoverIdx < pts.length) {
    const hp = pts[hoverIdx];
    const hx = toX(hoverIdx);
    const hy = toY(hp.c);

    // vertical line (extends through volume section)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(139,148,158,.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(hx, PAD.top);
    ctx.lineTo(hx, volY0 + VOL_H);
    ctx.stroke();

    // highlight hovered volume bar
    if (hp.v) {
      const bh = (hp.v / maxVol) * VOL_H;
      const bx = hx - barW / 2;
      const up = hp.c >= (hp.o ?? hp.c);
      ctx.fillStyle = up ? "rgba(63,185,80,.85)" : "rgba(248,81,73,.85)";
      ctx.fillRect(bx, volY0 + VOL_H - bh, barW, bh);
    }
    // horizontal line
    ctx.beginPath();
    ctx.moveTo(PAD.left, hy);
    ctx.lineTo(PAD.left + cW, hy);
    ctx.stroke();
    ctx.setLineDash([]);

    // dot
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx, hy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0d1117";
    ctx.fill();

    // tooltip pill
    const d = new Date(hp.t * 1000);
    let dateStr;
    if (range === "1d")
      dateStr = d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    else if (range === "5d")
      dateStr = d.toLocaleDateString("it-IT", {
        weekday: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    else
      dateStr = d.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    const priceStr = hp.c.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
    const volStr = hp.v
      ? hp.v >= 1e6
        ? `Vol ${(hp.v / 1e6).toFixed(1)}M`
        : hp.v >= 1e3
          ? `Vol ${(hp.v / 1e3).toFixed(0)}K`
          : `Vol ${hp.v}`
      : "";
    const line1 = priceStr;
    const line2 = dateStr + (volStr ? `  ${volStr}` : "");

    ctx.font = "bold 12px sans-serif";
    const w1 = ctx.measureText(line1).width;
    ctx.font = "10px sans-serif";
    const w2 = ctx.measureText(line2).width;
    const bw = Math.max(w1, w2) + 20;
    const bh = 36;
    let bx = hx + 10;
    if (bx + bw > W - 4) bx = hx - bw - 10;
    let by = hy - bh / 2;
    if (by < PAD.top) by = PAD.top;
    if (by + bh > PAD.top + cH) by = PAD.top + cH - bh;

    // box
    ctx.fillStyle = "#1c2128";
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    // text
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(line1, bx + 10, by + 14);
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px sans-serif";
    ctx.fillText(line2, bx + 10, by + 28);
  }
}

export { drawPriceChart };
