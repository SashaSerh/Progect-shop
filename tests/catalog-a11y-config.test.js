import { describe, it, expect, beforeEach } from 'vitest';

import { getTabBehavior, setTabBehavior, nextIndex, CATALOG_A11Y_DEFAULT } from '../js/catalog-a11y-config.js';

describe('catalog-a11y-config: pure functions and getters', () => {
  beforeEach(() => {
    // reset to default
    setTabBehavior('classic');
    try { localStorage.removeItem('catalogTabBehavior'); } catch {}
  });

  it('get/setTabBehavior updates and persists mode', () => {
    expect(getTabBehavior()).toBe(CATALOG_A11Y_DEFAULT);
    setTabBehavior('trap');
    expect(getTabBehavior()).toBe('trap');
    // invalid inputs ignored
    setTabBehavior('invalid');
    expect(getTabBehavior()).toBe('trap');
  });

  it('nextIndex cycles with wrap-around', () => {
    expect(nextIndex(0, +1, 3)).toBe(1);
    expect(nextIndex(2, +1, 3)).toBe(0);
    expect(nextIndex(0, -1, 3)).toBe(2);
    expect(nextIndex(1, -1, 3)).toBe(0);
    // edge cases
    expect(nextIndex(10, +1, 0)).toBe(0);
    expect(nextIndex(NaN, -1, 5)).toBe(4);
  });
});
