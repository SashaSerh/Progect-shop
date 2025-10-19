import { describe, it, beforeEach, expect } from 'vitest';
import { renderProducts, getMergedProducts } from '../js/products.js';

// Простая JSDOM интеграция: создаём контейнер и вставляем в document
describe('integration: products rendering with localStorage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="products__grid"></div>';
    localStorage.removeItem('products_local_v1');
  });

  it('renders product from localStorage', () => {
    const test = { id: 'p_int', name:{ru:'Интеграционный'}, description:{ru:'desc'}, price:1234, image:'https://placehold.co/300x200' };
    localStorage.setItem('products_local_v1', JSON.stringify([test]));
    const merged = getMergedProducts();
    // merged should contain our test product
    expect(merged.some(p => String(p.id) === 'p_int')).toBe(true);
    // render into DOM
    renderProducts('ru', window.translations || {}, merged);
    const grid = document.querySelector('.products__grid');
    expect(grid.querySelector('.product-card')).not.toBeNull();
    const title = grid.querySelector('.product-card__title');
    expect(title.textContent).toContain('Интеграционный');
  });
});
