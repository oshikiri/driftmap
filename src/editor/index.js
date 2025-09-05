import {
  TAP_MOVE_THRESHOLD,
  LONG_PRESS_MS,
  PIN_HIT_THRESHOLD,
  MIN_SCALE,
  MAX_PINCH_SCALE,
} from "./constants.js";
import { screenToWorld, worldToScreen } from "./coords.js";
import { drawScene } from "./renderer.js";
import { EditorState } from "./state.js";
import { buildLineInputPopover } from "./popovers/lineInputPopover.js";
import { bindInteractions } from "./interaction.js";
import { editorStyles } from "./styles.js";
import { editorMarkup } from "./template.js";

class DriftmapEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = this.renderTemplate();
    this.cacheElements();
    this.initState();
    this.setCanvasSizeFromWindow();
    this.bindEventListeners();
    this.redrawScene();
  }

  // ---------- Setup / Template ----------
  renderTemplate() {
    return `<style>${editorStyles}</style>${editorMarkup()}`;
  }

  cacheElements() {
    this.sceneCanvas = this.shadowRoot.getElementById("sceneCanvas");
    this.interactionCanvas =
      this.shadowRoot.getElementById("interactionCanvas");
    this.sceneCtx = this.sceneCanvas.getContext("2d");
    this.interactionCtx = this.interactionCanvas.getContext("2d");
    this.pinsEl = this.shadowRoot.getElementById("pins");
  }

  initState() {
    this.state = new EditorState();
    this.selectedPin = null;
    this.lastDist = null; // pinch distance (in screen px)
    this.TAP_MOVE_THRESHOLD = TAP_MOVE_THRESHOLD; // px
    this.LONG_PRESS_MS = LONG_PRESS_MS; // ms
  }

  getTransform() {
    return this.state.getTransform();
  }

  setCanvasSizeFromWindow() {
    const width = window.innerWidth;
    const height = window.innerHeight - 200;
    [this.sceneCanvas, this.interactionCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });
  }

  bindEventListeners() {
    this._unbindInteractions = bindInteractions(this.interactionCanvas, {
      tapMoveThreshold: this.TAP_MOVE_THRESHOLD,
      longPressMs: this.LONG_PRESS_MS,
      hitTestPin: (sx, sy) => this.getPinIndexAtScreen(sx, sy, 12),
      onTapBlank: (sx, sy) => this.createPinAt(sx, sy),
      onTapPin: (idx) => this.showLineInput(idx),
      onLongPressPin: (idx) => this.editPinName(idx),
      onPinch: ({ factor, center }) => {
        const prevScale = this.state.scale;
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_PINCH_SCALE, prevScale * factor),
        );
        const cx = center.x;
        const cy = center.y;
        const wx = (cx - this.state.offsetX) / prevScale;
        const wy = (cy - this.state.offsetY) / prevScale;
        this.state.scale = newScale;
        this.state.offsetX = cx - wx * newScale;
        this.state.offsetY = cy - wy * newScale;
        this.redrawScene();
      },
    });
  }

  disconnectedCallback() {
    if (this._unbindInteractions) this._unbindInteractions();
  }

  // Add a pin from screen coords (with world transform)
  createPinAt(sx, sy) {
    const { x: wx, y: wy } = screenToWorld(sx, sy, this.getTransform());
    const memo = prompt("Enter a memo");
    if (memo === null) return;
    const pin = { x: wx, y: wy, memo };
    this.state.addPin(pin);
    this.fitToAllPins();
  }

  getPinIndexAtScreen(sx, sy, thresholdPx = PIN_HIT_THRESHOLD) {
    let hit = -1;
    let best = Infinity;
    this.state.pins.forEach((pin, idx) => {
      const { x: px, y: py } = worldToScreen(pin.x, pin.y, this.getTransform());
      const dx = px - sx;
      const dy = py - sy;
      const d = Math.hypot(dx, dy);
      if (d < thresholdPx && d < best) {
        best = d;
        hit = idx;
      }
    });
    return hit;
  }

  showLineInput(idx) {
    const { x: baseSx, y: baseSy } = worldToScreen(
      this.state.pins[idx].x,
      this.state.pins[idx].y,
      this.getTransform(),
    );
    const inputDiv = buildLineInputPopover({
      screenX: baseSx,
      screenY: baseSy,
      canvasWidth: this.sceneCanvas.width,
      canvasHeight: this.sceneCanvas.height,
      onSubmit: (angle, length) => this.drawManualLine(idx, angle, length),
      onClose: () => {
        this.selectedPin = null;
      },
    });
    this.pinsEl.appendChild(inputDiv);
  }

  drawManualLine(idx, angle, length) {
    this.state.addLineFromIndex(idx, angle, length);
    this.fitToAllPins();
  }

  editPinName(idx) {
    const pin = this.state.pins[idx];
    const newName = prompt("Edit pin name", pin.memo);
    if (newName !== null) {
      pin.memo = newName;
      this.redrawScene();
    }
  }

  redrawScene() {
    drawScene(
      this.sceneCtx,
      this.getTransform(),
      this.state.lines,
      this.state.pins,
    );
  }

  fitToAllPins() {
    this.state.fitToAllPins(this.sceneCanvas.width, this.sceneCanvas.height);
    this.redrawScene();
  }
}

if (!customElements.get("driftmap-editor")) {
  customElements.define("driftmap-editor", DriftmapEditor);
}
