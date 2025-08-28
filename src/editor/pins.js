export function getBoundingBox(pins) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let pin of pins) {
    if (pin.x < minX) minX = pin.x;
    if (pin.x > maxX) maxX = pin.x;
    if (pin.y < minY) minY = pin.y;
    if (pin.y > maxY) maxY = pin.y;
  }
  return [minX, maxX, minY, maxY];
}
