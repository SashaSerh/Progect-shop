import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

let renderFn;
function loadMain(jsdom){
  global.window = jsdom.window;
  global.document = jsdom.window.document;
  global.location = jsdom.window.location;
  global.addToCart = () => {}; global.updateCartUI = () => {}; global.getCartAddedMessage = () => 'OK'; global.showActionToast = () => {};
  global.setOgTitle = () => {}; global.setTwitterTitle = () => {}; global.setOgDescription=()=>{}; global.setTwitterDescription=()=>{}; global.setOgUrl=()=>{}; global.setOgImage=()=>{}; global.setTwitterImage=()=>{}; global.setMetaDescription=()=>{};
  global.translations = { ru: { 'site-title':'S', 'tab-reviews':'Отзывы', 'tab-qa':'Вопрос‑ответ', 'image-changed':'', 'read-more':'Читать далее','read-less':'Свернуть' } };
  global.savedLanguage='ru';
  const mod = require('../js/main.js');
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}
function setupDom(html){
  const jsdom = new JSDOM(html, { url: 'https://example.com/product/t' });
  loadMain(jsdom); return jsdom;
}
const componentHtml = `<div id="product-detail-container">${require('fs').readFileSync(require('path').resolve(__dirname,'../components/product-detail.html'),'utf8')}</div>`;

describe('Product Detail pricing / credit / counters', () => {
  beforeEach(()=> { if (global.window?.localStorage) global.window.localStorage.clear(); });

  it('shows oldPrice and discount percent when oldPrice > price', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'p1', sku:'S1', name:{ ru:'Товар' }, price: 1000, oldPrice: 1250, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[] };
    renderFn('p1',[product]);
    const oldEl = dom.window.document.querySelector('[data-role="old-price"]');
    const discEl = dom.window.document.querySelector('[data-role="discount"]');
    expect(oldEl.hidden).toBe(false);
    expect(oldEl.textContent).toMatch(/1\s*250/);
    expect(discEl.hidden).toBe(false);
    expect(discEl.textContent).toMatch(/−\d+%/);
  });

  it('renders energy class badge when energyClass present', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'p2', sku:'S2', name:{ ru:'Энергия' }, price: 1000, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[], energyClass:'A++' };
    renderFn('p2',[product]);
    const badges = dom.window.document.querySelector('.product-buy__badges');
    expect(badges.textContent).toMatch(/A\+\+/);
  });

  it('updates tab counters for reviews and q&a', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'p3', sku:'S3', name:{ ru:'Отз' }, price: 1000, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[] };
    // preload storage
    dom.window.localStorage.setItem('reviews:p3', JSON.stringify([{rating:5,text:'ok'}]));
    dom.window.localStorage.setItem('qna:p3', JSON.stringify([{text:'q'}]));
    renderFn('p3',[product]);
    const tabs = Array.from(dom.window.document.querySelectorAll('.product-tabs .product-tabs__tab'));
    const tReviews = tabs.find(t=> t.getAttribute('data-tab')==='reviews');
    const tQa = tabs.find(t=> t.getAttribute('data-tab')==='qa');
    expect(tReviews.textContent).toMatch(/1/);
    expect(tQa.textContent).toMatch(/1/);
  });

  it('shows credit providers block when provided', () => {
    const dom = setupDom(componentHtml);
    const product = { id:'p4', sku:'S4', name:{ ru:'Кредит' }, price: 1000, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[], creditProviders:[{name:'Mono'}] };
    renderFn('p4',[product]);
    const credit = dom.window.document.querySelector('[data-role="credit"]');
    expect(credit.hidden).toBe(false);
    expect(credit.textContent).toMatch(/Mono/);
  });

  it('respects quantity stepper when adding to cart (integration-lite)', () => {
    const dom = setupDom(componentHtml);
    let addCount = 0; let lastQty = 0;
    global.addToCart = (_id, _p, q)=> { addCount++; lastQty = q; };
    const product = { id:'p5', sku:'S5', name:{ ru:'Qty' }, price: 1000, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[] };
    renderFn('p5',[product]);
    const input = dom.window.document.querySelector('.quantity-stepper__input');
    input.value = '3';
    const btn = dom.window.document.querySelector('[data-act="add-to-cart"]');
    btn.click();
    expect(addCount).toBe(1);
    expect(lastQty).toBe(3);
  });
});
