import { drawCompass, degToCardinal } from "./compass.js";

class CompassElement extends HTMLElement {
  #angle = 0;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          width: 100vw;
          height: 220px;
        }
        #container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          width: 220px;
          height: 220px;
          position: relative;
        }
        #canvas {
          background: radial-gradient(circle at 60% 40%, #fff 60%, #1976d2 100%);
          border-radius: 50%;
          box-shadow: 0 8px 32px rgba(25, 118, 210, 0.25), 0 2px 8px #aaa;
          border: 4px solid #1976d2;
          transition: box-shadow 0.2s;
        }
        #label {
          position: absolute;
          left: 0;
          bottom: 0;
          font-size: 0.7em;
          font-weight: bold;
          background: rgba(255,255,255,0.85);
          color: #1976d2;
          padding: 6px 10px;
          border-radius: 16px;
          box-shadow: 0 2px 8px #aaa;
          letter-spacing: 0.1em;
          border: 1px solid #1976d2;
        }
      </style>
      <div id="container">
        <div id="label">N</div>
        <canvas id="canvas" width="200" height="200"></canvas>
      </div>
    `;
    this.canvas = this.shadowRoot.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.label = this.shadowRoot.getElementById("label");
    this.lastUpdate = 0;
  }

  connectedCallback() {
    this.setAngle(0);
    this.label.textContent = "N (0/0)";
    window.addEventListener("deviceorientation", this.handleOrientation);
  }

  disconnectedCallback() {
    window.removeEventListener("deviceorientation", this.handleOrientation);
  }

  handleOrientation = (e) => {
    const now = Date.now();
    if (now - this.lastUpdate < 50) return;
    this.lastUpdate = now;
    let heading = e.alpha;
    if (typeof heading !== "number") heading = 0;
    this.setAngle(heading);
    this.label.textContent = `${degToCardinal(heading)} (${Math.round(
      360 - heading,
    )}/${Math.round(heading)})`;
  };

  setAngle(angle) {
    this.#angle = angle;
    drawCompass(this.ctx, this.#angle);
  }

  get angle() {
    return this.#angle;
  }
}

customElements.define("driftmap-compass", CompassElement);
