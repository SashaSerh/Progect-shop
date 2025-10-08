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
