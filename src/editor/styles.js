export const editorStyles = `
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
`;
