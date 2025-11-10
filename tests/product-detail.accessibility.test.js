import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

let renderFn;
function loadMain(jsdom){
  global.window = jsdom.window;
  global.document = jsdom.window.document;
  global.location = jsdom.window.location;
  global.addToCart = () => {}; global.updateCartUI = () => {}; global.getCartAddedMessage = () => 'Добавлено'; global.showActionToast = () => {};
  global.setOgTitle = () => {}; global.setTwitterTitle = () => {}; global.setOgDescription=()=>{}; global.setTwitterDescription=()=>{}; global.setOgUrl=()=>{}; global.setOgImage=()=>{}; global.setTwitterImage=()=>{}; global.setMetaDescription=()=>{};
  global.translations = { ru: { 'site-title':'Сайт', 'read-more':'Читать далее', 'read-less':'Свернуть', 'image-changed':'Изображение обновлено' } };
  global.savedLanguage='ru';
  const mod = require('../js/main.js');
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}
function setupDom(html){
  const jsdom = new JSDOM(html, { url: 'https://example.com/product/long' });
  loadMain(jsdom); return jsdom;
}
const componentHtml = `<div id="product-detail-container">${require('fs').readFileSync(require('path').resolve(__dirname,'../components/product-detail.html'),'utf8')}</div>`;

describe('Product Detail Accessibility / Collapsible / Gallery', () => {
  beforeEach(()=> { if (global.window?.localStorage) global.window.localStorage.clear(); });

  it('adds collapsible toggle for long description', async () => {
    const dom = setupDom(componentHtml);
    const longText = 'X '.repeat(1200); // ensure scrollHeight large
    const product = { id:'long', sku:'L1', name:{ ru:'Длинный' }, fullDesc:{ ru: longText }, description:{ ru: longText }, price:10, inStock:true, images:['picture/conditioners/demo-800w.jpg'], flags:[], specs:[] };
    renderFn('long',[product]);
    // Wait rAF collapse logic
    await new Promise(r=> setTimeout(r,50));
    const panel = dom.window.document.querySelector('.product-panel[data-panel="description"] [data-role="full-desc"]');
    expect(panel.classList.contains('collapsible')).toBe(true);
    expect(panel.classList.contains('is-collapsed')).toBe(true);
    const btn = dom.window.document.querySelector('.collapsible__toggle');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    btn.click();
    expect(panel.classList.contains('is-collapsed')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('constructs srcset for local image variants', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'img', sku:'I1', name:{ ru:'Картинка' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/sample-800w.jpg'], flags:[], specs:[] };
    renderFn('img',[product]);
    const imgEl = dom.window.document.querySelector('.product-gallery__image');
    const srcset = imgEl.getAttribute('srcset');
    expect(srcset).toMatch(/sample-320w.jpg 320w/);
    expect(srcset).toMatch(/sample-480w.jpg 480w/);
    expect(srcset).toMatch(/sample-768w.jpg 768w/);
    expect(srcset).toMatch(/sample-1200w.jpg 1200w/);
  });

  it('supports keyboard navigation between tabs (ArrowRight)', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'tabs', sku:'T1', name:{ ru:'Табы' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/demo-800w.jpg'], flags:[], specs:[] };
    renderFn('tabs',[product]);
    const tabs = dom.window.document.querySelectorAll('.product-tabs [role="tab"]');
    tabs[0].focus();
    const evt = new dom.window.KeyboardEvent('keydown', { key:'ArrowRight', bubbles:true });
    tabs[0].dispatchEvent(evt);
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('updates aria-live region on main image change', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'gal', sku:'G1', name:{ ru:'Галерея' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg','picture/conditioners/b-800w.jpg'], flags:[], specs:[] };
    renderFn('gal',[product]);
    const thumbs = dom.window.document.querySelectorAll('.product-gallery__thumb');
    const announce = dom.window.document.querySelector('[data-role="gallery-announce"]');
    expect(announce.textContent).toBe('');
    thumbs[1].click();
    expect(announce.textContent).toMatch(/#2/);
  });
});
