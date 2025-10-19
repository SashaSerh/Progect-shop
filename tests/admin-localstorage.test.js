import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLocalProducts, upsertLocalProduct, saveLocalProducts } from '../js/admin-products.js';

describe('admin-products localStorage helpers', () => {
  const KEY = 'products_local_v1';

  beforeEach(() => {
    // clean storage before each test
    localStorage.removeItem(KEY);
  });

  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it('getLocalProducts returns empty array when no data', () => {
    const out = getLocalProducts();
    expect(out).toEqual([]);
  });

  it('upsertLocalProduct adds a product and persists it', () => {
    const p = { id: 't1', name:{ru:'T'}, description:{ru:'d'}, price:1000 };
    upsertLocalProduct(p);
    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe('t1');
    expect(stored[0].price).toBe(1000);
  });

  it('upsertLocalProduct updates existing product', () => {
    const p = { id: 't2', name:{ru:'T2'}, description:{ru:'d2'}, price:200 };
    upsertLocalProduct(p);
    p.price = 300;
    upsertLocalProduct(p);
    const stored = JSON.parse(localStorage.getItem(KEY));
    expect(stored.length).toBe(1);
    expect(stored[0].price).toBe(300);
  });
});
