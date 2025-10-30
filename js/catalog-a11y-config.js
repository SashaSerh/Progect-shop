// Catalog A11y configuration and small helpers
// Stored in localStorage when available; default is 'classic'

const STORAGE_KEY = 'catalogTabBehavior';
const DEFAULT_BEHAVIOR = 'classic';

function readStorage() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'trap' ? 'trap' : DEFAULT_BEHAVIOR;
  } catch (_) {
    return DEFAULT_BEHAVIOR;
  }
}

let _tabBehavior = readStorage();

export function getTabBehavior() {
  // Always reflect latest persisted value to support runtime toggles in tests/QA
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    _tabBehavior = (v === 'trap') ? 'trap' : DEFAULT_BEHAVIOR;
  } catch (_) { /* ignore */ }
  return _tabBehavior;
}

export function setTabBehavior(mode) {
  if (mode !== 'trap' && mode !== 'classic') return _tabBehavior;
  _tabBehavior = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
  return _tabBehavior;
}

// Pure helper: compute next index for roving/tab cycles
export function nextIndex(current, dir, length) {
  if (!Number.isFinite(length) || length <= 0) return 0;
  const c = Number.isFinite(current) ? current : 0;
  const d = dir === -1 ? -1 : 1;
  return (c + d + length) % length;
}

export const CATALOG_A11Y_DEFAULT = DEFAULT_BEHAVIOR;
