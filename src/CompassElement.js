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
        }
        #canvas {
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px #aaa;
        }
        #label {
          position: absolute;
          top: 0px;
          left: 0px;
          font-size: 1em;
          font-weight: bold;
          background: white;
        }
      </style>
      <div id="container">
        <canvas id="canvas" width="200" height="200"></canvas>
        <div id="label">N</div>
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
