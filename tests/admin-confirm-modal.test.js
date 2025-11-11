import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderProductCard } from '../js/products.js';

// Helper: minimal translations object
const translations = {
  ru: {
    'service-order': 'Заказать'
  }
};

function makeLocalProduct() {
  return {
    id: 'p_testModal1',
    name: { ru: 'Тестовый товар', uk: 'Тестовий товар' },
    description: { ru: 'Описание', uk: 'Опис' },
    price: 1234,
    category: 'conditioners',
    specs: [],
    flags: [],
    image: 'https://placehold.co/600x400?text=Img'
  };
}

describe('Admin confirm delete modal (kebab)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    // Mark product as local so admin actions render
    localStorage.setItem('products_local_v1', JSON.stringify([makeLocalProduct()]));
  });

  it('opens modal after delete click and adds is-open class', async () => {
    const product = makeLocalProduct();
    const card = renderProductCard(product, 'ru', translations);
    document.body.appendChild(card);

    const kebab = card.querySelector('[data-admin-kebab]');
    expect(kebab).toBeTruthy();
    // Open menu
    kebab.click();
    const deleteBtn = card.querySelector('[data-delete][data-id="' + product.id + '"]');
    expect(deleteBtn).toBeTruthy();

    // Use fake timers for modal open focus
    vi.useFakeTimers();
    deleteBtn.focus(); // ensure lastFocused inside logic
    deleteBtn.click();
    vi.runAllTimers();

    const modal = document.getElementById('adminDeleteConfirmModal');
    expect(modal).toBeTruthy();
    expect(modal.classList.contains('is-open')).toBe(true);
    const okBtn = modal.querySelector('[data-confirm-ok]');
    expect(okBtn).toBeTruthy();
    // After timers, ok button should have focus
    expect(document.activeElement).toBe(okBtn);
  });

  it('focus trap cycles ok -> cancel -> ok with Tab and closes on Escape returning focus', async () => {
    const product = makeLocalProduct();
    const card = renderProductCard(product, 'ru', translations);
    document.body.appendChild(card);
    const kebab = card.querySelector('[data-admin-kebab]');
    kebab.click();
    const deleteBtn = card.querySelector('[data-delete][data-id="' + product.id + '"]');

    vi.useFakeTimers();
    deleteBtn.focus();
    deleteBtn.click();
    vi.runAllTimers();

    const modal = document.getElementById('adminDeleteConfirmModal');
    const okBtn = modal.querySelector('[data-confirm-ok]');
    const cancelBtn = modal.querySelector('[data-confirm-cancel]');
    expect(document.activeElement).toBe(okBtn);

    // Tab -> cancel
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(cancelBtn);
    // Tab -> ok
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(okBtn);
    // Shift+Tab -> cancel
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(cancelBtn);

    // Escape closes
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.classList.contains('is-open')).toBe(false);
    // Focus returns to delete button
    expect(document.activeElement).toBe(deleteBtn);
  });
});
