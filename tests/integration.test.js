import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Стаб/полифилы для среды jsdom
class IOStub {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb?.([{ isIntersecting: true, target: el }]); }
  unobserve() {}
  disconnect() {}
}

function setupGlobals() {
  if (!('IntersectionObserver' in global)) {
    global.IntersectionObserver = IOStub;
  }
  if (!('scrollTo' in window)) {
    window.scrollTo = () => {};
  }
  if (!('vibrate' in navigator)) {
    navigator.vibrate = () => {};
  }
}

function containersHTML() {
  return `
    <div id="header-container"></div>
    <div id="hero-container"></div>
    <div id="services-container"></div>
    <div id="products-container"><div class="products__grid"></div></div>
    <div id="contacts-container"></div>
    <div id="footer-container"></div>
    <div id="cart-modal-container"></div>
  `;
}

const headerComponent = `
  <header>
    <button class="theme-toggle" aria-label="Переключить тему"><span class="theme-icon"><img alt="Тёмная тема"></span></button>
    <button class="language-switcher" data-lang="ru">RU</button>
    <button class="language-switcher" data-lang="uk">UK</button>
    <button id="catalogButton" aria-expanded="false"></button>
    <div id="catalogDropdown" class="catalog-dropdown"></div>
    <input id="site-search" data-i18n-placeholder="search-placeholder" />
    <button id="searchButton"></button>
    <div class="cart">
      <span class="cart-count">0</span>
      <span class="cart-count">0</span>
      <span id="cartDropdownToggle"></span>
    </div>
  </header>
  <div id="cartDropdown">
    <ul class="cart-dropdown__items"></ul>
    <div class="cart-dropdown__summary" data-i18n="cart-total">Итого: $0.00</div>
    <button class="cart-dropdown__button" data-i18n="cart-checkout">Оформить заказ</button>
  </div>
`;

const productsComponent = `
  <section>
    <div class="products__grid"></div>
  </section>
`;

const servicesComponent = `
  <section>
    <div class="services__grid"></div>
  </section>
`;

const contactsComponent = `<section id="contacts"></section>`;
const heroComponent = `<section id="hero"></section>`;
const footerComponent = `<footer></footer>`;

const cartComponent = `
  <div id="cartModal" style="display:none">
    <ul class="cart-items"></ul>
    <div class="cart-summary" data-i18n="cart-total">Итого: $0.00</div>
    <button class="cart-button--clear" data-i18n="cart-clear">Очистить корзину</button>
    <button class="cart-button--checkout" data-i18n="cart-checkout">Оформить заказ</button>
    <button class="cart-modal__close">×</button>
  </div>
`;

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const path = typeof url === 'string' ? url : url.url;
    let body = '<div></div>';
    if (path.includes('components/header.html')) body = headerComponent;
    else if (path.includes('components/products.html')) body = productsComponent;
    else if (path.includes('components/services.html')) body = servicesComponent;
    else if (path.includes('components/contacts.html')) body = contactsComponent;
    else if (path.includes('components/hero.html')) body = heroComponent;
    else if (path.includes('components/footer.html')) body = footerComponent;
    else if (path.includes('components/cart.html')) body = cartComponent;
    return {
      ok: true,
      status: 200,
      text: async () => body,
    };
  }));
}

async function mountApp() {
  setupGlobals();
  // Чистим окружение
  localStorage.clear();
  document.body.innerHTML = containersHTML();
  mockFetch();
  // Сбрасываем кэш модулей, чтобы обработчики не дублировались
  await vi.resetModules();
  // Импорт модулей
  await import('../js/i18n.js');
  await import('../js/theme.js');
  await import('../js/products.js');
  await import('../js/cart.js');
  await import('../js/navigation.js');
  await import('../js/auth.js');
  await import('../js/main.js');
  // Триггерим DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));
  // Дождаться отрисовки компонентов
  await new Promise(r => setTimeout(r, 20));
}

function getText(sel) {
  const el = document.querySelector(sel);
  return el ? el.textContent : '';
}

describe('Integration: bootstrap и ключевые флоу', () => {
  beforeEach(async () => {
    await mountApp();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Bootstrap: компоненты загружены и язык применён', async () => {
    // Проверим, что header вставлен и переключатели на месте
    expect(document.querySelector('.theme-toggle')).toBeTruthy();
    // Язык по умолчанию ru — должен выставиться заголовок
  expect(document.title).toBe('ClimaTech');
  });

  it('Переключение языка на uk обновляет тексты', async () => {
    const ukBtn = document.querySelector('.language-switcher[data-lang="uk"]');
    ukBtn.click();
    await new Promise(r => setTimeout(r, 10));
  expect(document.title).toBe('ClimaTech');
    // placeholder поиска должен обновиться
    const search = document.getElementById('site-search');
    expect(search.getAttribute('placeholder')).toBe('Пошук по сайту');
  });

  it('Добавление товара через UI обновляет счётчик и суммы', async () => {
    // Дождёмся рендера products
    await new Promise(r => setTimeout(r, 10));
    const grid = document.querySelector('.products__grid');
    expect(grid).toBeTruthy();
    // Убедимся, что карточки появились (рендер из products.js)
    expect(grid.children.length).toBeGreaterThan(0);
    // Клик по первой кнопке заказа
    const btn = grid.querySelector('.product-card__button');
    expect(btn).toBeTruthy();
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    // Проверим счётчики корзины
    const counts = [...document.querySelectorAll('.cart-count')].map(el => el.textContent);
    expect(counts).toEqual(['1', '1']);
    // Проверим итог в dropdown summary
    const summary = getText('.cart-dropdown__summary').replace(/\s/g, '');
    expect(summary).toMatch(/Итого:.*грн|Разом:.*грн/);
  });

  it('Удаление из dropdown очищает корзину при единственном товаре', async () => {
    // Добавим товар
    const btn = document.querySelector('.products__grid .product-card__button');
    btn.click();
    await new Promise(r => setTimeout(r, 10));
    // Кнопка удаления
    const removeBtn = document.querySelector('.cart-dropdown__items .cart-dropdown__item-remove');
    expect(removeBtn).toBeTruthy();
    removeBtn.click();
    await new Promise(r => setTimeout(r, 10));
    // Пусто
    const itemsText = getText('.cart-dropdown__items');
    expect(itemsText).toMatch(/Корзина пуста|Кошик порожній/);
    const counts = [...document.querySelectorAll('.cart-count')].map(el => el.textContent);
    expect(counts).toEqual(['0', '0']);
  });

  it('Переключение темы добавляет класс light-theme и обновляет aria', async () => {
    const toggle = document.querySelector('.theme-toggle');
    toggle.click();
    await new Promise(r => setTimeout(r, 10));
    expect(document.body.classList.contains('light-theme')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('light');
    // Ария-лейбл должен измениться
    expect(toggle.getAttribute('aria-label')).toBe('Переключить на темную тему');
  });
});
