export function drawCompass(ctx, angle) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Draw outer circle
  ctx.beginPath();
  ctx.arc(100, 100, 90, 0, 2 * Math.PI);
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Draw cardinal points
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 100, 20);
  ctx.fillText("E", 180, 100);
  ctx.fillText("S", 100, 180);
  ctx.fillText("W", 20, 100);

  // Draw needle
  ctx.save();
  ctx.translate(100, 100);
  ctx.rotate((angle * Math.PI) / 180);

  const needleBottomLength = 5;

  // North needle (red triangle)
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(-needleBottomLength, 0);
  ctx.lineTo(needleBottomLength, 0);
  ctx.closePath();
  ctx.fillStyle = "#e00";
  ctx.fill();
  ctx.strokeStyle = "#a00";
  ctx.lineWidth = 1;
  ctx.stroke();

  // South needle (white triangle with black border)
  ctx.beginPath();
  ctx.moveTo(0, 70);
  ctx.lineTo(-needleBottomLength, 0);
  ctx.lineTo(needleBottomLength, 0);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function degToCardinal(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return dirs[Math.round(deg / 45)];
}
