import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

let renderFn;
function loadMain(jsdom){
  global.window = jsdom.window;
  global.document = jsdom.window.document;
  global.location = jsdom.window.location;
  global.addToCart = () => {}; global.updateCartUI = () => {}; global.getCartAddedMessage = () => 'Добавлено'; global.showActionToast = () => {};
  global.translations = { ru: { 'site-title':'Сайт', 'image-changed':'Изображение обновлено' } };
  global.savedLanguage='ru';
  const mod = require('../js/main.js');
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}
function setupDom(html){
  const jsdom = new JSDOM(html, { url: 'https://example.com/product/nav' });
  loadMain(jsdom); return jsdom;
}
const componentHtml = `<div id="product-detail-container">${fs.readFileSync(path.resolve(__dirname,'../components/product-detail.html'),'utf8')}</div>`;

describe('Gallery keyboard navigation', () => {
  beforeEach(()=> { if (global.window?.localStorage) global.window.localStorage.clear(); });

  it('ArrowRight moves focus and updates roving tabindex', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'galnav', sku:'GNV1', name:{ ru:'Галерея Нав' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg','picture/conditioners/b-800w.jpg','picture/conditioners/c-800w.jpg'], flags:[], specs:[] };
    renderFn('galnav',[product]);
    const thumbs = dom.window.document.querySelectorAll('.product-gallery__thumb');
    expect(thumbs.length).toBe(3);
    thumbs[0].focus();
    expect(thumbs[0].tabIndex).toBe(0);
    const evt = new dom.window.KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true });
    thumbs[0].dispatchEvent(evt);
    expect(document.activeElement).toBe(thumbs[1]);
    // roving tabindex updated
    expect(thumbs[0].tabIndex).toBe(-1);
    expect(thumbs[1].tabIndex).toBe(0);
  });

  it('Home and End jump to first and last thumb', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'galnav2', sku:'GNV2', name:{ ru:'Галерея Нав2' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg','picture/conditioners/b-800w.jpg','picture/conditioners/c-800w.jpg'], flags:[], specs:[] };
    renderFn('galnav2',[product]);
    const thumbs = dom.window.document.querySelectorAll('.product-gallery__thumb');
    thumbs[1].focus();
    thumbs[1].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key:'End', bubbles:true }));
    expect(document.activeElement).toBe(thumbs[2]);
    thumbs[2].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key:'Home', bubbles:true }));
    expect(document.activeElement).toBe(thumbs[0]);
  });

  it('activation updates aria-selected and live region', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'galnav3', sku:'GNV3', name:{ ru:'Галерея Нав3' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg','picture/conditioners/b-800w.jpg'], flags:[], specs:[] };
    renderFn('galnav3',[product]);
    const thumbs = dom.window.document.querySelectorAll('.product-gallery__thumb');
    const announce = dom.window.document.querySelector('[data-role="gallery-announce"]');
    thumbs[1].focus();
    thumbs[1].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key:'Enter', bubbles:true }));
    expect(thumbs[0].getAttribute('aria-selected')).toBe('false');
    expect(thumbs[1].getAttribute('aria-selected')).toBe('true');
    expect(announce.textContent).toMatch(/#2/);
  });
});
