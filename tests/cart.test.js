import { describe, it, expect, beforeEach, vi } from 'vitest';

// Импортируем модуль корзины как есть. Для перезаписи состояния cart будем использовать динамический импорт.
import * as cartModule from '../js/cart.js';
import { products } from '../js/products.js';

// Локальные утилиты для помощи в тестировании
function getProduct(id) {
  return products.find(p => p.id == id);
}

const translations = {
  ru: {
    'cart-items': 'Товаров: 0',
    'cart-total': 'Итого: $0.00',
    'cart-empty': 'Корзина пуста'
  },
  uk: {
    'cart-items': 'Товарів: 0',
    'cart-total': 'Разом: $0.00',
    'cart-empty': 'Кошик порожній'
  }
};

describe('cart logic (add/remove/clear/persistence)', () => {
  // Перед каждым тестом сбрасываем localStorage & состояние cart
  beforeEach(() => {
    // Очистка localStorage
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; }
    };

    // Сбрасываем экспортируемый cart (т.к. он let, переназначим напрямую)
    cartModule.cart.length = 0; // очистка массива по месту
  });

  it('addToCart добавляет новый товар', () => {
    const target = getProduct(1);
    cartModule.addToCart(target.id, products);
    expect(cartModule.cart).toHaveLength(1);
    expect(cartModule.cart[0]).toEqual({ id: target.id, quantity: 1 });
  });

  it('addToCart увеличивает количество при повторном добавлении', () => {
    const target = getProduct(1);
    cartModule.addToCart(target.id, products);
    cartModule.addToCart(target.id, products);
    expect(cartModule.cart[0].quantity).toBe(2);
  });

  it('removeFromCart удаляет товар по id', () => {
    const target = getProduct(1);
    cartModule.addToCart(target.id, products);
    cartModule.removeFromCart(target.id);
    expect(cartModule.cart).toHaveLength(0);
  });

  it('clearCart очищает корзину', () => {
    cartModule.addToCart(1, products);
    cartModule.addToCart(2, products);
    cartModule.clearCart();
    expect(cartModule.cart).toHaveLength(0);
  });

  it('saveCart / persistence сохраняет в localStorage', () => {
    cartModule.addToCart(1, products);
    const stored = JSON.parse(global.localStorage.getItem('cart'));
    expect(stored).toEqual([{ id: 1, quantity: 1 }]);
  });

  it('removeFromCart не падает при удалении несуществующего товара', () => {
    cartModule.addToCart(1, products);
    cartModule.removeFromCart('xxx');
    expect(cartModule.cart).toHaveLength(1); // осталось без изменений
  });

  it('addToCart игнорирует несуществующий id', () => {
    cartModule.addToCart('nope', products);
    expect(cartModule.cart).toHaveLength(0);
  });
});

describe('updateCartUI DOM rendering', () => {
  beforeEach(() => {
    // Базовая DOM структура, имитирующая элементы, которые обновляет updateCartUI
    document.body.innerHTML = `
      <span class="cart-count"></span>
      <span class="cart-count"></span>
      <div class="cart-text__items"></div>
      <div class="cart-text__total"></div>
      <ul class="cart-dropdown__items"></ul>
      <div class="cart-dropdown__summary"></div>
      <ul class="cart-items"></ul>
      <div class="cart-summary"></div>
    `;

    // Сброс состояния
    cartModule.cart.length = 0;
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; }
    };
  });

  it('показывает пустую корзину', () => {
    cartModule.updateCartUI(translations, 'ru');
    expect(document.querySelector('.cart-text__items').textContent).toContain('Товаров: 0');
    expect(document.querySelector('.cart-dropdown__items').textContent).toContain('Корзина пуста');
    expect(document.querySelector('.cart-items').textContent).toContain('Корзина пуста');
  });

  it('рендерит элементы и суммы после добавления товаров', () => {
    cartModule.addToCart(1, products); // 15000
    cartModule.addToCart(2, products); // 25000
    cartModule.addToCart(1, products); // +15000 (итого 2 шт товара 1)
    cartModule.updateCartUI(translations, 'ru');

    const counts = [...document.querySelectorAll('.cart-count')].map(el => el.textContent);
    expect(counts).toEqual(['3', '3']); // 2 шт товара 1 + 1 шт товара 2

    const totalText = document.querySelector('.cart-text__total').textContent;
    // 15000*2 + 25000 = 55000 (локаль uk-UA -> '55 000,00 грн' / без неразрывного пробела после удаления пробелов остаётся '55000,00грн')
    const normalized = totalText.replace(/\s/g,'');
    expect(normalized).toContain('55000,00');

    const dropdownItems = document.querySelectorAll('.cart-dropdown__items li');
    expect(dropdownItems.length).toBe(2);

    const cartItems = document.querySelectorAll('.cart-items li');
    expect(cartItems.length).toBe(2);
  });
});

describe('Cart modal Delete/Undo a11y flow', () => {
  beforeEach(async () => {
    // Минимальная DOM-разметка модалки, тост-контейнера и футера для фокуса
    document.body.innerHTML = `
      <div id="toast-container"></div>
      <div id="cartModal" style="display:block">
        <ul class="cart-items"></ul>
        <div class="cart-summary" data-i18n="cart-total">Итого: $0.00</div>
        <div class="cart-modal__footer">
          <button class="cart-button--clear">Очистить корзину</button>
          <button class="cart-button--checkout">Оформить заказ</button>
        </div>
        <button class="cart-modal__close">×</button>
      </div>
    `;

    // Сброс состояния корзины и localStorage
    cartModule.cart.length = 0;
    const store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; }
    };
    localStorage.setItem('language', 'ru');

    // Добавим два товара и отрисуем UI
    cartModule.addToCart(1, products);
    cartModule.addToCart(2, products);
    cartModule.updateCartUI(translations, 'ru');
  });

  it('Delete удаляет выделенный элемент и переводит фокус на следующий/кнопки', async () => {
    const list = document.querySelector('.cart-items');
    const itemsBefore = list.querySelectorAll('li');
    expect(itemsBefore.length).toBe(2);

    // Фокусируем первый элемент списка
    itemsBefore[0].focus();
    expect(document.activeElement).toBe(itemsBefore[0]);

    // Инициируем Delete
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    // Дождаться микроочереди обновления фокуса
    await new Promise(r => setTimeout(r, 0));

    const itemsAfter = list.querySelectorAll('li');
    expect(itemsAfter.length).toBe(1);
    // Фокус должен быть либо на оставшемся элементе, либо на кнопке в футере
    const focused = document.activeElement;
    const isListItem = focused && focused.tagName === 'LI';
    const isFooterBtn = focused && (focused.classList.contains('cart-button--checkout') || focused.classList.contains('cart-modal__close'));
    expect(isListItem || isFooterBtn).toBe(true);
  });

  it('Undo восстанавливает удалённый элемент и возвращает фокус', async () => {
    const list = document.querySelector('.cart-items');
    const firstLi = list.querySelector('li');
    // Узнаем id удаляемого элемента через кнопку удаления
    const removedId = firstLi.querySelector('.cart-item-remove')?.getAttribute('data-id');
    firstLi.focus();

    // Удаляем по Delete
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    await new Promise(r => setTimeout(r, 0));
    expect(list.querySelectorAll('li').length).toBe(1);

    // Нажимаем Undo в тосте
    const toastUndo = document.querySelector('#toast-container button');
    expect(toastUndo).toBeTruthy();
    toastUndo.click();

    await new Promise(r => setTimeout(r, 0));
    // Количество элементов восстановлено
    expect(list.querySelectorAll('li').length).toBe(2);

    // Фокус должен быть на восстановленном элементе или его кнопке удаления
    const focused = document.activeElement;
    const restoredBtn = document.querySelector(`.cart-items .cart-item-remove[data-id="${removedId}"]`);
    const restoredLi = restoredBtn?.closest('li');
    expect(focused === restoredLi || focused === restoredBtn).toBe(true);
  });
});
