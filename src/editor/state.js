import { getBoundingBox } from "./pins.js";
import { FIT_PADDING, MAX_FIT_SCALE, MIN_SCALE } from "./constants.js";

export class EditorState {
  constructor() {
    this.pins = [];
    this.lines = [];
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  getTransform() {
    return { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  addPin(pin) {
    this.pins.push(pin);
  }

  addLineFromIndex(idx, angleDeg, length) {
    const rad = (angleDeg * Math.PI) / 180;
    const from = this.pins[idx];
    const to = {
      x: from.x + Math.sin(rad) * length,
      y: from.y - Math.cos(rad) * length,
    };
    this.lines.push({ from: { x: from.x, y: from.y }, to });
    const newPin = { x: to.x, y: to.y, memo: "" };
    this.pins.push(newPin);
  }

  fitToAllPins(canvasWidth, canvasHeight) {
    if (this.pins.length === 0) return;
    let [minX, maxX, minY, maxY] = getBoundingBox(this.pins);
    const padding = FIT_PADDING;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;
    this.scale = Math.min(scaleX, scaleY, MAX_FIT_SCALE);
    this.scale = Math.max(this.scale, MIN_SCALE);

    const scaledContentWidth = contentWidth * this.scale;
    const scaledContentHeight = contentHeight * this.scale;
    this.offsetX = (canvasWidth - scaledContentWidth) / 2 - minX * this.scale;
    this.offsetY = (canvasHeight - scaledContentHeight) / 2 - minY * this.scale;
  }
}
