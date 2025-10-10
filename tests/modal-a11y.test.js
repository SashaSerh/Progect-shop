import { describe, it, expect, beforeEach, vi } from 'vitest';

// Тестируем поведение фокуса и Tab-trap для модалок корзины и профиля

function setupGlobals() {
  if (!('scrollTo' in window)) window.scrollTo = () => {};
}

function baseDOM() {
  return `
    <button id="openCartModal">Открыть корзину</button>
    <div class="cart-backdrop" style="display:none"></div>
    <div id="cartModal" style="display:none">
      <button class="first">A</button>
      <a href="#" class="middle">B</a>
      <button class="last">C</button>
    </div>

    <button id="profileButton">Профиль</button>
    <div id="profileModal" style="display:none">
      <div class="modal__content">
        <div id="modalContent"></div>
      </div>
    </div>
  `;
}

async function loadModules() {
  await vi.resetModules();
  return {
    cart: await import('../js/cart.js'),
    auth: await import('../js/auth.js'),
  };
}

describe('Modal A11y: Focus management & Tab-trap', () => {
  beforeEach(async () => {
    setupGlobals();
    document.body.innerHTML = baseDOM();
  });

  it('Cart modal: перенос фокуса внутрь, trap Tab и возврат фокуса', async () => {
    const { cart } = await loadModules();
    const opener = document.getElementById('openCartModal');
    opener.focus();

    // Открываем
    cart.openCartModal();
    const modal = document.getElementById('cartModal');
    expect(modal.style.display).toBe('block');

    const first = modal.querySelector('.first');
    const middle = modal.querySelector('.middle');
    const last = modal.querySelector('.last');

    // Первый элемент получает фокус
    expect(document.activeElement).toBe(first);

    // Tab доходит до last и циклично возвращается на first
    last.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    modal.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(first);

    // Shift+Tab с first уводит на last
    first.focus();
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    modal.dispatchEvent(shiftTab);
    expect(document.activeElement).toBe(last);

    // Закрываем и проверяем возврат фокуса
    cart.closeCartModal();
    expect(document.activeElement).toBe(opener);
  });

  it('Profile modal: перенос фокуса внутрь, trap Tab и возврат фокуса', async () => {
    const { auth } = await loadModules();
    const opener = document.getElementById('profileButton');
    opener.focus();

    // Минимальный translations для вызова openModal
    const translations = { ru: { 'login-title': 'Вход', username: 'Имя', password: 'Пароль', login: 'Войти', 'orders-title': 'Заказы', 'cart-empty': 'Корзина пуста', 'welcome': 'Добро пожаловать', 'profile-title': 'Профиль' } };

    // Открываем (по умолчанию not logged in)
    auth.openModal(translations, 'ru');
    const modal = document.getElementById('profileModal');
    expect(modal.style.display).toBe('flex');

  const first = modal.querySelector('.modal__content .first') || modal.querySelector('input,button,a');
  const focusables = modal.querySelectorAll('input,button,a');
  const last = modal.querySelector('.modal__content .last') || focusables[focusables.length - 1];

    // Первый элемент получает фокус
    expect(document.activeElement).toBe(first);

    // Tab с last возвращает на first
    last.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    modal.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(first);

    // Shift+Tab с first уводит на last
    first.focus();
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    modal.dispatchEvent(shiftTab);
    expect(document.activeElement).toBe(last);

    // Закрываем и проверяем возврат фокуса
    auth.closeModal();
    expect(document.activeElement).toBe(opener);
  });
});
