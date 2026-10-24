/* Native browser zoom keeps ownership of pinch and magnified panning. */
(() => {
  'use strict';
  const root = document.documentElement, viewport = window.visualViewport;
  const ZOOM_EPSILON = .01, GESTURE_SETTLE_MS = 300;
  let zoomed = false, pinching = false, resumeAt = 0, suppressClickUntil = 0, resumeTimer = 0;
  const scale = () => Math.max(1, Number(viewport?.scale) || 1);
  const isZoomed = () => scale() > 1 + ZOOM_EPSILON;
  const gesturesBlocked = () => isZoomed() || pinching || performance.now() < resumeAt;
  function settleGestures() {
    resumeAt = performance.now() + GESTURE_SETTLE_MS;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      window.dispatchEvent(new Event('bag-day-gestures-ready'));
    }, GESTURE_SETTLE_MS);
  }
  function cancelGestures() {
    suppressClickUntil = performance.now() + GESTURE_SETTLE_MS;
    window.dispatchEvent(new Event('bag-day-gesture-cancel'));
  }
  function sync() {
    const next = isZoomed();
    if (next === zoomed) return;
    zoomed = next;
    root.dataset.zoomed = String(zoomed);
    settleGestures();
    cancelGestures();
    window.dispatchEvent(new Event('bag-day-zoom-change'));
  }
  // Remove magnification from viewport measurements. Keyboard and browser-bar
  // changes still resize the layout, but zoom and panning do not shrink it.
  function layout() {
    const factor = scale(), magnified = isZoomed();
    return {
      width: Math.round((viewport?.width || window.innerWidth) * factor),
      height: Math.round((viewport?.height || window.innerHeight) * factor),
      top: magnified ? 0 : viewport?.offsetTop || 0,
      left: magnified ? 0 : viewport?.offsetLeft || 0
    };
  }
  function touches(event) {
    if (event.touches.length > 1 && !pinching) {
      pinching = true;
      cancelGestures();
    }
    // Keep a pinch cancelled until BOTH fingers lift, even at normal scale.
    if (pinching && event.touches.length === 0) {
      pinching = false;
      settleGestures();
      suppressClickUntil = resumeAt;
    }
  }
  for (const type of ['touchstart', 'touchend', 'touchcancel']) {
    document.addEventListener(type, touches, {capture: true, passive: true});
  }
  document.addEventListener('click', event => {
    if (event.detail !== 0 && (pinching || performance.now() < suppressClickUntil)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  function resetTouches() {
    pinching = false;
    settleGestures();
    cancelGestures();
    sync();
  }
  window.addEventListener('pageshow', resetTouches);
  window.addEventListener('pagehide', resetTouches);
  window.addEventListener('blur', resetTouches);
  viewport?.addEventListener('resize', sync);
  root.dataset.zoomed = 'false';
  window.BAG_DAY_VIEWPORT = {isZoomed, gesturesBlocked, layout};
  sync();
})();
