import { describe, it, expect, beforeEach } from 'vitest';

// main.js имеет побочные эффекты (навешивает делегирование). Импортируем после подготовки DOM.

describe('Catalog dropdown open on click', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header class="header">
        <button id="catalogButton" class="catalog-button" aria-haspopup="true" aria-controls="catalogDropdown" aria-expanded="false">Каталог</button>
        <div id="catalogDropdown" class="catalog-dropdown" role="menu" aria-hidden="true">
          <ul class="catalog-dropdown__list">
            <li><a href="#category-a">A</a></li>
            <li><a href="#category-b">B</a></li>
          </ul>
        </div>
      </header>`;
    // Импорт после создания элементов
    return import('../js/main.js');
  });

  it('opens dropdown when button clicked', () => {
    const btn = document.getElementById('catalogButton');
    const dd = document.getElementById('catalogDropdown');
    expect(btn).toBeTruthy();
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(false);
    btn.click();
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(dd.getAttribute('aria-hidden')).toBe('false');
  });

  it('closes dropdown on outside click', async () => {
    const btn = document.getElementById('catalogButton');
    const dd = document.getElementById('catalogDropdown');
    btn.click();
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(true);
    // Клик вне (создаём div вне dropdown)
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.click();
    // Закрытие анимированное: ждём >200ms (таймер в closeCatalogAnimated)
    await new Promise(r => setTimeout(r, 250));
    expect(dd.classList.contains('catalog-dropdown--open')).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
