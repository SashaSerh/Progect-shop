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
});
