class DriftmapEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .canvas-wrapper {
          height: 70vh;
        }
        canvas {
          background: #001427ff;
          cursor: crosshair;
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
          <canvas id="mapCanvas"></canvas>
          <div id="pins"></div>
        </div>
      </div>
    `;
    this.canvas = this.shadowRoot.getElementById("mapCanvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext("2d");
    this.pinsEl = this.shadowRoot.getElementById("pins");
    this.pins = [];
    this.lines = [];
    this.isDrawingLine = false;
    this.selectedPin = null;
    this.lastX = 0;
    this.lastY = 0;

    this.canvas.addEventListener("click", this.addPin);
    this.pinsEl.addEventListener("click", this.pinClick);
    this.canvas.addEventListener("mousedown", this.startLineDraw);
    this.canvas.addEventListener("mousemove", this.drawLine);
    this.canvas.addEventListener("mouseup", this.endLineDraw);
    this.canvas.addEventListener("touchstart", this.onTouchStart, {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", this.onTouchMove, {
      passive: false,
    });
    this.canvas.addEventListener("touchend", this.onTouchEnd);

    this.scale = 1;
    this.lastDist = null;
    this.offsetX = 0;
    this.offsetY = 0;

    this.redrawAll();
  }

  addPin = (e) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const memo = prompt("メモを入力してください");
    if (memo === null) return;
    const pin = { x, y, memo };
    this.pins.push(pin);
    this.renderPins();
  };

  renderPins() {
    this.pinsEl.innerHTML = "";
    this.pins.forEach((pin, idx) => {
      const pinEl = document.createElement("div");
      pinEl.className = "pin";
      pinEl.style.left = `${pin.x}px`;
      pinEl.style.top = `${pin.y}px`;
      pinEl.dataset.idx = idx;
      this.pinsEl.appendChild(pinEl);
      if (pin.memo) {
        const memoEl = document.createElement("div");
        memoEl.className = "memo";
        memoEl.textContent = pin.memo;
        memoEl.style.left = `${pin.x}px`;
        memoEl.style.top = `${pin.y}px`;
        this.pinsEl.appendChild(memoEl);
      }
    });
    this.redrawLines();
  }

  pinClick = (e) => {
    if (!e.target.classList.contains("pin")) return;
    const idx = parseInt(e.target.dataset.idx, 10);
    // 長押し判定用
    let longPressTimer;
    const pinEl = e.target;
    const startLongPress = () => {
      longPressTimer = setTimeout(() => {
        this.editPinName(idx);
      }, 600); // 600ms以上で長押し
    };
    const cancelLongPress = () => {
      clearTimeout(longPressTimer);
    };
    pinEl.addEventListener("mousedown", startLongPress);
    pinEl.addEventListener("touchstart", startLongPress);
    pinEl.addEventListener("mouseup", cancelLongPress);
    pinEl.addEventListener("mouseleave", cancelLongPress);
    pinEl.addEventListener("touchend", cancelLongPress);
    // 通常クリックで線描画モード
    pinEl.addEventListener("click", () => {
      this.selectedPin = this.pins[idx];
      this.isDrawingLine = true;
      this.showLineInput(idx);
    });
  };

  showLineInput(idx) {
    // 方向と長さ入力UIを表示
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
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = "#1976d2";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.lines.push({ from: { x: from.x, y: from.y }, to });
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
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = this.selectedPin.x;
    this.lastY = this.selectedPin.y;
    this.drawLine(e, true);
  };

  drawLine = (e, force) => {
    if (!this.isDrawingLine || !this.selectedPin) return;
    if (e.buttons !== 1 && !force) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = "#1976d2";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.lines.push({ from: { x: this.lastX, y: this.lastY }, to: { x, y } });
    this.lastX = x;
    this.lastY = y;
  };

  endLineDraw = () => {
    this.isDrawingLine = false;
    this.selectedPin = null;
  };

  redrawLines() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.lines.forEach((line) => {
      this.ctx.beginPath();
      this.ctx.moveTo(line.from.x, line.from.y);
      this.ctx.lineTo(line.to.x, line.to.y);
      this.ctx.strokeStyle = "#1976d2";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
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
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawLines();
    // ピンはCSSで絶対配置なので、ズーム時は再配置が必要
    this.renderPins();
    this.drawGrid();
  }

  drawGrid() {
    const gridSize = 50;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.save();
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 0.2;
    for (let x = 0; x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}

customElements.define("driftmap-editor", DriftmapEditor);
