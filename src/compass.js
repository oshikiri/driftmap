export function drawCompass(ctx, angle) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 5; // outer radius

  ctx.clearRect(0, 0, w, h);

  // Face background (parchment-like)
  const faceGrad = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
  faceGrad.addColorStop(0, "#faf6e9");
  faceGrad.addColorStop(1, "#e9e1c8");
  ctx.beginPath();
  ctx.arc(cx, cy, R - 6, 0, Math.PI * 2);
  ctx.fillStyle = faceGrad;
  ctx.fill();

  // Brass bezel ring
  const bezelGrad = ctx.createLinearGradient(0, cy - R, 0, cy + R);
  bezelGrad.addColorStop(0, "#a8812a");
  bezelGrad.addColorStop(0.5, "#e6c15a");
  bezelGrad.addColorStop(1, "#8a6a20");
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = bezelGrad;
  ctx.lineWidth = 10;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, R - 10, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ticks: every 5°, stronger for 15°/45°/90°
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg - 90) * (Math.PI / 180);
    let len = 6;
    let lw = 1;
    let col = "rgba(0,0,0,0.45)";
    if (deg % 15 === 0) {
      len = 10;
      lw = 1.4;
      col = "rgba(0,0,0,0.55)";
    }
    if (deg % 45 === 0) {
      len = 14;
      lw = 2;
      col = "rgba(0,0,0,0.7)";
    }
    if (deg % 90 === 0) {
      len = 18;
      lw = 2.4;
      col = "#000";
    }
    const r1 = R - 12;
    const r2 = r1 - len;
    const x1 = cx + Math.cos(rad) * r1;
    const y1 = cy + Math.sin(rad) * r1;
    const x2 = cx + Math.cos(rad) * r2;
    const y2 = cy + Math.sin(rad) * r2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  // Cardinal and intercardinal labels (rotated tangentially)
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 18px Georgia, 'Times New Roman', serif";
  const labelRadius = R - 34;
  const labels = [
    { t: "N", d: 0 },
    { t: "NE", d: 45 },
    { t: "E", d: 90 },
    { t: "SE", d: 135 },
    { t: "S", d: 180 },
    { t: "SW", d: 225 },
    { t: "W", d: 270 },
    { t: "NW", d: 315 },
  ];
  labels.forEach(({ t, d }) => {
    const rad = (d - 90) * (Math.PI / 180);
    const x = cx + Math.cos(rad) * labelRadius;
    const y = cy + Math.sin(rad) * labelRadius;
    const orientation = rad + Math.PI / 2; // tangent direction
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(orientation);
    ctx.fillStyle = d % 90 === 0 ? "#000" : "#333";
    ctx.fillText(t, 0, 0);
    ctx.restore();
  });
  ctx.restore();

  // Compass rose (simple 16-point star)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2); // align 0° to north
  const starR1 = R * 0.52;
  const starR2 = R * 0.22;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const rad1 = (i * 22.5 * Math.PI) / 180;
    const rad2 = ((i + 0.5) * 22.5 * Math.PI) / 180;
    ctx.lineTo(Math.cos(rad1) * starR1, Math.sin(rad1) * starR1);
    ctx.lineTo(Math.cos(rad2) * starR2, Math.sin(rad2) * starR2);
  }
  ctx.closePath();
  ctx.fillStyle = "#f5edd2";
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Needle
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  const needleW = 8;
  const needleL = R * 0.74;
  // North (red)
  ctx.beginPath();
  ctx.moveTo(0, -needleL);
  ctx.lineTo(-needleW, 0);
  ctx.lineTo(needleW, 0);
  ctx.closePath();
  ctx.fillStyle = "#b01717";
  ctx.strokeStyle = "#7a0f0f";
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
  // South (white)
  ctx.beginPath();
  ctx.moveTo(0, needleL);
  ctx.lineTo(-needleW, 0);
  ctx.lineTo(needleW, 0);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
  // Hub
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#d9c27a";
  ctx.strokeStyle = "#8a6a20";
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function degToCardinal(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return dirs[Math.round(deg / 45)];
}
