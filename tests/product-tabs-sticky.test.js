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
  global.setOgTitle = () => {}; global.setTwitterTitle = () => {}; global.setOgDescription=()=>{}; global.setTwitterDescription=()=>{}; global.setOgUrl=()=>{}; global.setOgImage=()=>{}; global.setTwitterImage=()=>{}; global.setMetaDescription=()=>{};
  global.translations = { ru: { 'site-title':'Сайт' } };
  global.savedLanguage='ru';
  const mod = require('../js/main.js');
  renderFn = mod.renderProductDetail || global.renderProductDetail;
}
function setupDom(html){
  const jsdom = new JSDOM(html, { url: 'https://example.com/product/sticky' });
  loadMain(jsdom); return jsdom;
}
const componentHtml = `<div id="product-detail-container">${fs.readFileSync(path.resolve(__dirname,'../components/product-detail.html'),'utf8')}</div>`;

describe('Product tabs sticky behavior', () => {
  beforeEach(()=> { if (global.window?.localStorage) global.window.localStorage.clear(); });

  it('applies sticky classes to product tabs', async () => {
    const dom = setupDom(componentHtml);
    const product = { id:'sticky', sku:'S1', name:{ ru:'Стикки' }, description:{ ru:'Desc' }, price:10, inStock:true, images:['picture/conditioners/a-800w.jpg'], flags:[], specs:[] };
    renderFn('sticky',[product]);
    const tabs = dom.window.document.querySelector('.product-tabs');
    // JS установит is-sticky сразу
    expect(tabs.classList.contains('is-sticky')).toBe(true);
    // В JSDOM getBoundingClientRect().top === 0, stickyTop ~ 72 => is-stuck станет true
    // Дождёмся 0-таймаута из onResize
    await new Promise(r => setTimeout(r, 10));
    expect(tabs.classList.contains('is-stuck')).toBe(true);
  });
});
