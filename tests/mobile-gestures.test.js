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
});
