import { getBoundingBox } from "./pins.js";

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
    this.pins = [];
    this.lines = [];
    this.selectedPin = null;
    this._longPressTimer = null;
    this._pointers = new Map(); // pointerId -> { x, y }
    this._pinchCenter = null;
    this.scale = 1;
    this.lastDist = null; // pinch distance (in screen px)
    this.offsetX = 0;
    this.offsetY = 0;
    this.TAP_MOVE_THRESHOLD = 8; // px
    this.LONG_PRESS_MS = 600; // ms
    this._tapCandidate = null; // { x, y, time, hitIdx }
    this._pinching = false; // 2本指ジェスチャ中
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

  // ---------- Coordinate Utilities ----------
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.scale + this.offsetX,
      y: wy * this.scale + this.offsetY,
    };
  }

  // 画面座標(sx, sy)からピンを追加（ワールド変換付き）
  createPinAt(sx, sy) {
    const { x: wx, y: wy } = this.screenToWorld(sx, sy);
    const memo = prompt("Enter a memo");
    if (memo === null) return;
    const pin = { x: wx, y: wy, memo };
    this.pins.push(pin);
    this.fitToAllPins();
  }

  getPinIndexAtScreen(sx, sy, thresholdPx = 10) {
    let hit = -1;
    let best = Infinity;
    this.pins.forEach((pin, idx) => {
      const { x: px, y: py } = this.worldToScreen(pin.x, pin.y);
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
    const inputDiv = this.buildLineInputPopover(idx);
    this.pinsEl.appendChild(inputDiv);
  }

  buildLineInputPopover(idx) {
    const inputDiv = document.createElement("div");
    inputDiv.className = "line-input-popover";
    // スクリーン座標へ変換して配置（少し右上にオフセット）
    const { x: baseSx, y: baseSy } = this.worldToScreen(
      this.pins[idx].x,
      this.pins[idx].y,
    );
    const offset = 12;
    let sx = baseSx + offset;
    let sy = baseSy - offset;
    // 画面端を超えないよう簡易クランプ
    const maxX = this.sceneCanvas.width - 240;
    const maxY = this.sceneCanvas.height - 140;
    sx = Math.max(8, Math.min(sx, maxX));
    sy = Math.max(8, Math.min(sy, maxY));
    inputDiv.style.left = `${sx}px`;
    inputDiv.style.top = `${sy}px`;

    inputDiv.innerHTML = `
      <header>
        <span class=\"close\" id=\"closeBtn\" aria-label=\"Close\">×</span>
      </header>
      <div class=\"row\">
        <label for=\"angleInput\">Angle(°)</label>
        <input type=\"number\" id=\"angleInput\" value=\"0\" inputmode=\"decimal\" />
      </div>
      <div class=\"row\">
        <label for=\"lengthInput\">Length</label>
        <input type=\"number\" id=\"lengthInput\" value=\"50\" inputmode=\"decimal\" />
      </div>
      <div class=\"actions\">
        <button id=\"drawLineBtn\">Draw</button>
      </div>
    `;
    // キャンバスへのイベント伝播を防ぐ
    inputDiv.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    inputDiv.addEventListener("click", (ev) => ev.stopPropagation());

    const run = () => {
      const angle = parseFloat(inputDiv.querySelector("#angleInput").value);
      const length = parseFloat(inputDiv.querySelector("#lengthInput").value);
      if (!isFinite(angle) || !isFinite(length)) return;
      this.drawManualLine(idx, angle, length);
      inputDiv.remove();
      this.selectedPin = null;
    };
    inputDiv.querySelector("#drawLineBtn").onclick = run;
    inputDiv.querySelector("#closeBtn").onclick = () => inputDiv.remove();
    return inputDiv;
  }

  drawManualLine(idx, angle, length) {
    const rad = (angle * Math.PI) / 180;
    const from = this.pins[idx];
    const to = {
      x: from.x + Math.sin(rad) * length,
      y: from.y - Math.cos(rad) * length,
    };
    this.lines.push({ from: { x: from.x, y: from.y }, to });

    // Automatically add a pin at the end of the line
    const newPin = {
      x: to.x,
      y: to.y,
      memo: "", // Empty memo for automatically created pins
    };
    this.pins.push(newPin);

    this.fitToAllPins();
  }

  editPinName(idx) {
    const pin = this.pins[idx];
    const newName = prompt("Edit pin name", pin.memo);
    if (newName !== null) {
      pin.memo = newName;
      this.redrawScene();
    }
  }

  redrawScene() {
    // Clear and render the whole scene (lines + pins)
    // Reset transform before clearing to avoid partial clears/ghosts
    if (this.sceneCtx.resetTransform) {
      this.sceneCtx.resetTransform();
    } else {
      this.sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.sceneCtx.clearRect(
      0,
      0,
      this.sceneCanvas.width,
      this.sceneCanvas.height,
    );
    this.sceneCtx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY,
    );
    this.lines.forEach((line) => {
      this.drawLine(line);
    });
    this.pins.forEach((pin) => {
      this.drawPin(pin);
    });
  }

  drawLine(line) {
    this.sceneCtx.beginPath();
    this.sceneCtx.moveTo(line.from.x, line.from.y);
    this.sceneCtx.lineTo(line.to.x, line.to.y);
    this.sceneCtx.strokeStyle = "#1976d2";
    this.sceneCtx.lineWidth = 2;
    this.sceneCtx.stroke();
  }

  drawPin(pin) {
    const r = 6;
    this.sceneCtx.beginPath();
    this.sceneCtx.fillStyle = "#740027";
    this.sceneCtx.strokeStyle = "#fff";
    this.sceneCtx.lineWidth = 2 / this.scale;
    this.sceneCtx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
    this.sceneCtx.fill();
    this.sceneCtx.stroke();
    if (pin.memo) {
      this.sceneCtx.save();
      this.sceneCtx.font = `${12 / this.scale}px sans-serif`;
      this.sceneCtx.textBaseline = "bottom";
      this.sceneCtx.lineWidth = 3 / this.scale;
      this.sceneCtx.strokeStyle = "#fff";
      this.sceneCtx.fillStyle = "#333";
      this.sceneCtx.strokeText(pin.memo, pin.x + r + 4 / this.scale, pin.y - r);
      this.sceneCtx.fillText(pin.memo, pin.x + r + 4 / this.scale, pin.y - r);
      this.sceneCtx.restore();
    }
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
        const prevScale = this.scale;
        const factor = dist / this.lastDist;
        const newScale = Math.max(0.1, Math.min(6, prevScale * factor));
        const cx = this._pinchCenter.x;
        const cy = this._pinchCenter.y;
        const wx = (cx - this.offsetX) / prevScale;
        const wy = (cy - this.offsetY) / prevScale;
        this.scale = newScale;
        this.offsetX = cx - wx * newScale;
        this.offsetY = cy - wy * newScale;
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
    if (this.pins.length === 0) return;

    // Calculate bounding box of all pins
    let [minX, maxX, minY, maxY] = getBoundingBox(this.pins);

    // Add padding around the pins
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate required scale to fit all pins
    const canvasWidth = this.sceneCanvas.width;
    const canvasHeight = this.sceneCanvas.height;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = canvasWidth / contentWidth;
    const scaleY = canvasHeight / contentHeight;

    // Use the smaller scale to ensure everything fits
    this.scale = Math.min(scaleX, scaleY, 3); // Max scale of 3
    this.scale = Math.max(this.scale, 0.1); // Min scale of 0.1

    // Calculate offset to center the content
    const scaledContentWidth = contentWidth * this.scale;
    const scaledContentHeight = contentHeight * this.scale;

    this.offsetX = (canvasWidth - scaledContentWidth) / 2 - minX * this.scale;
    this.offsetY = (canvasHeight - scaledContentHeight) / 2 - minY * this.scale;

    this.redrawScene();
  }
}

customElements.define("driftmap-editor", DriftmapEditor);
