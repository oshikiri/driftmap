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
    return `
      <style>
        .canvas-wrapper {
          height: 70vh;
          position: relative;
        }
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          cursor: crosshair;
        }
        #sceneCanvas {
          z-index: 2;
          pointer-events: none;
        }
        #interactionCanvas {
          z-index: 3;
          background: transparent;
          touch-action: none;
        }
        .line-input-popover {
          position: absolute;
          min-width: 200px;
          max-width: 280px;
          padding: 8px 10px;
          background: #ffffff;
          border: 1px solid #d0d7de;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          z-index: 10;
          color: #222;
          font-size: 14px;
          line-height: 1.4;
        }
        .line-input-popover header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .line-input-popover header .close {
          cursor: pointer;
          font-size: 16px;
          color: #666;
          padding: 0 4px;
          border-radius: 4px;
        }
        .line-input-popover header .close:hover {
          background: #f2f2f2;
        }
        .line-input-popover .row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 6px 0;
        }
        .line-input-popover label {
          white-space: nowrap;
          min-width: 84px;
        }
        .line-input-popover input[type="number"] {
          width: 6em;
          padding: 4px 6px;
          font-size: 14px;
          border: 1px solid #c8c8c8;
          border-radius: 4px;
        }
        .line-input-popover .actions {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        button {
          align-self: flex-end;
          padding: 0.5em 1em;
          font-size: 1em;
          border-radius: 4px;
          border: none;
          background: #1976d2;
          color: #fff;
          cursor: pointer;
        }
      </style>
      <div class="editor-container">
        <div class="canvas-wrapper">
          <canvas id="sceneCanvas"></canvas>
          <canvas id="interactionCanvas"></canvas>
          <div id="pins"></div>
        </div>
      </div>
    `;
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
    this._longPressTimer = null;
    this._pointers = new Map(); // pointerId -> { x, y }
    this._pinchCenter = null;
    this.lastDist = null; // pinch distance (in screen px)
    this.TAP_MOVE_THRESHOLD = TAP_MOVE_THRESHOLD; // px
    this.LONG_PRESS_MS = LONG_PRESS_MS; // ms
    this._tapCandidate = null; // { x, y, time, hitIdx }
    this._pinching = false; // 2本指ジェスチャ中
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
    this.interactionCanvas.addEventListener("pointerdown", this.onPointerDown);
    this.interactionCanvas.addEventListener("pointermove", this.onPointerMove);
    this.interactionCanvas.addEventListener("pointerup", this.onPointerUp);
    this.interactionCanvas.addEventListener("pointercancel", this.onPointerUp);
  }

  disconnectedCallback() {
    if (this.interactionCanvas) {
      this.interactionCanvas.removeEventListener(
        "pointerdown",
        this.onPointerDown,
      );
      this.interactionCanvas.removeEventListener(
        "pointermove",
        this.onPointerMove,
      );
      this.interactionCanvas.removeEventListener("pointerup", this.onPointerUp);
      this.interactionCanvas.removeEventListener(
        "pointercancel",
        this.onPointerUp,
      );
    }
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  // 画面座標(sx, sy)からピンを追加（ワールド変換付き）
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

  // Pointer Events: unified touch/mouse/pen handling
  onPointerDown = (e) => {
    this.interactionCanvas.setPointerCapture(e.pointerId);
    const rect = this.interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this._pointers.set(e.pointerId, { x, y });

    if (this._pointers.size === 2) {
      // Initialize pinch gesture
      const pts = Array.from(this._pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      this.lastDist = Math.hypot(dx, dy);
      this._pinchCenter = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      this._pinching = true;
      // ピンチに移行したらタップ/長押し/線描画を中断
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
      this._tapCandidate = null;
      this.selectedPin = null;
      return;
    }

    // 単一ポインタ: タップ候補を記録
    const hitIdx = this.getPinIndexAtScreen(x, y, 12);
    this._tapCandidate = { x, y, time: performance.now(), hitIdx };
    if (hitIdx !== -1) {
      // ピン上での長押し編集（ドラッグ描画は廃止）
      this._longPressTimer = setTimeout(() => {
        this.editPinName(hitIdx);
        this._tapCandidate = null; // 長押し後はタップ扱いにしない
      }, this.LONG_PRESS_MS);
    }
  };

  onPointerMove = (e) => {
    const rect = this.interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (this._pointers.has(e.pointerId))
      this._pointers.set(e.pointerId, { x, y });

    if (this._pointers.size === 2) {
      // Pinch zoom around center
      e.preventDefault();
      const pts = Array.from(this._pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      if (this.lastDist && this._pinchCenter) {
        const prevScale = this.state.scale;
        const factor = dist / this.lastDist;
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_PINCH_SCALE, prevScale * factor),
        );
        const cx = this._pinchCenter.x;
        const cy = this._pinchCenter.y;
        const wx = (cx - this.state.offsetX) / prevScale;
        const wy = (cy - this.state.offsetY) / prevScale;
        this.state.scale = newScale;
        this.state.offsetX = cx - wx * newScale;
        this.state.offsetY = cy - wy * newScale;
        this.redrawScene();
      }
      this.lastDist = dist;
      this._pinching = true;
      return;
    }

    // 単一ポインタ: タップ候補からのドラッグは何もしない
    if (this._tapCandidate) {
      const dx = x - this._tapCandidate.x;
      const dy = y - this._tapCandidate.y;
      if (Math.hypot(dx, dy) > this.TAP_MOVE_THRESHOLD) {
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
        this._tapCandidate = null; // タップ候補終了
      }
    }
  };

  onPointerUp = (e) => {
    if (this._pointers.has(e.pointerId)) this._pointers.delete(e.pointerId);
    if (this._pointers.size < 2) {
      this.lastDist = null;
      this._pinchCenter = null;
    }
    // 長押し解除
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    // タップ判定（移動少）: ピン上→角度UI、空白→ピン追加
    if (this._tapCandidate) {
      const rect = this.interactionCanvas.getBoundingClientRect();
      const upx = e.clientX - rect.left;
      const upy = e.clientY - rect.top;
      const moved = Math.hypot(
        upx - this._tapCandidate.x,
        upy - this._tapCandidate.y,
      );
      if (moved <= this.TAP_MOVE_THRESHOLD) {
        if (this._tapCandidate.hitIdx !== -1) {
          this.showLineInput(this._tapCandidate.hitIdx);
        } else {
          this.createPinAt(upx, upy);
        }
      }
    }

    this._tapCandidate = null;
  };

  fitToAllPins() {
    this.state.fitToAllPins(this.sceneCanvas.width, this.sceneCanvas.height);
    this.redrawScene();
  }
}

if (!customElements.get("driftmap-editor")) {
  customElements.define("driftmap-editor", DriftmapEditor);
}
