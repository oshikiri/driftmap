const INK = "#5c4a1f"; // classic ink
const TEXT_DARK = "#3b2f1b";
const WHITE = "#fff";
const PIN_RADIUS = 5.5; // pin circle radius (world units)

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
}

function getLineMetrics(line) {
  const dx = line.to.x - line.from.x;
  const dy = line.to.y - line.from.y;
  const segLen = Math.hypot(dx, dy) || 1;
  const ux = dx / segLen;
  const uy = dy / segLen;
  const midX = (line.from.x + line.to.x) * 0.5;
  const midY = (line.from.y + line.to.y) * 0.5;
  const perpLen = Math.hypot(-dy, dx) || 1;
  const nx = -dy / perpLen;
  const ny = dx / perpLen;
  return { dx, dy, segLen, ux, uy, midX, midY, nx, ny };
}

function drawArrowhead(ctx, tipX, tipY, ux, uy, scale, color = INK) {
  const size = 12 / scale; // arrow length (screen-constant)
  const width = 8 / scale; // arrow base width
  const bx = tipX - ux * size; // base center
  const by = tipY - uy * size;
  const px = -uy; // perpendicular unit x
  const py = ux; // perpendicular unit y
  const lx = bx + px * (width / 2);
  const ly = by + py * (width / 2);
  const rx = bx - px * (width / 2);
  const ry = by - py * (width / 2);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(lx, ly);
  ctx.lineTo(rx, ry);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawLineLabel(ctx, line, metrics, scale) {
  // Prefer stored values; fallback to computed
  const length = Number.isFinite(line.length) ? line.length : metrics.segLen;
  const computedRad = Math.atan2(metrics.dx, -metrics.dy);
  const computedDeg = (computedRad * 180) / Math.PI;
  const angleDeg = Number.isFinite(line.angleDeg) ? line.angleDeg : computedDeg;
  const label = `${Math.round(length * 10) / 10} / ${Math.round(angleDeg * 10) / 10}°`;

  // Slight offset along normal to avoid overlapping the line
  const offX = metrics.nx * (8 / scale);
  const offY = metrics.ny * (8 / scale);

  ctx.save();
  const fontPx = 14 / scale;
  ctx.font = `${fontPx}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const metricsText = ctx.measureText(label);
  const textW =
    metricsText.actualBoundingBoxLeft + metricsText.actualBoundingBoxRight ||
    metricsText.width;
  const textH =
    metricsText.actualBoundingBoxAscent +
      metricsText.actualBoundingBoxDescent || fontPx;
  const pad = 6 / scale;
  const bx = metrics.midX + offX - (textW / 2 + pad);
  const by = metrics.midY + offY - (textH / 2 + pad * 0.6);
  const bw = textW + pad * 2;
  const bh = textH + pad * 1.2;
  // background box
  ctx.save();
  roundRect(ctx, bx, by, bw, bh, 6 / scale);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.lineWidth = 1 / scale;
  ctx.strokeStyle = "rgba(59,47,27,0.25)";
  ctx.stroke();
  ctx.restore();
  // text
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = WHITE;
  ctx.fillStyle = TEXT_DARK;
  ctx.strokeText(label, metrics.midX + offX, metrics.midY + offY);
  ctx.fillText(label, metrics.midX + offX, metrics.midY + offY);
  ctx.restore();
}

function drawLineSegment(ctx, from, to, scale, color = INK, width = 2) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width / scale;
  ctx.stroke();
}

function computeArrowPlacement(line, scale, pins) {
  const m = getLineMetrics(line);
  const eps = 0.5; // tolerance to consider line.to on a pin center
  let onPin = null;
  for (const p of pins) {
    const d = Math.hypot(p.x - line.to.x, p.y - line.to.y);
    if (d <= eps) {
      onPin = p;
      break;
    }
  }
  if (!onPin) return null;
  const margin = 2 / scale; // keep arrow tip slightly off the pin edge
  const tipBack = PIN_RADIUS + margin; // from pin center towards the line
  const tipX = line.to.x - m.ux * tipBack;
  const tipY = line.to.y - m.uy * tipBack;
  const arrowSize = 12 / scale; // must match drawArrowhead
  const baseX = tipX - m.ux * arrowSize;
  const baseY = tipY - m.uy * arrowSize;
  return { tipX, tipY, baseX, baseY, ux: m.ux, uy: m.uy };
}

function drawLineOverlay(ctx, line, scale, pins) {
  const placement = computeArrowPlacement(line, scale, pins);
  if (placement) {
    const lineVis = {
      from: line.from,
      to: { x: placement.baseX, y: placement.baseY },
    };
    const mVis = getLineMetrics(lineVis);
    // ラベルの数値は元の論理長さ・角度を使用
    const mOrig = getLineMetrics(line);
    const computedRad = Math.atan2(mOrig.dx, -mOrig.dy);
    const computedDeg = (computedRad * 180) / Math.PI;
    const length = Number.isFinite(line.length) ? line.length : mOrig.segLen;
    const angleDeg = Number.isFinite(line.angleDeg)
      ? line.angleDeg
      : computedDeg;
    const lineForLabel = {
      from: lineVis.from,
      to: lineVis.to,
      length,
      angleDeg,
    };
    drawArrowhead(
      ctx,
      placement.tipX,
      placement.tipY,
      placement.ux,
      placement.uy,
      scale,
      INK,
    );
    drawLineLabel(ctx, lineForLabel, mVis, scale);
  } else {
    const m = getLineMetrics(line);
    drawArrowhead(ctx, line.to.x, line.to.y, m.ux, m.uy, scale, INK);
    drawLineLabel(ctx, line, m, scale);
  }
}

function drawPin(ctx, pin, scale) {
  const r = PIN_RADIUS;
  ctx.beginPath();
  ctx.fillStyle = "#b01717"; // classic red
  ctx.strokeStyle = "#2b1d0a"; // dark ink
  ctx.lineWidth = 1.5 / scale;
  ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (pin.memo) {
    ctx.save();
    ctx.font = `${12 / scale}px Georgia, 'Times New Roman', serif`;
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3 / scale;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#3b2f1b";
    const off = r + 4 / scale;
    ctx.strokeText(pin.memo, pin.x + off, pin.y - r);
    ctx.fillText(pin.memo, pin.x + off, pin.y - r);
    ctx.restore();
  }
}

let __paperPattern = null;

function ensurePaperPattern(ctx) {
  if (__paperPattern) return __paperPattern;
  const size = 128;
  const off = document.createElement("canvas");
  off.width = off.height = size;
  const octx = off.getContext("2d");
  // Base transparent; we'll draw speckles only so underlying CSS background shows through
  octx.clearRect(0, 0, size, size);
  // Speckles
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.2 + 0.3;
    const a = Math.random() * 0.08 + 0.04; // low alpha
    octx.beginPath();
    octx.arc(x, y, r, 0, Math.PI * 2);
    octx.fillStyle = `rgba(92, 74, 31, ${a})`;
    octx.fill();
  }
  __paperPattern = ctx.createPattern(off, "repeat");
  return __paperPattern;
}

export function drawScene(ctx, transform, lines, pins) {
  const { scale, offsetX, offsetY } = transform;
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Paper texture overlay (subtle, transparent so CSS background remains visible)
  const pat = ensurePaperPattern(ctx);
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
  // Vignette
  ctx.save();
  const g = ctx.createRadialGradient(
    ctx.canvas.width * 0.5,
    ctx.canvas.height * 0.5,
    Math.min(ctx.canvas.width, ctx.canvas.height) * 0.2,
    ctx.canvas.width * 0.5,
    ctx.canvas.height * 0.5,
    Math.max(ctx.canvas.width, ctx.canvas.height) * 0.7,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(92,74,31,0.12)");
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  lines.forEach((line) => {
    const placement = computeArrowPlacement(line, scale, pins);
    const toPoint = placement
      ? { x: placement.baseX, y: placement.baseY }
      : line.to;
    drawLineSegment(ctx, line.from, toPoint, scale, INK, 2);
  });
  pins.forEach((pin) => drawPin(ctx, pin, scale));
  lines.forEach((line) => drawLineOverlay(ctx, line, scale, pins));
}
