export const editorStyles = `
  :host {
    color: var(--text);
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
  }

  .canvas-wrapper {
    height: 100vh;
    position: relative;
    border-radius: 0;
    overflow: hidden;
    box-shadow: none;
    background: radial-gradient(1600px 900px at 30% 20%, #fbf7ea 0%, var(--paper-bg) 60%, var(--paper-bg-2) 100%);
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
    /* subtle sepia grid over parchment */
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px),
      linear-gradient(var(--grid-strong) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-strong) 1px, transparent 1px);
    background-size:
      16px 16px,
      16px 16px,
      80px 80px,
      80px 80px;
    background-position:
      0 0,
      0 0,
      0 0,
      0 0;
  }

  #interactionCanvas {
    z-index: 3;
    background: transparent;
    touch-action: none;
  }

  /* Popover (classic card) */
  .line-input-popover {
    position: absolute;
    min-width: 220px;
    max-width: 320px;
    padding: 10px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0,0,0,0.18);
    z-index: 10;
    color: var(--text);
    font-size: 14px;
    line-height: 1.4;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .line-input-popover header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .line-input-popover header .close {
    cursor: pointer;
    font-size: 16px;
    color: #5a513e;
    padding: 2px 6px;
    border-radius: 6px;
    transition: background 0.15s ease, transform 0.1s ease;
  }
  .line-input-popover header .close:hover {
    background: rgba(0,0,0,0.06);
  }
  .line-input-popover header .close:active {
    transform: scale(0.96);
  }
  .line-input-popover .row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
  }
  .line-input-popover label {
    white-space: nowrap;
    min-width: 90px;
    color: #495267;
  }
  .line-input-popover input[type="number"] {
    width: 7em;
    padding: 6px 8px;
    font-size: 14px;
    border: 1px solid #c8c8c8;
    border-radius: 8px;
    background: #fff;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .line-input-popover input[type="number"]:focus {
    border-color: var(--brass);
    box-shadow: 0 0 0 3px rgba(183, 154, 56, 0.20);
  }
  .line-input-popover .actions {
    margin-top: 12px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  button {
    align-self: flex-end;
    padding: 0.55em 1.1em;
    font-size: 0.95em;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.04);
    background: linear-gradient(180deg, var(--brass) 0%, var(--brass-600) 100%);
    color: #fff;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(183,154,56,0.35), 0 2px 6px rgba(0,0,0,0.15);
    transition: transform 0.08s ease, box-shadow 0.2s ease, filter 0.2s ease;
  }
  button:hover {
    filter: brightness(1.05);
    box-shadow: 0 8px 20px rgba(183,154,56,0.45), 0 3px 8px rgba(0,0,0,0.18);
  }
  button:active {
    transform: translateY(1px) scale(0.99);
  }
  .line-input-popover #drawLineBtn {
    background: linear-gradient(180deg, var(--brass) 0%, var(--brass-600) 100%);
    box-shadow: 0 6px 16px rgba(183,154,56,0.35), 0 2px 6px rgba(0,0,0,0.15);
  }
`;
