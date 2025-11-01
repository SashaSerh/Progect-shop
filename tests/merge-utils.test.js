import { describe, it, expect } from 'vitest';
import { mergeProduct, computeDiff } from '../js/merge-utils.js';

describe('merge-utils', () => {
  const local = {
    id: 'p1',
    name: { ru: 'Локал', uk: '' },
    description: { ru: 'лок опис', uk: '' },
    price: 100,
    sku: 'SKU1',
    category: 'ac',
    image: 'l.jpg',
    images: ['l1.jpg'],
    inStock: true,
    flags: ['sale']
  };
  const remote = {
    id: 'remote-ignored',
    name: { ru: 'Ремо', uk: 'Ремо ук' },
    description: { ru: '', uk: 'укр опис' },
    price: 120,
    sku: 'SKU1',
    category: 'recuperator',
    image: 'r.jpg',
    images: ['r1.jpg'],
    inStock: false,
    flags: [{ key: 'new', color: '#00f' }]
  };

  it('mergeProduct preserves local id and merges values/sets', () => {
    const merged = mergeProduct(local, remote);
    expect(merged.id).toBe('p1');
    expect(merged.name.ru).toBe('Ремо');
    expect(merged.name.uk).toBe('Ремо ук');
    expect(merged.description.ru).toBe('лок опис'); // remote empty keeps local
    expect(merged.description.uk).toBe('укр опис');
    expect(merged.price).toBe(120);
    expect(merged.sku).toBe('SKU1');
    expect(merged.category).toBe('recuperator');
    expect(merged.image).toBe('r.jpg');
    expect(merged.images).toEqual(['l1.jpg', 'r1.jpg']);
    expect(merged.inStock).toBe(false);
    expect(Array.isArray(merged.flags)).toBe(true);
    const keys = merged.flags.map(f => (typeof f === 'string' ? f : f.key));
    expect(keys).toEqual(expect.arrayContaining(['sale','new']));
  });

  it('computeDiff lists differences between local and remote', () => {
    const diffs = computeDiff(local, remote);
    const fields = diffs.map(d => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name.ru','name.uk','description.uk','price','category','image','images','inStock','flags']));
  });
});
