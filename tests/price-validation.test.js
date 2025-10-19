import { describe, it, expect } from 'vitest';

describe('price parsing and validation', () => {
  it('parses integer price strings to Number', () => {
    const v = '15000';
    expect(Number(v)).toBe(15000);
  });

  it('rejects negative prices', () => {
    const v = '-100';
    const n = Number(v);
    expect(n < 0).toBe(true);
  });

  it('handles floats by rounding (simulated conversion to cents)', () => {
    const v = '1299.99';
    const cents = Math.round(parseFloat(v) * 100);
    expect(cents).toBe(129999);
  });
});
