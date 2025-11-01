import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { initCompareBar, renderCompareBar } from '../js/compare-bar.js';
import { toggleCompare, clearCompare } from '../js/products.js';
import { translations } from '../js/i18n.js';

function mountCompareBar() {
	document.body.innerHTML = `
		<section class="compare-bar" data-component="compare-bar" role="region" aria-live="polite" hidden>
			<div class="compare-bar__header">
				<span class="compare-bar__title">${translations.ru['compare-bar-title']}</span>
				<span class="compare-bar__badge" aria-label="${translations.ru['compare-count'].replace('{{count}}', '0')}" data-count="0">0</span>
			</div>
			<p class="compare-bar__empty">${translations.ru['compare-bar-empty']}</p>
			<ul class="compare-bar__list" aria-label="Товары для сравнения"></ul>
			<div class="compare-bar__actions">
				<button type="button" class="compare-bar__button compare-bar__button--clear" data-action="clear">${translations.ru['compare-bar-clear']}</button>
				<button type="button" class="compare-bar__button compare-bar__button--open" data-action="open" aria-disabled="true" disabled>${translations.ru['compare-bar-open']}</button>
			</div>
		</section>
	`;
}

function nextTick() {
	return new Promise((resolve) => setTimeout(resolve, 25));
}

describe('Compare bar UI', () => {
	beforeEach(() => {
		localStorage.clear();
		clearCompare();
		mountCompareBar();
		if (!global.requestAnimationFrame) {
			global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
		}
		initCompareBar('ru');
		renderCompareBar('ru');
	});

	afterEach(() => {
		document.body.innerHTML = '';
		clearCompare();
		localStorage.clear();
	});

	it('stays hidden when no products are selected', () => {
		const bar = document.querySelector('.compare-bar');
		expect(bar).toBeTruthy();
		expect(bar?.hasAttribute('hidden')).toBe(true);
		expect(bar?.classList.contains('is-visible')).toBe(false);
	});

	it('renders selected products and keeps compare button disabled until two items', async () => {
		toggleCompare(1);
		await nextTick();
		const bar = document.querySelector('.compare-bar');
		const listItems = bar?.querySelectorAll('.compare-bar__item') ?? [];
		const openBtn = bar?.querySelector('.compare-bar__button--open');
		const badge = bar?.querySelector('.compare-bar__badge');

		expect(bar?.hasAttribute('hidden')).toBe(false);
		expect(bar?.classList.contains('is-visible')).toBe(true);
		expect(listItems.length).toBe(1);
		expect(openBtn?.disabled).toBe(true);
		expect(badge?.textContent).toBe('1');
	});

	it('enables compare action once two products are selected and clears correctly', async () => {
		toggleCompare(1);
		toggleCompare(2);
		await nextTick();
		let openBtn = document.querySelector('.compare-bar__button--open');
		expect(openBtn?.disabled).toBe(false);

		clearCompare();
		await nextTick();
		const bar = document.querySelector('.compare-bar');
		expect(bar?.hasAttribute('hidden')).toBe(true);
		expect(bar?.classList.contains('is-visible')).toBe(false);
	});

	it('updates strings when language changes', async () => {
		window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: 'uk' } }));
		await nextTick();
		const title = document.querySelector('.compare-bar__title');
		expect(title?.textContent).toBe(translations.uk['compare-bar-title']);
	});
});
