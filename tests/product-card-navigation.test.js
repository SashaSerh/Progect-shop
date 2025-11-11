import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderProductCard } from '../js/products.js';

function containersHTML() {
  return `
    <div id="header-container"></div>
    <div id="hero-container"></div>
    <div id="services-container"></div>
    <div id="products-container"><div class="products__grid"></div></div>
    <div id="product-detail-container"></div>
    <div id="comparison-container"></div>
    <div id="compare-modal-container"></div>
    <div id="contacts-container"></div>
    <div id="portfolio-container"></div>
    <div id="footer-container"></div>
    <div id="cart-modal-container"></div>
    <div id="toast-container"></div>
  `;
}

const headerWithCatalog = `
  <header>
    <button id="catalogButton" aria-expanded="false">Каталог</button>
    <div id="catalogDropdown" class="catalog-dropdown" aria-hidden="true">
      <ul class="catalog-dropdown__list">
        <li><a href="#c1">Раздел 1</a></li>
        <li><a href="#c2">Раздел 2</a></li>
        <li><a href="#c3">Раздел 3</a></li>
      </ul>
    </div>
  </header>
`;

async function mountApp() {
  localStorage.clear();
  localStorage.setItem('language', 'ru');
  document.body.innerHTML = containersHTML();

  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = typeof url === 'string' ? url : url.url;
    let body = '<div></div>';
    if (path.includes('components/header.html')) body = headerWithCatalog;
    else if (path.includes('components/products.html')) body = '<section></section>';
    else if (path.includes('components/services.html')) body = '<section></section>';
    else if (path.includes('components/contacts.html')) body = '<section></section>';
    else if (path.includes('components/hero.html')) body = '<section></section>';
    else if (path.includes('components/footer.html')) body = '<footer></footer>';
    else if (path.includes('components/cart.html')) body = '<div id="cartModal" style="display:none"></div>';
    else if (path.includes('components/product-detail.html')) body = '<section class="product-detail"></section>';
    else if (path.includes('components/compare-bar.html')) body = '<div></div>';
    else if (path.includes('components/compare-modal.html')) body = '<div></div>';
    else if (path.includes('components/portfolio.html')) body = '<section></section>';
    return { ok: true, status: 200, text: async () => body };
  }));

  await vi.resetModules();
  await import('../js/i18n.js');
  await import('../js/theme.js');
  await import('../js/products.js');
  await import('../js/cart.js');
  await import('../js/navigation.js');
  await import('../js/auth.js');
  await import('../js/main.js');

  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise(r => setTimeout(r, 20));
}

// Minimal translations for renderProductCard usage in tests
const translations = {
  ru: {
    'service-order': 'Заказать'
  }
};

function makeProduct() {
  return {
    id: 'p_nav1',
    name: { ru: 'Нав тест', uk: 'Нав тест' },
    description: { ru: 'Описание', uk: 'Опис' },
    price: 999,
    category: 'ac',
    specs: [],
    flags: [],
    image: 'https://placehold.co/600x400?text=Img'
  };
}

describe('Product card navigation (full-card click)', () => {
  beforeEach(async () => {
    await mountApp();
    // Reset hash before each test
    location.hash = '';
  });

  it('click on non-interactive area navigates to product detail', async () => {
    const grid = document.querySelector('.products__grid');
    const product = makeProduct();
    const card = renderProductCard(product, 'ru', translations);
    grid.appendChild(card);

    // Click on the card element itself (non-interactive area)
    card.click();

    expect(location.hash).toBe(`#product-${product.id}`);
  });

  it('clicking add-to-cart button inside card does not navigate', async () => {
    const grid = document.querySelector('.products__grid');
    const product = makeProduct();
    const card = renderProductCard(product, 'ru', translations);
    grid.appendChild(card);

    const cartBtn = card.querySelector('.product-card__button');
    expect(cartBtn).toBeTruthy();

    cartBtn.click();

    // Should not navigate on button click
    expect(location.hash).toBe('');
  });
});
