function drawLine(ctx, line) {
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.strokeStyle = "#5c4a1f"; // classic ink
  ctx.lineWidth = 2;
  ctx.stroke();
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

  lines.forEach((line) => drawLine(ctx, line));
  pins.forEach((pin) => drawPin(ctx, pin, scale));
}
