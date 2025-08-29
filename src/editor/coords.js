export function screenToWorld(sx, sy, transform) {
  const { scale, offsetX, offsetY } = transform;
  return {
    x: (sx - offsetX) / scale,
    y: (sy - offsetY) / scale,
  };
}

export function worldToScreen(wx, wy, transform) {
  const { scale, offsetX, offsetY } = transform;
  return {
    x: wx * scale + offsetX,
    y: wy * scale + offsetY,
  };
}
