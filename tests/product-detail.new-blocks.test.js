import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// We'll simulate minimal environment for renderProductDetail by stubbing needed globals.
// Assumptions: renderProductDetail defined in main.js and relies on DOM structure with #product-detail-container
// We'll mock translations and products array.

// Lazy import main.js after DOM prepared
let renderFn;

function loadMain(jsdom) {
  // Simulate existing globals expected by main.js
  global.window = jsdom.window;
  global.document = jsdom.window.document;
  global.location = jsdom.window.location;
  // Minimal stubs used by renderProductDetail
  global.addToCart = () => {};
  global.updateCartUI = () => {};
  global.getCartAddedMessage = () => 'Добавлено';
  global.showActionToast = () => {};
  // Provide empty functions for meta setters if referenced
  global.setOgTitle = () => {}; global.setTwitterTitle = () => {}; global.setOgDescription = () => {}; global.setTwitterDescription = () => {}; global.setOgUrl = () => {}; global.setOgImage = () => {}; global.setTwitterImage = () => {}; global.setMetaDescription = () => {};
  // translations stub
  global.translations = {
    ru: { 'site-title': 'Сайт', 'sku':'Артикул', flags: { isNew: 'Новинка', isHit: 'Хит' } },
    uk: { 'site-title': 'Сайт', 'sku':'Артикул', flags: { isNew: 'Новинка', isHit: 'Хіт' } }
  };
  global.savedLanguage = 'ru';
  // Import main.js (will attach renderProductDetail or similar)
  const mod = require('../js/main.js');
  // We locate function by name used earlier in code (renderProductDetail)
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}

function setupDom(html) {
  const jsdom = new JSDOM(html, { url: 'https://example.com/product/123' });
  loadMain(jsdom);
  return jsdom;
}

const baseComponentHtml = `
<div id="product-detail-container">
  ${require('fs').readFileSync(require('path').resolve(__dirname,'../components/product-detail.html'),'utf8')}
</div>`;

describe('Product Detail New Blocks', () => {
  beforeEach(() => {
    // Clear localStorage between tests
    if (global.window?.localStorage) global.window.localStorage.clear();
  });

  it('renders aggregate rating when reviews exist', () => {
    const dom = setupDom(baseComponentHtml);
    // Prepare product with id
    const product = {
      id: 'p1', sku: 'SKU1', name: { ru: 'Товар', uk: 'Товар' }, description: { ru: 'Desc', uk: 'Desc' }, price: 1000, inStock: true,
      images: ['picture/conditioners/demo-800w.jpg'], flags: [], specs: []
    };
    // Seed reviews in localStorage
    dom.window.localStorage.setItem('reviews:p1', JSON.stringify([
      { id:1, author:'A', rating:5, text:'ok', createdAt:new Date().toISOString() },
      { id:2, author:'B', rating:4, text:'ok', createdAt:new Date().toISOString() }
    ]));
    renderFn('p1', [product]);
    const rating = dom.window.document.querySelector('[data-role="rating"]');
    expect(rating).toBeTruthy();
    expect(rating.hidden).toBe(false);
    const valueEl = rating.querySelector('[data-role="rating-value"]');
    expect(valueEl.textContent).toMatch(/4.5/); // average of 5 and 4
    // JSON-LD aggregateRating present
    const ldScript = dom.window.document.getElementById('product-jsonld');
    const ld = JSON.parse(ldScript.textContent);
    expect(ld.aggregateRating).toBeTruthy();
    expect(ld.aggregateRating.ratingValue).toBe('4.5');
  });

  it('hides rating block when no reviews', () => {
    const dom = setupDom(baseComponentHtml);
    const product = { id: 'p2', sku: 'SKU2', name: { ru: 'Товар2', uk: 'Товар2' }, description: { ru: 'Desc', uk: 'Desc' }, price: 2000, inStock: true, images:['picture/conditioners/demo-800w.jpg'], flags: [], specs: [] };
    renderFn('p2', [product]);
    const rating = dom.window.document.querySelector('[data-role="rating"]');
    expect(rating).toBeTruthy();
    expect(rating.hidden).toBe(true);
    const ld = JSON.parse(dom.window.document.getElementById('product-jsonld').textContent);
    expect(ld.aggregateRating).toBeUndefined();
  });

  it('submits and renders a new review', () => {
    const dom = setupDom(baseComponentHtml);
    const product = { id: 'p3', sku: 'SKU3', name: { ru: 'Товар3', uk: 'Товар3' }, description: { ru: 'Desc', uk: 'Desc' }, price: 3000, inStock: true, images:['picture/conditioners/demo-800w.jpg'], flags: [], specs: [] };
    renderFn('p3', [product]);
    const form = dom.window.document.querySelector('[data-role="reviews-form"]');
    form.querySelector('input[name="author"]').value = 'Иван';
    form.querySelector('select[name="rating"]').value = '5';
    form.querySelector('textarea[name="text"]').value = 'Отлично';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const list = dom.window.document.querySelector('[data-role="reviews-list"]');
    expect(list.hidden).toBe(false);
    expect(list.querySelectorAll('.reviews__item').length).toBe(1);
  });

  it('renders flags badges when flags provided', () => {
    const dom = setupDom(baseComponentHtml);
    const product = { id: 'p4', sku: 'SKU4', name: { ru: 'Товар4', uk: 'Товар4' }, description: { ru: 'Desc', uk: 'Desc' }, price: 4000, inStock: true, images:['picture/conditioners/demo-800w.jpg'], flags: [{ key:'isNew', color:'#ff0' }, 'isHit'], specs: [] };
    renderFn('p4', [product]);
    const badges = dom.window.document.querySelectorAll('.product-buy__badges .badge--flag');
    expect(badges.length).toBe(2);
    expect(Array.from(badges).map(b => b.getAttribute('data-flag'))).toEqual(['isNew','isHit']);
  });

  it('Q&A submits and renders a question', () => {
    const dom = setupDom(baseComponentHtml);
    const product = { id: 'p5', sku: 'SKU5', name: { ru: 'Товар5', uk: 'Товар5' }, description: { ru: 'Desc', uk: 'Desc' }, price: 5000, inStock: true, images:['picture/conditioners/demo-800w.jpg'], flags: [], specs: [] };
    renderFn('p5', [product]);
    const form = dom.window.document.querySelector('[data-role="qa-form"]');
    form.querySelector('input[name="author"]').value = 'Ольга';
    form.querySelector('textarea[name="text"]').value = 'Есть ли гарантия?';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles:true, cancelable:true }));
    const list = dom.window.document.querySelector('[data-role="qa-list"]');
    expect(list.hidden).toBe(false);
    expect(list.querySelectorAll('.qa__item').length).toBe(1);
  });

  it('share links populate Telegram and WhatsApp href', () => {
    const dom = setupDom(baseComponentHtml);
    const product = { id: 'p6', sku: 'SKU6', name: { ru: 'Товар6', uk: 'Товар6' }, description: { ru: 'Desc', uk: 'Desc' }, price: 6000, inStock: true, images:['picture/conditioners/demo-800w.jpg'], flags: [], specs: [] };
    renderFn('p6', [product]);
    const tg = dom.window.document.querySelector('[data-role="share-tg"]');
    const wa = dom.window.document.querySelector('[data-role="share-wa"]');
    expect(tg.getAttribute('href')).toMatch(/t.me\/share\/url/);
    expect(wa.getAttribute('href')).toMatch(/wa.me/);
  });
});
