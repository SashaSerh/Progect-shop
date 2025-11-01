import { getMergedProducts, getCompareIds, toggleCompare, clearCompare } from './products.js';
import { translations } from './i18n.js';

const MAX_ITEMS = 4;
const PLACEHOLDER_THUMB = 'https://placehold.co/140x140?text=No+Image';
const focusableSelector = 'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let currentLanguage = 'ru';
let isInitialized = false;
let modalElements = null;
let isOpen = false;
let lastFocusedElement = null;
let trapHandler = null;
let escapeHandler = null;
let copyTimeoutId = null;
let baseHintMessage = '';

function resolveLanguage(lang) {
    return ['ru', 'uk'].includes(lang) ? lang : currentLanguage;
}

function getStrings(lang) {
    const fallback = translations?.ru || {};
    const dict = translations?.[lang] || fallback;
    const withFallback = (key, alt) => dict[key] || fallback[key] || alt;
    return {
        title: withFallback('compare-modal-title', 'Сравнение товаров'),
        close: withFallback('compare-modal-close', 'Закрыть'),
        copy: withFallback('compare-modal-copy-link', 'Скопировать ссылку'),
        clear: withFallback('compare-modal-clear', 'Очистить'),
        remove: withFallback('compare-modal-remove', 'Убрать из сравнения'),
        hint: withFallback('compare-modal-hint', 'Вы можете сравнить до {{limit}} товаров. Показано: {{count}}.'),
        trimmedHint: withFallback('compare-modal-trimmed-hint', 'Показаны первые {{limit}} из {{total}}.'),
        copied: withFallback('compare-modal-copy-success', 'Ссылка скопирована'),
        copyError: withFallback('compare-modal-copy-failure', 'Не удалось скопировать ссылку'),
        featureHeader: withFallback('compare-modal-feature-column', 'Характеристика'),
        priceLabel: withFallback('compare-field-price', 'Цена'),
        availabilityLabel: withFallback('compare-field-availability', 'Наличие'),
        brandLabel: withFallback('compare-field-brand', 'Бренд'),
        skuLabel: withFallback('compare-field-sku', 'Артикул'),
        warrantyLabel: withFallback('compare-field-warranty', 'Гарантия'),
        warrantyTemplate: withFallback('compare-modal-warranty-value', '{{count}} мес.'),
        emptyValue: withFallback('compare-modal-empty-value', '—'),
        inStock: withFallback('in-stock', 'В наличии'),
        onOrder: withFallback('on-order', 'Под заказ')
    };
}

function queryElements() {
    const root = document.getElementById('compareModal');
    if (!root) return null;
    const backdrop = root.querySelector('.compare-modal__backdrop');
    const content = root.querySelector('.compare-modal__content');
    const title = root.querySelector('#compareModalTitle');
    const hint = root.querySelector('.compare-modal__hint');
    const table = root.querySelector('.compare-modal__table');
    const head = table?.querySelector('thead');
    const body = table?.querySelector('tbody');
    const closeBtn = root.querySelector('.compare-modal__close');
    const copyBtn = root.querySelector('[data-action="copy-link"]');
    const clearBtn = root.querySelector('[data-action="clear"]');
    if (!backdrop || !content || !title || !hint || !head || !body || !closeBtn || !copyBtn || !clearBtn) {
        return null;
    }
    return { root, backdrop, content, title, hint, head, body, closeBtn, copyBtn, clearBtn };
}

function formatPrice(value, lang, emptyFallback) {
    if (typeof value !== 'number' || Number.isNaN(value)) return emptyFallback;
    const locale = lang === 'uk' ? 'uk-UA' : 'ru-RU';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(value);
    } catch (_) {
        return `${Math.round(value)} грн`;
    }
}

function formatWarranty(months, template, emptyFallback) {
    if (typeof months !== 'number' || Number.isNaN(months) || months <= 0) return emptyFallback;
    return template.replace('{{count}}', String(months));
}

function resolveSpecLabel(specKey, lang) {
    const fallback = translations?.ru || {};
    const dict = translations?.[lang] || fallback;
    const key = `spec-${specKey}`;
    return dict[key] || fallback[key] || specKey;
}

function populateHeader(products, head, strings, lang) {
    head.innerHTML = '';
    const row = document.createElement('tr');
    const featureTh = document.createElement('th');
    featureTh.scope = 'col';
    featureTh.className = 'compare-modal__feature-header';
    featureTh.textContent = strings.featureHeader;
    row.appendChild(featureTh);

    products.forEach((product) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.dataset.id = String(product.id);
        const wrapper = document.createElement('div');
        wrapper.className = 'compare-modal__product-header';

        const img = document.createElement('img');
        img.src = product.image && String(product.image).trim().length ? product.image : PLACEHOLDER_THUMB;
        img.alt = product.name?.[lang] || product.name?.ru || '';
        img.loading = 'lazy';
        img.className = 'compare-modal__product-thumb';
        wrapper.appendChild(img);

        const meta = document.createElement('div');
        meta.className = 'compare-modal__product-meta';
        const nameEl = document.createElement('span');
        nameEl.className = 'compare-modal__product-title';
        nameEl.textContent = product.name?.[lang] || product.name?.ru || '';
        meta.appendChild(nameEl);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'compare-modal__remove';
        removeBtn.dataset.action = 'remove';
        removeBtn.dataset.id = String(product.id);
        removeBtn.textContent = strings.remove;
        removeBtn.setAttribute('aria-label', `${strings.remove}: ${nameEl.textContent}`.trim());
        meta.appendChild(removeBtn);

        wrapper.appendChild(meta);
        th.appendChild(wrapper);
        row.appendChild(th);
    });

    head.appendChild(row);
}

function buildFields(strings, lang) {
    return [
        {
            key: 'price',
            label: strings.priceLabel,
            getValue: (product) => formatPrice(product.price, lang, strings.emptyValue)
        },
        {
            key: 'availability',
            label: strings.availabilityLabel,
            getValue: (product) => (product.inStock ? strings.inStock : strings.onOrder)
        },
        {
            key: 'brand',
            label: strings.brandLabel,
            getValue: (product) => product.brand || strings.emptyValue
        },
        {
            key: 'sku',
            label: strings.skuLabel,
            getValue: (product) => product.sku || strings.emptyValue
        },
        {
            key: 'warranty',
            label: strings.warrantyLabel,
            getValue: (product) => formatWarranty(product.warrantyMonths, strings.warrantyTemplate, strings.emptyValue)
        }
    ];
}

function collectSpecKeys(products) {
    const keys = new Set();
    products.forEach((product) => {
        if (!Array.isArray(product.specs)) return;
        product.specs.forEach((spec) => {
            if (spec?.key) keys.add(spec.key);
        });
    });
    return Array.from(keys);
}

function findSpecValue(product, key, lang, emptyFallback) {
    if (!Array.isArray(product.specs)) return emptyFallback;
    const entry = product.specs.find((spec) => spec?.key === key);
    if (!entry) return emptyFallback;
    const localized = entry.value?.[lang];
    return localized || entry.value?.ru || emptyFallback;
}

function populateBody(products, body, strings, lang) {
    body.innerHTML = '';
    const fields = buildFields(strings, lang);
    const specKeys = collectSpecKeys(products);
    specKeys.forEach((specKey) => {
        fields.push({
            key: `spec-${specKey}`,
            label: resolveSpecLabel(specKey, lang),
            getValue: (product) => findSpecValue(product, specKey, lang, strings.emptyValue)
        });
    });

    fields.forEach((field) => {
        const row = document.createElement('tr');
        row.dataset.field = field.key;
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = field.label;
        row.appendChild(th);

        products.forEach((product) => {
            const td = document.createElement('td');
            td.textContent = field.getValue(product);
            row.appendChild(td);
        });

        body.appendChild(row);
    });
}

function setHint(message, { temporary = false } = {}) {
    if (!modalElements) return;
    if (!message || !message.trim()) {
        modalElements.hint.hidden = true;
        modalElements.hint.textContent = '';
        return;
    }
    modalElements.hint.hidden = false;
    modalElements.hint.textContent = message;
    if (temporary) {
        if (copyTimeoutId) {
            clearTimeout(copyTimeoutId);
            copyTimeoutId = null;
        }
        copyTimeoutId = setTimeout(() => {
            modalElements.hint.textContent = baseHintMessage;
            if (!baseHintMessage) {
                modalElements.hint.hidden = true;
            }
            copyTimeoutId = null;
        }, 2500);
    }
}

function buildBaseHint(count, total, strings) {
    const base = strings.hint
        .replace('{{limit}}', String(MAX_ITEMS))
        .replace('{{count}}', String(count))
        .replace('{{total}}', String(total));
    if (total > MAX_ITEMS) {
        const trimmed = strings.trimmedHint
            .replace('{{limit}}', String(MAX_ITEMS))
            .replace('{{count}}', String(count))
            .replace('{{total}}', String(total));
        return `${base} ${trimmed}`.trim();
    }
    return base;
}

function focusFirstElement() {
    if (!modalElements) return;
    if (modalElements.content instanceof HTMLElement) {
        modalElements.content.focus({ preventScroll: true });
        return;
    }
    const focusables = modalElements.root.querySelectorAll(focusableSelector);
    if (!focusables.length) return;
    const first = focusables[0];
    if (first instanceof HTMLElement) {
        first.focus();
    }
}

function handleFocusTrap(event) {
    if (event.key !== 'Tab' || !modalElements) return;
    const focusables = Array.from(modalElements.root.querySelectorAll(focusableSelector)).filter((el) => !el.hasAttribute('disabled'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function handleEscape(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}

function attachGlobalHandlers() {
    if (!modalElements || trapHandler || escapeHandler) return;
    trapHandler = handleFocusTrap;
    escapeHandler = handleEscape;
    modalElements.root.addEventListener('keydown', trapHandler);
    document.addEventListener('keydown', escapeHandler, { passive: true });
}

function detachGlobalHandlers() {
    if (!modalElements) return;
    if (trapHandler) {
        modalElements.root.removeEventListener('keydown', trapHandler);
        trapHandler = null;
    }
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler, { passive: true });
        escapeHandler = null;
    }
}

function announce(strings, ids) {
    const lang = currentLanguage;
    const catalog = getMergedProducts();
    const unique = Array.from(new Set(ids.map((id) => String(id))));
    const limited = unique.slice(0, MAX_ITEMS);
    const products = limited
        .map((id) => catalog.find((item) => String(item.id) === id))
        .filter(Boolean);
    if (!products.length) {
        closeModal();
        return false;
    }

    populateHeader(products, modalElements.head, strings, lang);
    populateBody(products, modalElements.body, strings, lang);
    baseHintMessage = buildBaseHint(products.length, unique.length, strings);
    setHint(baseHintMessage, { temporary: false });
    return true;
}

function openModal(ids) {
    if (!modalElements) return;
    const strings = getStrings(currentLanguage);
    const populated = announce(strings, ids);
    if (!populated) return;
    modalElements.title.textContent = strings.title;
    modalElements.closeBtn.setAttribute('aria-label', strings.close);
    modalElements.copyBtn.textContent = strings.copy;
    modalElements.clearBtn.textContent = strings.clear;

    modalElements.root.removeAttribute('hidden');
    modalElements.root.setAttribute('aria-hidden', 'false');
    modalElements.root.classList.add('is-visible');
    document.body.classList.add('compare-modal-open');
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    isOpen = true;
    attachGlobalHandlers();
    focusFirstElement();
}

function closeModal() {
    if (!modalElements) return;
    modalElements.root.classList.remove('is-visible');
    modalElements.root.setAttribute('aria-hidden', 'true');
    modalElements.root.setAttribute('hidden', '');
    document.body.classList.remove('compare-modal-open');
    detachGlobalHandlers();
    isOpen = false;
    baseHintMessage = '';
    if (copyTimeoutId) {
        clearTimeout(copyTimeoutId);
        copyTimeoutId = null;
    }
    setHint('', { temporary: false });
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;
}

async function copyLink(payload) {
    if (!Array.isArray(payload.ids) || !payload.ids.length) return;
    const url = new URL(window.location.href);
    url.searchParams.set('compare', payload.ids.join(','));
    const text = url.toString();
    try {
        const canUseClipboard = typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
        if (canUseClipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                document.body.removeChild(textarea);
                throw err;
            }
            document.body.removeChild(textarea);
        }
        setHint(payload.copied, { temporary: true });
    } catch (_) {
        setHint(payload.copyError, { temporary: true });
    }
}

function handleRootClick(event) {
    if (!modalElements) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-close="true"]')) {
        closeModal();
        return;
    }
    const removeBtn = target.closest('[data-action="remove"]');
    if (removeBtn && removeBtn.dataset.id) {
        toggleCompare(removeBtn.dataset.id);
        return;
    }
    if (target.closest('[data-action="clear"]')) {
        clearCompare();
        closeModal();
        return;
    }
    if (target.closest('[data-action="copy-link"]')) {
        const strings = getStrings(currentLanguage);
        const ids = getCompareIds();
        copyLink({ ...strings, ids });
    }
}

function handleCompareChange() {
    if (!isOpen) return;
    const strings = getStrings(currentLanguage);
    const ids = getCompareIds();
    if (!ids.length) {
        closeModal();
        return;
    }
    announce(strings, ids);
}

function applyLanguage(strings) {
    if (!modalElements) return;
    modalElements.title.textContent = strings.title;
    modalElements.closeBtn.setAttribute('aria-label', strings.close);
    modalElements.copyBtn.textContent = strings.copy;
    modalElements.clearBtn.textContent = strings.clear;
    if (isOpen) {
        const ids = getCompareIds();
        announce(strings, ids);
    }
}

export function renderCompareModal(ids = getCompareIds(), lang = currentLanguage) {
    currentLanguage = resolveLanguage(lang);
    if (!modalElements) return;
    if (!Array.isArray(ids) || ids.length === 0) {
        closeModal();
        return;
    }
    openModal(ids);
}

export function setCompareModalLanguage(lang) {
    currentLanguage = resolveLanguage(lang);
    const strings = getStrings(currentLanguage);
    applyLanguage(strings);
}

export function initCompareModal(lang = currentLanguage) {
    currentLanguage = resolveLanguage(lang);
    modalElements = queryElements();
    if (!modalElements) return;
    // Always (re)bind click handler for the current root in case DOM was remounted between tests/renders
    try {
        const root = modalElements.root;
        if (!root.__compareClickBound) {
            root.addEventListener('click', handleRootClick);
            // mark to avoid duplicate bindings on the same element
            Object.defineProperty(root, '__compareClickBound', { value: true, configurable: true });
        }
    } catch (_) { /* noop */ }

    if (!isInitialized) {
        isInitialized = true;
        modalElements.root.setAttribute('aria-hidden', 'true');
        modalElements.root.setAttribute('hidden', '');

        if (typeof window !== 'undefined') {
            window.addEventListener('compare:open', (event) => {
                const ids = event?.detail?.ids;
                if (Array.isArray(ids) && ids.length) {
                    renderCompareModal(ids, currentLanguage);
                }
            });
            window.addEventListener('compare:change', handleCompareChange);
            window.addEventListener('languagechange', (event) => {
                const nextLang = event?.detail?.lang;
                if (typeof nextLang === 'string') {
                    setCompareModalLanguage(nextLang);
                }
            });
        }
    }

    setCompareModalLanguage(currentLanguage);
}

if (typeof window !== 'undefined') {
    window.initCompareModal = initCompareModal;
    window.renderCompareModal = renderCompareModal;
    window.setCompareModalLanguage = setCompareModalLanguage;
}
