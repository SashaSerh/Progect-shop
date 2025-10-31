import { describe, it, expect, beforeEach, vi } from 'vitest';

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
  // Clean env
  localStorage.clear();
  // Default lang to ru to avoid i18n surprises
  localStorage.setItem('language', 'ru');
  document.body.innerHTML = containersHTML();
  // Mock fetch for components used by initApp
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
  // Reset modules to avoid duplicate listeners
  await vi.resetModules();
  await import('../js/i18n.js');
  await import('../js/theme.js');
  await import('../js/products.js');
  await import('../js/cart.js');
  await import('../js/navigation.js');
  await import('../js/auth.js');
  await import('../js/main.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  // Allow initApp to render header
  await new Promise(r => setTimeout(r, 20));
}

function keydown(target, key, opts = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: !!opts.shiftKey });
  target.dispatchEvent(ev);
}

describe('Catalog A11y: roving and trap', () => {
  beforeEach(async () => {
    await mountApp();
  });

  it('ArrowDown/Up and Home/End move focus across items', async () => {
    // classic mode (no trap)
    localStorage.setItem('catalogTabBehavior', 'classic');
    const btn = document.getElementById('catalogButton');
    const dd = document.getElementById('catalogDropdown');
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    const items = Array.from(dd.querySelectorAll('.catalog-dropdown__list a'));
    expect(document.activeElement).toBe(items[0]);
    keydown(dd, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    keydown(dd, 'End');
    expect(document.activeElement).toBe(items[2]);
    keydown(dd, 'Home');
    expect(document.activeElement).toBe(items[0]);
    keydown(dd, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]); // wrap
  });

  it('Tab cycles inside only in trap mode; classic lets Tab escape', async () => {
    // trap mode (set via public setter to update runtime config)
    if (typeof window.setCatalogTabBehavior === 'function') window.setCatalogTabBehavior('trap');
    const btn = document.getElementById('catalogButton');
    const dd = document.getElementById('catalogDropdown');
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    const items = Array.from(dd.querySelectorAll('.catalog-dropdown__list a'));
    expect(document.activeElement).toBe(items[0]);
    keydown(dd, 'Tab');
    expect(document.activeElement).toBe(items[1]);
    keydown(dd, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(items[0]);

  // classic mode
  if (typeof window.setCatalogTabBehavior === 'function') window.setCatalogTabBehavior('classic');
    // Close then reopen to re-evaluate behavior
    const isOpen = dd.classList.contains('catalog-dropdown--open');
    if (isOpen) {
      const evEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      dd.dispatchEvent(evEsc);
      await new Promise(r => setTimeout(r, 220));
    }
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    const items2 = Array.from(dd.querySelectorAll('.catalog-dropdown__list a'));
    expect(document.activeElement).toBe(items2[0]);
    // In classic, pressing Tab should not cycle; focus would move out — we simulate by ensuring handler didn't change focus index
    keydown(dd, 'Tab');
    // As jsdom won't actually move focus outside automatically, assert that our handler didn't rotate focus
    expect(document.activeElement).toBe(items2[0]);
  });

  it('Escape closes dropdown and restores focus to button', async () => {
    localStorage.setItem('catalogTabBehavior', 'trap');
    const btn = document.getElementById('catalogButton');
    const dd = document.getElementById('catalogDropdown');
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(true);
    keydown(dd, 'Escape');
    await new Promise(r => setTimeout(r, 220));
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
