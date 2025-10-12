// Centralized gestures configuration
export const gesturesConfig = {
  angleMax: 30,
  startThreshold: 8,
  closeThresholdRatio: 0.2,
  openThresholdRatio: 0.2,
  springBackDuration: 220, // a bit softer by default
  flingVelocity: 0.6,      // px/ms: slightly easier to trigger
  flingWindowMs: 120       // ms
};

// Also expose on window for convenience/overrides at runtime
if (typeof window !== 'undefined') {
  window.gesturesConfig = Object.assign({}, gesturesConfig, window.gesturesConfig || {});
}
