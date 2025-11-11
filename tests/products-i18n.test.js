import { describe, it, expect, beforeEach } from 'vitest';
import { products, renderProducts } from '../js/products.js';
import { switchLanguage, translations } from '../js/i18n.js';

// We simulate only the grid container; renderProducts depends on .products__grid
function setupDom() {
  document.body.innerHTML = `<div class="products__grid"></div>`;
}

describe('Products i18n re-render', () => {
  beforeEach(() => {
    setupDom();
    localStorage.setItem('language','ru');
    renderProducts('ru', translations);
  });

  it('updates product descriptions after switchLanguage to uk', () => {
    const firstDescRu = document.querySelector('.product-card__description').textContent;
    expect(firstDescRu).toBe(products[0].description.ru);
    switchLanguage('uk');
    const firstDescUk = document.querySelector('.product-card__description').textContent;
    expect(firstDescUk).toBe(products[0].description.uk);
  });

  it('falls back gracefully when switching to unsupported lang', () => {
    switchLanguage('de');
    const descAfter = document.querySelector('.product-card__description').textContent;
    // remains Russian fallback for description
    expect(descAfter).toBe(products[0].description.ru);
  });
});
