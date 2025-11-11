import { describe, it, beforeEach, expect } from 'vitest';
import { renderProducts, getMergedProducts, setProducts } from '../js/products.js';

// Проверяем, что после "перезапуска" (повторной инициализации) локальные товары попадают в общий список
describe('integration: persist products across reload', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="products__grid"></div>';
    localStorage.removeItem('products_local_v1');
    // сбросим модульное состояние (эмулируем загрузку)
    setProducts([]);
  });

  it('restores local products on init via getMergedProducts', () => {
    const test = {
      id: 'p_reload',
      name: { ru: 'Товар после перезагрузки', uk: 'Товар після перезавантаження' },
      description: { ru: 'описание', uk: 'опис' },
      price: 7777,
      image: 'https://placehold.co/600x400?text=Local',
      category: 'service',
      inStock: true,
    };
    localStorage.setItem('products_local_v1', JSON.stringify([test]));

    // "инициализация": получаем merged и задаём products
    const merged = getMergedProducts();
    expect(merged.some(p => String(p.id) === 'p_reload')).toBe(true);
    setProducts(merged);

    // рендерим и убеждаемся, что карточка есть
    renderProducts('ru', window.translations || {}, merged);
  const grid = document.querySelector('.products__grid');
  const descriptions = Array.from(grid.querySelectorAll('.product-card__description')).map(el => el.textContent.trim());
  expect(descriptions.join(' ')).toContain('описание');
  });
});
