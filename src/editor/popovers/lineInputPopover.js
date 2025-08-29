export function buildLineInputPopover({
  screenX,
  screenY,
  canvasWidth,
  canvasHeight,
  onSubmit,
  onClose,
}) {
  const inputDiv = document.createElement("div");
  inputDiv.className = "line-input-popover";

  const offset = 12;
  let sx = screenX + offset;
  let sy = screenY - offset;
  const maxX = canvasWidth - 240;
  const maxY = canvasHeight - 140;
  sx = Math.max(8, Math.min(sx, maxX));
  sy = Math.max(8, Math.min(sy, maxY));
  inputDiv.style.left = `${sx}px`;
  inputDiv.style.top = `${sy}px`;

  inputDiv.innerHTML = `
    <header>
      <span class="close" id="closeBtn" aria-label="Close">×</span>
    </header>
    <div class="row">
      <label for="angleInput">Angle(°)</label>
      <input type="number" id="angleInput" value="0" inputmode="decimal" />
    </div>
    <div class="row">
      <label for="lengthInput">Length</label>
      <input type="number" id="lengthInput" value="50" inputmode="decimal" />
    </div>
    <div class="actions">
      <button id="drawLineBtn">Draw</button>
    </div>
  `;

  inputDiv.addEventListener("pointerdown", (ev) => ev.stopPropagation());
  inputDiv.addEventListener("click", (ev) => ev.stopPropagation());

  const run = () => {
    const angle = parseFloat(inputDiv.querySelector("#angleInput").value);
    const length = parseFloat(inputDiv.querySelector("#lengthInput").value);
    if (!isFinite(angle) || !isFinite(length)) return;
    onSubmit?.(angle, length);
    inputDiv.remove();
    onClose?.();
  };
  inputDiv.querySelector("#drawLineBtn").onclick = run;
  inputDiv.querySelector("#closeBtn").onclick = () => {
    inputDiv.remove();
    onClose?.();
  };

  return inputDiv;
}
