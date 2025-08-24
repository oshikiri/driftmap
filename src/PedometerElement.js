class DriftmapPedometer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.lastPeak = 0;
    this.peakThreshold = 12; // Adjust for sensitivity
    this.shadowRoot.innerHTML = `
      <style>
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: sans-serif;
        }
        button {
          margin: 0.25em;
          padding: 0.5em 1em;
          font-size: 0.5em;
        }
        input[type="number"] {
          width: 4em;
          text-align: center;
        }
      </style>
      <div class="container">
        <input id="stepInput" type="number" min="1" value="0" />
        <button id="reset">Reset</button>
      </div>
    `;
    this.stepInput = this.shadowRoot.getElementById("stepInput");
    this.shadowRoot
      .getElementById("reset")
      .addEventListener("click", () => this.resetSteps());

    window.addEventListener("devicemotion", this.handleMotion);
  }

  addSteps(n) {
    this.stepInput.value = (parseInt(this.stepInput.value, 10) || 0) + n;
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
      this.addSteps(1);
      this.lastPeak = Date.now();
    }
  };
}

customElements.define("driftmap-pedometer", DriftmapPedometer);
