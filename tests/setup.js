// Vitest global setup for jsdom

// Stub scrollTo to avoid jsdom warnings
if (typeof window !== 'undefined') {
  // Полностью заглушаем, чтобы не видеть предупреждений jsdom
  window.scrollTo = () => {};
  window.scrollBy = () => {};
  // Polyfill PointerEvent for jsdom
  if (typeof window.PointerEvent !== 'function') {
    class PolyPointerEvent extends Event {
      constructor(type, init = {}) {
        // ensure bubbling/cancelable by default so window listeners receive events
        if (init.bubbles === undefined) init.bubbles = true;
        if (init.cancelable === undefined) init.cancelable = true;
        super(type, init);
        this.clientX = init.clientX ?? 0;
        this.clientY = init.clientY ?? 0;
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
        this.isPrimary = init.isPrimary ?? true;
        this.buttons = init.buttons ?? 0;
        this.pressure = init.pressure ?? 0.5;
      }
    }
    window.PointerEvent = PolyPointerEvent;
    global.PointerEvent = PolyPointerEvent;
  }
  // Stub vibrate to avoid errors in tests
  if (!('vibrate' in navigator)) {
    navigator.vibrate = () => false;
  }
}
