import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { initCompareModal } from '../js/compare-modal.js';
import { toggleCompare, clearCompare, getCompareIds } from '../js/products.js';
import { translations } from '../js/i18n.js';

const originalClipboard = navigator.clipboard;

const modalMarkup = `
<div id="compare-modal-container">
    <section id="compareModal" class="compare-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="compareModalTitle">
        <div class="compare-modal__backdrop" data-close="true"></div>
        <div class="compare-modal__content" role="document" tabindex="-1">
            <header class="compare-modal__header">
                <h2 id="compareModalTitle" data-i18n="compare-modal-title">${translations.ru['compare-modal-title']}</h2>
                <button type="button" class="compare-modal__close" aria-label="${translations.ru['compare-modal-close']}" data-close="true">
                    <span aria-hidden="true">×</span>
                </button>
            </header>
            <div class="compare-modal__body">
                <p class="compare-modal__hint" hidden></p>
                <div class="compare-modal__table-wrapper" aria-live="polite" aria-atomic="true">
                    <table class="compare-modal__table">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            <footer class="compare-modal__footer">
                <button type="button" class="compare-modal__cta" data-action="copy-link" data-i18n="compare-modal-copy-link">${translations.ru['compare-modal-copy-link']}</button>
                <button type="button" class="compare-modal__cta compare-modal__cta--secondary" data-action="clear" data-i18n="compare-modal-clear">${translations.ru['compare-modal-clear']}</button>
            </footer>
        </div>
    </section>
</div>`;

function mountModal() {
    document.body.innerHTML = modalMarkup;
}

function nextFrame() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Compare modal interactions', () => {
    beforeEach(() => {
        document.body.classList.remove('compare-modal-open');
        localStorage.clear();
        clearCompare();
        mountModal();
        initCompareModal('ru');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.body.classList.remove('compare-modal-open');
        clearCompare();
        localStorage.clear();
        vi.restoreAllMocks();
        if (originalClipboard === undefined) {
            delete navigator.clipboard;
        } else {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: originalClipboard
            });
        }
    });

    it('opens and renders selected products when compare:open is dispatched', async () => {
        toggleCompare(1);
        toggleCompare(2);
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids: [1, 2] } }));
        await nextFrame();

        const modal = document.getElementById('compareModal');
        expect(modal?.classList.contains('is-visible')).toBe(true);
        expect(document.body.classList.contains('compare-modal-open')).toBe(true);

        const headers = modal?.querySelectorAll('thead th');
        expect(headers?.length).toBe(3); // feature column + 2 products

        const productTitles = modal?.querySelectorAll('.compare-modal__product-title');
        expect(productTitles?.length).toBe(2);
        expect(productTitles?.[0]?.textContent).toBe('Кондиционер EcoCool');

        const priceRow = modal?.querySelector('tr[data-field="price"]');
        const priceCell = priceRow?.querySelector('td');
        expect(priceCell?.textContent).toBeTruthy();
    });

    it('removes individual items and reflects updated columns', async () => {
        toggleCompare(1);
        toggleCompare(2);
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids: [1, 2] } }));
        await nextFrame();

        const removeBtn = document.querySelector('[data-action="remove"]');
        expect(removeBtn).toBeTruthy();
        removeBtn?.dispatchEvent(new Event('click', { bubbles: true }));
        await nextFrame();

        const headers = document.querySelectorAll('thead th');
        expect(headers.length).toBe(2); // feature column + remaining product
        expect(getCompareIds().length).toBe(1);
    });

    it('limits view to four products and shows hint about trimming', async () => {
        toggleCompare(1);
        toggleCompare(2);
        toggleCompare('s1');
        toggleCompare('s2');
        toggleCompare('s3');
        const ids = [1, 2, 's1', 's2', 's3'];
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids } }));
        await nextFrame();

        const headers = document.querySelectorAll('thead th');
        expect(headers.length).toBe(5); // feature + 4 products
        const hint = document.querySelector('.compare-modal__hint');
        expect(hint?.textContent).toContain('Показаны первые');
    });

    it('copies share link via clipboard API and shows success hint', async () => {
        toggleCompare(1);
        toggleCompare(2);
        const writeText = vi.fn().mockResolvedValue();
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText }
        });
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids: [1, 2] } }));
        await nextFrame();

        const copyButton = document.querySelector('[data-action="copy-link"]');
        copyButton?.dispatchEvent(new Event('click', { bubbles: true }));
        await nextFrame();

        expect(writeText).toHaveBeenCalledTimes(1);
        const expectedUrl = new URL(window.location.href);
        expectedUrl.searchParams.set('compare', '1,2');
        expect(writeText).toHaveBeenCalledWith(expectedUrl.toString());
        const hint = document.querySelector('.compare-modal__hint');
        expect(hint?.textContent).toContain(translations.ru['compare-modal-copy-success']);
    });

    it('reacts to language change events', async () => {
        toggleCompare(1);
        toggleCompare(2);
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids: [1, 2] } }));
        await nextFrame();

        window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: 'uk' } }));
        await nextFrame();

        const title = document.querySelector('#compareModalTitle');
        expect(title?.textContent).toBe(translations.uk['compare-modal-title']);
        const copyBtn = document.querySelector('[data-action="copy-link"]');
        expect(copyBtn?.textContent).toBe(translations.uk['compare-modal-copy-link']);
    });

    it('clears all items when clear action is triggered', async () => {
        toggleCompare(1);
        toggleCompare(2);
        window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids: [1, 2] } }));
        await nextFrame();

        const clearBtn = document.querySelector('[data-action="clear"]');
        clearBtn?.dispatchEvent(new Event('click', { bubbles: true }));
        await nextFrame();

        expect(getCompareIds().length).toBe(0);
        const modal = document.getElementById('compareModal');
        expect(modal?.classList.contains('is-visible')).toBe(false);
        expect(document.body.classList.contains('compare-modal-open')).toBe(false);
    });
});
