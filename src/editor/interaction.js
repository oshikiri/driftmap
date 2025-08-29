export function bindInteractions(
  canvas,
  {
    hitTestPin, // (sx, sy) => index or -1
    onTapBlank, // (sx, sy) => void
    onTapPin, // (idx) => void
    onLongPressPin, // (idx) => void
    onPinch, // ({ factor, center: {x,y} }) => void
    tapMoveThreshold = 8,
    longPressMs = 600,
  } = {},
) {
  const pointers = new Map(); // pointerId -> { x, y }
  let pinchCenter = null;
  let lastDist = null;
  let longPressTimer = null;
  let tapCandidate = null; // { x, y, hitIdx }

  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e) {
    canvas.setPointerCapture?.(e.pointerId);
    const { x, y } = getXY(e);
    pointers.set(e.pointerId, { x, y });

    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      lastDist = Math.hypot(dx, dy);
      pinchCenter = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
      tapCandidate = null;
      return;
    }

    const hitIdx = hitTestPin ? hitTestPin(x, y) : -1;
    tapCandidate = { x, y, hitIdx };
    if (hitIdx !== -1 && onLongPressPin) {
      longPressTimer = setTimeout(() => {
        onLongPressPin(hitIdx);
        tapCandidate = null;
        longPressTimer = null;
      }, longPressMs);
    }
  }

  function onMove(e) {
    const { x, y } = getXY(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x, y });

    if (pointers.size === 2) {
      e.preventDefault();
      const pts = Array.from(pointers.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      if (lastDist && pinchCenter && onPinch) {
        const factor = dist / lastDist;
        onPinch({ factor, center: { x: pinchCenter.x, y: pinchCenter.y } });
      }
      lastDist = dist;
      return;
    }

    if (tapCandidate) {
      const dx = x - tapCandidate.x;
      const dy = y - tapCandidate.y;
      if (Math.hypot(dx, dy) > tapMoveThreshold) {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = null;
        tapCandidate = null;
      }
    }
  }

  function onUp(e) {
    if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      lastDist = null;
      pinchCenter = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (tapCandidate) {
      const { x, y } = getXY(e);
      const moved = Math.hypot(x - tapCandidate.x, y - tapCandidate.y);
      if (moved <= tapMoveThreshold) {
        if (tapCandidate.hitIdx !== -1) onTapPin?.(tapCandidate.hitIdx);
        else onTapBlank?.(x, y);
      }
    }
    tapCandidate = null;
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);

  return function unbind() {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    if (longPressTimer) clearTimeout(longPressTimer);
  };
}
