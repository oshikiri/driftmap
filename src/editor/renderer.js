function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
}

function drawLine(ctx, line, scale) {
  console.log(line);
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.strokeStyle = "#5c4a1f"; // classic ink
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw angle and length label near the middle of the line
  const dx = line.to.x - line.from.x;
  const dy = line.to.y - line.from.y;
  const midX = (line.from.x + line.to.x) * 0.5;
  const midY = (line.from.y + line.to.y) * 0.5;

  // Use stored angle/length if available, otherwise compute
  const length = Number.isFinite(line.length)
    ? line.length
    : Math.hypot(dx, dy);
  // Angle in degrees, 0 pointing up (negative Y), increasing clockwise
  const computedRad = Math.atan2(dx, -dy);
  const computedDeg = (computedRad * 180) / Math.PI;
  const angleDeg = Number.isFinite(line.angleDeg) ? line.angleDeg : computedDeg;

  const label = `${Math.round(length * 10) / 10} / ${Math.round(angleDeg * 10) / 10}°`;

  // Offset label slightly perpendicular to the line, constant on-screen
  const perpLen = Math.hypot(-dy, dx) || 1;
  const nx = (-dy / perpLen) * (8 / scale);
  const ny = (dx / perpLen) * (8 / scale);

  ctx.save();
  const fontPx = 14 / scale;
  ctx.font = `${fontPx}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const metrics = ctx.measureText(label);
  const textW =
    metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight ||
    metrics.width;
  const textH =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
    fontPx;
  const pad = 6 / scale;
  const bx = midX + nx - (textW / 2 + pad);
  const by = midY + ny - (textH / 2 + pad * 0.6);
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
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#3b2f1b";
  ctx.strokeText(label, midX + nx, midY + ny);
  ctx.fillText(label, midX + nx, midY + ny);
  ctx.restore();
}

function drawPin(ctx, pin, scale) {
  const r = 5.5;
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

  lines.forEach((line) => drawLine(ctx, line, scale));
  pins.forEach((pin) => drawPin(ctx, pin, scale));
}
