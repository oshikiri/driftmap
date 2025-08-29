export function editorMarkup() {
  return `
    <div class="editor-container">
      <div class="canvas-wrapper">
        <canvas id="sceneCanvas"></canvas>
        <canvas id="interactionCanvas"></canvas>
        <div id="pins"></div>
      </div>
    </div>
  `;
}
