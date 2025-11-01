import { describe, it, expect } from 'vitest';
import { autoFlagColor, hashCodeToHue, hslToHex } from '../js/flags-color.js';

describe('flags-color', () => {
  it('hashCodeToHue is deterministic and within 0..360', () => {
    const h1 = hashCodeToHue('sale');
    const h2 = hashCodeToHue('sale');
    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThanOrEqual(360);
  });

  it('hslToHex returns #rrggbb', () => {
    const hex = hslToHex(180, 50, 50);
    expect(hex).toMatch(/^#?[0-9a-fA-F]{6}$/);
  });

  it('autoFlagColor returns hex and is deterministic per key', () => {
    const a = autoFlagColor('popular');
    const b = autoFlagColor('popular');
    const c = autoFlagColor('hit');
    expect(a).toBe(b);
    expect(a).toMatch(/^#?[0-9a-fA-F]{6}$/);
    expect(c).not.toBe(a);
  });
});
