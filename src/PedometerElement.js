class DriftmapPedometer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.lastPeak = 0;
    this.peakThreshold = 12; // Adjust for sensitivity
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
          color: var(--text);
        }
        .card {
          display: grid;
          grid-template-columns: auto auto;
          align-items: center;
          gap: 8px 10px;
          min-width: 160px;
          padding: 10px 12px;
          background: var(--panel);
          border: 1px solid var(--panel-border);
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.16);
        }
        .label {
          grid-column: 1 / 3;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 12px;
          letter-spacing: 0.06em;
          color: var(--text);
        }
        .steps {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .steps input[type="number"] {
          width: 6em;
          padding: 6px 8px;
          font-size: 14px;
          text-align: center;
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          background: #fffdf6;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .steps input[type="number"]:focus {
          border-color: var(--brass);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--brass) 40%, transparent);
        }
        button {
          justify-self: end;
          padding: 0.42em 0.85em;
          font-size: 0.9em;
          border-radius: 8px;
          border: 1px solid var(--brass);
          background: linear-gradient(180deg, color-mix(in srgb, var(--brass) 60%, #f7e69a) 0%, var(--brass-600) 100%);
          color: var(--text);
          cursor: pointer;
          box-shadow: 0 6px 14px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12);
          transition: transform 0.08s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        button:hover { filter: brightness(1.03); }
        button:active { transform: translateY(1px) scale(0.99); }
      </style>
      <div class="card">
        <div class="label">Steps</div>
        <div class="steps">
          <input id="stepInput" type="number" min="0" value="0" />
        </div>
        <button id="reset">Reset</button>
      </div>
    `;
    this.stepInput = this.shadowRoot.getElementById("stepInput");
    this.shadowRoot
      .getElementById("reset")
      .addEventListener("click", () => this.resetSteps());
  }

  connectedCallback() {
    window.addEventListener("devicemotion", this.handleMotion);
  }

  disconnectedCallback() {
    window.removeEventListener("devicemotion", this.handleMotion);
  }

  increamentSteps() {
    this.stepInput.value = (parseInt(this.stepInput.value, 10) || 0) + 1;
  }

  resetSteps() {
    this.stepInput.value = 0;
  }

  handleMotion = (event) => {
    const acc = event.accelerationIncludingGravity;
    console.log(acc);
    if (!acc) return;
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    if (magnitude > this.peakThreshold && Date.now() - this.lastPeak > 400) {
      this.increamentSteps();
      this.lastPeak = Date.now();
    }
  };
}

customElements.define("driftmap-pedometer", DriftmapPedometer);
