import { describe, it, expect, beforeEach, vi } from 'vitest';

// Мы не можем эмулировать полноценные touch/drag анимации в jsdom,
// но можем проверить базовую инициализацию и отсутствие ошибок при resize
// и то, что toggleMobileNav вызывается при достаточном прогрессе (через шпиона на метод).

describe('Mobile gestures: edge-swipe', () => {
  let main;
  beforeEach(async () => {
    document.body.innerHTML = `
      <button class="hamburger-toggle" aria-expanded="false"></button>
      <nav class="mobile-nav" aria-hidden="true"></nav>
    `;
    // эмулируем мобильный размер
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 640 });
    // подгружаем модуль после подготовки DOM
    vi.resetModules();
    main = await import('../js/main.js');
    // запускаем инициализацию
    if (typeof window.initMobileHeader === 'function') window.initMobileHeader();
  });

  it('Создает overlay для мобильного меню и не падает на resize', () => {
    const overlay = document.querySelector('.mobile-nav-overlay');
    expect(overlay).toBeTruthy();
    // вызов ресайза не должен кидать ошибок
    window.dispatchEvent(new Event('resize'));
  });

  it('Edge-swipe open: недотянутый жест не открывает меню (spring-back)', async () => {
    const overlay = document.querySelector('.mobile-nav-overlay');
    const menu = document.querySelector('.mobile-nav');
    expect(menu.classList.contains('active')).toBe(false);

    // Эмулируем down у правого края в верхней половине
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 355, clientY: 40 }));
    // Недостаточное движение (меньше порога открытия 20% * 360 = 72px)
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 330, clientY: 45 }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 330, clientY: 45 }));

    // Не должно открыться
    expect(menu.classList.contains('active')).toBe(false);
    // overlay может быть показан на время интерактива, но должен сниматься
    // Дадим таймеру spring-back отработать
    await new Promise(r => setTimeout(r, 220));
    expect(overlay.classList.contains('is-visible')).toBe(false);
  });

  it('Edge-swipe open: достаточный жест открывает меню', () => {
    const overlay = document.querySelector('.mobile-nav-overlay');
    const menu = document.querySelector('.mobile-nav');
    expect(menu.classList.contains('active')).toBe(false);

    // Down у правого края, верхняя половина
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 359, clientY: 60 }));
    // Движение влево > 72px
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 270, clientY: 62 }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 270, clientY: 62 }));

    expect(menu.classList.contains('active')).toBe(true);
    expect(overlay.classList.contains('is-visible')).toBe(true);
  });

  it('Fling close (menu): быстрый флик вправо закрывает даже при малом пути', async () => {
    const overlay = document.querySelector('.mobile-nav-overlay');
    const menu = document.querySelector('.mobile-nav');
    // Откроем меню программно
    if (typeof window.initMobileHeader === 'function') {
      const btn = document.querySelector('.hamburger-toggle');
      btn.click();
      await new Promise(r => setTimeout(r, 10));
    }
    expect(menu.classList.contains('active')).toBe(true);

    // Начинаем жест на самом меню (свайп‑to‑close)
    menu.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 60 }));
    // Быстрая серия move с резким ростом dx
    const t0 = Date.now();
    menu.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 60 }));
    menu.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 60 })); // быстрый прирост
    // Завершение жеста
    menu.dispatchEvent(new PointerEvent('pointerup', { clientX: 60, clientY: 60 }));

    // Дадим обработчикам чуть времени
  await new Promise(r => setTimeout(r, 120));
    expect(menu.classList.contains('active')).toBe(false);
    expect(overlay.classList.contains('is-visible')).toBe(false);
  });

  it('Fling close (cart): быстрый флик вправо закрывает даже при малом пути', async () => {
    // Создадим минимальную разметку модалки корзины
    const cartModal = document.createElement('div');
    cartModal.id = 'cartModal';
    document.body.appendChild(cartModal);
    // Откроем через публичную функцию, чтобы навесились жесты
    const { openCartModal, closeCartModal } = await import('../js/cart.js');
    openCartModal();
    expect(cartModal.style.display).toBe('block');
    // Жест закрытия: быстрый dx
    cartModal.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 520 }));
    cartModal.dispatchEvent(new PointerEvent('pointermove', { clientX: 30, clientY: 520 }));
    cartModal.dispatchEvent(new PointerEvent('pointermove', { clientX: 85, clientY: 520 })); // быстрый прирост
    cartModal.dispatchEvent(new PointerEvent('pointerup', { clientX: 85, clientY: 520 }));
  // Дать время на анимацию и отложенное скрытие (closeCartModal скрывает через ~250ms)
  await new Promise(r => setTimeout(r, 320));
    expect(cartModal.style.display).toBe('none');
  });
});
