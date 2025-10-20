import { getCompareIds, getMergedProducts, toggleCompare, clearCompare } from './products.js';
import { translations } from './i18n.js';

const PLACEHOLDER_THUMB = 'https://placehold.co/80x80?text=No+Image';

let currentLanguage = 'ru';
let isInitialized = false;

function resolveLanguage(lang) {
    const candidate = typeof lang === 'string' ? lang : currentLanguage;
    return ['ru', 'uk'].includes(candidate) ? candidate : 'ru';
}

function getStrings(lang) {
    const safeLang = resolveLanguage(lang);
    const fallback = translations?.ru || {};
    const dict = translations?.[safeLang] || fallback;
    return {
        title: dict['compare-bar-title'] || fallback['compare-bar-title'] || 'Товары для сравнения',
        empty: dict['compare-bar-empty'] || fallback['compare-bar-empty'] || 'Добавьте товары для сравнения, чтобы увидеть их здесь.',
        clear: dict['compare-bar-clear'] || fallback['compare-bar-clear'] || 'Очистить',
        open: dict['compare-bar-open'] || fallback['compare-bar-open'] || 'Сравнить',
        openDisabled: dict['compare-bar-open-disabled'] || fallback['compare-bar-open-disabled'] || 'Выберите хотя бы два товара для сравнения',
        remove: dict['compare-item-remove'] || fallback['compare-item-remove'] || 'Удалить из сравнения',
        count: dict['compare-count'] || fallback['compare-count'] || 'Выбрано: {{count}}'
    };
}

function queryElements() {
    const root = document.querySelector('.compare-bar');
    if (!root) return null;
    const title = root.querySelector('.compare-bar__title');
    const badge = root.querySelector('.compare-bar__badge');
    const empty = root.querySelector('.compare-bar__empty');
    const list = root.querySelector('.compare-bar__list');
    const clearBtn = root.querySelector('.compare-bar__button--clear');
    const openBtn = root.querySelector('.compare-bar__button--open');
    if (!title || !badge || !empty || !list || !clearBtn || !openBtn) return null;
    return { root, title, badge, empty, list, clearBtn, openBtn };
}

function formatCountLabel(template, count) {
    if (typeof template !== 'string') return String(count);
    return template.replace('{{count}}', String(count)).replace('{count}', String(count));
}

function updateStaticText(strings, elements) {
    elements.title.textContent = strings.title;
    elements.empty.textContent = strings.empty;
    elements.clearBtn.textContent = strings.clear;
    elements.openBtn.textContent = strings.open;
    elements.openBtn.title = strings.open;
    elements.openBtn.setAttribute('aria-label', strings.open);
}

function buildListItem(product, lang, removeLabel) {
    const li = document.createElement('li');
    li.className = 'compare-bar__item';
    li.dataset.id = String(product.id);

    const chip = document.createElement('article');
    chip.className = 'compare-chip';
    chip.setAttribute('data-id', String(product.id));

    const thumb = document.createElement('img');
    thumb.className = 'compare-chip__thumb';
    thumb.src = product.image && String(product.image).trim().length ? product.image : PLACEHOLDER_THUMB;
    thumb.alt = product.name?.[lang] || product.name?.ru || '';
    thumb.loading = 'lazy';
    chip.appendChild(thumb);

    const meta = document.createElement('div');
    meta.className = 'compare-chip__meta';
    const title = document.createElement('span');
    title.className = 'compare-chip__title';
    title.textContent = product.name?.[lang] || product.name?.ru || '';
    meta.appendChild(title);
    chip.appendChild(meta);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'compare-chip__remove';
    removeBtn.dataset.action = 'remove';
    removeBtn.dataset.id = String(product.id);
    removeBtn.setAttribute('aria-label', removeLabel);
    removeBtn.title = removeLabel;
    removeBtn.innerHTML = '<span aria-hidden="true">×</span>';
    chip.appendChild(removeBtn);

    li.appendChild(chip);
    return li;
}

export function renderCompareBar(lang = currentLanguage) {
    const elements = queryElements();
    if (!elements) return;

    currentLanguage = resolveLanguage(lang);
    const strings = getStrings(currentLanguage);
    updateStaticText(strings, elements);

    const ids = getCompareIds();
    const count = ids.length;
    elements.badge.textContent = String(count);
    elements.badge.dataset.count = String(count);
    elements.badge.setAttribute('aria-label', formatCountLabel(strings.count, count));

    if (!count) {
        elements.list.innerHTML = '';
        elements.empty.hidden = false;
        elements.openBtn.disabled = true;
        elements.openBtn.setAttribute('aria-disabled', 'true');
        elements.openBtn.title = strings.openDisabled;
        elements.root.dataset.count = '0';
        elements.root.classList.remove('is-visible');
        elements.root.setAttribute('hidden', '');
        return;
    }

    const catalog = getMergedProducts();
    elements.list.innerHTML = '';
    ids.forEach((id) => {
        const product = catalog.find(item => String(item.id) === String(id));
        if (!product) return;
        elements.list.appendChild(buildListItem(product, currentLanguage, strings.remove));
    });

    const hasAtLeastTwo = count >= 2;
    elements.empty.hidden = true;
    elements.openBtn.disabled = !hasAtLeastTwo;
    elements.openBtn.setAttribute('aria-disabled', String(!hasAtLeastTwo));
    elements.openBtn.title = hasAtLeastTwo ? strings.open : strings.openDisabled;
    elements.root.dataset.count = String(count);
    elements.root.removeAttribute('hidden');
    const reveal = () => elements.root.classList.add('is-visible');
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(reveal);
    } else {
        setTimeout(reveal, 16);
    }
}

export function setCompareLanguage(lang) {
    currentLanguage = resolveLanguage(lang);
    renderCompareBar(currentLanguage);
}

export function initCompareBar(lang = currentLanguage) {
    currentLanguage = resolveLanguage(lang);
    const elements = queryElements();
    if (!elements) return;
    if (isInitialized) {
        renderCompareBar(currentLanguage);
        return;
    }
    isInitialized = true;

    elements.root.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const removeBtn = target.closest('[data-action="remove"]');
        if (removeBtn && removeBtn.dataset.id) {
            toggleCompare(removeBtn.dataset.id);
            return;
        }
        const clearBtn = target.closest('[data-action="clear"]');
        if (clearBtn) {
            clearCompare();
            return;
        }
        const openBtn = target.closest('[data-action="open"]');
        if (openBtn && !openBtn.disabled) {
            const ids = getCompareIds();
            try {
                window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids } }));
            } catch (_) {
                /* noop */
            }
        }
    });

    if (typeof window !== 'undefined') {
        window.addEventListener('compare:change', () => renderCompareBar(currentLanguage));
        window.addEventListener('languagechange', (event) => {
            const nextLang = event?.detail?.lang;
            if (nextLang) {
                currentLanguage = resolveLanguage(nextLang);
                renderCompareBar(currentLanguage);
            }
        });
    }

    renderCompareBar(currentLanguage);
}

if (typeof window !== 'undefined') {
    window.initCompareBar = initCompareBar;
    window.renderCompareBar = renderCompareBar;
    window.setCompareLanguage = setCompareLanguage;
}
