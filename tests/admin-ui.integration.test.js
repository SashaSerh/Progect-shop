import { describe, it, expect, beforeEach, vi } from 'vitest';

// Мокаем products.js: перехватываем renderProducts и добавляем заглушки для getMergedProducts/setProducts
vi.mock('../js/products.js', () => {
  return {
    renderProducts: vi.fn(),
    getMergedProducts: vi.fn(() => {
      try { return JSON.parse(localStorage.getItem('products_local_v1') || '[]'); } catch { return []; }
    }),
    setProducts: vi.fn(() => {}),
  };
});

import { renderProducts } from '../js/products.js';

describe('admin UI integration (JSDOM)', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div class="header__controls"></div>
      <div id="toast-container"></div>
      <div class="products__grid"></div>
      <div class="modal" id="adminProductModal" role="dialog" aria-modal="true" style="display:none">
        <div class="modal__content">
          <button class="modal__close" id="adminProductModalClose" aria-label="Закрыть">✕</button>
          <form id="adminProductForm">
            <input type="hidden" name="id">
            <input name="title_ru">
            <input name="title_uk">
            <textarea name="description_ru"></textarea>
            <textarea name="description_uk"></textarea>
            <input name="price" type="number">
            <input name="sku">
            <input name="category">
            <select name="inStock"><option value="true">Да</option><option value="false">Нет</option></select>
            <input name="image" type="file">
            <div id="adminImagePreview"></div>
            <button type="submit" id="adminProductSave">Сохранить</button>
            <button type="button" id="adminProductCancel">Отмена</button>
          </form>
        </div>
      </div>`;
    localStorage.removeItem('products_local_v1');
    renderProducts.mockClear();
  });

  it('добавляет кнопку, открывает модал и сохраняет товар', async () => {
    const { initAdminProducts } = await import('../js/admin-products.js');
    initAdminProducts({}, 'ru');
    const addBtn = document.querySelector('.header-add-product');
    expect(addBtn).toBeTruthy();

    // Открываем модал
    addBtn.click();
    const modal = document.getElementById('adminProductModal');
    expect(modal.style.display).toBe('flex');

    // Заполняем форму и сабмитим
    const form = document.getElementById('adminProductForm');
    form.querySelector('input[name="title_ru"]').value = 'Тестовый товар';
    form.querySelector('input[name="price"]').value = '1234';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Проверяем, что товар в localStorage и renderProducts вызывался
    const data = JSON.parse(localStorage.getItem('products_local_v1') || '[]');
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(renderProducts).toHaveBeenCalled();
    expect(modal.style.display).toBe('none');
  });

  it('удаляет товар по клику на кнопку с data-delete', async () => {
    // seed local product
    const seed = [{ id: 'p_seed', name:{ru:'Seed'}, description:{ru:''}, price: 10, image:'' }];
    localStorage.setItem('products_local_v1', JSON.stringify(seed));

    const { initAdminProducts } = await import('../js/admin-products.js');
    initAdminProducts({}, 'ru');

    // Создаём фиктивную кнопку удаления и кликаем
    const delBtn = document.createElement('button');
    delBtn.className = 'product-card__button';
    delBtn.setAttribute('data-delete', '');
    delBtn.setAttribute('data-id', 'p_seed');
    document.body.appendChild(delBtn);

    // confirm мок, чтобы не было диалога
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    delBtn.click();

    const data = JSON.parse(localStorage.getItem('products_local_v1') || '[]');
    expect(data.length).toBe(0);
    expect(renderProducts).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
