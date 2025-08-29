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
          height: 240px;
        }
        #container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          width: 240px;
          height: 240px;
          position: relative;
          filter: drop-shadow(0 18px 35px rgba(0,0,0,0.35)) drop-shadow(0 3px 12px rgba(0,0,0,0.2));
        }
        #canvas {
          background: transparent;
          border-radius: 50%;
          box-shadow: 0 10px 28px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 0.15s ease, box-shadow 0.25s ease, filter 0.25s ease;
          position: relative;
          z-index: 1;
        }
        #canvas:hover {
          filter: none;
          box-shadow: 0 12px 34px rgba(0,0,0,0.32), 0 3px 10px rgba(0,0,0,0.26);
        }
        #label {
          position: absolute;
          left: 0;
          bottom: 0;
          font-size: 0.8em;
          font-weight: 700;
          color: var(--text);
          padding: 6px 10px;
          border-radius: 16px;
          letter-spacing: 0.12em;
          background: var(--panel);
          border: 1px solid var(--panel-border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
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
