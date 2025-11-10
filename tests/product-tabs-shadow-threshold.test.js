import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

let renderFn;
function loadMain(jsdom){
  global.window = jsdom.window;
  global.document = jsdom.window.document;
  global.location = jsdom.window.location;
  global.addToCart = () => {}; global.updateCartUI = () => {}; global.getCartAddedMessage = () => 'Добавлено'; global.showActionToast = () => {};
  global.setOgTitle = () => {}; global.setTwitterTitle = () => {}; global.setOgDescription=()=>{}; global.setTwitterDescription=()=>{}; global.setOgUrl=()=>{}; global.setOgImage=()=>{}; global.setTwitterImage=()=>{}; global.setMetaDescription=()=>{};
  global.translations = { ru: { 'site-title':'Сайт' } };
  global.savedLanguage='ru';
  // Make rAF synchronous
  jsdom.window.requestAnimationFrame = (fn) => fn();
  const mod = require('../js/main.js');
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}
function setupDom(){
  const jsdom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://example.com/product/shadow' });
  loadMain(jsdom); return jsdom;
}

function injectHeader(doc, height){
  const header = doc.createElement('div');
  header.className = 'header';
  // Mock offsetHeight
  Object.defineProperty(header, 'offsetHeight', { get: () => height, configurable: true });
  // Mock getBoundingClientRect
  header.getBoundingClientRect = () => ({ top: 0, left:0, width: 1200, height, bottom: height, right:1200 });
  doc.body.appendChild(header);
  return header;
}

const componentHtml = `<div id="product-detail-container">${fs.readFileSync(path.resolve(__dirname,'../components/product-detail.html'),'utf8')}</div>`;

describe('Product tabs shadow threshold', () => {
  beforeEach(()=> { if (global.window?.localStorage) global.window.localStorage.clear(); });

  it('toggle is-stuck only after crossing header height and updates on condensed class', async () => {
    const dom = setupDom();
    const { document: doc, window: win } = dom.window;
    const header = injectHeader(doc, 100);
    // Inject component markup
    const containerWrapper = doc.createElement('div');
    containerWrapper.innerHTML = componentHtml;
    doc.body.appendChild(containerWrapper);
    const product = { id:'shadow', sku:'SH1', name:{ ru:'Тени' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[] };
    renderFn('shadow',[product]);
    const tabs = doc.querySelector('.product-tabs');
    expect(tabs).toBeTruthy();
    // Initially at top => below threshold, no shadow
    Object.defineProperty(win, 'scrollY', { value: 0, configurable: true });
    Object.defineProperty(doc.documentElement, 'scrollTop', { value: 0, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await new Promise(r => setTimeout(r, 0));
    expect(tabs.classList.contains('is-stuck')).toBe(false);

    // Scroll past header height => shadow appears
    Object.defineProperty(win, 'scrollY', { value: 120, configurable: true });
    Object.defineProperty(doc.documentElement, 'scrollTop', { value: 120, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await new Promise(r => setTimeout(r, 0));
    expect(tabs.classList.contains('is-stuck')).toBe(true);

    // Condense header: reduce height => threshold lowers
    header.classList.add('header--condensed');
    // Simulate observer callback by firing resize
    win.dispatchEvent(new win.Event('resize'));

    // Now with smaller threshold, set scroll just below previous but above new
    Object.defineProperty(win, 'scrollY', { value: 70, configurable: true });
    Object.defineProperty(doc.documentElement, 'scrollTop', { value: 70, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await new Promise(r => setTimeout(r, 0));
    expect(tabs.classList.contains('is-stuck')).toBe(true);

    // Go slightly below (simulate above new threshold minus margin)
    Object.defineProperty(win, 'scrollY', { value: 40, configurable: true });
    Object.defineProperty(doc.documentElement, 'scrollTop', { value: 40, configurable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await new Promise(r => setTimeout(r, 0));
    expect(tabs.classList.contains('is-stuck')).toBe(false);
  });
});
