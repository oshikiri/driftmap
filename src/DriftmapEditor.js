class DriftmapEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
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
        #lineCanvas {
          z-index: 2;
          pointer-events: none;
        }
        #interactionCanvas {
          z-index: 3;
          background: transparent;
        }
        .pin {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #740027ff;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 2px #333;
          transform: translate(-6px, -6px);
          cursor: pointer;
          z-index: 4;
        }
        .memo {
          position: absolute;
          background: #fffbe7;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.9em;
          transform: translate(12px, -24px);
          pointer-events: none;
          z-index: 4;
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
          <canvas id="lineCanvas"></canvas>
          <canvas id="interactionCanvas"></canvas>
          <div id="pins"></div>
        </div>
      </div>
    `;

    // Initialize canvases
    this.lineCanvas = this.shadowRoot.getElementById("lineCanvas");
    this.interactionCanvas =
      this.shadowRoot.getElementById("interactionCanvas");

    const width = window.innerWidth;
    const height = window.innerHeight - 200;

    [this.lineCanvas, this.interactionCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });

    this.lineCtx = this.lineCanvas.getContext("2d");
    this.interactionCtx = this.interactionCanvas.getContext("2d");

    this.pinsEl = this.shadowRoot.getElementById("pins");
    this.pins = [];
    this.lines = [];
    this.isDrawingLine = false;
    this.selectedPin = null;
    this.lastX = 0;
    this.lastY = 0;

    // Event listeners on interaction canvas only
    this.interactionCanvas.addEventListener("click", this.addPin);
    this.pinsEl.addEventListener("click", this.pinClick);
    this.interactionCanvas.addEventListener("mousedown", this.startLineDraw);
    this.interactionCanvas.addEventListener("mousemove", this.drawLine);
    this.interactionCanvas.addEventListener("mouseup", this.endLineDraw);
    this.interactionCanvas.addEventListener("touchstart", this.onTouchStart, {
      passive: false,
    });
    this.interactionCanvas.addEventListener("touchmove", this.onTouchMove, {
      passive: false,
    });
    this.interactionCanvas.addEventListener("touchend", this.onTouchEnd);

    this.scale = 1;
    this.lastDist = null;
    this.offsetX = 0;
    this.offsetY = 0;

    this.redrawAll();
  }

  addPin = (e) => {
    const rect = this.interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const memo = prompt("メモを入力してください");
    if (memo === null) return;
    const pin = { x, y, memo };
    this.pins.push(pin);
    this.renderPins();

    // Auto-fit to show all pins after adding a new one
    this.fitToAllPins();
  };

  renderPins() {
    this.pinsEl.innerHTML = "";
    this.pins.forEach((pin, idx) => {
      // Apply transformation to pin position
      const transformedX = pin.x * this.scale + this.offsetX;
      const transformedY = pin.y * this.scale + this.offsetY;

      const pinEl = document.createElement("div");
      pinEl.className = "pin";
      pinEl.style.left = `${transformedX}px`;
      pinEl.style.top = `${transformedY}px`;
      pinEl.dataset.idx = idx;
      this.pinsEl.appendChild(pinEl);
      if (pin.memo) {
        const memoEl = document.createElement("div");
        memoEl.className = "memo";
        memoEl.textContent = pin.memo;
        memoEl.style.left = `${transformedX}px`;
        memoEl.style.top = `${transformedY}px`;
        this.pinsEl.appendChild(memoEl);
      }
    });
  }

  pinClick = (e) => {
    if (!e.target.classList.contains("pin")) return;
    const idx = parseInt(e.target.dataset.idx, 10);
    let longPressTimer;
    const pinEl = e.target;
    const startLongPress = () => {
      longPressTimer = setTimeout(() => {
        this.editPinName(idx);
      }, 600);
    };
    const cancelLongPress = () => {
      clearTimeout(longPressTimer);
    };
    pinEl.addEventListener("mousedown", startLongPress);
    pinEl.addEventListener("touchstart", startLongPress, { passive: true });
    pinEl.addEventListener("mouseup", cancelLongPress);
    pinEl.addEventListener("mouseleave", cancelLongPress);
    pinEl.addEventListener("touchend", cancelLongPress, { passive: true });
    pinEl.addEventListener("click", () => {
      this.selectedPin = this.pins[idx];
      this.isDrawingLine = true;
      this.showLineInput(idx);
    });
  };

  showLineInput(idx) {
    const inputDiv = document.createElement("div");
    inputDiv.style.position = "absolute";
    inputDiv.style.left = `${this.pins[idx].x}px`;
    inputDiv.style.top = `${this.pins[idx].y}px`;
    inputDiv.style.background = "#fff";
    inputDiv.style.border = "1px solid #ccc";
    inputDiv.style.padding = "4px";
    inputDiv.style.zIndex = 10;
    inputDiv.innerHTML = `
      <label>方向(度): <input type="number" id="angleInput" value="0" style="width:4em;" /></label><br>
      <label>長さ: <input type="number" id="lengthInput" value="50" style="width:4em;" /></label><br>
      <button id="drawLineBtn">線を描く</button>
    `;
    this.pinsEl.appendChild(inputDiv);
    inputDiv.querySelector("#drawLineBtn").onclick = () => {
      const angle = parseFloat(inputDiv.querySelector("#angleInput").value);
      const length = parseFloat(inputDiv.querySelector("#lengthInput").value);
      this.drawManualLine(idx, angle, length);
      inputDiv.remove();
      this.isDrawingLine = false;
      this.selectedPin = null;
    };
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

    this.redrawAll();
    this.fitToAllPins();
  }

  editPinName(idx) {
    const pin = this.pins[idx];
    const newName = prompt("ピンの名前を編集", pin.memo);
    if (newName !== null) {
      pin.memo = newName;
      this.renderPins();
    }
  }

  startLineDraw = (e) => {
    if (!this.isDrawingLine || !this.selectedPin) return;
    const rect = this.interactionCanvas.getBoundingClientRect();
    this.lastX = this.selectedPin.x;
    this.lastY = this.selectedPin.y;
    this.drawLine(e, true);
  };

  drawLine = (e, force) => {
    if (!this.isDrawingLine || !this.selectedPin) return;
    if (e.buttons !== 1 && !force) return;
    const rect = this.interactionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.lines.push({ from: { x: this.lastX, y: this.lastY }, to: { x, y } });
    this.lastX = x;
    this.lastY = y;
    this.redrawLines();
  };

  endLineDraw = () => {
    this.isDrawingLine = false;
    this.selectedPin = null;
  };

  redrawLines() {
    this.lineCtx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    this.lineCtx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY,
    );
    this.lines.forEach((line) => {
      this.lineCtx.beginPath();
      this.lineCtx.moveTo(line.from.x, line.from.y);
      this.lineCtx.lineTo(line.to.x, line.to.y);
      this.lineCtx.strokeStyle = "#1976d2";
      this.lineCtx.lineWidth = 2;
      this.lineCtx.stroke();
    });
  }

  onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.lastDist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  onTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this.lastDist) {
        const delta = dist / this.lastDist;
        this.scale *= delta;
        this.scale = Math.max(0.5, Math.min(3, this.scale));
        this.redrawAll();
      }
      this.lastDist = dist;
    }
  };

  onTouchEnd = (e) => {
    this.lastDist = null;
  };

  redrawAll() {
    this.redrawLines();
    this.renderPins();
  }

  fitToAllPins() {
    if (this.pins.length === 0) return;

    // Calculate bounding box of all pins
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    this.pins.forEach((pin) => {
      minX = Math.min(minX, pin.x);
      maxX = Math.max(maxX, pin.x);
      minY = Math.min(minY, pin.y);
      maxY = Math.max(maxY, pin.y);
    });

    // Add padding around the pins
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    // Calculate required scale to fit all pins
    const canvasWidth = this.lineCanvas.width;
    const canvasHeight = this.lineCanvas.height;
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

    this.redrawAll();
  }

  redrawAll() {
    this.redrawLines();
    this.renderPins();
  }
}

customElements.define("driftmap-editor", DriftmapEditor);
