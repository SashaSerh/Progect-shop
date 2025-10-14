import { describe, it, expect } from 'vitest';
import { translations } from '../js/i18n.js';

describe('i18n completeness', () => {
  it('uk has all ru keys (at least)', () => {
    const ruKeys = Object.keys(translations.ru).sort();
    const ukKeys = Object.keys(translations.uk).sort();
    const missingInUk = ruKeys.filter(k => !ukKeys.includes(k));
    expect(missingInUk).toEqual([]);
  });

  it('ru has all uk keys (symmetry check)', () => {
    const ruKeys = Object.keys(translations.ru).sort();
    const ukKeys = Object.keys(translations.uk).sort();
    const missingInRu = ukKeys.filter(k => !ruKeys.includes(k));
    expect(missingInRu).toEqual([]);
  });
});
