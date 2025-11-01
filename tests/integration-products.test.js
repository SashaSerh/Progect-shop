import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { translations } from '../js/i18n.js';
import { renderProducts } from '../js/products.js';

function mountProductsGrid() {
	document.body.innerHTML = `
		<section id="products">
			<div class="products__grid"></div>
		</section>
	`;
}

describe('Products integration: карточки и флаги', () => {
	beforeEach(() => {
		mountProductsGrid();
		localStorage.clear();
		delete window.__productsFilterCache;
	});

	afterEach(() => {
		document.body.innerHTML = '';
		localStorage.clear();
	});

	it('рендерит стандартные флаги из поставляемого каталога', () => {
		renderProducts('ru', translations);

		const card = document.querySelector('.product-card');
		expect(card).toBeTruthy();

		const flagContainer = card.querySelector('.product-card__flag-badges');
		expect(flagContainer).toBeTruthy();

		const badges = Array.from(flagContainer.querySelectorAll('.flag-badge')).map((el) => ({
			key: el.getAttribute('data-flag-key'),
			text: el.textContent.trim(),
		}));

		expect(badges).toEqual([
			{ key: 'sale', text: translations.ru.flags.sale },
			{ key: 'top', text: translations.ru.flags.top },
			{ key: 'popular', text: translations.ru.flags.popular },
		]);

		expect(card.style.getPropertyValue('--flag-sale-bg')).not.toBe('');
		expect(card.style.getPropertyValue('--flag-sale-color')).toBe('#fff');
	});

	it('использует переводы для флагов при переключении языка', () => {
		renderProducts('uk', translations);

		const badges = Array.from(document.querySelectorAll('.flag-badge')).map((el) => el.textContent.trim());
		expect(badges).toContain(translations.uk.flags.sale);
		expect(badges).toContain(translations.uk.flags.top);
		expect(badges).toContain(translations.uk.flags.popular);
	});

	it('помечает локальные товары и применяет кастомные флаги', () => {
		const localProduct = {
			id: 'p_demo',
			name: { ru: 'Локальный товар', uk: 'Локальний товар' },
			description: { ru: 'Тестовый локальный товар', uk: 'Тестовий локальний товар' },
			price: 12345,
			category: 'service',
			image: '',
			flags: [{ key: 'hit', color: '#112233' }, { key: 'new' }],
			inStock: true,
		};

		localStorage.setItem('products_local_v1', JSON.stringify([localProduct]));

		renderProducts('ru', translations, [localProduct]);

		const card = document.querySelector('.product-card');
		expect(card).toBeTruthy();
		expect(card.querySelector('.badge--local')).toBeTruthy();
		expect(card.querySelector('.product-card__admin-actions')).toBeTruthy();

		const flagKeys = Array.from(card.querySelectorAll('.flag-badge')).map((el) => el.getAttribute('data-flag-key'));
		expect(flagKeys).toEqual(['hit', 'new']);

		expect(card.style.getPropertyValue('--flag-hit-bg')).toBe('#112233');
		expect(card.style.getPropertyValue('--flag-hit-color')).toBe('#fff');
	});

	it('отмечает быстрые действия как активные на основе localStorage', () => {
		localStorage.setItem('products_favorites_v1', JSON.stringify(['1']));
		localStorage.setItem('products_compare_v1', JSON.stringify(['1']));
		renderProducts('ru', translations);

		const card = document.querySelector('.product-card');
		expect(card).toBeTruthy();

		const favoriteBtn = card.querySelector('.product-card__quick-btn[data-action="favorite"]');
		const compareBtn = card.querySelector('.product-card__quick-btn[data-action="compare"]');
		expect(favoriteBtn).toBeTruthy();
		expect(compareBtn).toBeTruthy();
		expect(favoriteBtn.classList.contains('is-active')).toBe(true);
		expect(favoriteBtn.getAttribute('aria-pressed')).toBe('true');
		expect(compareBtn.classList.contains('is-active')).toBe(true);
		expect(compareBtn.getAttribute('aria-pressed')).toBe('true');
	});
});
