function drawLine(ctx, line) {
  ctx.beginPath();
  ctx.moveTo(line.from.x, line.from.y);
  ctx.lineTo(line.to.x, line.to.y);
  ctx.strokeStyle = "#1976d2";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPin(ctx, pin, scale) {
  const r = 6;
  ctx.beginPath();
  ctx.fillStyle = "#740027";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2 / scale;
  ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (pin.memo) {
    ctx.save();
    ctx.font = `${12 / scale}px sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3 / scale;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#333";
    ctx.strokeText(pin.memo, pin.x + r + 4 / scale, pin.y - r);
    ctx.fillText(pin.memo, pin.x + r + 4 / scale, pin.y - r);
    ctx.restore();
  }
}

export function drawScene(ctx, transform, lines, pins) {
  const { scale, offsetX, offsetY } = transform;
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  lines.forEach((line) => drawLine(ctx, line));
  pins.forEach((pin) => drawPin(ctx, pin, scale));
}
