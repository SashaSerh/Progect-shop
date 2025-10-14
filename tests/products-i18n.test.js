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

  it('updates product titles after switchLanguage to uk', () => {
    const firstTitleRu = document.querySelector('.product-card__title').textContent;
    expect(firstTitleRu).toBe(products[0].name.ru);
    switchLanguage('uk'); // triggers languagechange event, products listener will re-filter
    // listener in products.js should re-render
    const firstTitleUk = document.querySelector('.product-card__title').textContent;
    expect(firstTitleUk).toBe(products[0].name.uk);
  });

  it('falls back gracefully when switching to unsupported lang', () => {
    switchLanguage('de');
    const titleAfter = document.querySelector('.product-card__title').textContent;
    // remains Russian fallback
    expect(titleAfter).toBe(products[0].name.ru);
  });
});
