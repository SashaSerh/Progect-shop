import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { initWelcomeOverlay, needsWelcomeOverlay } from './welcome.js';
import { products, renderProducts, renderProductCard, filterProducts, toggleFavorite, toggleCompare, getFavoriteIds, getCompareIds, getProductsByCategory, isFavorite, isCompared, isAdminMode } from './products.js';
import { initCompareBar } from './compare-bar.js';
import { initCompareModal } from './compare-modal.js';
import { contentConfig } from './content-config.js';
import { initMarketing } from './marketing.js';
import { initNavigation } from './navigation.js';

// Utility functions
const clampQuantity = (value) => {
    const numeric = Math.floor(Number(value));
    if (!Number.isFinite(numeric) || numeric < 1) return 1;
    return numeric > 99 ? 99 : numeric;
};
import { updateProfileButton, openModal, closeModal } from './auth.js';
import { gesturesConfig as defaultGesturesConfig } from './gestures-config.js';

async function loadComponent(containerId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load ${componentPath}: ${response.status}`);
        }
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        } else {
            console.error(`Container ${containerId} not found`);
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '<p>Ошибка загрузки компонента</p>';
    }
}

// ===== Catalog dropdown A11y helpers =====
// Configurable Tab behavior: 'trap' (Tab циклично по пунктам меню) | 'classic' (Tab выходит наружу)
const catalogA11yConfig = {
    tabBehavior: (typeof localStorage !== 'undefined' && localStorage.getItem('catalogTabBehavior')) || 'classic'
};
// Public API to update behavior at runtime
window.setCatalogTabBehavior = function setCatalogTabBehavior(mode) {
    if (mode !== 'trap' && mode !== 'classic') return;
    catalogA11yConfig.tabBehavior = mode;
    try { localStorage.setItem('catalogTabBehavior', mode); } catch(_) {}
};
let catalogTrapActive = false;
let catalogLastActive = null;
let catalogKeydownHandler = null;
let catalogFocusinHandler = null;
let catalogMenuItems = [];
let catalogActiveIndex = 0;
let catalogCloseTimeoutId = null;
let catalogOnEndRef = null;

function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
}

function openCatalogDropdown({ withTrap = false } = {}) {
    const catalogDropdown = document.querySelector('#catalogDropdown');
    const catalogButton = document.querySelector('#catalogButton');
    if (!catalogDropdown || !catalogButton) return;

    // Cancel pending close animation if any
    if (catalogDropdown.classList.contains('catalog-dropdown--closing')) {
        catalogDropdown.classList.remove('catalog-dropdown--closing');
    }
    if (catalogCloseTimeoutId) {
        clearTimeout(catalogCloseTimeoutId);
        catalogCloseTimeoutId = null;
    }

    // Position relative to button
    const rect = catalogButton.getBoundingClientRect();
    catalogDropdown.style.top = `${rect.bottom + window.scrollY}px`;
    catalogDropdown.style.left = `${rect.left + window.scrollX}px`;
    catalogDropdown.style.position = 'absolute';

    catalogDropdown.classList.add('catalog-dropdown--open');
    catalogDropdown.classList.remove('catalog-dropdown--closing');
    catalogButton.setAttribute('aria-expanded', 'true');
    catalogDropdown.setAttribute('aria-hidden', 'false');

    // Setup menu semantics and roving tabindex
    catalogMenuItems = Array.from(catalogDropdown.querySelectorAll('.catalog-dropdown__list a'));
    catalogMenuItems.forEach((a) => {
        a.setAttribute('role', 'menuitem');
        a.setAttribute('tabindex', '-1');
        const li = a.closest('li');
        if (li) li.setAttribute('role', 'none');
    });
    catalogActiveIndex = 0;
    if (catalogMenuItems[0]) catalogMenuItems[0].setAttribute('tabindex', '0');

    // Remember last active element for focus restore
    catalogLastActive = document.activeElement;

    // Move focus to current menu item (roving pattern)
    if (catalogMenuItems.length) {
        try { catalogMenuItems[catalogActiveIndex].focus(); } catch(_) {}
    } else {
        catalogDropdown.tabIndex = -1;
        try { catalogDropdown.focus(); } catch(_) {}
    }

    // Attach keydown for roving and optional Tab trap
    if (!catalogKeydownHandler) {
        catalogKeydownHandler = (ev) => {
            const key = ev.key;
            const max = catalogMenuItems.length - 1;
            if (key === 'ArrowDown') {
                ev.preventDefault();
                if (!catalogMenuItems.length) return;
                catalogActiveIndex = (catalogActiveIndex + 1) % catalogMenuItems.length;
                catalogMenuItems.forEach((a, i) => a.setAttribute('tabindex', i === catalogActiveIndex ? '0' : '-1'));
                catalogMenuItems[catalogActiveIndex].focus();
                return;
            }
            if (key === 'ArrowUp') {
                ev.preventDefault();
                if (!catalogMenuItems.length) return;
                catalogActiveIndex = (catalogActiveIndex - 1 + catalogMenuItems.length) % catalogMenuItems.length;
                catalogMenuItems.forEach((a, i) => a.setAttribute('tabindex', i === catalogActiveIndex ? '0' : '-1'));
                catalogMenuItems[catalogActiveIndex].focus();
                return;
            }
            if (key === 'Home') {
                ev.preventDefault();
                if (!catalogMenuItems.length) return;
                catalogActiveIndex = 0;
                catalogMenuItems.forEach((a, i) => a.setAttribute('tabindex', i === catalogActiveIndex ? '0' : '-1'));
                catalogMenuItems[catalogActiveIndex].focus();
                return;
            }
            if (key === 'End') {
                ev.preventDefault();
                if (!catalogMenuItems.length) return;
                catalogActiveIndex = max;
                catalogMenuItems.forEach((a, i) => a.setAttribute('tabindex', i === catalogActiveIndex ? '0' : '-1'));
                catalogMenuItems[catalogActiveIndex].focus();
                return;
            }
            if (key === 'Enter' || key === ' ') {
                if (!catalogMenuItems.length) return;
                ev.preventDefault();
                catalogMenuItems[catalogActiveIndex].click();
                return;
            }
            if (key === 'Escape') {
                ev.preventDefault();
                if (typeof closeCatalogAnimated === 'function') {
                    closeCatalogAnimated({ restoreFocus: true });
                }
                return;
            }
            if (key === 'Tab' && catalogA11yConfig.tabBehavior === 'trap') {
                // Trap focus within menu items
                ev.preventDefault();
                if (!catalogMenuItems.length) return;
                const dir = ev.shiftKey ? -1 : 1;
                catalogActiveIndex = (catalogActiveIndex + dir + catalogMenuItems.length) % catalogMenuItems.length;
                catalogMenuItems.forEach((a, i) => a.setAttribute('tabindex', i === catalogActiveIndex ? '0' : '-1'));
                catalogMenuItems[catalogActiveIndex].focus();
                return;
            }
        };
        catalogDropdown.addEventListener('keydown', catalogKeydownHandler);
    }

    // Ensure focus stays inside while open only in trap mode
    if (catalogA11yConfig.tabBehavior === 'trap' && !catalogFocusinHandler) {
        catalogFocusinHandler = (ev) => {
            if (!catalogDropdown.classList.contains('catalog-dropdown--open')) return;
            if (!catalogDropdown.contains(ev.target)) {
                const items = getFocusableElements(catalogDropdown);
                (items[0] || catalogDropdown).focus();
            }
        };
        document.addEventListener('focusin', catalogFocusinHandler);
    }
}

function closeCatalogAnimated({ restoreFocus = false } = {}) {
    const catalogDropdown = document.querySelector('#catalogDropdown');
    const catalogButton = document.querySelector('#catalogButton');
    if (!catalogDropdown || !catalogButton) return;
    if (!catalogDropdown.classList.contains('catalog-dropdown--open')) return;

    // Remove handlers
    if (catalogKeydownHandler) {
        try { catalogDropdown.removeEventListener('keydown', catalogKeydownHandler); } catch(_) {}
        catalogKeydownHandler = null;
    }
    if (catalogFocusinHandler) {
        try { document.removeEventListener('focusin', catalogFocusinHandler); } catch(_) {}
        catalogFocusinHandler = null;
    }

    // Add closing class to animate opacity/transform
    catalogDropdown.classList.add('catalog-dropdown--closing');
    const done = () => {
        catalogDropdown.classList.remove('catalog-dropdown--open');
        catalogDropdown.classList.remove('catalog-dropdown--closing');
        catalogButton.setAttribute('aria-expanded', 'false');
        catalogDropdown.setAttribute('aria-hidden', 'true');
        // cleanup roving tabindex state
        catalogMenuItems.forEach(a => a.setAttribute('tabindex', '-1'));
        catalogMenuItems = [];
        catalogActiveIndex = 0;
        if (catalogCloseTimeoutId) { clearTimeout(catalogCloseTimeoutId); catalogCloseTimeoutId = null; }
        if (restoreFocus && catalogLastActive instanceof HTMLElement) {
            // Return focus to the opener button by default
            try { (catalogLastActive.isConnected ? catalogLastActive : catalogButton).focus(); } catch(_) {}
        }
        catalogLastActive = null;
        if (catalogOnEndRef) {
            catalogDropdown.removeEventListener('transitionend', catalogOnEndRef);
            catalogOnEndRef = null;
        }
    };
    const onEnd = (ev) => {
        if (ev && ev.target !== catalogDropdown) return; // only root dropdown
        done();
    };
    catalogOnEndRef = onEnd;
    catalogDropdown.addEventListener('transitionend', onEnd, { once: true });
    // Fallback in case transitionend doesn't fire
    catalogCloseTimeoutId = setTimeout(done, 200);
}

function toggleCatalogDropdown(e) {
    e.stopPropagation();
    const catalogDropdown = document.querySelector('#catalogDropdown');
    if (!catalogDropdown) return;
    const isOpen = catalogDropdown.classList.contains('catalog-dropdown--open');
    if (isOpen) {
        if (typeof closeCatalogAnimated === 'function') {
            closeCatalogAnimated({ restoreFocus: true });
        }
    } else {
        openCatalogDropdown({ withTrap: catalogA11yConfig.tabBehavior === 'trap' });
    }
}

function renderCategoryProducts(categorySlug, lang, translations, sortBy = 'default', priceFilter = 'all', page = 1, itemsPerPage = 6) {
    const allProducts = getProductsByCategory(categorySlug);
    const grid = document.getElementById('category-products-grid');
    const pagination = document.getElementById('category-pagination');
    
    if (!grid) return;

    // Get filter values from checkboxes and selects (same as filterProducts)
    const selectedTypes = Array.from(document.querySelectorAll('input[name="type"]:checked')).map(cb => cb.value);
    const selectedCapacities = Array.from(document.querySelectorAll('input[name="capacity"]:checked')).map(cb => cb.value);
    const selectedControls = Array.from(document.querySelectorAll('input[name="control"]:checked')).map(cb => cb.value);
    const selectedFeatures = Array.from(document.querySelectorAll('input[name="features"]:checked')).map(cb => cb.value);
    const priceSort = document.getElementById('price-sort')?.value || 'default';
    
    // Start with category products
    let filteredProducts = [...allProducts];

    // Apply advanced filters (same logic as filterProducts)
    if (selectedTypes.length > 0) {
        filteredProducts = filteredProducts.filter(product => {
            const productType = getProductType(product);
            return selectedTypes.includes(productType);
        });
    }
    
    if (selectedCapacities.length > 0) {
        filteredProducts = filteredProducts.filter(product => {
            const productCapacity = getProductCapacity(product);
            return selectedCapacities.includes(productCapacity);
        });
    }
    
    if (selectedControls.length > 0) {
        filteredProducts = filteredProducts.filter(product => {
            const productControl = getProductControlType(product);
            return selectedControls.includes(productControl);
        });
    }
    
    if (selectedFeatures.length > 0) {
        filteredProducts = filteredProducts.filter(product => {
            const productFeatures = getProductFeatures(product);
            return selectedFeatures.some(feature => productFeatures.includes(feature));
        });
    }
    
    // Price sorting (from select)
    if (priceSort !== 'default') {
        filteredProducts.sort((a, b) => priceSort === 'low-to-high' ? a.price - b.price : b.price - a.price);
    }

    // Legacy filters (for backward compatibility)
    if (priceFilter !== 'all') {
        switch (priceFilter) {
            case '0-15000':
                filteredProducts = filteredProducts.filter(p => p.price <= 15000);
                break;
            case '15000-30000':
                filteredProducts = filteredProducts.filter(p => p.price > 15000 && p.price <= 30000);
                break;
            case '30000-50000':
                filteredProducts = filteredProducts.filter(p => p.price > 30000 && p.price <= 50000);
                break;
            case '50000+':
                filteredProducts = filteredProducts.filter(p => p.price > 50000);
                break;
        }
    }

    // Legacy sorting
    if (sortBy !== 'default' && priceSort === 'default') {
        switch (sortBy) {
            case 'price-low':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filteredProducts.sort((a, b) => (b.rating?.value || 0) - (a.rating?.value || 0));
                break;
            case 'newest':
                filteredProducts.sort((a, b) => String(b.id).localeCompare(String(a.id)));
                break;
        }
    }

    // Пагинация
    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayProducts = filteredProducts.slice(startIndex, endIndex);

    // Рендерим товары
    grid.innerHTML = '';
    
    if (displayProducts.length === 0) {
        grid.innerHTML = '<p>Товари за вибраними критеріями не знайдені</p>';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const langDict = (translations && translations[lang]) || (translations && translations['ru']) || {};
    const fallbackDict = (translations && translations['ru']) || {};

    displayProducts.forEach(product => {
        const productCard = renderCategoryProductCard(product, lang, translations);
        grid.appendChild(productCard);
    });

    // Рендерим пагинацию
    renderCategoryPagination(pagination, page, totalPages, totalItems);
    
    // Update products count
    updateProductsCount(totalItems);
}

function renderCategoryPagination(container, currentPage, totalPages, totalItems) {
    if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const paginationHTML = [];
    
    // Кнопка "Предыдущая"
    if (currentPage > 1) {
        paginationHTML.push(`<button class="pagination__button pagination__button--prev" data-page="${currentPage - 1}">« Попередня</button>`);
    }

    // Номера страниц
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML.push(`<button class="pagination__button" data-page="1">1</button>`);
        if (startPage > 2) {
            paginationHTML.push('<span class="pagination__dots">...</span>');
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? ' pagination__button--active' : '';
        paginationHTML.push(`<button class="pagination__button${activeClass}" data-page="${i}">${i}</button>`);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML.push('<span class="pagination__dots">...</span>');
        }
        paginationHTML.push(`<button class="pagination__button" data-page="${totalPages}">${totalPages}</button>`);
    }

    // Кнопка "Следующая"
    if (currentPage < totalPages) {
        paginationHTML.push(`<button class="pagination__button pagination__button--next" data-page="${currentPage + 1}">Наступна »</button>`);
    }

    container.innerHTML = `
        <div class="pagination">
            <div class="pagination__info">
                Показано товарів: ${Math.min(currentPage * 6, totalItems)} з ${totalItems}
            </div>
            <div class="pagination__controls">
                ${paginationHTML.join('')}
            </div>
        </div>
    `;

    // Добавляем обработчики событий
    container.querySelectorAll('.pagination__button').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            if (page) {
                updateCategoryFilters({ page });
            }
        });
    });
}

const FAVORITES_STORAGE_KEY = 'products_favorites_v1';
const COMPARE_STORAGE_KEY = 'products_compare_v1';

function loadStoredIds(key) {
    if (typeof localStorage === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return new Set(parsed.map((value) => String(value)));
        }
    } catch (_) { /* ignore broken payload */ }
    return new Set();
}

let favoriteIds = loadStoredIds(FAVORITES_STORAGE_KEY);
let compareIds = loadStoredIds(COMPARE_STORAGE_KEY);

function persistIds(key, idsSet) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(idsSet)));
    } catch (_) { /* ignore storage quota */ }
}

function hashCodeToHue(str) {
    if (!str) return 210; // default blue
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0; // keep 32-bit
    }
    // map to 0..360
    return Math.abs(h) % 360;
}

function hydrateCollectionsFromStorage() {
    if (typeof localStorage === 'undefined') return;
    favoriteIds = loadStoredIds(FAVORITES_STORAGE_KEY);
    compareIds = loadStoredIds(COMPARE_STORAGE_KEY);
}

function renderCategoryProductCard(product, lang, translations) {
    return renderProductCard(product, lang, translations);
}


function updateCategoryFilters(updates = {}) {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const categorySlug = urlParams.get('category');
    if (!categorySlug) return;

    // Получаем текущие параметры
    const currentSort = urlParams.get('sort') || 'default';
    const currentPriceFilter = urlParams.get('price') || 'all';
    const currentPage = parseInt(urlParams.get('page')) || 1;

    // Обновляем параметры
    const newSort = updates.sort !== undefined ? updates.sort : currentSort;
    const newPriceFilter = updates.price !== undefined ? updates.price : currentPriceFilter;
    const newPage = updates.page !== undefined ? updates.page : (updates.sort || updates.price ? 1 : currentPage);

    // Обновляем URL
    const newUrl = `#category=${categorySlug}&sort=${newSort}&price=${newPriceFilter}&page=${newPage}`;
    window.location.hash = newUrl;

    // Перерендериваем товары
    const lang = localStorage.getItem('selectedLanguage') || 'ru';
    renderCategoryProducts(categorySlug, lang, translations, newSort, newPriceFilter, newPage);
}

function initCategoryControls() {
    // Обработчики для сортировки
    const sortSelect = document.getElementById('category-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            updateCategoryFilters({ sort: e.target.value });
        });
    }

    // Обработчики для фильтра цены
    const priceSelect = document.getElementById('category-price-filter');
    if (priceSelect) {
        priceSelect.addEventListener('change', (e) => {
            updateCategoryFilters({ price: e.target.value });
        });
    }

    // Обработчики для сброса фильтров
    const resetButton = document.getElementById('category-reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            updateCategoryFilters({ sort: 'default', price: 'all', page: 1 });
            // Сбрасываем селекторы
            if (sortSelect) sortSelect.value = 'default';
            if (priceSelect) priceSelect.value = 'all';
        });
    }
}

function performSearch(query, lang) {
    const filteredProducts = products.filter(product => 
        product.name[lang].toLowerCase().includes(query.toLowerCase())
    );
    renderProducts(lang, translations, filteredProducts);
    window.scrollTo({ top: document.querySelector('#products-container').offsetTop, behavior: 'smooth' });
}

function showSearchSuggestions(query, lang) {
    const searchDropdown = document.querySelector('#searchDropdown');
    const searchList = document.querySelector('.search-dropdown__list');
    if (!searchDropdown || !searchList) return;

    searchList.innerHTML = '';
    if (query.length < 2) {
        searchDropdown.classList.remove('search-dropdown--open');
        return;
    }

    const suggestions = products.filter(product => 
        product.name[lang].toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions

    if (suggestions.length === 0) {
        searchDropdown.classList.remove('search-dropdown--open');
        return;
    }

    suggestions.forEach(product => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#product-${product.id}`;
        a.textContent = product.name[lang];
        li.appendChild(a);
        searchList.appendChild(li);
    });

    searchDropdown.classList.add('search-dropdown--open');
}

// Saved language is used across listeners; keep at module scope so tests and other modules can read it
let savedLanguage;
let mobileHeaderInitialized = false;

if (typeof window !== 'undefined') {
    window.addEventListener('languagechange', (event) => {
        const lang = event?.detail?.lang;
        if (typeof lang === 'string' && ['ru', 'uk'].includes(lang)) {
            savedLanguage = lang;
        }
    });
}

function getCartAddedMessage(lang) {
    const storedLang = (() => {
        try { return localStorage.getItem('language'); } catch (_) { return null; }
    })();
    const fallback = ['ru', 'uk'].includes(lang) ? lang : (['ru', 'uk'].includes(storedLang) ? storedLang : 'ru');
    return (translations?.[fallback]?.['cart-added']) || (translations?.ru?.['cart-added']) || 'Добавлено в корзину';
}

const MAX_TOAST_STACK = 3;
const TOAST_TYPE_CLASS = {
    cart: 'toast--success',
    success: 'toast--success',
    favorite: 'toast--favorite',
    compare: 'toast--compare'
};

let suppressFavoriteToast = false;
let suppressCompareToast = false;
let collectionBadgesInitialized = false;

const badgeSelectors = {
    favorite: ['favoriteBadge', 'mobileFavoriteBadge'],
    compare: ['compareBadge', 'mobileCompareBadge']
};

const badgeCache = {
    favorite: [],
    compare: []
};

function translateKey(key, lang = savedLanguage) {
    const fallback = translations?.ru || {};
    const dict = translations?.[lang] || fallback;
    return dict?.[key] || fallback?.[key] || '';
}

function getProductDisplayName(productId, lang = savedLanguage) {
    const targetId = String(productId);
    const product = Array.isArray(products) ? products.find((item) => String(item.id) === targetId) : null;
    return (product?.name?.[lang]) || (product?.name?.ru) || '';
}

function showActionToast({ message, type = 'success', actions = [], duration = 2600 } = {}) {
    if (!message) return () => {};
    const host = document.getElementById('toast-container');
    if (!host) return () => {};

    while (host.children.length >= MAX_TOAST_STACK) {
        host.removeChild(host.firstElementChild);
    }

    const toast = document.createElement('div');
    const typeClass = TOAST_TYPE_CLASS[type] || TOAST_TYPE_CLASS.success;
    toast.className = ['toast', typeClass].filter(Boolean).join(' ');
    toast.setAttribute('role', 'status');

    const messageEl = document.createElement('div');
    messageEl.className = 'toast__message';
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    if (Array.isArray(actions) && actions.length) {
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'toast__actions';
        actions.forEach((action) => {
            if (!action || !action.label) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toast__button';
            btn.textContent = action.label;
            if (action.ariaLabel) btn.setAttribute('aria-label', action.ariaLabel);
            btn.addEventListener('click', () => {
                try { action.handler?.(); } catch (_) { /* noop */ }
                if (action.autoClose !== false) hideToast();
            });
            actionsWrap.appendChild(btn);
        });
        if (actionsWrap.childElementCount) {
            toast.appendChild(actionsWrap);
        }
    }

    host.appendChild(toast);

    const reveal = () => toast.classList.add('is-visible');
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal);
    else setTimeout(reveal, 16);

    let removed = false;
    let timerId = null;
    const hideDelay = (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) ? duration : null;
    if (hideDelay !== null) {
        timerId = setTimeout(() => hideToast(), hideDelay);
    }

    function hideToast() {
        if (removed) return;
        removed = true;
        if (timerId) clearTimeout(timerId);
        toast.classList.remove('is-visible');
        const cleanup = () => toast.remove();
        toast.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 320);
    }

    toast.addEventListener('mouseenter', () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    });

    toast.addEventListener('mouseleave', () => {
        if (!removed && hideDelay !== null && !timerId) {
            timerId = setTimeout(() => hideToast(), 1200);
        }
    });

    return hideToast;
}

function ensureBadgeRefs(type) {
    const selectors = badgeSelectors[type];
    if (!selectors) return [];
    badgeCache[type] = selectors.map((id, index) => {
        const cached = badgeCache[type][index];
        if (cached && cached.isConnected) return cached;
        return document.getElementById(id);
    }).filter(Boolean);
    return badgeCache[type];
}

function updateBadgeGroup(type, ids, lang = savedLanguage) {
    const elements = ensureBadgeRefs(type);
    if (!elements.length) return;
    const list = Array.isArray(ids) ? ids : (type === 'favorite' ? getFavoriteIds() : getCompareIds());
    const normalized = Array.isArray(list) ? list : [];
    const count = normalized.length;
    const labelKey = type === 'favorite' ? 'badge-favorites' : 'badge-compare';
    const label = translateKey(labelKey, lang);
    const accessible = label ? `${label}: ${count}` : String(count);
    elements.forEach((el) => {
        if (!el) return;
        el.hidden = count === 0;
        el.textContent = String(count);
        if (label) {
            el.dataset.label = label;
        }
        el.setAttribute('aria-label', accessible);
        el.setAttribute('title', accessible);
    });
}

function updateQuickActionButtons(type, ids, lang = savedLanguage) {
    const action = type === 'favorite' ? 'favorite' : 'compare';
    const activeSet = new Set((Array.isArray(ids) ? ids : []).map(String));
    const addKey = action === 'favorite' ? 'favorite-add' : 'compare-add';
    const removeKey = action === 'favorite' ? 'favorite-remove' : 'compare-remove';
    const addLabel = translateKey(addKey, lang);
    const removeLabel = translateKey(removeKey, lang);
    const selector = '.product-card__quick-btn[data-action=' + action + ']';
    document.querySelectorAll(selector).forEach((btn) => {
        const id = btn.dataset.id;
        const isActive = activeSet.has(String(id));
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
        const label = isActive ? removeLabel : addLabel;
        if (label) {
            btn.setAttribute('aria-label', label);
            btn.setAttribute('title', label);
        }
    });
}

function normalizeIds(list, fallbackGetter) {
    if (Array.isArray(list)) return list.map(String);
    if (typeof fallbackGetter === 'function') {
        const fallback = fallbackGetter();
        return Array.isArray(fallback) ? fallback.map(String) : [];
    }
    return [];
}

function formatCollectionToastMessage(baseKey, productName, lang = savedLanguage) {
    const base = translateKey(baseKey, lang);
    if (productName) {
        return `${base}: ${productName}`;
    }
    return base;
}

function initCollectionBadges() {
    if (collectionBadgesInitialized) {
        updateBadgeGroup('favorite', getFavoriteIds());
        updateBadgeGroup('compare', getCompareIds());
        updateQuickActionButtons('favorite', getFavoriteIds(), savedLanguage);
        updateQuickActionButtons('compare', getCompareIds(), savedLanguage);
        return;
    }
    collectionBadgesInitialized = true;

    updateBadgeGroup('favorite', getFavoriteIds());
    updateBadgeGroup('compare', getCompareIds());
    updateQuickActionButtons('favorite', getFavoriteIds(), savedLanguage);
    updateQuickActionButtons('compare', getCompareIds(), savedLanguage);

    if (typeof window !== 'undefined') {
        window.addEventListener('favorites:change', (event) => {
            const ids = normalizeIds(event?.detail?.ids, getFavoriteIds);
            updateBadgeGroup('favorite', ids);
            updateQuickActionButtons('favorite', ids, savedLanguage);
        });
        window.addEventListener('compare:change', (event) => {
            const ids = normalizeIds(event?.detail?.ids, getCompareIds);
            updateBadgeGroup('compare', ids);
            updateQuickActionButtons('compare', ids, savedLanguage);
        });
        window.addEventListener('languagechange', (event) => {
            const lang = typeof event?.detail?.lang === 'string' ? event.detail.lang : savedLanguage;
            updateBadgeGroup('favorite', getFavoriteIds(), lang);
            updateBadgeGroup('compare', getCompareIds(), lang);
            updateQuickActionButtons('favorite', getFavoriteIds(), lang);
            updateQuickActionButtons('compare', getCompareIds(), lang);
        });
    }
}

async function initApp() {
    await Promise.all([
        loadComponent('header-container', 'components/header.html'),
        loadComponent('hero-container', 'components/hero.html'),
        loadComponent('services-container', 'components/services.html'),
        loadComponent('products-container', 'components/products.html'),
        // product-detail загружается по маршруту, но подключаем шаблон заранее (скрыт)
        loadComponent('product-detail-container', 'components/product-detail.html').catch(() => {}),
        loadComponent('comparison-container', 'components/compare-bar.html'),
    loadComponent('compare-modal-container', 'components/compare-modal.html'),
        loadComponent('contacts-container', 'components/contacts.html'),
        loadComponent('portfolio-container', 'components/portfolio.html'),
        loadComponent('footer-container', 'components/footer.html'),
        loadComponent('cart-modal-container', 'components/cart.html')
    ]);

    // Применяем тему по умолчанию (теперь светлая) и синхронизируем иконки/ARIA
    try { initTheme(); } catch(_) {}

    const openCartModalButton = document.querySelector('#openCartModal');
    const cartModal = document.querySelector('#cartModal');
    const closeModalButton = document.querySelector('.cart-modal__close');

    if (openCartModalButton && cartModal) {
        openCartModalButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openCartModal(e);
            updateCartUI(translations, savedLanguage);
        });
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeCartModal);
    }
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                closeCartModal();
            }
        });
    }

    // Инициализация языка и первичный рендер
    // Язык по умолчанию теперь Ukrainian (uk). Показываем приветственный выбор, если язык ещё не установлен.
    // Cookie helpers for language selection expiry
    savedLanguage = localStorage.getItem('language');
    const cookieMissing = needsWelcomeOverlay(); // now always true (overlay each visit)
    if (!['ru','uk'].includes(savedLanguage)) {
        savedLanguage = 'uk';
        localStorage.setItem('language', savedLanguage);
    }
    // Применяем переводы (обновит document.title и плейсхолдеры)
    if (typeof switchLanguage === 'function') {
        switchLanguage(savedLanguage);
    }
    // Рендерим товары сразу (в тестовой среде важна синхронность появления карточек)
    renderProducts(savedLanguage, translations);
    initCompareBar(savedLanguage);
    initCompareModal(savedLanguage);
    initCollectionBadges();

    // Загружаем компонент приветствия (лениво) и отображаем, если первый визит
    // Show overlay if cookie missing (first visit or expired manual clear scenario)
        try {
                await loadComponent('welcome-container', 'components/welcome.html');
                initWelcomeOverlay(savedLanguage);
        } catch (e) {
                // Fallback: если контейнера/шаблона нет (например, в тестах), создадим минимальный оверлей
                let overlay = document.getElementById('welcomeOverlay');
                if (!overlay) {
                        const host = document.getElementById('welcome-container') || document.body;
                        const wrap = document.createElement('div');
                        wrap.innerHTML = `
                            <div id="welcomeOverlay" class="is-visible" role="dialog" aria-modal="true">
                                <div class="welcome__content">
                                    <button class="welcome-lang-btn" data-lang="ru">RU</button>
                                    <button class="welcome-lang-btn" data-lang="uk">UK</button>
                                    <button id="welcomeContinue">OK</button>
                                    <span id="welcomeLangValue"></span>
                                </div>
                            </div>`;
                        host.appendChild(wrap.firstElementChild);
                }
                try { initWelcomeOverlay(savedLanguage); } catch(_) {}
        }
    // После первичного рендера привяжем переход на страницу товара
    bindProductCardNavigation();

    // Загрузим админ-форму для добавления товаров и инициализируем модуль
    try {
        // Попробуем получить HTML компонента и вставить в body (если не был загружен автоматически)
        const resp = await fetch('components/admin-product-form.html');
        if (resp.ok) {
            const html = await resp.text();
            // Вставим в конец body только если модал ещё не присутствует
            if (!document.getElementById('adminProductModal')) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = html;
                document.body.appendChild(wrapper.firstElementChild);
            }
        }
    } catch (err) { /* ignore fetch errors */ }
    try {
        console.log('Importing admin-products.js...');
        const admin = await import('./admin-products.js');
        if (admin && typeof admin.initAdminProducts === 'function') {
            console.log('Initializing admin products...');
            admin.initAdminProducts(translations, savedLanguage);
        } else {
            console.error('initAdminProducts function not found');
        }
    } catch (err) { console.error('Error importing admin module:', err); }

    // Инициализируем маркетинговые CTA и форму контактов (кнопки позвонить/WhatsApp/Telegram)
    try { initMarketing(); } catch (e) { /* no-op */ }

    // Рендер портфолио по конфигу (поддержка заголовков/описаний, локализация ru/uk)
    const portfolioGrid = document.querySelector('.portfolio__grid');
    const portfolioSection = document.querySelector('#portfolio');
    const portfolioBehavior = portfolioSection?.getAttribute('data-portfolio-behavior') || 'lightbox';
    if (portfolioGrid && Array.isArray(contentConfig.portfolio)) {
        portfolioGrid.innerHTML = '';
        // helper to build responsive srcset from placehold.co style URLs like 480x320
        const buildSrcset = (src) => {
            try {
                // Expect pattern .../<w>x<h>
                const m = src.match(/(\d+)x(\d+)/);
                if (!m) return '';
                const w = parseInt(m[1], 10), h = parseInt(m[2], 10);
                const ratio = h / w;
                const widths = [320, 480, 640, 960];
                return widths.map(W => `${src.replace(/(\d+)x(\d+)/, `${W}x${Math.round(W*ratio)}`)} ${W}w`).join(', ');
            } catch { return ''; }
        };
        const defaultSizes = '(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 320px';

        contentConfig.portfolio.forEach(item => {
            const fig = document.createElement('figure');
            fig.className = 'portfolio__item';
            // Картинка (возможно в ссылке, если режим link)
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = item.alt || '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.sizes = defaultSizes;
            const srcset = buildSrcset(item.src);
            if (srcset) img.srcset = srcset;
            if (portfolioBehavior === 'link' && item.url) {
                const a = document.createElement('a');
                a.href = item.url;
                a.className = 'portfolio__item-link';
                a.appendChild(img);
                fig.appendChild(a);
            } else {
                fig.appendChild(img);
            }
            // Подписи из i18n по ключам (fallback: текущий язык -> ru -> '')
            const getI18n = (key) => {
                if (!key) return '';
                const lang = savedLanguage;
                return (translations[lang] && translations[lang][key])
                    || (translations['ru'] && translations['ru'][key])
                    || '';
            };
            const titleText = getI18n(item.titleKey);
            const descText = getI18n(item.descriptionKey);
            if (titleText || descText) {
                const fc = document.createElement('figcaption');
                if (titleText) {
                    const t = document.createElement('div');
                    t.className = 'portfolio__item-title';
                    t.textContent = titleText;
                    fc.appendChild(t);
                }
                if (descText) {
                    const d = document.createElement('div');
                    d.className = 'portfolio__item-description';
                    d.textContent = descText;
                    fc.appendChild(d);
                }
                fig.appendChild(fc);
            }
            portfolioGrid.appendChild(fig);
        });
    }

    // После загрузки компонентов и первичной инициализации языка активируем переключатели языка
    if (typeof initLanguageSwitchers === 'function') {
        initLanguageSwitchers();
    }

    // Простой лайтбокс для портфолио: клик по изображению — открытие полноразмерного превью
    (function initPortfolioLightbox(){
        const grid = document.querySelector('.portfolio__grid');
        if (!grid) return;
        if (portfolioBehavior !== 'lightbox') return; // в режиме ссылок лайтбокс не включаем
        let overlay, img;
        let trapHandler = null;
        function close() {
            if (!overlay) return;
            overlay.classList.remove('is-visible');
            setTimeout(() => overlay.remove(), 200);
            document.removeEventListener('keydown', onKey);
            overlay?.removeEventListener('keydown', trapHandler);
            if (lastActive) lastActive.focus();
        }
        function onKey(e){ if (e.key === 'Escape') close(); }
        let lastActive = null;
        grid.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.tagName.toLowerCase() !== 'img') return;
            lastActive = document.activeElement;
            overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.tabIndex = -1;
            overlay.setAttribute('role','dialog');
            overlay.setAttribute('aria-modal','true');
            const wrapper = document.createElement('div');
            wrapper.className = 'lightbox-wrapper';
            img = document.createElement('img');
            img.src = target.getAttribute('src');
            img.alt = target.getAttribute('alt') || '';
            wrapper.appendChild(img);
            const btn = document.createElement('button');
            btn.className = 'lightbox-close';
            btn.setAttribute('aria-label','Закрыть');
            btn.textContent = '×';
            btn.addEventListener('click', close);
            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
            document.addEventListener('keydown', onKey, { passive: true });
            overlay.appendChild(wrapper);
            overlay.appendChild(btn);
            document.body.appendChild(overlay);
            // Trap focus внутри оверлея
            trapHandler = (ev) => {
                if (ev.key !== 'Tab') return;
                const focusables = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
                else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
            };
            overlay.addEventListener('keydown', trapHandler);
            requestAnimationFrame(() => overlay.classList.add('is-visible'));
            btn.focus();
        });
    })();

    // Хеш-маршрутизация: #product-<id>
    setupHashRouting(savedLanguage);
    
    // Инициализация мобильного заголовка
    initMobileHeader();
    // Инициализация десктопного поведения хедера (sticky + сжатие верхней полосы)
    initDesktopHeaderCondense();
    
    // Привязываем обработчики тем ПОСЛЕ инициализации мобильного хедера
    // Делегирование клика по .theme-toggle обеспечивает единый источник обработчика
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const btn = t.closest('.theme-toggle');
        if (btn) {
            try { toggleTheme(); } catch(_) {}
        }
    });

    const profileButton = document.getElementById('profileButton');
    const profileModal = document.getElementById('profileModal');
    const modalClose = document.querySelector('.modal__close');
    
    if (profileButton && profileModal && modalClose) {
        updateProfileButton(translations, savedLanguage);
        profileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(translations, savedLanguage);
        });
        modalClose.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                closeModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileModal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    const categorySelect = document.getElementById('category');
    const priceSelect = document.getElementById('price');
    if (categorySelect) categorySelect.addEventListener('change', () => {
        if (typeof filterProductsWithSkeleton === 'function') {
            filterProductsWithSkeleton(savedLanguage, translations);
        } else {
            filterProducts(savedLanguage, translations);
        }
    });
    if (priceSelect) priceSelect.addEventListener('change', () => {
        if (typeof filterProductsWithSkeleton === 'function') {
            filterProductsWithSkeleton(savedLanguage, translations);
        } else {
            filterProducts(savedLanguage, translations);
        }
    });

    // New advanced filter event listeners
    const filterCheckboxes = document.querySelectorAll('input[type="checkbox"][name="type"], input[type="checkbox"][name="capacity"], input[type="checkbox"][name="control"], input[type="checkbox"][name="features"]');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Check if we're on a category page
            const categoryGrid = document.getElementById('category-products-grid');
            if (categoryGrid) {
                // We're on a category page, re-render category products
                const urlParams = new URLSearchParams(window.location.hash.substring(1));
                const categorySlug = window.location.hash.split('#')[1]?.split('?')[0] || 'conditioners';
                renderCategoryProducts(categorySlug, savedLanguage, translations);
            } else {
                // We're on the main products page
                if (typeof filterProductsWithSkeleton === 'function') {
                    filterProductsWithSkeleton(savedLanguage, translations);
                } else {
                    filterProducts(savedLanguage, translations);
                }
            }
        });
    });

    const priceSortSelect = document.getElementById('price-sort');
    if (priceSortSelect) {
        priceSortSelect.addEventListener('change', () => {
            // Check if we're on a category page
            const categoryGrid = document.getElementById('category-products-grid');
            if (categoryGrid) {
                // We're on a category page, re-render category products
                const urlParams = new URLSearchParams(window.location.hash.substring(1));
                const categorySlug = window.location.hash.split('#')[1]?.split('?')[0] || 'conditioners';
                renderCategoryProducts(categorySlug, savedLanguage, translations);
            } else {
                // We're on the main products page
                if (typeof filterProductsWithSkeleton === 'function') {
                    filterProductsWithSkeleton(savedLanguage, translations);
                } else {
                    filterProducts(savedLanguage, translations);
                }
            }
        });
    }

    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset all checkboxes
            filterCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            // Reset price sort
            if (priceSortSelect) priceSortSelect.value = 'default';
            // Reset legacy filters
            if (categorySelect) categorySelect.value = 'all';
            if (priceSelect) priceSelect.value = 'all';
            
            // Re-filter - check if we're on a category page
            const categoryGrid = document.getElementById('category-products-grid');
            if (categoryGrid) {
                // We're on a category page, re-render category products
                const urlParams = new URLSearchParams(window.location.hash.substring(1));
                const categorySlug = window.location.hash.split('#')[1]?.split('?')[0] || 'conditioners';
                renderCategoryProducts(categorySlug, savedLanguage, translations);
            } else {
                // We're on the main products page
                if (typeof filterProductsWithSkeleton === 'function') {
                    filterProductsWithSkeleton(savedLanguage, translations);
                } else {
                    filterProducts(savedLanguage, translations);
                }
            }
        });
    }

    // Языковые переключатели теперь инициализируются централизованно через initLanguageSwitchers()

    const cartDropdownToggle = document.querySelector('#cartDropdownToggle');
    const cartDropdown = document.querySelector('#cartDropdown');
    if (cartDropdownToggle && cartDropdown) {
        cartDropdownToggle.addEventListener('click', toggleCartDropdown);
        document.addEventListener('click', (e) => {
            if (!cartDropdown.contains(e.target) && !cartDropdownToggle.contains(e.target)) {
                cartDropdown.classList.remove('cart-dropdown--open');
                cartDropdownToggle.setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cartDropdown.classList.contains('cart-dropdown--open')) {
                cartDropdown.classList.remove('cart-dropdown--open');
                cartDropdownToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    const catalogButton = document.querySelector('#catalogButton');
    const catalogDropdown = document.querySelector('#catalogDropdown');
    if (catalogButton && catalogDropdown) {
        // Open dropdown on hover (no focus trap)
        catalogButton.addEventListener('mouseenter', () => {
            openCatalogDropdown({ withTrap: false });
        });
        
        // Close dropdown when mouse leaves both button and dropdown
        const closeDropdown = () => {
            if (typeof closeCatalogAnimated === 'function') {
                closeCatalogAnimated({ restoreFocus: false });
            }
        };
        
        catalogButton.addEventListener('mouseleave', (e) => {
            // Check if mouse is moving to dropdown
            setTimeout(() => {
                if (!catalogDropdown.matches(':hover') && !catalogButton.matches(':hover')) {
                    closeDropdown();
                }
            }, 100);
        });
        
        catalogDropdown.addEventListener('mouseleave', (e) => {
            // Check if mouse is moving to button
            setTimeout(() => {
                if (!catalogDropdown.matches(':hover') && !catalogButton.matches(':hover')) {
                    closeDropdown();
                }
            }, 100);
        });
        
        // Click toggles with focus trap only if configured
        catalogButton.addEventListener('click', (e) => {
            const useTrap = catalogA11yConfig.tabBehavior === 'trap';
            // For toggleCatalogDropdown we decide inside based on config
            toggleCatalogDropdown(e);
        });
        
        document.addEventListener('click', (e) => {
            if (!catalogDropdown.contains(e.target) && !catalogButton.contains(e.target)) {
                if (typeof closeCatalogAnimated === 'function') {
                    closeCatalogAnimated({ restoreFocus: false });
                }
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && catalogDropdown.classList.contains('catalog-dropdown--open')) {
                if (typeof closeCatalogAnimated === 'function') {
                    closeCatalogAnimated({ restoreFocus: true });
                }
            }
        });

        // Close dropdown when a catalog link is clicked
        catalogDropdown.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && catalogDropdown.contains(link)) {
                // Let navigation happen, just close visually
                if (typeof closeCatalogAnimated === 'function') {
                    closeCatalogAnimated({ restoreFocus: false });
                }
            }
        });

        // Close on route change as an extra safety net
        window.addEventListener('hashchange', () => {
            if (typeof closeCatalogAnimated === 'function') {
                closeCatalogAnimated({ restoreFocus: false });
            }
        });
    }

    const searchInput = document.querySelector('#site-search');
    const searchButton = document.querySelector('#searchButton');
    const searchDropdown = document.querySelector('#searchDropdown');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            showSearchSuggestions(e.target.value, savedLanguage);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(e.target.value, savedLanguage);
                searchDropdown.classList.remove('search-dropdown--open');
            }
        });
    }
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value, savedLanguage);
            searchDropdown.classList.remove('search-dropdown--open');
        });
    }
    if (searchDropdown) {
        document.addEventListener('click', (e) => {
            if (!searchDropdown.contains(e.target) && !searchInput.contains(e.target)) {
                searchDropdown.classList.remove('search-dropdown--open');
            }
        });
    }

    // Обработчики темы подключаются через делегирование ниже

    const checkoutButton = document.querySelector('.cart-button--checkout');
    if (checkoutButton) checkoutButton.addEventListener('click', openCartModal);

    const clearCartButton = document.querySelector('.cart-button--clear');
    if (clearCartButton) clearCartButton.addEventListener('click', () => {
        clearCart();
        updateCartUI(translations, savedLanguage);
    });

    const productsGrid = document.querySelector('.products__grid');
    if (productsGrid) {
        // Обработчики теперь глобальные, см. выше
    }

    const servicesGrid = document.querySelector('.services__grid');
    if (servicesGrid) {
        servicesGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('service-card__button')) {
                const productId = e.target.dataset.id;
                addToCart(productId, products);
                updateCartUI(translations, savedLanguage);
                showActionToast({ type: 'cart', message: getCartAddedMessage(savedLanguage) });
            } else if (e.target.classList.contains('service-card__title')) {
                const card = e.target.closest('.service-card');
                const btn = card?.querySelector('.service-card__button');
                const id = btn?.dataset.id;
                if (id) {
                    location.hash = `#product-${id}`;
                }
            }
        });
    }

    const cartDropdownItems = document.querySelector('.cart-dropdown__items');
    if (cartDropdownItems) {
        cartDropdownItems.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-dropdown__item-remove')) {
                const productId = e.target.dataset.id;
                removeFromCart(productId);
                updateCartUI(translations, savedLanguage);
            }
        });
    }

    // Fallback delegation for cart dropdown remove in environments where container listener wasn't bound
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('cart-dropdown__item-remove')) {
            const productId = t.dataset.id;
            if (productId) {
                removeFromCart(productId);
                updateCartUI(translations, savedLanguage);
            }
        }
    });

    const cartItems = document.querySelector('.cart-items');
    if (cartItems) {
        cartItems.addEventListener('click', (e) => {
            if (e.target.classList.contains('cart-item-remove')) {
                const productId = e.target.dataset.id;
                removeFromCart(productId);
                updateCartUI(translations, savedLanguage);
            }
        });
    }

    const scrollToTopButton = document.querySelector('.scroll-to-top');
    if (scrollToTopButton) {
        let lastScrollTop = 0;
        let scrollThreshold = 200; // Минимальный скролл для появления кнопки
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            // Показываем кнопку когда прокрутили вниз больше чем на 200px
            if (currentScroll > scrollThreshold) {
                scrollToTopButton.classList.add('visible');
            } else {
                scrollToTopButton.classList.remove('visible');
            }
            
            lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // Для мобильных браузеров
        });
        
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({ 
                top: 0, 
                behavior: 'smooth' 
            });
            
            // Добавляем небольшую анимацию нажатия
            scrollToTopButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                scrollToTopButton.style.transform = '';
            }, 150);
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));

    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'https://placehold.co/150x150/red/white?text=Image+Error';
        }
    }, true);

    // Регистрация Service Worker + уведомление об обновлении
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('/service-worker.js');
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_ACTIVATED') {
                    showUpdateToast();
                }
            });
        } catch (e) {
            // DEBUG: console.warn('SW registration failed', e);
        }
    }

    // Обновляем базовый JSON-LD WebSite/Organization (url + SearchAction) после загрузки
    try { updateBaseJsonLd(); } catch {}

    // Hero LQIP handling
    const heroImg = document.querySelector('.hero__image.lqip');
    if (heroImg) {
        const mark = () => heroImg.classList.add('lqip--loaded');
        heroImg.addEventListener('load', mark, { once: true });
        if (heroImg.complete && heroImg.naturalWidth > 0) mark();
    }
};


// Функция для изменения цветовой схемы логотипа
function changeLogoColorScheme(scheme) {
    const logo = document.querySelector('.header__logo');
    if (!logo) return;
    
    // Удаляем все существующие цветовые схемы
    logo.classList.remove('red-scheme', 'green-scheme', 'purple-scheme', 'grayscale');
    
    // Добавляем новую схему, если она указана
    if (scheme && scheme !== 'default') {
        logo.classList.add(`${scheme}-scheme`);
    }
    
    // Сохраняем выбор в localStorage
    localStorage.setItem('logoColorScheme', scheme || 'default');
}

// Run initApp immediately if document already parsed (tests import the module), otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // fire-and-forget
    initApp().catch(() => {});
}

// Инициализация цветовой схемы логотипа при загрузке
function initLogoColorScheme() {
    const savedScheme = localStorage.getItem('logoColorScheme') || 'default';
    changeLogoColorScheme(savedScheme);
}

// Wire manual reopen buttons (desktop + mobile) after components loaded (delegation safe)
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('open-language-overlay')) {
        if (typeof window.showWelcomeOverlay === 'function') {
            window.showWelcomeOverlay(target);
        } else {
            // Lazy load if not present yet
            loadComponent('welcome-container', 'components/welcome.html').then(() => {
                initWelcomeOverlay(localStorage.getItem('language') || 'uk');
                if (typeof window.showWelcomeOverlay === 'function') window.showWelcomeOverlay(target);
            }).catch(()=>{});
        }
    }
});

// Global handler for product card quick buttons (works for both main page and category pages)
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const quickBtn = target.closest('.product-card__quick-btn');
    if (quickBtn) {
        const action = quickBtn.dataset.action;
        const productId = quickBtn.dataset.id;
        if (!action || !productId) return;
        const productName = getProductDisplayName(productId, savedLanguage);
        let isActive = false;
        if (action === 'favorite') {
            const skipToast = suppressFavoriteToast;
            if (suppressFavoriteToast) suppressFavoriteToast = false;
            isActive = toggleFavorite(productId);
            const labelKey = isActive ? 'favorite-remove' : 'favorite-add';
            const label = translateKey(labelKey, savedLanguage);
            if (label) {
                quickBtn.setAttribute('aria-label', label);
                quickBtn.setAttribute('title', label);
            }
            quickBtn.classList.toggle('is-active', isActive);
            quickBtn.setAttribute('aria-pressed', String(isActive));
            updateQuickActionButtons('favorite', getFavoriteIds(), savedLanguage);
            if (!skipToast) {
                const messageKey = isActive ? 'toast-favorite-added' : 'toast-favorite-removed';
                const message = formatCollectionToastMessage(messageKey, productName, savedLanguage);
                const undoLabel = translateKey('toast-undo', savedLanguage);
                const actions = [];
                if (undoLabel) {
                    actions.push({
                        label: undoLabel,
                        handler: () => {
                            suppressFavoriteToast = true;
                            toggleFavorite(productId);
                            updateQuickActionButtons('favorite', getFavoriteIds(), savedLanguage);
                        }
                    });
                }
                showActionToast({ type: 'favorite', message, actions });
            }
        } else if (action === 'compare') {
            const skipToast = suppressCompareToast;
            if (suppressCompareToast) suppressCompareToast = false;
            isActive = toggleCompare(productId);
            const labelKey = isActive ? 'compare-remove' : 'compare-add';
            const label = translateKey(labelKey, savedLanguage);
            if (label) {
                quickBtn.setAttribute('aria-label', label);
                quickBtn.setAttribute('title', label);
            }
            quickBtn.classList.toggle('is-active', isActive);
            quickBtn.setAttribute('aria-pressed', String(isActive));
            updateQuickActionButtons('compare', getCompareIds(), savedLanguage);
            if (!skipToast) {
                const messageKey = isActive ? 'toast-compare-added' : 'toast-compare-removed';
                const message = formatCollectionToastMessage(messageKey, productName, savedLanguage);
                const undoLabel = translateKey('toast-undo', savedLanguage);
                const openLabel = translateKey('toast-open-compare', savedLanguage);
                const actions = [];
                if (isActive && openLabel) {
                    actions.push({
                        label: openLabel,
                        handler: () => {
                            const ids = getCompareIds();
                            if (ids.length && typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('compare:open', { detail: { ids } }));
                            }
                        }
                    });
                }
                if (undoLabel) {
                    actions.push({
                        label: undoLabel,
                        handler: () => {
                            suppressCompareToast = true;
                            toggleCompare(productId);
                            updateQuickActionButtons('compare', getCompareIds(), savedLanguage);
                        }
                    });
                }
                showActionToast({ type: 'compare', message, actions });
            }
        } else {
            return;
        }
        return;
    }
});

// Global handlers for product card interactions (quantity, cart, navigation)
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    
    // Quantity stepper buttons
    const quantityBtn = target.closest('.quantity-stepper__btn');
    if (quantityBtn) {
        const card = quantityBtn.closest('.product-card');
        const input = card?.querySelector('.quantity-stepper__input');
        if (!input) return;
        const delta = quantityBtn.dataset.action === 'increment' ? 1 : -1;
        const next = clampQuantity(Number(input.value) + delta);
        input.value = String(next);
        return;
    }
    
    // Main product card button (add to cart)
    if (target.classList.contains('product-card__button') && !target.hasAttribute('data-edit') && !target.hasAttribute('data-delete')) {
        const productId = target.dataset.id;
        if (!productId) return;
        const card = target.closest('.product-card');
        const input = card?.querySelector('.quantity-stepper__input');
        const qty = clampQuantity(input ? Number(input.value) : 1);
        if (input) input.value = String(qty);
        addToCart(productId, products, qty);
        updateCartUI(translations, savedLanguage);
        showActionToast({ type: 'cart', message: getCartAddedMessage(savedLanguage) });
        return;
    }
    
    // Product card image or title click (navigate to product detail)
    if (target.classList.contains('product-card__image') || target.classList.contains('product-card__title') || target.classList.contains('product-card__title-link')) {
        const card = target.closest('.product-card');
        const id = card?.dataset.id;
        if (id) {
            location.hash = `#product-${id}`;
        }
        return;
    }
});

// Global handler for quantity input changes
document.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.classList.contains('quantity-stepper__input')) return;
    input.value = String(clampQuantity(input.value));
});

// Экспорт функций для использования в других файлах

// ====== Product detail: rendering and routing ======
function getLangSafe() {
    const l = (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'ru';
    return ['ru','uk'].includes(l) ? l : 'ru';
}

function renderProductDetail(productId) {
    const lang = getLangSafe();
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    // Ensure template is present; if not loaded yet, bail.
    const section = container.querySelector('.product-detail');
    if (!section) return;
    const product = Array.isArray(products) ? products.find(p => String(p.id) === String(productId)) : null;
    if (!product) {
        container.innerHTML = `<section class="product-detail"><div class="container"><button class="product-detail__back" type="button">← ${translations?.[lang]?.['nav-products'] || 'Товары'}</button><p style="margin-top:8px">Товар не найден</p></div></section>`;
        bindProductDetailEvents();
        return;
    }
        // Fill breadcrumbs
        try {
            const bcCatalog = section.querySelector('[data-crumb="catalog"]');
            const bcCategory = section.querySelector('[data-crumb="category"]');
            const bcCurrent = section.querySelector('[data-crumb="current"]');
            if (bcCatalog) {
                bcCatalog.setAttribute('href', '#products');
                bcCatalog.onclick = (e) => { e.preventDefault(); location.hash = ''; const el = document.getElementById('products'); if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' }); };
            }
            if (bcCategory) {
                const cat = product.category || 'all';
                if (cat === 'service') {
                    const label = translations?.[lang]?.['services-title'] || 'Наши услуги';
                    bcCategory.textContent = label;
                    bcCategory.setAttribute('href', '#services');
                    bcCategory.onclick = (e) => {
                        e.preventDefault();
                        location.hash = '';
                        const el = document.getElementById('services');
                        if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
                    };
                } else {
                    const categoryLabel = (cat === 'ac') ? (translations?.[lang]?.['filter-ac'] || 'Кондиционеры') : (cat === 'recuperator' ? (translations?.[lang]?.['filter-recuperator'] || 'Рекуператоры') : (translations?.[lang]?.['filter-all'] || 'Все'));
                    bcCategory.textContent = categoryLabel;
                    bcCategory.setAttribute('href', '#products');
                    bcCategory.onclick = (e) => {
                        e.preventDefault();
                        location.hash = '';
                        const sel = document.getElementById('category');
                        if (sel) { sel.value = cat; }
                        if (typeof filterProducts === 'function') filterProducts(lang, translations);
                        const el = document.getElementById('products'); if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
                    };
                }
            }
            if (bcCurrent) {
                bcCurrent.textContent = product.name?.[lang] || product.name?.ru || '';
            }
        } catch {}

        // Fill basic fields
    section.querySelector('.product-detail__title').textContent = product.name?.[lang] || product.name?.ru || '';
    section.querySelector('.product-detail__price').textContent = `${Math.round(Number(product.price)).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн`;
    // Main image and thumbs
    const imgEl = section.querySelector('.product-detail__image');
    if (imgEl) {
        imgEl.classList.add('lqip');
        imgEl.setAttribute('loading','eager');
        imgEl.setAttribute('decoding','async');
        imgEl.setAttribute('fetchpriority','high');
        // sizes hint: image container roughly half of content area on desktop, full width on mobile
        imgEl.setAttribute('sizes','(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 600px');
    }
    const images = (Array.isArray(product.images) && product.images.length ? product.images : [product.image]).filter(Boolean);
    let currentImgIdx = 0;
        if (imgEl) {
            // lazy + preloader
            ensureImagePreloader(section);
            loadLargeImage(imgEl, images[0] || '', product.name?.[lang] || '');
        }
    const thumbs = section.querySelector('.product-detail__thumbs');
    if (thumbs) {
        thumbs.innerHTML = '';
        images.forEach((src, i) => {
            const t = document.createElement('img');
            t.src = src;
            t.alt = product.name?.[lang] || '';
            t.loading = 'lazy';
            t.decoding = 'async';
            t.sizes = '(max-width: 640px) 20vw, 96px';
            t.srcset = `${src} 1x, ${src} 2x`;
            if (i === 0) t.classList.add('is-active');
            t.addEventListener('click', () => {
                currentImgIdx = i;
                    if (imgEl) { loadLargeImage(imgEl, src, product.name?.[lang] || ''); }
                thumbs.querySelectorAll('img').forEach(el => el.classList.remove('is-active'));
                t.classList.add('is-active');
            });
            thumbs.appendChild(t);
        });
    }
    // Meta badges
    const meta = section.querySelector('.product-detail__meta');
    if (meta) {
        meta.innerHTML = '';
        const stock = document.createElement('span');
        stock.className = 'badge ' + (product.inStock ? 'badge--ok' : 'badge--warn');
        stock.textContent = product.inStock ? (translations?.[lang]?.['in-stock'] || 'В наличии') : (translations?.[lang]?.['on-order'] || 'Под заказ');
        meta.appendChild(stock);
        if (product.warrantyMonths != null) {
            const w = document.createElement('span');
            w.className = 'badge';
            w.textContent = `${translations?.[lang]?.['warranty'] || 'Гарантия'}: ${product.warrantyMonths} мес.`;
            meta.appendChild(w);
        }
        if (product.brand) {
            const b = document.createElement('span'); b.className = 'badge';
            b.textContent = `${translations?.[lang]?.['brand'] || 'Бренд'}: ${product.brand}`;
            meta.appendChild(b);
        }
        if (product.sku) {
            const s = document.createElement('span'); s.className = 'badge';
            s.textContent = `${translations?.[lang]?.['sku'] || 'Артикул'}: ${product.sku}`;
            meta.appendChild(s);
        }
    }
    // Specs
    const specsList = section.querySelector('.product-detail__specs-list');
    if (specsList) {
        specsList.innerHTML = '';
        const specs = Array.isArray(product.specs) ? product.specs : [];
        specs.forEach(spec => {
            const li = document.createElement('li');
            const keyLabel = translations?.[lang]?.[`spec-${spec.key}`] || spec.key;
            const valueText = (spec.value && (spec.value[lang] || spec.value['ru'] || '')) || '';
            li.textContent = `${keyLabel}: ${valueText}`;
            specsList.appendChild(li);
        });
    }
    // Actions
    const btn = section.querySelector('.product-detail__addtocart');
    if (btn) {
        btn.onclick = () => {
            addToCart(product.id, products);
            updateCartUI(translations, lang);
            showActionToast({ type: 'cart', message: getCartAddedMessage(lang) });
        };
    }
    // Set document title
    try { document.title = `${product.name?.[lang] || ''} — ${translations?.[lang]?.['site-title'] || ''}`; } catch {}
    // Update meta/OG/Twitter for product page
    try {
        const title = document.title;
        const desc = product.description?.[lang] || product.description?.ru || 'Климатическое оборудование и услуги';
        const url = location.href;
        const image = images[0] || '/icons/icon-icon512x512.png';
        setOgTitle(title); setTwitterTitle(title);
        setOgDescription(desc); setTwitterDescription(desc);
        setOgUrl(url);
        setOgImage(image); setTwitterImage(image);
        setMetaDescription(desc);
    } catch {}

    // JSON-LD structured data (Product/Service)
        try {
            const scriptId = 'product-jsonld';
            const old = document.getElementById(scriptId);
            if (old) old.remove();
            const isService = (product.category === 'service');
            const ld = isService ? {
                '@context': 'https://schema.org',
                '@type': 'Service',
                name: product.name?.[lang] || product.name?.ru || '',
                brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
                description: product.description?.[lang] || product.description?.ru || '',
                image: images,
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'UAH',
                    price: String(product.price),
                    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'
                }
            } : {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: product.name?.[lang] || product.name?.ru || '',
                sku: product.sku || undefined,
                brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
                image: images,
                description: product.description?.[lang] || product.description?.ru || '',
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'UAH',
                    price: String(product.price),
                    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'
                }
            };
            const s = document.createElement('script');
            s.type = 'application/ld+json';
            s.id = scriptId;
            s.textContent = JSON.stringify(ld);
            document.head.appendChild(s);
            // BreadcrumbList JSON-LD based on visible breadcrumbs
            const bcId = 'breadcrumbs-jsonld';
            document.getElementById(bcId)?.remove();
            const crumbs = [];
            const bcNav = section.querySelector('.breadcrumbs');
            if (bcNav) {
                const links = bcNav.querySelectorAll('.breadcrumbs__link, .breadcrumbs__current');
                let pos = 1;
                links.forEach(el => {
                    const name = el.textContent?.trim() || '';
                    if (!name) return;
                    const item = (el instanceof HTMLAnchorElement && el.getAttribute('href')) ? el.href : location.href;
                    crumbs.push({ '@type': 'ListItem', position: pos++, name, item });
                });
            }
            if (crumbs.length >= 2) {
                const bcs = document.createElement('script');
                bcs.type = 'application/ld+json';
                bcs.id = bcId;
                bcs.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });
                document.head.appendChild(bcs);
            }
        } catch {}
}

function bindProductDetailEvents() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    const back = container.querySelector('.product-detail__back');
    if (back) back.onclick = () => { history.back(); };
}

function ensureProductDetailLoaded() {
    const container = document.getElementById('product-detail-container');
    if (!container) return Promise.resolve(false);
    if (container.querySelector('.product-detail')) return Promise.resolve(true);
    // attempt to fetch if not present
    return fetch('components/product-detail.html')
        .then(r => r.text())
        .then(html => { container.innerHTML = html; return true; })
        .catch(() => false);
}

function showSection(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
}

function setupHashRouting(initialLang) {
    // Prefer content-config helpers; keep minimal fallback for robustness
    const fallbackCategoryComponents = {
        'conditioners': 'components/category-conditioners.html',
        'commercial-ac': 'components/category-commercial-ac.html',
        'multi-split': 'components/category-multi-split.html',
        'indoor-units': 'components/category-indoor-units.html',
        'outdoor-units': 'components/category-outdoor-units.html',
        'mobile-ac': 'components/category-mobile-ac.html',
        'fan-coils': 'components/category-fan-coils.html',
        'humidifiers': 'components/category-humidifiers.html',
        'air-purifiers': 'components/category-air-purifiers.html',
        'dehumidifiers': 'components/category-dehumidifiers.html',
        'controllers': 'components/category-controllers.html',
        'heat-pumps': 'components/category-heat-pumps.html',
        'electric-heaters': 'components/category-electric-heaters.html',
        'accessories': 'components/category-accessories.html'
    };

    function handleRoute() {
        const hash = location.hash || '';
        
        // Check for category hash pattern
        const categoryMatch = hash.match(/^#category-(.+)$/);
        if (categoryMatch) {
            const categorySlug = categoryMatch[1];
            const componentPath = (typeof window !== 'undefined' && typeof window.getComponentBySlug === 'function')
                ? (window.getComponentBySlug(categorySlug) || fallbackCategoryComponents[categorySlug])
                : fallbackCategoryComponents[categorySlug];
            if (componentPath) {
                loadComponent('main-container', componentPath).then(() => {
                    // Hide other sections and show the category page
                    showSection('hero-container', false);
                    showSection('services-container', false);
                    showSection('products-container', false);
                    showSection('portfolio-container', false);
                    showSection('contacts-container', false);
                    showSection('product-detail-container', false);
                    showSection('main-container', true); // Make sure main-container is visible
                    
                    // Render category products with filters from URL
                    const lang = getLangSafe();
                    const urlParams = new URLSearchParams(window.location.hash.substring(1));
                    const sortBy = urlParams.get('sort') || 'default';
                    const priceFilter = urlParams.get('price') || 'all';
                    const page = parseInt(urlParams.get('page')) || 1;
                    
                    renderCategoryProducts(categorySlug, lang, translations, sortBy, priceFilter, page);
                    
                    // Initialize category controls with delay to ensure DOM is ready
                    setTimeout(() => {
                        initCategoryControls();
                        
                        // Update filter selectors to match URL params
                        const sortSelect = document.getElementById('category-sort-select');
                        const priceSelect = document.getElementById('category-price-filter');
                        if (sortSelect) sortSelect.value = sortBy;
                        if (priceSelect) priceSelect.value = priceFilter;
                    }, 100);
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }).catch(error => {
                    console.error('Error loading category component:', error);
                });
                return;
            }
        }
        
    const m = hash.match(/^#product-(.+)$/);
        if (m) {
            const pid = m[1];
            ensureProductDetailLoaded().then(ok => {
                if (!ok) return;
                // toggle visibility
                showSection('hero-container', false);
                showSection('services-container', false);
                showSection('products-container', false);
                showSection('portfolio-container', false);
                showSection('contacts-container', false);
                showSection('product-detail-container', true);
                renderProductDetail(pid);
                bindProductDetailEvents();
            });
    } else if (hash === '#products') {
            // Show products section
            showSection('hero-container', true);
            showSection('services-container', true);
            showSection('products-container', true);
            showSection('portfolio-container', true);
            showSection('contacts-container', true);
            showSection('product-detail-container', false);
            showSection('main-container', false);
            
            // Scroll to products section
            const productsSection = document.querySelector('#products-container');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (hash === '#admin/products') {
            // Load Admin Products page
            loadComponent('admin-page-container', 'components/admin-products.html').then(async () => {
                // Hide other sections, show admin
                showSection('hero-container', false);
                showSection('services-container', false);
                showSection('products-container', false);
                showSection('portfolio-container', false);
                showSection('contacts-container', false);
                showSection('product-detail-container', false);
                showSection('main-container', false);
                showSection('admin-page-container', true);
                try {
                    const mod = await import('./admin-page.js');
                    if (mod && typeof mod.initAdminPage === 'function') {
                        const lang = getLangSafe();
                        await mod.initAdminPage(translations, lang);
                    }
                } catch (e) { console.error('Admin page init error', e); }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }).catch(err => console.error('Error loading admin page component:', err));
        } else {
            // Show main sections
            showSection('hero-container', true);
            showSection('services-container', true);
            showSection('products-container', true);
            showSection('portfolio-container', true);
            showSection('contacts-container', true);
            showSection('product-detail-container', false);
            showSection('admin-page-container', false);
            showSection('main-container', false);
            // Restore title via i18n
            const lang = getLangSafe();
            if (typeof switchLanguage === 'function') switchLanguage(lang);
            // Восстанавливаем дефолтные мета/OG
            restoreDefaultMetaOg();
        }
    }
    window.addEventListener('hashchange', () => { handleRoute(); try { initMarketing(); } catch {} });
    // language change should refresh detail contents
    window.addEventListener('languagechange', () => {
        const hash = location.hash || '';
        const m = hash.match(/^#product-(.+)$/);
        if (m) {
            renderProductDetail(m[1]);
        } else {
            // обновим OG title под текущий заголовок сайта
            try { setOgTitle(document.title); setTwitterTitle(document.title); } catch {}
        }
        try { initMarketing(); } catch {}
    });
    // initial route
    handleRoute();
}

function bindProductCardNavigation() {
    const grid = document.querySelector('.products__grid');
    if (!grid) return;
    // Already delegated in DOMContentLoaded, but rebind for safety after re-renders
    // No-op here: kept for potential future enhancements
}

// Ненавязчивый тост по активации нового SW
function showUpdateToast() {
    // Используем общий механизм тостов и i18n
    const message = translateKey('toast-update-installed');
    // Короткое авто‑скрытие, без действий — просто уведомление
    showActionToast({ message: message || 'Обновление установлено', type: 'success', duration: 2400 });
}

// ====== SEO/OG/Twitter helpers ======
function upsertMeta(attr, name, content) {
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute('content', content);
}
function setOgTitle(v){ upsertMeta('property','og:title', v); }
function setOgDescription(v){ upsertMeta('property','og:description', v); }
function setOgUrl(v){ upsertMeta('property','og:url', v); }
function setOgImage(v){ upsertMeta('property','og:image', v); }
function setTwitterTitle(v){ upsertMeta('name','twitter:title', v); }
function setTwitterDescription(v){ upsertMeta('name','twitter:description', v); }
function setTwitterImage(v){ upsertMeta('name','twitter:image', v); }
function setMetaDescription(v){ upsertMeta('name','description', v); }
function restoreDefaultMetaOg(){
    const lang = getLangSafe();
    const title = translations?.[lang]?.['site-title'] || 'ClimaTech';
    const desc = 'Продажа, монтаж и обслуживание климатической техники: кондиционеры, вентиляция, рекуператоры. Консультации и быстрый монтаж.';
    setOgTitle(title); setTwitterTitle(title);
    setOgDescription(desc); setTwitterDescription(desc);
    setOgUrl(location.origin + location.pathname);
    setMetaDescription(desc);
}

// ====== Base JSON-LD (Organization/WebSite) enrichment ======
function updateBaseJsonLd(){
    const url = location.origin + '/';
    const org = document.getElementById('org-jsonld');
    if (org) {
        try {
            const data = JSON.parse(org.textContent || '{}');
            data.url = url;
            data.logo = '/icons/icon-icon512x512.png';
            org.textContent = JSON.stringify(data);
        } catch {}
    }
    const site = document.getElementById('website-jsonld');
    if (site) {
        try {
            const data = JSON.parse(site.textContent || '{}');
            data.url = url;
            data.potentialAction = {
                '@type': 'SearchAction',
                target: `${url}?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            };
            site.textContent = JSON.stringify(data);
        } catch {}
    }
}

// Helpers: image preloader for product-detail
function ensureImagePreloader(section) {
    let wrap = section.querySelector('.product-detail__image-wrap');
    if (!wrap) return;
    let spinner = wrap.querySelector('.image-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'image-spinner';
        spinner.setAttribute('aria-hidden','true');
        wrap.appendChild(spinner);
    }
}

function loadLargeImage(imgEl, src, alt) {
    const wrap = imgEl.closest('.product-detail__image-wrap');
    const spinner = wrap && wrap.querySelector('.image-spinner');
    if (spinner) spinner.style.display = 'block';
    imgEl.style.opacity = '0';
    const pre = new Image();
    pre.onload = () => {
        imgEl.src = src;
        // Responsive hints
        try {
            const url = new URL(src, location.href);
            // crude alternative sizes from known picsum pattern
            const alt1200 = src;
            const alt800 = src.replace('/1200/800','/800/533');
            const alt600 = src.replace('/1200/800','/600/400');
            imgEl.srcset = `${alt600} 600w, ${alt800} 800w, ${alt1200} 1200w`;
            imgEl.sizes = '(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 800px';
        } catch {}
        imgEl.alt = alt || '';
        imgEl.decode?.().catch(()=>{}).finally(() => {
            requestAnimationFrame(() => {
                imgEl.style.transition = 'opacity .25s ease';
                imgEl.style.opacity = '1';
                if (spinner) spinner.style.display = 'none';
                imgEl.classList.add('lqip--loaded');
            });
        });
    };
    pre.onerror = () => {
        imgEl.src = src; // fallback to broken src (onerror in global may replace)
        imgEl.alt = alt || '';
        if (spinner) spinner.style.display = 'none';
        imgEl.style.opacity = '1';
    };
    pre.src = src;
}
window.changeLogoColorScheme = changeLogoColorScheme;
window.initLogoColorScheme = initLogoColorScheme;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для загрузки логотипа
    setTimeout(initLogoColorScheme, 100);
    
    // Инициализация современных мобильных эффектов
    initModernMobileEffects();
    
    // Переинициализация мобильных эффектов при изменении размера окна
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initModernMobileEffects();
        }, 250);
    });
});

// Современные мобильные эффекты
function initModernMobileEffects() {
    // Проверяем, что это мобильное устройство
    if (window.innerWidth > 768) {
        return; // Не применяем эффекты на десктопе
    }
    
    // Добавляем микро-анимации для кнопок
    const buttons = document.querySelectorAll('.modern-button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.add('micro-bounce');
            setTimeout(() => {
                this.classList.remove('micro-bounce');
            }, 400);
        });
    });
    
    // Intersection Observer для fade-in анимаций
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('micro-fade-in');
            }
        });
    }, observerOptions);
    
    // Наблюдаем за карточками
    document.querySelectorAll('.glass-card, .soft-card').forEach(el => {
        observer.observe(el);
    });
    
    // Активная навигация для мобильных
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item[href]');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Убираем активный класс у всех
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            // Добавляем активный класс к текущему
            this.classList.add('active');
            
            // Плавная прокрутка
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Динамическое изменение цвета header при прокрутке (только на мобильных)
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 768) { // Только для мобильных
            const header = document.querySelector('.header');
            if (header) {
                if (window.scrollY > 100) {
                    header.style.backdropFilter = 'blur(20px)';
                    header.style.background = 'var(--glass-bg)';
                } else {
                    header.style.backdropFilter = 'blur(10px)';
                    header.style.background = 'var(--primary-color)';
                }
            }
        }
        lastScrollY = window.scrollY;
    });
    
    // Haptic feedback для мобильных (если поддерживается)
    if ('vibrate' in navigator && window.innerWidth <= 768) {
        document.querySelectorAll('.modern-button, .mobile-nav-item').forEach(element => {
            element.addEventListener('touchstart', () => {
                navigator.vibrate(10); // Короткая вибрация
            });
        });
    }
    
    // FAB кнопка работает на всех устройствах (без ограничения по ширине экрана)
    document.querySelectorAll('.fab').forEach(element => {
        element.addEventListener('click', () => {
            if ('vibrate' in navigator) {
                navigator.vibrate(25); // Короткая вибрация для FAB
            }
        });
    });
}

// Функция инициализации мобильного заголовка
function initMobileHeader() {
    if (mobileHeaderInitialized) {
        return;
    }
    // Поддержка как старого, так и нового хедера
    const hamburgerToggle = document.querySelector('.hamburger-toggle') || document.querySelector('.minimal-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    // Создаём overlay один раз
    let overlay = document.querySelector('.mobile-nav-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-nav-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('role', 'presentation');
        // Вставляем overlay ПЕРЕД меню, чтобы меню всегда было над ним
        if (mobileNav && mobileNav.parentNode) {
            mobileNav.parentNode.insertBefore(overlay, mobileNav);
        } else {
            document.body.appendChild(overlay);
        }
    }

    // Если .mobile-nav вложено в элемент с transform/filter (собственный stacking context), переносим меню в body
    if (mobileNav && mobileNav.parentElement !== document.body) {
        document.body.appendChild(mobileNav);
    }
    // Гарантируем, что overlay и меню находятся в body и overlay стоит непосредственно перед меню
    if (overlay && overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
    }
    if (mobileNav && mobileNav.parentElement === document.body && overlay && overlay.parentElement === document.body) {
        if (overlay.nextSibling !== mobileNav) {
            document.body.insertBefore(overlay, mobileNav);
        }
    }
    const mobileNavLinks = document.querySelectorAll('.mobile-nav__link');
    const mobileProfileButton = document.querySelector('.mobile-nav__profile');
    const mobileNavCloseBtn = document.querySelector('.mobile-nav__close');

    if (!hamburgerToggle || !mobileNav) {
        console.log('Мобильный заголовок не найден');
        return;
    }

    mobileHeaderInitialized = true;

    // Инициализация доступности: запрещаем фокус на скрытых элементах
    const focusableElements = mobileNav.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    focusableElements.forEach(el => {
        el.setAttribute('tabindex', '-1');
    });

    // Overlay удалён — клики вне меню больше не перехватываются искусственно.

    // Функция открытия/закрытия мобильного меню
    let __navDrag = null;
    let __navEdgeOpen = null; // edge-swipe open (правый край, верхняя половина)

    function toggleMobileNav(open = null) {
        const isOpen = open !== null ? open : !mobileNav.classList.contains('active');
        const focusableElements = mobileNav.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        
        if (isOpen) {
            hamburgerToggle.classList.add('active');
            mobileNav.classList.add('active');
            // Overlay удалён — фон не затемняется.
            document.body.style.overflow = 'hidden'; // Блокируем прокрутку
            hamburgerToggle.setAttribute('aria-expanded', 'true');
            mobileNav.setAttribute('aria-hidden', 'false');
            // Показ overlay
            overlay.classList.add('is-visible');
            
            // Разрешаем фокус на элементах меню
            focusableElements.forEach(el => {
                el.removeAttribute('tabindex');
            });

            // Жест свайпа для закрытия мобильного меню
            attachMobileNavGestures();
        } else {
            hamburgerToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            // Overlay отсутствует — ничего не скрываем.
            document.body.style.overflow = ''; // Разблокируем прокрутку
            hamburgerToggle.setAttribute('aria-expanded', 'false');
            mobileNav.setAttribute('aria-hidden', 'true');
            // Скрываем overlay
            overlay.classList.remove('is-visible');
            
            // Запрещаем фокус на элементах меню
            focusableElements.forEach(el => {
                el.setAttribute('tabindex', '-1');
            });

            // Снимаем жесты и сбрасываем возможный transform
            detachMobileNavGestures();
            mobileNav.style.transform = '';
        }
    }

    // Обработчик клика по гамбургеру
    hamburgerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMobileNav();
        
        // Добавляем тактильную обратную связь
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });

    // Клик по overlay — закрываем меню
    overlay.addEventListener('click', () => toggleMobileNav(false));

    // Клик по крестику — закрываем меню
    if (mobileNavCloseBtn) {
        mobileNavCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileNav(false);
        });
    }

    // Делегирование: закрываем меню только если реально переходим в другую секцию
    // Конфигурация поведения закрытия (глобальная для возможности изменения динамически)
    if (!window.mobileNavCloseConfig) {
        window.mobileNavCloseConfig = {
            sameSectionThreshold: 60,   // px: если секция уже почти в зоне — не закрывать
            delay: 120,                 // ms: лёгкая задержка закрытия для плавного UX
            closeOnSameSection: false,  // закрывать ли если уже на месте
            ignoreSelectors: ['.mobile-settings'], // области, в пределах которых не закрывать
            attributeKeepOpen: 'data-keep-open',
            classKeepOpen: 'keep-open',
            // Подготовка к edge-swipe (позже)
            enableEdgeSwipe: false
        };
    }

    if (!window.setMobileNavCloseConfig) {
        window.setMobileNavCloseConfig = (partial) => {
            window.mobileNavCloseConfig = { ...window.mobileNavCloseConfig, ...partial };
        };
    }

    mobileNav.addEventListener('click', (e) => {
        const cfg = window.mobileNavCloseConfig;
        const link = e.target.closest('.mobile-nav__link');
        if (!link) return;

        // 1. Атрибут или класс удержания
        if (link.hasAttribute(cfg.attributeKeepOpen) || link.classList.contains(cfg.classKeepOpen)) return;
        // 2. Нахождение внутри игнорируемой области
        if (cfg.ignoreSelectors.some(sel => link.closest(sel))) return;

        let shouldClose = true;
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#') && href.length > 1) {
            const target = document.querySelector(href);
            if (target) {
                const rect = target.getBoundingClientRect();
                const nearTop = Math.abs(rect.top) < cfg.sameSectionThreshold;
                if (nearTop && !cfg.closeOnSameSection) {
                    shouldClose = false;
                }
            }
        }

        if (!shouldClose) return;

        const performClose = () => {
            toggleMobileNav(false);
            link.style.transform = 'scale(0.95)';
            setTimeout(() => { link.style.transform = ''; }, 150);
        };

        if (cfg.delay > 0) {
            setTimeout(performClose, cfg.delay);
        } else {
            performClose();
        }
    });

    // Обработчик мобильного профиля
    if (mobileProfileButton) {
        mobileProfileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileNav(false);
            
            // Открываем модальное окно профиля (используем существующую функцию)
            if (typeof openModal === 'function' && typeof translations !== 'undefined' && typeof savedLanguage !== 'undefined') {
                openModal(translations, savedLanguage);
            }
        });
    }

    // Закрытие меню по клавише Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            toggleMobileNav(false);
            hamburgerToggle.focus(); // Возвращаем фокус на кнопку
        }
    });

    // Улучшенная навигация по клавиатуре в меню
    mobileNav.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const focusableElements = mobileNav.querySelectorAll('a:not([tabindex="-1"]), button:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });

    // Инициализация тоглов в мобильном хедере
    initMobileToggles();

    // Закрытие меню при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            toggleMobileNav(false);
        }
    });

    // Эффект прокрутки для мобильного заголовка
    let lastScrollTop = 0;
    const mobileHeader = document.querySelector('.header__mobile');
    
    if (mobileHeader) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 10) {
                mobileHeader.classList.add('scrolled');
            } else {
                mobileHeader.classList.remove('scrolled');
            }
            
            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    console.log('Мобильный заголовок инициализирован');

    // ——— helpers: жесты свайп‑to‑close для меню ———
    // Глобальный конфиг жестов (настраиваемый)
    const G = (window.gesturesConfig = { ...defaultGesturesConfig, ...(window.gesturesConfig || {}) });

    function attachMobileNavGestures() {
        if (__navDrag) return;
        const state = {
            active: false,
            startX: 0,
            startY: 0,
            dx: 0,
            dy: 0,
            moved: false,
            allow: false,
            samples: [] // {t, dx}
        };
    const maxAngle = G.angleMax; // градусы
    const threshold = G.startThreshold; // px
    const closeThreshold = Math.max(80, Math.floor((window.innerWidth || 360) * G.closeThresholdRatio));

        const onStart = (evt) => {
            if (!mobileNav.classList.contains('active')) return;
            const p = getPoint(evt);
            state.startX = p.x; state.startY = p.y;
            state.dx = 0; state.dy = 0; state.moved = false; state.allow = false; state.active = true;
            state.samples = [];
            mobileNav.style.transition = 'none';
        };
        const onMove = (evt) => {
            if (!state.active) return;
            const p = getPoint(evt);
            state.dx = p.x - state.startX;
            state.dy = p.y - state.startY;
            if (!state.moved) {
                const absDx = Math.abs(state.dx);
                const absDy = Math.abs(state.dy);
                if (absDx < threshold && absDy < threshold) return;
                const angle = Math.atan2(absDy, absDx) * 180 / Math.PI;
                if (angle > maxAngle) { // вертикально — не перехватываем
                    cancel();
                    return;
                }
                // Закрываем жестом вправо (dx > 0)
                if (state.dx <= 0) { // двигается влево — игнорируем
                    cancel();
                    return;
                }
                state.allow = true;
                state.moved = true;
            }
            if (!state.allow) return;
            const translate = Math.max(0, state.dx);
            mobileNav.style.transform = `translateX(${translate}px)`;
            // пишем сэмпл для вычисления скорости
            const now = Date.now();
            state.samples.push({ t: now, dx: state.dx });
            // чистим старые
            const cutoff = now - G.flingWindowMs;
            while (state.samples.length && state.samples[0].t < cutoff) state.samples.shift();
            evt.preventDefault();
        };
        const onEnd = () => {
            if (!state.active) return;
            state.active = false;
            mobileNav.style.transition = '';
            // скорость за последнее окно
            const sLen = state.samples.length;
            let fast = false;
            if (sLen >= 2) {
                const first = state.samples[0];
                const last = state.samples[sLen - 1];
                const dt = Math.max(1, last.t - first.t);
                const v = (last.dx - first.dx) / dt; // px/ms (dx растёт вправо)
                fast = v > G.flingVelocity; // быстрый флик вправо
            }
            const applied = extractTranslateX(mobileNav);
            if (applied >= closeThreshold || fast) {
                mobileNav.style.transform = '';
                toggleMobileNav(false);
                try { navigator.vibrate && navigator.vibrate(10); } catch(_) {}
            } else {
                // spring-back
                mobileNav.style.transition = `transform ${G.springBackDuration}ms ease-out`;
                mobileNav.style.transform = '';
            }
        };
        const cancel = () => {
            state.active = false;
            mobileNav.style.transition = '';
            mobileNav.style.transform = '';
        };

        const bound = { start: onStart, move: onMove, end: onEnd };
        mobileNav.addEventListener('touchstart', bound.start, { passive: true });
        mobileNav.addEventListener('touchmove', bound.move, { passive: false });
        mobileNav.addEventListener('touchend', bound.end, { passive: true });
        mobileNav.addEventListener('pointerdown', bound.start, { passive: true });
        window.addEventListener('pointermove', bound.move, { passive: false });
        window.addEventListener('pointerup', bound.end, { passive: true });
        __navDrag = { bound };
    }

    function detachMobileNavGestures() {
        if (!__navDrag) return;
        const { bound } = __navDrag;
        try {
            mobileNav.removeEventListener('touchstart', bound.start);
            mobileNav.removeEventListener('touchmove', bound.move);
            mobileNav.removeEventListener('touchend', bound.end);
            mobileNav.removeEventListener('pointerdown', bound.start);
            window.removeEventListener('pointermove', bound.move);
            window.removeEventListener('pointerup', bound.end);
        } catch(_) {}
        __navDrag = null;
    }

    function getPoint(evt) {
        if (evt.touches && evt.touches[0]) return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
        return { x: evt.clientX, y: evt.clientY };
    }

    function extractTranslateX(el) {
        try {
            const st = window.getComputedStyle(el);
            const tr = st.transform || st.webkitTransform || 'none';
            if (tr === 'none') return 0;
            const m = tr.match(/matrix\(([^)]+)\)/) || tr.match(/matrix\d?\(([^)]+)\)/);
            if (m && m[1]) {
                const parts = m[1].split(',').map(parseFloat);
                return parts[4] || 0; // tx
            }
        } catch (_) { /* ignore */ }
        return 0;
    }

    // Edge‑swipe open для мобильного меню (правый край, верхняя половина экрана)
    function enableMobileNavEdgeSwipeOpen() {
        if (__navEdgeOpen) return;
        const state = {
            active: false,
            startX: 0,
            startY: 0,
            dx: 0,
            dy: 0,
            moved: false,
            allow: false,
        };
    const EDGE = 18; // px от правого края
    const threshold = Math.max(6, G.startThreshold + 2); // немного выше, чем у закрытия
    const maxAngle = G.angleMax; // градусы (фильтрация вертикали)
    const openFraction = G.openThresholdRatio; // доля ширины

        const onDown = (evt) => {
            // Только мобильный, меню закрыто, верхняя половина экрана
            if (window.innerWidth > 768) return;
            if (mobileNav.classList.contains('active')) return;
            const p = getPoint(evt);
            const vw = window.innerWidth || 360;
            const vh = window.innerHeight || 640;
            const distRight = vw - p.x;
            if (distRight > EDGE) return;
            if (p.y > vh * 0.5) return; // нижняя половина отдана под корзину
            state.active = true;
            state.startX = p.x; state.startY = p.y;
            state.dx = 0; state.dy = 0; state.moved = false; state.allow = false;
            // подготовка панели и overlay
            overlay.classList.add('is-visible');
            // интерактивное появление меню справа
            mobileNav.style.transition = 'none';
            mobileNav.style.transform = `translateX(${vw}px)`;
        };

        const onMove = (evt) => {
            if (!state.active) return;
            const p = getPoint(evt);
            state.dx = p.x - state.startX;
            state.dy = p.y - state.startY;
            if (!state.moved) {
                const absDx = Math.abs(state.dx), absDy = Math.abs(state.dy);
                if (absDx < threshold && absDy < threshold) return;
                const angle = Math.atan2(absDy, absDx) * 180 / Math.PI;
                if (angle > maxAngle) { // вертикальный жест — отмена
                    return cancelInteractive();
                }
                // Для открытия — движение влево (dx < 0)
                if (state.dx >= 0) {
                    return cancelInteractive();
                }
                state.allow = true;
                state.moved = true;
            }
            if (!state.allow) return;
            const vw = window.innerWidth || 360;
            const progress = Math.min(vw, Math.max(0, -state.dx));
            mobileNav.style.transform = `translateX(${vw - progress}px)`;
            evt.preventDefault();
        };

        const onUp = () => {
            if (!state.active) return;
            const vw = window.innerWidth || 360;
            const progress = Math.min(vw, Math.max(0, -state.dx));
            mobileNav.style.transition = '';
            mobileNav.style.transform = '';
            const needOpen = progress >= vw * openFraction;
            state.active = false;
            if (needOpen) {
                // Доверим открытие штатной функции (фокус/aria/lock)
                toggleMobileNav(true);
                try { navigator.vibrate && navigator.vibrate(10); } catch(_) {}
            } else {
                // Spring-back при недотянутом жесте
                mobileNav.style.transition = `transform ${G.springBackDuration}ms ease-out`;
                mobileNav.style.transform = '';
                setTimeout(() => overlay.classList.remove('is-visible'), G.springBackDuration);
            }
        };

        const cancelInteractive = () => {
            if (!state.active) return;
            state.active = false;
            mobileNav.style.transition = '';
            mobileNav.style.transform = '';
            overlay.classList.remove('is-visible');
        };

        const bound = { down: onDown, move: onMove, up: onUp, cancel: cancelInteractive };
        window.addEventListener('touchstart', bound.down, { passive: true });
        window.addEventListener('touchmove', bound.move, { passive: false });
        window.addEventListener('touchend', bound.up, { passive: true });
        window.addEventListener('pointerdown', bound.down, { passive: true });
        window.addEventListener('pointermove', bound.move, { passive: false });
        window.addEventListener('pointerup', bound.up, { passive: true });
        __navEdgeOpen = { bound };
    }

    function disableMobileNavEdgeSwipeOpen() {
        if (!__navEdgeOpen) return;
        const { bound } = __navEdgeOpen;
        window.removeEventListener('touchstart', bound.down);
        window.removeEventListener('touchmove', bound.move);
        window.removeEventListener('touchend', bound.up);
        window.removeEventListener('pointerdown', bound.down);
        window.removeEventListener('pointermove', bound.move);
        window.removeEventListener('pointerup', bound.up);
        __navEdgeOpen = null;
    }

    // Автовключение edge‑swipe в мобильном режиме
    const applyEdgeSwipe = () => {
        if (window.innerWidth <= 768) enableMobileNavEdgeSwipeOpen();
        else disableMobileNavEdgeSwipeOpen();
    };
    applyEdgeSwipe();
    window.addEventListener('resize', () => {
        clearTimeout(applyEdgeSwipe.__t);
        applyEdgeSwipe.__t = setTimeout(applyEdgeSwipe, 150);
    }, { passive: true });
}

// Функция инициализации мобильных тоглов
function initMobileToggles() {
    const compactThemeToggle = document.getElementById('mobileThemeToggle');
    const compactCartButton = document.getElementById('mobileCartButton');
    const compactLangChips = document.querySelectorAll('.mobile-settings__lang .lang-chip');
    const savedLang = localStorage.getItem('language') || 'ru';

    // Тема
    if (compactThemeToggle) {
        compactThemeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof toggleTheme === 'function') toggleTheme();
            if (navigator.vibrate) navigator.vibrate(30);
        });
        // Установка первоначальных aria
        const isLight = document.body.classList.contains('light-theme');
        compactThemeToggle.setAttribute('aria-label', isLight ? 'Переключить на темную тему' : 'Переключить на светлую тему');
        compactThemeToggle.setAttribute('aria-pressed', isLight);
    }

    // Языковые чипы
    if (compactLangChips.length) {
        compactLangChips.forEach(chip => {
            const lang = chip.getAttribute('data-lang');
            chip.classList.toggle('active', lang === savedLang);
            chip.setAttribute('aria-pressed', lang === savedLang);
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetLang = chip.getAttribute('data-lang');
                if (typeof switchLanguage === 'function') switchLanguage(targetLang);
                compactLangChips.forEach(c => {
                    const isActive = c === chip;
                    c.classList.toggle('active', isActive);
                    c.setAttribute('aria-pressed', isActive);
                });
                if (navigator.vibrate) navigator.vibrate(25);
            });
        });
    }

    // Корзина
    if (compactCartButton) {
        compactCartButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof openCartModal === 'function') openCartModal(e);
            if (navigator.vibrate) navigator.vibrate(20);
        });
    }

    // Слушатели глобальных событий
    window.addEventListener('themechange', (e) => {
        const theme = e.detail?.theme || (document.body.classList.contains('light-theme') ? 'light' : 'dark');
        if (compactThemeToggle) {
            const label = theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему';
            compactThemeToggle.setAttribute('aria-label', label);
            compactThemeToggle.setAttribute('aria-pressed', theme === 'light');
        }
    });

    window.addEventListener('languagechange', (e) => {
        const lang = e.detail?.lang || localStorage.getItem('language') || 'ru';
        compactLangChips.forEach(chip => {
            const isActive = chip.getAttribute('data-lang') === lang;
            chip.classList.toggle('active', isActive);
            chip.setAttribute('aria-pressed', isActive);
        });
    });

    console.log('Мобильные тоглы инициализированы (compact mode)');
}

// Экспорт функций
window.initModernMobileEffects = initModernMobileEffects;
window.initMobileHeader = initMobileHeader;
window.initMobileToggles = initMobileToggles;

// Десктопный хедер: прячем верхнюю полосу при прокрутке
function initDesktopHeaderCondense() {
    const header = document.querySelector('.header');
    if (!header) return;
    const topBar = header.querySelector('.header__top-bar');
    const container = header.querySelector('.header__container');
    let ticking = false;
    let fixedApplied = false;
    let spacer = null;
    let condensed = false;
    let lastSpacerHeight = 0;

    // Проверка/починка sticky: если родитель создаёт контекст (overflow/transform), включаем фиксированный режим
    const ensureStickyOrFixed = () => {
        const isDesktop = window.innerWidth >= 769;
        if (!isDesktop) {
            if (fixedApplied) {
                header.classList.remove('header--fixed');
                if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
                spacer = null;
                fixedApplied = false;
            }
            return;
        }
        // Определяем, не ломается ли sticky из-за трансформаций/фильтров/контекста у предков
        const breaksSticky = (() => {
            let node = header.parentElement;
            while (node && node !== document.body) {
                const cs = getComputedStyle(node);
                const hasTransform = cs.transform !== 'none' || cs.perspective !== 'none';
                const hasFilter = (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none');
                // Некоторые браузеры ломают sticky при contain: paint/layout
                const hasContain = cs.contain && cs.contain.includes('paint');
                if (hasTransform || hasFilter || hasContain) return true;
                node = node.parentElement;
            }
            return false;
        })();
        // Дополнительная проверка: работает ли sticky фактически при скролле
        let stickyIneffective = false;
        try {
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (y > 10) {
                const top = header.getBoundingClientRect().top;
                // Если sticky работает — top ≈ 0, иначе элемент «уезжает» вверх (< 0)
                stickyIneffective = Math.abs(top) > 1; 
            }
        } catch {}

        const needFixed = breaksSticky || stickyIneffective;

        if (needFixed && !fixedApplied) {
            // Добавляем spacer, равный текущей высоте header, чтобы не прыгал контент
            spacer = document.createElement('div');
            spacer.className = 'header-spacer';
            lastSpacerHeight = header.offsetHeight;
            spacer.style.height = lastSpacerHeight + 'px';
            header.classList.add('header--fixed');
            header.parentNode.insertBefore(spacer, header.nextSibling);
            fixedApplied = true;
        } else if (!needFixed && fixedApplied) {
            header.classList.remove('header--fixed');
            if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
            spacer = null;
            fixedApplied = false;
        } else if (fixedApplied && spacer) {
            // обновляем высоту спейсера при ресайзе
            lastSpacerHeight = header.offsetHeight;
            spacer.style.height = lastSpacerHeight + 'px';
        }
    };
    // Применяем/снимаем fixed‑fallback один раз при старте и при ресайзе (не на каждом скролле, чтобы избежать миганий)
    const applyFixedDecision = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { ensureStickyOrFixed(); ticking = false; });
    };
    // Устанавливаем css-переменную высоты верхней полосы для анимации padding-top контейнера
    const updateTopBarHeightVar = () => {
        if (!topBar || !container) return;
        const h = topBar.offsetHeight || 0;
        container.style.setProperty('--topbar-h', h + 'px');
    };
    // Гладкое скрытие верхней полосы с гистерезисом (чтобы не дёргалось на границе)
    const ADD_AT = 48;   // добавить header--condensed при скролле ниже этой высоты
    const REMOVE_AT = 24; // снять при прокрутке вверх выше этой высоты
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const isDesktop = window.innerWidth >= 769;
            if (!isDesktop) { header.classList.remove('header--condensed'); condensed = false; ticking = false; return; }
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (!condensed && y > ADD_AT) { header.classList.add('header--condensed'); condensed = true; }
            else if (condensed && y < REMOVE_AT) { header.classList.remove('header--condensed'); condensed = false; }

            // Однократная проверка: если sticky не удерживает header (top заметно уходит от 0), включаем fixed‑fallback
            if (!fixedApplied && y > ADD_AT) {
                const topNow = header.getBoundingClientRect().top;
                if (Math.abs(topNow) > 1) {
                    ensureStickyOrFixed(); // применит fixed при необходимости
                }
            }

            // Если включён fixed‑fallback, поддерживаем актуальную высоту спейсера при смене высоты хедера
            if (fixedApplied && spacer) {
                const h = header.offsetHeight;
                if (h !== lastSpacerHeight) {
                    lastSpacerHeight = h;
                    spacer.style.height = h + 'px';
                }
            }
            ticking = false;
        });
    };
    window.addEventListener('scroll', () => { updateTopBarHeightVar(); onScroll(); }, { passive: true });
    window.addEventListener('resize', () => { updateTopBarHeightVar(); applyFixedDecision(); }, { passive: true });
    updateTopBarHeightVar();
    applyFixedDecision();
    onScroll();
}

// Helper functions for advanced filtering (copied from products.js)
function getProductType(product) {
    return product.type || 'wall';
}

function getProductCapacity(product) {
    return product.capacity || '9';
}

function getProductControlType(product) {
    return product.controlType || 'on-off';
}

function getProductFeatures(product) {
    return product.features || [];
}

function updateProductsCount(count) {
    const countElement = document.getElementById('productsCount');
    if (countElement) {
        countElement.textContent = count;
    }
}