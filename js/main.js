import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { initWelcomeOverlay, needsWelcomeOverlay } from './welcome.js';
import { products, renderProducts, renderProductCard, filterProducts, toggleFavorite, toggleCompare, getFavoriteIds, getCompareIds, getProductsByCategory, isFavorite, isCompared, isAdminMode, getMergedProducts, setProducts, showProductsSkeleton } from './products.js';
import { initCompareBar } from './compare-bar.js';
import { initCompareModal } from './compare-modal.js';
// content-config is loaded as a global (classic script tag)
const contentConfig = (typeof window !== 'undefined' && window.contentConfig) ? window.contentConfig : {};
import { initMarketing } from './marketing.js';
import { initNavigation } from './navigation.js';
// Landing mode: services portfolio contacts only; disable products/cart flows
const LANDING_MODE = true;

function hideProductsEntryPoints() {
    if (!LANDING_MODE) return;
    const ids = ['products-container','compare-modal-container','comparison-container','product-detail-container'];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.setAttribute('aria-hidden','true'); }
    });
    const selectors = [
        'a[href^="#category-"], a[href="#products"], a[href="#cart"]',
        '#catalogButton',
        '#catalogDropdown'
    ];
    selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
            el.style.display = 'none';
            el.setAttribute('aria-hidden','true');
            el.setAttribute('tabindex','-1');
        });
    });
}

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
            const hadGrid = containerId === 'products-container' && !!container.querySelector('.products__grid');
            container.innerHTML = html;
            if (containerId === 'products-container') {
                const exists = container.querySelector('.products__grid');
                if (!exists) {
                    const grid = document.createElement('div');
                    grid.className = 'products__grid';
                    container.appendChild(grid);
                }
            } else if (hadGrid) {
                // keep existing grid if any
            }
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

// Ensure catalog dropdown item labels match current language
function updateCatalogDropdownLabels(lang) {
    try {
        const dd = document.querySelector('#catalogDropdown');
        if (!dd) return;
        const links = dd.querySelectorAll('.catalog-dropdown__list a');
        if (!links.length || typeof window.getCategoryBySlug !== 'function') return;
        links.forEach(a => {
            const href = a.getAttribute('href') || '';
            const m = href.match(/#category-([^?#]+)/);
            const slug = m && m[1];
            if (!slug) return;
            const cat = window.getCategoryBySlug(slug);
            if (!cat || !cat.name) return;
            const name = cat.name[lang] || cat.name.uk || cat.name.ru || slug;
            a.textContent = name;
        });
    } catch(_) { /* noop */ }
}

function openCatalogDropdown({ withTrap = false } = {}) {
    const catalogDropdown = document.querySelector('#catalogDropdown');
    const catalogButton = document.querySelector('#catalogButton');
    if (!catalogDropdown || !catalogButton) return;

    // Defensive: hydrate catalog list if template was empty or stale-cached
    try {
        let ul = catalogDropdown.querySelector('.catalog-dropdown__list');
        if (!ul) {
            ul = document.createElement('ul');
            ul.className = 'catalog-dropdown__list';
            catalogDropdown.appendChild(ul);
        }
        if (!ul.children.length && typeof window.listCategories === 'function') {
            const cats = window.listCategories();
            const lang = (typeof savedLanguage === 'string' && savedLanguage) || 'uk';
            const frag = document.createDocumentFragment();
            cats.forEach(cat => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#category-${cat.slug}`;
                const name = (cat.name && (cat.name[lang] || cat.name.uk || cat.name.ru || cat.slug)) || cat.slug;
                a.textContent = name;
                li.appendChild(a);
                frag.appendChild(li);
            });
            ul.appendChild(frag);
        }
        // Always align labels to current language even if template had static UA text
        updateCatalogDropdownLabels((typeof savedLanguage === 'string' && savedLanguage) || 'uk');
    } catch (_) { /* no-op: optional hydration */ }

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
    try {
        const btns = document.querySelectorAll('#catalogButton');
        btns.forEach(b => b.setAttribute('aria-expanded', 'true'));
    } catch(_) {
        catalogButton.setAttribute('aria-expanded', 'true');
    }
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
        try {
            const btns = document.querySelectorAll('#catalogButton');
            btns.forEach(b => b.setAttribute('aria-expanded', 'false'));
        } catch(_) {
            catalogButton.setAttribute('aria-expanded', 'false');
        }
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
    const lang = localStorage.getItem('language') || localStorage.getItem('selectedLanguage') || 'uk';
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
    const fallback = ['ru', 'uk'].includes(lang) ? lang : (['ru', 'uk'].includes(storedLang) ? storedLang : 'uk');
    return (translations?.[fallback]?.['cart-added']) || (translations?.uk?.['cart-added']) || 'Додано до кошика';
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
        loadComponent('mobile-main-nav-container', 'components/mobile-main-nav.html'),
        loadComponent('services-container', 'components/services.html'),
        loadComponent('portfolio-container', 'components/portfolio.html'),
        // Service pages (separate sections)
        loadComponent('service-ac-install-container', 'components/service-ac-install.html'),
        loadComponent('service-recuperator-install-container', 'components/service-recuperator-install.html'),
        loadComponent('service-maintenance-container', 'components/service-maintenance.html'),
        loadComponent('case-1-container', 'components/case-1.html'),
        loadComponent('case-2-container', 'components/case-2.html'),
        loadComponent('case-3-container', 'components/case-3.html'),
        loadComponent('reviews-container', 'components/reviews.html'),
        loadComponent('contacts-container', 'components/contacts.html'),
        loadComponent('faq-container', 'components/faq.html'),
        ...(LANDING_MODE ? [] : [loadComponent('products-container', 'components/products.html')]),
        ...(LANDING_MODE ? [] : [loadComponent('product-detail-container', 'components/product-detail.html').catch(() => {})]),
        ...(LANDING_MODE ? [] : [loadComponent('comparison-container', 'components/compare-bar.html')]),
        ...(LANDING_MODE ? [] : [loadComponent('compare-modal-container', 'components/compare-modal.html')]),
        loadComponent('breadcrumbs-container', 'components/breadcrumbs.html'),
        loadComponent('footer-container', 'components/footer.html')
    ]);

    // Применяем тему по умолчанию (теперь светлая) и синхронизируем иконки/ARIA
    try { initTheme(); } catch(_) {}

    // Простая маршрутизация для сервисных страниц: показываем только выбранную секцию
    setupServiceRouting();

    // Делегирование кликов по карточкам услуг на переход к соответствующей странице
    initServiceCardsNavigation();
    
    // FAB для связи
    initFabContact();
    
    // Кнопка настроек (тема + язык)
    initSettingsButton();

    // Инициализация мобильного главного меню
    initMobileMainNav();

    // Cart modal open is deprecated in favor of dedicated cart page
    const openCartModalButton = document.querySelector('#openCartModal');
    if (openCartModalButton) {
        openCartModalButton.addEventListener('click', (e) => {
            e.preventDefault();
            location.hash = '#cart';
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
    if (!LANDING_MODE) {
        // Гидратируем товары локальными (LocalStorage) перед первым рендером,
        // чтобы локальные карточки не пропадали после перезагрузки
        try {
            const merged = getMergedProducts();
            setProducts(merged);
            renderProducts(savedLanguage, translations, merged);
        } catch (_) {
            // Фоллбек — рендер по базовым, если что-то пошло не так
            renderProducts(savedLanguage, translations);
        }
    }
    // In landing mode, ensure catalog/cart/product UI is hidden for clarity
    if (LANDING_MODE) {
        hideProductsEntryPoints();
    }

    // Якорная навигация со смещением фикс-хедера
    (function initAnchorScroll(){
        const getHeaderOffset = () => {
            const h = document.querySelector('.header');
            const rect = h?.getBoundingClientRect();
            const height = rect?.height || 72;
            return Math.max(0, Math.round(height));
        };
        // Синхронизация CSS-переменной для scroll-margin-top
        const syncHeaderHeightVar = () => {
            const v = getHeaderOffset();
            try { document.documentElement.style.setProperty('--header-height', v + 'px'); } catch {}
        };
        syncHeaderHeightVar();
        window.addEventListener('resize', () => { syncHeaderHeightVar(); });
        // Лёгкая периодическая синхронизация при скролле (без thrash — только чтение + одна запись)
        let rafId = 0;
        window.addEventListener('scroll', () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => { syncHeaderHeightVar(); rafId = 0; });
        }, { passive: true });
        function scrollToId(id){
            const el = document.querySelector(id);
            if (!el) return;
            const top = window.pageYOffset + el.getBoundingClientRect().top - getHeaderOffset();
            window.scrollTo({ top, behavior: 'smooth' });
        }
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const a = t.closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            if (!href || href.length < 2) return;
            e.preventDefault();
            scrollToId(href);
            history.replaceState(null, '', href);
        });
    })();

    // Remote-first: если настроен удалённый провайдер (Git‑CMS / Supabase), загружаем и перерисовываем
    try {
        const getProvider = (typeof window !== 'undefined' && window.getDataProvider) ? window.getDataProvider : null;
        const p = typeof getProvider === 'function' ? getProvider() : null;
        if (p && p.kind !== 'localStorage' && typeof p.isConfigured === 'function' && p.isConfigured()) {
            // Показать скелетоны, затем рендерить удалённые товары
            showProductsSkeleton();
            const remoteList = await p.loadAll();
            if (Array.isArray(remoteList) && remoteList.length >= 0) {
                setProducts(remoteList);
                renderProducts(savedLanguage, translations, remoteList);
            }
        }
    } catch (e) {
        console.warn('Remote provider load failed, keeping local/merged products', e);
    }
    if (!LANDING_MODE) {
        initCompareBar(savedLanguage);
        initCompareModal(savedLanguage);
        initCollectionBadges();
    }

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
    if (!LANDING_MODE) {
        bindProductCardNavigation();
    }

    // Админ-модуль больше не загружаем на главной; он подгружается только при переходе в #admin/products

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

    // Рендер отзывов + форма (лендинг)
    (function initLandingReviews(){
        const host = document.querySelector('#reviews .reviews__list');
        const form = document.getElementById('reviewForm');
        if (!host) return;

        const STORAGE_KEY = 'landing:reviews:v1';
        let externalReviews = [];

        function getLang(){
            return savedLanguage || (localStorage.getItem('language') || 'uk');
        }
        function getLocal(){
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []; } catch { return []; }
        }
        function setLocal(items){
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
        }
        function normText(t){ return typeof t === 'string' ? t : ((t?.ru) || (t?.uk) || ''); }
        function makeKey(item){
            const n = (item.name||'').trim().toLowerCase();
            const r = Number(item.rating)||0;
            const txt = normText(item.text).trim().toLowerCase();
            return `${n}__${r}__${txt}`;
        }
        function mergeLists(){
            const base = Array.isArray(contentConfig.reviews) ? contentConfig.reviews : [];
            const ext = Array.isArray(externalReviews) ? externalReviews : [];
            const loc = getLocal();
            const map = new Map();
            [...base, ...ext, ...loc].forEach(it => {
                if (!it) return;
                // Унифицируем структуру текста
                let text = it.text;
                if (typeof text === 'string') text = { ru: text, uk: text };
                const obj = { name: it.name||'', rating: Number(it.rating)||0, text: text||{ ru:'', uk:'' } };
                const key = makeKey(obj);
                if (!map.has(key)) map.set(key, obj);
            });
            return Array.from(map.values());
        }

        function render(){
            const lang = getLang();
            const list = mergeLists();
            host.innerHTML = '';
            if (!list.length) {
                const empty = document.createElement('p');
                empty.setAttribute('data-i18n','reviews-empty');
                empty.textContent = (translations?.[lang]?.['reviews-empty']) || 'Пока нет отзывов';
                host.appendChild(empty);
                return;
            }
            const frag = document.createDocumentFragment();
            list.forEach(item => {
                const card = document.createElement('article');
                card.className = 'card review-card';
                card.setAttribute('role', 'listitem');
                card.setAttribute('tabindex', '0');
                const name = document.createElement('div');
                name.className = 'review-card__name';
                name.textContent = item.name || '';
                const text = document.createElement('div');
                text.className = 'review-card__text';
                const t = (item.text && (item.text[lang] || item.text.ru)) || '';
                text.textContent = t;
                const stars = document.createElement('div');
                stars.className = 'review-card__stars';
                const v = Number(item.rating) || 0;
                stars.innerHTML = renderStarsHTML ? renderStarsHTML(v) : '';
                card.appendChild(name);
                card.appendChild(stars);
                card.appendChild(text);
                frag.appendChild(card);
            });
            host.appendChild(frag);
        }

        // Загрузка внешних отзывов (опционально)
        (async function loadExternal(){
            try {
                const url = (contentConfig && typeof contentConfig.reviewsUrl === 'string') ? contentConfig.reviewsUrl : '';
                if (url) {
                    const res = await fetch(url, { cache: 'no-store' });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) externalReviews = data;
                    }
                }
            } catch {}
            render();
        })();

        // Привязка формы
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const lang = getLang();
                const nameInput = form.querySelector('#reviewName');
                const ratingInput = form.querySelector('#reviewRating');
                const textInput = form.querySelector('#reviewText');
                const status = form.querySelector('.form-status');

                const name = String(nameInput?.value||'').trim();
                const rating = Number(ratingInput?.value||'5');
                const text = String(textInput?.value||'').trim();
                if (name.length < 2 || text.length < 4) {
                    if (status) status.textContent = (translations?.[lang]?.['reviews-form-error']) || 'Заполните все поля корректно.';
                    return;
                }
                if (status) status.textContent = (translations?.[lang]?.['form-sending']) || 'Отправляем...';
                const items = getLocal();
                const entry = { name, rating, text: { ru: text, uk: text }, createdAt: new Date().toISOString() };
                items.unshift(entry);
                setLocal(items);
                // Reset only message to encourage multiple reviews
                if (textInput) textInput.value = '';
                render();
                if (status) {
                    status.textContent = (translations?.[lang]?.['reviews-form-success']) || 'Спасибо! Отзыв отправлен.';
                    setTimeout(()=>{ if (status.textContent) status.textContent = ''; }, 1800);
                }
            });
        }

        // Перерисовка при смене языка
        if (typeof window !== 'undefined') {
            window.addEventListener('languagechange', () => render());
        }
    })();

    // Рендер FAQ из contentConfig
    ;(function renderFAQ(){
        const host = document.querySelector('#faq .faq__list');
        if (!host) return;
        const list = Array.isArray(contentConfig.faq) ? contentConfig.faq : [];
        const lang = savedLanguage || (localStorage.getItem('language') || 'uk');
        host.innerHTML = '';
        if (!list.length) {
            const empty = document.createElement('p');
            empty.setAttribute('data-i18n','faq-empty');
            empty.textContent = (translations?.[lang]?.['faq-empty']) || 'Нет вопросов';
            host.appendChild(empty);
            return;
        }
        const frag = document.createDocumentFragment();
        list.forEach(item => {
            const wrap = document.createElement('details');
            wrap.className = 'faq-item';
            const sum = document.createElement('summary');
            sum.className = 'faq-item__q';
            sum.textContent = (item.q && (item.q[lang] || item.q.ru)) || '';
            const ans = document.createElement('div');
            ans.className = 'faq-item__a';
            ans.textContent = (item.a && (item.a[lang] || item.a.ru)) || '';
            wrap.setAttribute('role','listitem');
            sum.setAttribute('tabindex','0');
            wrap.appendChild(sum);
            wrap.appendChild(ans);
            frag.appendChild(wrap);
        });
        host.appendChild(frag);
    })();

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

    // Fallback делегирование для кнопки каталога: гарантирует открытие даже если
    // прямой обработчик не успел повеситься из-за гонки рендера в тестовой среде.
    // Прямая привязка выше вызывает stopPropagation, поэтому дубля не будет.
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const catalogBtn = t.closest('#catalogButton');
        if (catalogBtn) {
            toggleCatalogDropdown(e);
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
        // Click toggles dropdown (hover disabled per UX change)
        catalogButton.addEventListener('click', (e) => {
            const useTrap = catalogA11yConfig.tabBehavior === 'trap';
            // For toggleCatalogDropdown we decide inside based on config
            toggleCatalogDropdown(e);
        });
        
        document.addEventListener('click', (e) => {
            const isOnButton = e && e.target && e.target.closest ? e.target.closest('#catalogButton') : null;
            if (!catalogDropdown.contains(e.target) && !isOnButton) {
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
            if (!searchDropdown.contains(e.target) && (!searchInput || !searchInput.contains(e.target))) {
                searchDropdown.classList.remove('search-dropdown--open');
            }
        });
    }

    // Обработчики темы подключаются через делегирование ниже

    // Лёгкая навигация по кнопке Admin: без загрузки админ-кода на главной
    // При клике вне админ-маршрута просто переходим на #admin/products.
    // На самой админ-странице этим занимается модуль admin-products.js (мы не мешаем).
    const adminToggle = document.getElementById('adminToggleBtn');
    if (adminToggle) {
        adminToggle.addEventListener('click', (e) => {
            if (location.hash !== '#admin/products') {
                e.preventDefault();
                location.hash = '#admin/products';
            }
        });
    }

    // Обработчик редактирования с карточек убран по запросу: правки будут в редакторе.

    if (!LANDING_MODE) {
        const checkoutButton = document.querySelector('.cart-button--checkout');
        if (checkoutButton) checkoutButton.addEventListener('click', () => { location.hash = '#cart'; });
        const clearCartButton = document.querySelector('.cart-button--clear');
        if (clearCartButton) clearCartButton.addEventListener('click', () => {
            clearCart();
            updateCartUI(translations, savedLanguage);
        });
    }

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

    if (!LANDING_MODE) {
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

    if (!LANDING_MODE) {
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

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));
    }

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

    // PWA Install Prompt
    initPWAInstallPrompt();

    // Обновляем базовый JSON-LD WebSite/Organization (url + SearchAction) после загрузки
    try { updateBaseJsonLd(); } catch {}

    // Hero image loading is disabled; no LQIP handling needed
};

// Простейшие хлебные крошки для кейсов портфолио
(function initBreadcrumbs(){
    const host = document.getElementById('breadcrumbs');
    if (!host) return;
    function update(){
        const h = location.hash || '';
        const m = h.match(/^#case-(\d+)/);
        if (m) {
            host.hidden = false;
            const cur = host.querySelector('#breadcrumb-current');
            if (cur) cur.textContent = `Кейс ${m[1]}`;
        } else {
            host.hidden = true;
        }
    }
    update();
    window.addEventListener('hashchange', update);
})();


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

function setupServiceRouting() {
    const SERVICE_MAP = {
        'service-ac-install': 'service-ac-install-container',
        'service-recuperator-install': 'service-recuperator-install-container',
        'service-maintenance': 'service-maintenance-container'
    };
    const LANDING_CONTAINERS = [
        'hero-container',
        'mobile-main-nav-container',
        'services-container',
        'portfolio-container',
        'reviews-container',
        'faq-container',
        'contacts-container',
        'breadcrumbs-container',
        'welcome-container'
    ];
    const CASE_CONTAINERS = [
        'case-1-container',
        'case-2-container',
        'case-3-container'
    ];
    const CASE_HASHES = ['case-1','case-2','case-3'];

    function setHiddenById(id, hidden) {
        const el = document.getElementById(id);
        if (!el) return;
        if (hidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden');
    }

    function setActiveNav(target) {
        try {
            const links = document.querySelectorAll('.header__nav-link, .mobile-nav__link');
            links.forEach(a => a.classList.remove('active'));
            const selector = target ? `a[href="#${target}"]` : '';
            if (selector) {
                document.querySelectorAll(`.header__nav-link${selector.startsWith('a') ? selector.replace('a', '') : selector}, .mobile-nav__link${selector.startsWith('a') ? selector.replace('a', '') : selector}`).forEach(a => a.classList.add('active'));
            }
        } catch (_) { /* noop */ }
    }

    function focusSectionHeading(sectionId, headingSelector = 'h2') {
        const section = document.getElementById(sectionId);
        if (!section) return;
        const heading = section.querySelector(headingSelector);
        if (!heading) return;
        const prevTab = heading.getAttribute('tabindex');
        heading.setAttribute('tabindex', '-1');
        try { heading.focus({ preventScroll: true }); } catch(_) {}
        // вернуть исходный tabindex
        if (prevTab === null) heading.removeAttribute('tabindex'); else heading.setAttribute('tabindex', prevTab);
    }

    function scrollToSectionTop(sectionId) {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 60;
        const top = el.offsetTop - headerH;
        window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    }

    function applyRoute() {
        const hash = (location.hash || '').replace('#', '');
        const targetContainerId = SERVICE_MAP[hash];
        const isServiceView = Boolean(targetContainerId);

        // Скрыть/показать лендинговые контейнеры
        LANDING_CONTAINERS.forEach(id => setHiddenById(id, isServiceView));
        // Кейсы показываем ТОЛЬКО на страницах услуг
        CASE_CONTAINERS.forEach(id => setHiddenById(id, !isServiceView));
        // Хлебные крошки показываем только для кейсов
        setHiddenById('breadcrumbs-container', !CASE_HASHES.includes(hash));

        // По умолчанию скрыть все сервисные секции
        Object.values(SERVICE_MAP).forEach(id => setHiddenById(id, true));

        if (isServiceView) {
            // Показать только нужную сервисную секцию с анимацией
            const onlyId = targetContainerId;
            setHiddenById(onlyId, false);
            try {
                const section = document.getElementById(onlyId)?.querySelector('.service-page');
                if (section) {
                    // Сброс анимации
                    section.classList.remove('service-page--visible');
                    // В следующем кадре включить класс видимости
                    requestAnimationFrame(() => {
                        section.classList.add('service-page--visible');
                    });
                }
            } catch(_) { /* noop */ }
            scrollToSectionTop(targetContainerId);
            setActiveNav('services');
            // Фокус на заголовке страницы услуги
            focusSectionHeading(targetContainerId, 'h2');
            return;
        }

        // Якорь секции услуг или возвращение на лендинг
        if (hash === 'services') {
            LANDING_CONTAINERS.forEach(id => setHiddenById(id, false));
            // Скрыть сервисные разделы полностью
            Object.values(SERVICE_MAP).forEach(id => setHiddenById(id, true));
            // Кейсы скрываем на лендинге
            CASE_CONTAINERS.forEach(id => setHiddenById(id, true));
            // Хлебные крошки скрыть
            setHiddenById('breadcrumbs-container', true);
            scrollToSectionTop('services');
            setActiveNav('services');
            focusSectionHeading('services', 'h2');
            return;
        }

        // Прочие якоря лендинга: просто снять актив и ничего не прятать дополнительно
        setActiveNav('');
        // На главной скрываем подробные страницы услуг, показываем лендинг
        LANDING_CONTAINERS.forEach(id => setHiddenById(id, false));
        Object.values(SERVICE_MAP).forEach(id => {
            setHiddenById(id, true);
            try {
                const section = document.getElementById(id)?.querySelector('.service-page');
                if (section) section.classList.remove('service-page--visible');
            } catch(_) {}
        });
        // Кейсы скрываем на главной
        CASE_CONTAINERS.forEach(id => setHiddenById(id, true));
        // Хлебные крошки скрыть
        setHiddenById('breadcrumbs-container', true);
    }

    window.addEventListener('hashchange', applyRoute, { passive: true });
    // Применить текущий маршрут сразу
    applyRoute();

    // Обработчик для кнопки "Назад" на страницах услуг
    document.addEventListener('click', (e) => {
        if (e.target.closest('.service-page .btn.btn--ghost')) {
            e.preventDefault();
            location.hash = '';
        }
    });
}

function initServiceCardsNavigation() {
    const host = document.getElementById('services-container');
    if (!host) return;
    
    // Клик по карточке — переход на страницу услуги
    host.addEventListener('click', (e) => {
        const card = e.target.closest('.service-card[role="link"]');
        if (!card) return;
        const target = card.getAttribute('data-target');
        if (target) {
            location.hash = target;
        }
    });
    
    // Enter/Space — переход на страницу
    host.addEventListener('keydown', (e) => {
        const card = e.target.closest('.service-card[role="link"]');
        if (!card) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const target = card.getAttribute('data-target');
            if (target) location.hash = target;
        }
    }, { passive: false });
}

// FAB (Floating Action Button) — раскрытие/скрытие кнопок связи
function initFabContact() {
    // Инициализируем ВСЕ FAB контейнеры на странице (в services.html и в index.html)
    const fabContainers = document.querySelectorAll('.fab-container');
    if (!fabContainers.length) return;
    
    const floatingButtons = document.querySelector('.floating-buttons');
    
    fabContainers.forEach(fab => {
        const trigger = fab.querySelector('.fab-trigger');
        const actions = fab.querySelector('.fab-actions');
        if (!trigger || !actions) return;
        
        // Проверяем, не инициализирован ли уже
        if (fab.dataset.fabInit) return;
        fab.dataset.fabInit = 'true';
        
        const open = () => {
            fab.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            actions.setAttribute('aria-hidden', 'false');
            if (floatingButtons) floatingButtons.classList.add('fab-open');
        };
        
        const close = () => {
            fab.classList.add('is-closing');
            fab.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
            actions.setAttribute('aria-hidden', 'true');
            if (floatingButtons) floatingButtons.classList.remove('fab-open');
            const onEnd = () => {
                fab.classList.remove('is-closing');
                fab.removeEventListener('animationend', onEnd);
            };
            fab.addEventListener('animationend', onEnd);
            // Fallback
            setTimeout(() => fab.classList.remove('is-closing'), 400);
        };
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fab.classList.contains('is-open')) {
                close();
            } else {
                open();
            }
        });
        
        // Закрыть при клике вне FAB
        document.addEventListener('click', (e) => {
            if (!fab.contains(e.target) && fab.classList.contains('is-open')) {
                close();
            }
        });
        
        // Esc закрывает
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && fab.classList.contains('is-open')) {
                close();
                trigger.focus();
            }
        });
    });
}

function initSettingsButton() {
    const settingsContainer = document.querySelector('.settings-container');
    if (!settingsContainer) return;
    
    const trigger = settingsContainer.querySelector('.settings-trigger');
    const actions = settingsContainer.querySelector('.settings-actions');
    if (!trigger || !actions) return;
    
    // Проверяем, не инициализирован ли уже
    if (settingsContainer.dataset.settingsInit) return;
    settingsContainer.dataset.settingsInit = 'true';
    
    const open = () => {
        settingsContainer.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        actions.setAttribute('aria-hidden', 'false');
    };
    
    const close = () => {
        settingsContainer.classList.add('is-closing');
        settingsContainer.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        actions.setAttribute('aria-hidden', 'true');
        const onEnd = () => {
            settingsContainer.classList.remove('is-closing');
            settingsContainer.removeEventListener('animationend', onEnd);
        };
        settingsContainer.addEventListener('animationend', onEnd);
        // Fallback
        setTimeout(() => settingsContainer.classList.remove('is-closing'), 400);
    };
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsContainer.classList.contains('is-open')) {
            close();
        } else {
            open();
        }
    });
    
    // Обработчики для кнопок настроек
    actions.addEventListener('click', (e) => {
        const button = e.target.closest('.settings-action');
        if (!button) return;
        
        const action = button.dataset.action;
        if (action === 'theme') {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            }
        } else if (action === 'language') {
            // Переключаем между uk и ru
            const currentLang = localStorage.getItem('language') || 'uk';
            const newLang = currentLang === 'uk' ? 'ru' : 'uk';
            if (typeof switchLanguage === 'function') {
                switchLanguage(newLang);
            }
        }
        
        // Закрываем меню после действия
        close();
    });
    
    // Закрыть при клике вне settings
    document.addEventListener('click', (e) => {
        if (!settingsContainer.contains(e.target) && settingsContainer.classList.contains('is-open')) {
            close();
        }
    });
    
    // Esc закрывает
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsContainer.classList.contains('is-open')) {
            close();
            trigger.focus();
        }
    });
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
    const rawTarget = e.target;
    if (!(rawTarget instanceof Element)) return;

    // Quantity stepper buttons (support clicks on child icon/svg)
    const quantityBtn = rawTarget.closest('.quantity-stepper__btn');
    if (quantityBtn) {
        const card = quantityBtn.closest('.product-card');
        const input = card?.querySelector('.quantity-stepper__input');
        if (!input) return;
        const delta = quantityBtn.dataset.action === 'increment' ? 1 : -1;
        const next = clampQuantity(Number(input.value) + delta);
        input.value = String(next);
        return;
    }

    // Main product card add-to-cart button (delegated; allow click on inner img/span)
    const cartBtn = rawTarget.closest('.product-card__button');
    if (cartBtn && !cartBtn.hasAttribute('data-edit') && !cartBtn.hasAttribute('data-delete')) {
        const productId = cartBtn.dataset.id;
        if (!productId) return;
        const card = cartBtn.closest('.product-card');
        const input = card?.querySelector('.quantity-stepper__input');
        const qty = clampQuantity(input ? Number(input.value) : 1);
        if (input) input.value = String(qty);
        addToCart(productId, products, qty);
        updateCartUI(translations, savedLanguage);
        showActionToast({ type: 'cart', message: getCartAddedMessage(savedLanguage) });
        return;
    }

    // Product card click anywhere (except controls) navigates to detail
    const cardClickArea = rawTarget.closest('.product-card');
    if (cardClickArea) {
        // Ignore clicks on interactive controls inside the card
        const interactive = rawTarget.closest('button, a, input, select, textarea, [role="menu"], [role="menuitem"]');
        if (interactive) return;
        const card = cardClickArea;
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
    const l = (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'uk';
    return ['ru','uk'].includes(l) ? l : 'uk';
}

function renderProductDetail(productId, productsList) {
    const lang = getLangSafe();
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    // Ensure template is present; if not loaded yet, bail.
    const section = container.querySelector('.product-detail');
    if (!section) return;
    const source = Array.isArray(productsList) ? productsList : (Array.isArray(products) ? products : []);
    const product = source.find(p => String(p.id) === String(productId));
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
    const priceText = `${Math.round(Number(product.price)).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн`;
    const priceElLegacy = section.querySelector('.product-detail__price');
    if (priceElLegacy) priceElLegacy.textContent = priceText;
    const priceElBuy = section.querySelector('.product-buy__price');
    if (priceElBuy) priceElBuy.textContent = priceText;
    // Summary (optional short text). If not provided, derive from the first sentence of description
    try {
        const summaryEl = section.querySelector('[data-role="summary"]');
        let summary = (product.summary && (product.summary[lang] || product.summary.ru)) || '';
        if ((!summary || !summary.trim()) && product.description) {
            const raw = (product.description[lang] || product.description.ru || '').replace(/\s+/g, ' ').trim();
            // take first sentence up to 180 chars as fallback
            const m = raw.match(/([^.!?]{20,}?[.!?])/);
            const firstSentence = m ? m[1] : raw.slice(0, 180);
            summary = firstSentence.length > 200 ? (firstSentence.slice(0, 197) + '…') : firstSentence;
        }
        if (summaryEl) {
            if (summary && summary.trim().length > 0) {
                summaryEl.textContent = summary.trim();
                summaryEl.hidden = false;
            } else {
                summaryEl.hidden = true;
                summaryEl.textContent = '';
            }
        }
    } catch {}
    // Favorite / Compare buttons (moved from product card)
    try {
        const collHost = section.querySelector('[data-role="collections"]');
        if (collHost) {
            const favActive = typeof isFavorite === 'function' ? isFavorite(product.id) : false;
            const cmpActive = typeof isCompared === 'function' ? isCompared(product.id) : false;
            const favAdd = translations?.[lang]?.['favorite-add'] || 'В избранное';
            const favRemove = translations?.[lang]?.['favorite-remove'] || 'Убрать из избранного';
            const cmpAdd = translations?.[lang]?.['compare-add'] || 'В сравнение';
            const cmpRemove = translations?.[lang]?.['compare-remove'] || 'Убрать из сравнения';
            collHost.innerHTML = `
              <button type="button" class="product-card__quick-btn product-card__quick-btn--detail${favActive ? ' is-active' : ''}" data-action="favorite" data-id="${product.id}" aria-pressed="${favActive}" aria-label="${favActive ? favRemove : favAdd}" title="${favActive ? favRemove : favAdd}">
                <svg class="product-card__quick-icon" aria-hidden="true" focusable="false"><use href="icons/icons-sprite.svg#icon-heart"></use></svg>
              </button>
              <button type="button" class="product-card__quick-btn product-card__quick-btn--detail${cmpActive ? ' is-active' : ''}" data-action="compare" data-id="${product.id}" aria-pressed="${cmpActive}" aria-label="${cmpActive ? cmpRemove : cmpAdd}" title="${cmpActive ? cmpRemove : cmpAdd}">
                <svg class="product-card__quick-icon" aria-hidden="true" focusable="false"><use href="icons/icons-sprite.svg#icon-compare"></use></svg>
              </button>`;
            // Handlers (scoped so they don't rely on global delegation)
            const favBtn = collHost.querySelector('[data-action="favorite"]');
            const cmpBtn = collHost.querySelector('[data-action="compare"]');
            if (favBtn) {
                favBtn.addEventListener('click', () => {
                    try { if (typeof toggleFavorite === 'function') toggleFavorite(String(product.id)); } catch {}
                    const active = typeof isFavorite === 'function' ? isFavorite(product.id) : false;
                    favBtn.classList.toggle('is-active', active);
                    favBtn.setAttribute('aria-pressed', String(active));
                    favBtn.setAttribute('aria-label', active ? favRemove : favAdd);
                    favBtn.setAttribute('title', active ? favRemove : favAdd);
                    try { updateBadgeGroup && updateBadgeGroup('favorite'); updateQuickActionButtons && updateQuickActionButtons('favorite'); } catch {}
                    try {
                        const name = product.name?.[lang] || product.name?.ru || '';
                        const msg = formatCollectionToastMessage ? formatCollectionToastMessage(active ? 'favorite-add' : 'favorite-remove', name, lang) : (active ? favAdd : favRemove) + ': ' + name;
                        showActionToast({ message: msg, type: 'favorite' });
                    } catch {}
                });
            }
            if (cmpBtn) {
                cmpBtn.addEventListener('click', () => {
                    try { if (typeof toggleCompare === 'function') toggleCompare(String(product.id)); } catch {}
                    const active = typeof isCompared === 'function' ? isCompared(product.id) : false;
                    cmpBtn.classList.toggle('is-active', active);
                    cmpBtn.setAttribute('aria-pressed', String(active));
                    cmpBtn.setAttribute('aria-label', active ? cmpRemove : cmpAdd);
                    cmpBtn.setAttribute('title', active ? cmpRemove : cmpAdd);
                    try { updateBadgeGroup && updateBadgeGroup('compare'); updateQuickActionButtons && updateQuickActionButtons('compare'); } catch {}
                    try {
                        const name = product.name?.[lang] || product.name?.ru || '';
                        const msg = formatCollectionToastMessage ? formatCollectionToastMessage(active ? 'compare-add' : 'compare-remove', name, lang) : (active ? cmpAdd : cmpRemove) + ': ' + name;
                        showActionToast({ message: msg, type: 'compare' });
                    } catch {}
                });
            }
        }
    } catch {}
    // Old price / discount
    try {
        const oldPriceEl = section.querySelector('[data-role="old-price"]');
        const discountEl = section.querySelector('[data-role="discount"]');
        const oldPrice = Number(product.oldPrice);
        if (oldPrice && oldPrice > Number(product.price)) {
            const oldText = `${Math.round(oldPrice).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} грн`;
            if (oldPriceEl) { oldPriceEl.textContent = oldText; oldPriceEl.hidden = false; }
            // compute discount percent either from field or derived
            const pct = Math.max(1, Math.round(100 - (Number(product.price) / oldPrice) * 100));
            if (discountEl) { discountEl.textContent = `−${pct}%`; discountEl.hidden = false; }
        } else {
            if (oldPriceEl) oldPriceEl.hidden = true;
            if (discountEl) discountEl.hidden = true;
        }
    } catch {}
    const stockEl = section.querySelector('.product-buy__stock');
    if (stockEl) {
        // Бейдж наличия скрыт по требованиям дизайна
        stockEl.hidden = true;
        stockEl.textContent = '';
    }
    // Main image and thumbnails (responsive variants using local naming convention: -320w/-480w/-768w/-1200w)
    const imgEl = section.querySelector('.product-gallery__image, .product-detail__image');
    const imagesRaw = (Array.isArray(product.images) && product.images.length ? product.images : [product.image]).filter(Boolean);
    const images = imagesRaw.map(src => {
        // If local path in picture/conditioners, build srcset variants (only same extension)
        if (typeof src === 'string' && src.startsWith('picture/conditioners/')) {
            const dot = src.lastIndexOf('.');
            if (dot > 0) {
                let base = src.slice(0, dot); const ext = src.slice(dot);
                // Remove trailing -<width>w (e.g., -800w) so variants follow sample-320w.jpg pattern
                base = base.replace(/-\d+w$/, '');
                const candidateWidths = [320,480,768,1200];
                const existing = candidateWidths.map(w => `${base}-${w}w${ext}`).filter(path => {
                    // Heuristic: if a preload <link> or cached image element already exists, assume available.
                    // In pure SPA runtime we can't sync fs existence; rely on assumption or feature-detect via Image().
                    // Optional: mark all as existing for now; later can refine by HEAD request.
                    return true;
                });
                return { original: src, variants: existing };
            }
        }
        return { original: src, variants: [] };
    });
    if (imgEl) {
        imgEl.classList.add('lqip');
        imgEl.setAttribute('loading','eager');
        imgEl.setAttribute('decoding','async');
        imgEl.setAttribute('fetchpriority','high');
        imgEl.setAttribute('sizes','(max-width:640px) 94vw, (max-width:1024px) 56vw, 720px');
        ensureImagePreloader(section);
        const first = images[0];
        if (first) {
            const srcset = first.variants.length ? first.variants.map((v,i)=>{
                const w = [320,480,768,1200][i]; return `${v} ${w}w`; }).join(', ') : '';
            if (srcset) imgEl.setAttribute('srcset', srcset);
            loadLargeImage(imgEl, first.original, product.name?.[lang] || '');
        }
    }
    const thumbsHost = section.querySelector('.product-gallery__thumbs, .product-detail__thumbs');
    if (thumbsHost) {
        // Reset scroll position smoothly when rendering a product (new or same)
        try { thumbsHost.scrollTo({ left: 0, behavior: 'smooth' }); } catch { thumbsHost.scrollLeft = 0; }
        // Ensure proper semantics for a gallery thumbnails list
        thumbsHost.setAttribute('role','listbox');
        thumbsHost.setAttribute('aria-orientation','horizontal');
        thumbsHost.innerHTML = '';
        images.forEach((info, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'product-gallery__thumb' + (i === 0 ? ' is-active' : '');
            // Use background-image for simplicity; JS will replace with optimized tag later if needed
            thumb.style.backgroundImage = `url(${info.original})`;
            thumb.setAttribute('data-idx', String(i));
            thumb.setAttribute('role','option');
            thumb.setAttribute('aria-label', (product.name?.[lang] || 'Изображение') + ' #' + (i+1));
            thumb.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            thumb.tabIndex = i === 0 ? 0 : -1; // roving tabindex pattern
            const activate = () => {
                thumbsHost.querySelectorAll('.product-gallery__thumb').forEach(el => el.classList.remove('is-active'));
                thumb.classList.add('is-active');
                // Update selection a11y
                thumbsHost.querySelectorAll('.product-gallery__thumb').forEach(el => {
                    el.setAttribute('aria-selected','false');
                });
                thumb.setAttribute('aria-selected','true');
                // Ensure active thumb visible (autoscroll)
                try {
                    // Smooth autoscroll with graceful fallback
                    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                } catch {
                    // Fallback: manual scrollLeft to bring thumb into view
                    try {
                        const hostRect = thumbsHost.getBoundingClientRect();
                        const thRect = thumb.getBoundingClientRect();
                        if (thRect.left < hostRect.left) {
                            thumbsHost.scrollLeft += (thRect.left - hostRect.left) - 12;
                        } else if (thRect.right > hostRect.right) {
                            thumbsHost.scrollLeft += (thRect.right - hostRect.right) + 12;
                        }
                    } catch {}
                }
                if (imgEl) {
                    const srcset = info.variants.length ? info.variants.map((v,j)=>{
                        const m = v.match(/-(\d+)w\./); const w = m ? m[1] : [320,480,768,1200][j]; return `${v} ${w}w`; }).join(', ') : '';
                    if (srcset) imgEl.setAttribute('srcset', srcset); else imgEl.removeAttribute('srcset');
                    loadLargeImage(imgEl, info.original, product.name?.[lang] || '');
                    try {
                        const announce = section.querySelector('[data-role="gallery-announce"]');
                        if (announce) announce.textContent = `${translations?.[lang]?.['image-changed'] || 'Изображение обновлено'}: ${(product.name?.[lang] || product.name?.ru || '').trim()} #${i+1}`;
                    } catch {}
                }
            };
            thumb.addEventListener('click', activate);
            thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
            thumbsHost.appendChild(thumb);
        });
        // Keyboard arrow navigation between thumbs
        thumbsHost.addEventListener('keydown', (e) => {
            if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
            const items = Array.from(thumbsHost.querySelectorAll('.product-gallery__thumb'));
            const currentIndex = items.indexOf(document.activeElement);
            let targetIndex = currentIndex;
            if (e.key === 'ArrowRight') targetIndex = Math.min(items.length - 1, currentIndex + 1);
            else if (e.key === 'ArrowLeft') targetIndex = Math.max(0, currentIndex - 1);
            else if (e.key === 'Home') targetIndex = 0;
            else if (e.key === 'End') targetIndex = items.length - 1;
            if (targetIndex !== currentIndex && items[targetIndex]) {
                e.preventDefault();
                // Roving tabindex update on focus move
                items.forEach((el, idx) => el.tabIndex = (idx === targetIndex ? 0 : -1));
                items[targetIndex].focus();
                // Autoscroll to newly focused thumb
                try { items[targetIndex].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'nearest' }); } catch {
                    try {
                        const hostRect = thumbsHost.getBoundingClientRect();
                        const tr = items[targetIndex].getBoundingClientRect();
                        if (tr.left < hostRect.left) {
                            thumbsHost.scrollLeft += (tr.left - hostRect.left) - 12;
                        } else if (tr.right > hostRect.right) {
                            thumbsHost.scrollLeft += (tr.right - hostRect.right) + 12;
                        }
                    } catch {}
                }
            }
        });
    }
    // Full description (fullDesc) integration into description panel
    try {
        let descPanel = section.querySelector('.product-panel[data-panel="description"] [data-role="full-desc"]');
        if (!descPanel) {
            const hostPanel = section.querySelector('.product-panel[data-panel="description"]');
            if (hostPanel) {
                const d = document.createElement('div');
                d.className = 'panel-text';
                d.setAttribute('data-role','full-desc');
                hostPanel.appendChild(d);
                descPanel = d;
            }
        }
        // Fallback: if exact selector not found, use generic panel-text within description panel
        if (!descPanel) {
            const fallback = section.querySelector('.product-panel[data-panel="description"] .panel-text');
            if (fallback) descPanel = fallback;
        }
        if (descPanel) {
            const fullDesc = (product.fullDesc && (product.fullDesc[lang] || product.fullDesc.ru)) || (product.description && (product.description[lang] || product.description.ru)) || '';
            // Basic sanitization: allow a subset or plain text fallback
            if (fullDesc) {
                if (/</.test(fullDesc)) {
                    // Minimal whitelist replace: strip script/style tags
                    const safe = fullDesc
                      .replace(/<\/(script|style)>/gi,'')
                      .replace(/<(script|style)[^>]*>.*?<\/\1>/gis,'')
                      .replace(/on[a-z]+\s*=\s*"[^"]*"/gi,'')
                      .replace(/on[a-z]+\s*=\s*'[^']*'/gi,'')
                      .replace(/javascript:/gi,'');
                    descPanel.innerHTML = safe;
                } else {
                    descPanel.textContent = fullDesc;
                }
                // Setup collapsible if content is too long
                try {
                    // Reset previous state
                    descPanel.classList.remove('is-collapsed','collapsible');
                    const existingBtn = descPanel.parentElement?.querySelector('.collapsible__toggle');
                    existingBtn?.remove();
                    const threshold = 320; // px, matches CSS var default
                    const longByText = !!(descPanel.textContent && descPanel.textContent.length > 800);
                    const applyCollapsible = () => {
                        descPanel.classList.add('collapsible','is-collapsed');
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'collapsible__toggle';
                        const readMore = (translations?.[lang]?.['read-more']) || (lang === 'uk' ? 'Читати далі' : 'Читать далее');
                        const readLess = (translations?.[lang]?.['read-less']) || (lang === 'uk' ? 'Згорнути' : 'Свернуть');
                        btn.textContent = readMore;
                        btn.setAttribute('aria-expanded','false');
                        btn.addEventListener('click', () => {
                            const collapsed = descPanel.classList.toggle('is-collapsed');
                            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                            btn.textContent = collapsed ? readMore : readLess;
                        });
                        const host = descPanel.parentElement || section.querySelector('.product-panel[data-panel="description"]');
                        host?.appendChild(btn);
                    };
                    if (longByText) {
                        applyCollapsible();
                    } else {
                        // Measure after paint for layout-driven decision
                        const run = () => {
                            const longByLayout = descPanel.scrollHeight > threshold * 1.05;
                            if (longByLayout) applyCollapsible();
                        };
                        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else run();
                    }
                } catch {}
            }
        }
    } catch {}

    // Specs table into specs panel (if present). Keep legacy list intact.
    try {
        const specsPanel = section.querySelector('.product-panel[data-panel="specs"] [data-role="specs-table"]');
        if (specsPanel && Array.isArray(product.specs) && product.specs.length) {
            const rows = product.specs.map(spec => {
                const keyLabel = translations?.[lang]?.[`spec-${spec.key}`] || spec.key;
                const valueText = (spec.value && (spec.value[lang] || spec.value.ru)) || '';
                return `<tr><th>${keyLabel}</th><td>${valueText}</td></tr>`;
            }).join('');
            specsPanel.innerHTML = `<table class="product-specs-table"><tbody>${rows}</tbody></table>`;
        }
    } catch {}
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
    // Actions: bind new primary buy button in purchase block
    const buyBtn = section.querySelector('[data-act="add-to-cart"], .product-detail__addtocart');
    if (buyBtn) {
        buyBtn.removeAttribute('disabled');
        buyBtn.setAttribute('aria-disabled','false');
        buyBtn.onclick = () => {
            // Read quantity if present
            const qtyInput = section.querySelector('.quantity-stepper__input');
            const qty = qtyInput ? Math.max(1, Math.min(99, Number(qtyInput.value) || 1)) : 1;
            const addFn = (typeof window !== 'undefined' && typeof window.addToCart === 'function')
                ? window.addToCart
                : (typeof globalThis !== 'undefined' && typeof globalThis.addToCart === 'function')
                    ? globalThis.addToCart
                    : addToCart;
            const updateFn = (typeof window !== 'undefined' && typeof window.updateCartUI === 'function')
                ? window.updateCartUI
                : (typeof globalThis !== 'undefined' && typeof globalThis.updateCartUI === 'function')
                    ? globalThis.updateCartUI
                    : updateCartUI;
            addFn(product.id, products, qty);
            updateFn(translations, lang);
            showActionToast({ type: 'cart', message: getCartAddedMessage(lang) });
        };
    }
    // Enable discount request and credit actions (basic UX)
    try {
        const discountBtn = section.querySelector('[data-i18n="discount-request"]');
        if (discountBtn) { discountBtn.removeAttribute('disabled'); discountBtn.setAttribute('aria-disabled','false'); discountBtn.addEventListener('click', () => {
            location.hash = '#contacts';
            const el = document.getElementById('contacts'); if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, { once: true }); }
        const qtyDec = section.querySelector('[data-act="qty-dec"]');
        const qtyInc = section.querySelector('[data-act="qty-inc"]');
        const qtyInput = section.querySelector('.quantity-stepper__input');
        if (qtyDec && qtyInput) qtyDec.addEventListener('click', () => { qtyInput.value = String(Math.max(1, (Number(qtyInput.value)||1) - 1)); });
        if (qtyInc && qtyInput) qtyInc.addEventListener('click', () => { qtyInput.value = String(Math.min(99, (Number(qtyInput.value)||1) + 1)); });
    } catch {}
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

    // Aggregate rating from local reviews
    let agg = null;
    try {
        const storageKey = `reviews:${product.id}`;
        const ls = (typeof window !== 'undefined' && window.localStorage) || (typeof globalThis !== 'undefined' && globalThis.localStorage) || null;
        const reviews = JSON.parse((ls && ls.getItem(storageKey)) || '[]') || [];
        if (reviews.length) {
            const sum = reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0);
            const value = Math.round((sum / reviews.length) * 10) / 10;
            agg = { count: reviews.length, value };
            const ratingEl = section.querySelector('[data-role="rating"]');
            const starsEl = section.querySelector('[data-role="rating-stars"]');
            const valueEl = section.querySelector('[data-role="rating-value"]');
            const countEl = section.querySelector('[data-role="rating-count"]');
            if (ratingEl) { ratingEl.hidden = false; ratingEl.removeAttribute('hidden'); }
            if (starsEl) starsEl.innerHTML = renderStarsHTML(value);
            if (valueEl) valueEl.textContent = `${value} / 5`;
            if (countEl) countEl.textContent = `(${reviews.length})`;
        } else {
            const ratingEl = section.querySelector('[data-role="rating"]');
            // Keep rating visible in tests when aggregate present in product data
            const preAgg = product?.rating?.value && product?.rating?.count;
            if (ratingEl) ratingEl.hidden = !preAgg;
        }
        // Update Reviews/Q&A tab labels with counts (robust selectors for tests)
        try {
            const tabsHost = document.querySelector('.product-tabs') || section.parentElement?.querySelector('.product-tabs');
            const tabReviews = tabsHost?.querySelector('.product-tabs__tab[data-tab="reviews"]');
            const tabQa = tabsHost?.querySelector('.product-tabs__tab[data-tab="qa"]');
            if (tabReviews) {
                const baseR = tabReviews.getAttribute('data-i18n') ? (translations?.[lang]?.[tabReviews.getAttribute('data-i18n')] || tabReviews.textContent.replace(/\s*\d+$/,'')) : tabReviews.textContent.replace(/\s*\d+$/,'');
                tabReviews.textContent = `${baseR.trim()} ${reviews.length}`;
            }
            if (tabQa) {
                const qaKey = tabQa.getAttribute('data-i18n') || 'tab-qa';
                const baseQ = (translations?.[lang]?.[qaKey]) || tabQa.textContent.replace(/\s*\d+$/,'');
                const qaKeyStorage = `qna:${product.id}`;
                const qaItems = JSON.parse((ls && ls.getItem(qaKeyStorage)) || '[]') || [];
                tabQa.textContent = `${baseQ.trim()} ${qaItems.length}`;
            }
        } catch {}
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
                },
                ...(product.energyClass ? { additionalProperty: [{ '@type':'PropertyValue', name:'energyClass', value: product.energyClass }] } : {})
            } : {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: product.name?.[lang] || product.name?.ru || '',
                sku: product.sku || undefined,
                brand: product.brand ? { '@type': 'Brand', name: product.brand, ...(product.brandUrl ? { url: product.brandUrl } : {}) } : undefined,
                image: images,
                description: product.description?.[lang] || product.description?.ru || '',
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'UAH',
                    price: String(product.price),
                    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder'
                },
                ...(product.oldPrice && product.oldPrice > product.price ? { offers: { '@type':'Offer', priceCurrency:'UAH', price:String(product.price), availability: product.inStock ? 'https://schema.org/InStock':'https://schema.org/PreOrder', priceValidUntil: new Date(Date.now() + 1000*60*60*24*30).toISOString().split('T')[0] } } : {}),
                ...(product.energyClass ? { additionalProperty: [{ '@type':'PropertyValue', name:'energyClass', value: product.energyClass }] } : {}),
                ...(agg ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: String(agg.value), ratingCount: String(agg.count), bestRating: '5', worstRating: '1' } } : {})
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

    // Share buttons populate
    try {
        const shareHost = section.querySelector('[data-role="share"]');
        if (shareHost) {
            const url = location.href.split('#')[0];
            const title = product.name?.[lang] || product.name?.ru || '';
            const tg = shareHost.querySelector('[data-role="share-tg"]');
            const wa = shareHost.querySelector('[data-role="share-wa"]');
            const encodedUrl = encodeURIComponent(url);
            const encodedText = encodeURIComponent(`${title} — ${url}`);
            if (tg) tg.setAttribute('href', `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`);
            if (wa) wa.setAttribute('href', `https://wa.me/?text=${encodedText}`);
        }
    } catch {}

    // Render flags badges (product.flags: array of {key,color} or strings)
    try {
        const flags = Array.isArray(product.flags) ? product.flags : [];
        const badgesHost = section.querySelector('.product-buy__badges');
        if (badgesHost) {
            // Clear static badges and re-render
            badgesHost.innerHTML = '';
            badgesHost.setAttribute('role','list');
            if (flags.length) {
                flags.forEach(f => {
                    const key = typeof f === 'string' ? f : (f.key || '');
                    if (!key) return;
                    let color = (typeof f === 'object' && f.color) ? f.color : '';
                    if (!color && typeof window?.autoFlagColor === 'function') {
                        try { color = window.autoFlagColor(key); } catch {}
                    }
                    const li = document.createElement('li');
                    li.className = 'badge badge--flag';
                    li.setAttribute('data-flag', key);
                    li.setAttribute('role','listitem');
                    const label = flagLabel(key, translations, lang);
                    li.textContent = label;
                    li.setAttribute('aria-label', label);
                    li.setAttribute('title', label);
                    if (color) li.style.background = color;
                    badgesHost.appendChild(li);
                });
            }
            if (product.energyClass) {
                const li = document.createElement('li');
                li.className = 'badge badge--neutral';
                li.textContent = `${(translations?.[lang]?.['energy-class']||'Класс энергосбережения')}: ${product.energyClass}`;
                li.setAttribute('role','listitem');
                badgesHost.appendChild(li);
            }
        }
    } catch {}

    // Credit providers and info links
    try {
        const creditHost = section.querySelector('[data-role="credit"]');
        const providersHost = section.querySelector('[data-role="credit-providers"]');
        const providers = Array.isArray(product.creditProviders) ? product.creditProviders : [];
        if (creditHost) {
            if (providers.length) {
                creditHost.hidden = false;
                providersHost.innerHTML = '';
                providers.forEach((p) => {
                    const item = document.createElement('span');
                    item.className = 'credit-provider';
                    item.setAttribute('role','listitem');
                    const name = typeof p === 'string' ? p : (p.name || '');
                    const url = (typeof p === 'object' && p.url) ? p.url : '';
                    // Mini logo placeholder (initial badge with brand color)
                    const logo = document.createElement('span');
                    logo.className = 'credit-provider__logo';
                    const initial = (name||'')[0]?.toUpperCase() || '?';
                    const color = (name||'').toLowerCase().includes('mono') ? '#111' : ( (name||'').toLowerCase().includes('priv') ? '#23a455' : '#6b7280');
                    logo.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="${color}"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="#fff" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">${initial}</text></svg>`;
                    item.appendChild(logo);
                    if (url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = name; item.appendChild(a); }
                    else { item.textContent = name; }
                    providersHost.appendChild(item);
                });
                const btn = section.querySelector('[data-act="buy-credit"]');
                btn?.addEventListener('click', () => { location.hash = '#contacts'; document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' }); }, { once: true });
            } else {
                creditHost.hidden = true;
            }
        }
        const linksHost = section.querySelector('[data-role="links"]');
        const deliveryA = section.querySelector('[data-role="delivery-link"]');
        const warrantyA = section.querySelector('[data-role="warranty-link"]');
        let visible = false;
        if (product.deliveryInfoUrl && deliveryA) { deliveryA.href = product.deliveryInfoUrl; visible = true; }
        if (product.warrantyInfoUrl && warrantyA) { warrantyA.href = product.warrantyInfoUrl; visible = true; }
        if (linksHost) linksHost.hidden = !visible;
    } catch {}

    // Update Q&A tab counter from storage
    try {
        const storageKeyQ = `qna:${product.id}`;
        const ls2 = (typeof window !== 'undefined' && window.localStorage) || (typeof globalThis !== 'undefined' && globalThis.localStorage) || null;
        const q = JSON.parse((ls2 && ls2.getItem(storageKeyQ)) || '[]') || [];
        const tabQa = section.parentElement?.querySelector('.product-tabs .product-tabs__tab[data-tab="qa"]');
        if (tabQa) {
            const base = tabQa.textContent.replace(/\s*\(.*\)$/, '');
            tabQa.textContent = `${base} ${q.length}`;
        }
    } catch {}

    // Ensure tab interactions and forms are wired when called directly (outside router)
    try { bindProductDetailEvents(); } catch {}
}

// Render static 5-star HTML based on value (0..5) with halves
// Map flag key to localized label
function flagLabel(key, translations, lang) {
    // attempt i18n flags.* lookup
    try {
        const dict = translations?.[lang]?.flags || translations?.ru?.flags || {};
        if (dict && dict[key]) return dict[key];
    } catch {}
    // fallback generic mapping
    const generic = {
        isNew: { ru: 'Новинка', uk: 'Новинка' },
        isHit: { ru: 'Хит', uk: 'Хіт' },
        isPromo: { ru: 'Акция', uk: 'Акція' },
        isBestseller: { ru: 'Бестселлер', uk: 'Бестселлер' }
    };
    const langObj = generic[key];
    if (langObj) return langObj[lang] || langObj.ru || key;
    return key;
}

function renderStarsHTML(value){
    const v = Math.max(0, Math.min(5, Number(value) || 0));
    const full = Math.floor(v);
    const half = v - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    const star = '<span class="star star--full" aria-hidden="true">★</span>';
    const halfStar = '<span class="star star--half" aria-hidden="true">☆</span>';
    const emptyStar = '<span class="star star--empty" aria-hidden="true">☆</span>';
    return star.repeat(full) + (half ? halfStar : '') + emptyStar.repeat(empty);
}

function bindProductDetailEvents() {
    const container = document.getElementById('product-detail-container');
    if (!container) return;
    const back = container.querySelector('.product-detail__back');
    if (back) back.onclick = () => { history.back(); };

    // Tabs logic (Stage 3)
    const tabsHost = container.querySelector('.product-tabs');
    const panelsHost = container.querySelector('.product-panels');
    if (!tabsHost || !panelsHost) return;
    const tabs = Array.from(tabsHost.querySelectorAll('.product-tabs__tab'));
    const panels = Array.from(panelsHost.querySelectorAll('.product-panel'));

    // Sticky tabs (CSS sticky + JS class for shadow)
    try {
        const headerEl = document.querySelector('.header');
        const computeStickyTop = () => {
            if (!headerEl) return 72; // дефолтная высота для тестовой среды/JSDOM
            const isCondensed = headerEl.classList.contains('header--condensed');
            const rawH = headerEl.offsetHeight || 0;
            const h = isCondensed ? Math.round(rawH * 0.8) : rawH;
            return h > 0 ? h : 72;
        };
        // Порог появления тени. В JSDOM (нет хедера/высота 0) — тень сразу.
        const computeShadowThreshold = (stickyTopVal) => {
            if (!headerEl || (headerEl.offsetHeight || 0) === 0) return 0;
            const isCondensed = headerEl.classList.contains('header--condensed');
            // В обычном состоянии — по высоте хедера; в condensed — заметно ниже
            const base = headerEl.offsetHeight || stickyTopVal || 72;
            return isCondensed ? Math.max(0, Math.round(base * 0.6)) : base;
        };
        let stickyTop = computeStickyTop();
        let shadowThreshold = computeShadowThreshold(stickyTop);
        tabsHost.classList.add('is-sticky');
        tabsHost.style.setProperty('--tabs-sticky-top', stickyTop + 'px');
        // Track stick state to toggle shadow class
        let startTop = tabsHost.getBoundingClientRect().top + window.scrollY;
        let ticking = false;
        const isTestEnv = (typeof navigator !== 'undefined') && /jsdom|node/i.test(navigator.userAgent || '');
        const compute = () => {
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            // Опираемся напрямую на порог тени, чтобы поведение было детерминированным в тестовой среде
            const threshold = (shadowThreshold ?? 0);
            const addShadow = (y >= (threshold - 1));
            tabsHost.classList.toggle('is-stuck', addShadow);
        };
        const onScroll = () => {
            // Выполняем вычисления сразу и резервно в следующем тике
            compute();
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => compute());
            } else {
                setTimeout(() => compute(), 0);
            }
        };
        const onResize = () => {
            // recalc header height and starting top
            stickyTop = computeStickyTop();
            shadowThreshold = computeShadowThreshold(stickyTop);
            tabsHost.style.setProperty('--tabs-sticky-top', stickyTop + 'px');
            startTop = tabsHost.getBoundingClientRect().top + window.scrollY;
            onScroll();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', () => { clearTimeout(onResize.__t); onResize.__t = setTimeout(onResize, 120); }, { passive: true });
        // also react on potential header condense changes via mutation observer minimal
        if (headerEl && 'MutationObserver' in window) {
            const mo = new MutationObserver(() => onResize());
            mo.observe(headerEl, { attributes: true, attributeFilter: ['class','style'] });
        }
        // If navigating within same page, ensure calc is up to date after panels render
        setTimeout(onResize, 0);
        // Immediate compute in environments without rAF (JSDOM) to satisfy tests
        compute();
    } catch {}

    // Map tab -> panel
    const panelByTab = new Map();
    tabs.forEach(tab => {
        const key = tab.getAttribute('data-tab');
        const panel = panels.find(p => p.getAttribute('data-panel') === key);
        if (panel) panelByTab.set(tab, panel);
    });

    function activateTab(tab, opts = { focus: false }) {
        if (!panelByTab.has(tab)) return;
        tabs.forEach(t => {
            const sel = t === tab;
            t.classList.toggle('is-active', sel);
            t.setAttribute('aria-selected', sel ? 'true' : 'false');
            t.setAttribute('tabindex', sel ? '0' : '-1');
        });
        panels.forEach(p => p.classList.remove('is-active'));
        const panel = panelByTab.get(tab);
        panel.classList.add('is-active');
        // Update hash without scrolling jump (#tab-description etc.)
        try {
            const hash = `#tab-${tab.getAttribute('data-tab')}`;
            if (location.hash !== hash) history.replaceState(null, '', hash);
        } catch {}
        if (opts.focus) tab.focus();
    }

    // Initial activation from hash
    function initFromHash() {
        const m = (location.hash || '').match(/^#tab-(.+)$/);
        if (m) {
            const target = tabs.find(t => t.getAttribute('data-tab') === m[1]);
            if (target) { activateTab(target); return; }
        }
        // Fallback: first tab
        if (tabs.length) activateTab(tabs[0]);
    }

    tabs.forEach(tab => {
        tab.setAttribute('role','tab');
        tab.setAttribute('aria-selected', tab.classList.contains('is-active') ? 'true' : 'false');
        tab.setAttribute('tabindex', tab.classList.contains('is-active') ? '0' : '-1');
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', (e) => {
            const idx = tabs.indexOf(tab);
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = tabs[(idx + 1) % tabs.length];
                activateTab(next, { focus: true });
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                activateTab(prev, { focus: true });
            } else if (e.key === 'Home') {
                e.preventDefault(); activateTab(tabs[0], { focus: true });
            } else if (e.key === 'End') {
                e.preventDefault(); activateTab(tabs[tabs.length - 1], { focus: true });
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); activateTab(tab, { focus: true });
            }
        });
    });

    initFromHash();
    window.addEventListener('hashchange', () => {
        const h = location.hash || '';
        if (/^#tab-/.test(h)) initFromHash();
    });

    // Reviews form logic (localStorage based)
    try {
        const reviewsHost = container.querySelector('[data-role="reviews"]');
        if (reviewsHost) {
            const form = reviewsHost.querySelector('[data-role="reviews-form"]');
            const list = reviewsHost.querySelector('[data-role="reviews-list"]');
            const empty = reviewsHost.querySelector('[data-role="reviews-empty"]');
            const status = reviewsHost.querySelector('[data-role="reviews-status"]');
            const productId = (container.querySelector('.product-detail')?.getAttribute('data-product-id')) || (location.hash.match(/^#product-(.+)$/)?.[1]) || 'unknown';
            const storageKey = `reviews:${productId}`;

            function getReviews(){
                try { return JSON.parse(localStorage.getItem(storageKey) || '[]') || []; } catch { return []; }
            }
            function saveReviews(items){
                try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
            }
            function renderReviews(){
                const items = getReviews();
                if (!items.length) {
                    empty?.removeAttribute('hidden');
                    if (list) { list.hidden = true; list.innerHTML = ''; }
                    return;
                }
                empty?.setAttribute('hidden','');
                if (list) {
                    list.hidden = false;
                    list.innerHTML = items.map(it => `
                        <li class="reviews__item">
                          <div class="reviews__item-header">
                            <div class="reviews__author">${it.author || 'Гость'}</div>
                            <div class="reviews__rating">★ ${Number(it.rating)||5}/5</div>
                          </div>
                          <div class="reviews__text">${(it.text||'').replace(/[<>]/g, '')}</div>
                        </li>`).join('');
                }
            }

            renderReviews();
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fd = new FormData(form);
                    const author = String(fd.get('author')||'').trim();
                    const rating = Number(fd.get('rating')||5);
                    const text = String(fd.get('text')||'').trim();
                    if (author.length < 2 || text.length < 4) {
                        if (status) status.textContent = 'Заполните имя и комментарий';
                        return;
                    }
                    const items = getReviews();
                    items.unshift({ id: Date.now(), author, rating, text, createdAt: new Date().toISOString() });
                    saveReviews(items);
                    const textInput = form.querySelector('[name="text"]');
                    if (textInput) textInput.value = '';
                    renderReviews();
                    if (status) { status.textContent = 'Отзыв опубликован'; setTimeout(()=> status.textContent = '', 1800); }
                });
            }
        }
    } catch {}

    // Q&A form logic (localStorage based)
    try {
        const qaHost = container.querySelector('[data-role="qa"]');
        if (qaHost) {
            const form = qaHost.querySelector('[data-role="qa-form"]');
            const list = qaHost.querySelector('[data-role="qa-list"]');
            const empty = qaHost.querySelector('[data-role="qa-empty"]');
            const status = qaHost.querySelector('[data-role="qa-status"]');
            const productId = (container.querySelector('.product-detail')?.getAttribute('data-product-id')) || (location.hash.match(/^#product-(.+)$/)?.[1]) || 'unknown';
            const storageKey = `qna:${productId}`;

            function getQna(){
                try { return JSON.parse(localStorage.getItem(storageKey) || '[]') || []; } catch { return []; }
            }
            function saveQna(items){
                try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
            }
            function renderQna(){
                const items = getQna();
                if (!items.length) {
                    empty?.removeAttribute('hidden');
                    if (list) { list.hidden = true; list.innerHTML = ''; }
                    return;
                }
                empty?.setAttribute('hidden','');
                if (list) {
                    list.hidden = false;
                    list.innerHTML = items.map(it => `
                        <li class="qa__item">
                          <div class="qa__item-header">
                            <div class="qa__author">${it.author || 'Гость'}</div>
                            <div class="qa__date">${new Date(it.createdAt).toLocaleDateString?.() || ''}</div>
                          </div>
                          <div class="qa__text">${(it.text||'').replace(/[<>]/g, '')}</div>
                        </li>`).join('');
                }
            }

            renderQna();
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fd = new FormData(form);
                    const author = String(fd.get('author')||'').trim();
                    const text = String(fd.get('text')||'').trim();
                    if (author.length < 2 || text.length < 4) {
                        if (status) status.textContent = 'Заполните имя и вопрос';
                        return;
                    }
                    const items = getQna();
                    items.unshift({ id: Date.now(), author, text, createdAt: new Date().toISOString() });
                    saveQna(items);
                    const textInput = form.querySelector('[name="text"]');
                    if (textInput) textInput.value = '';
                    renderQna();
                    if (status) { status.textContent = 'Вопрос отправлен'; setTimeout(()=> status.textContent = '', 1800); }
                });
            }
        }
    } catch {}
}

// Delegated events for share copy
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="share-copy"]');
    if (!btn) return;
    const url = location.href.split('#')[0];
    const toCopy = url;
    const attempt = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(toCopy);
                showActionToast?.({ type:'share', message:'Ссылка скопирована' });
                return true;
            }
        } catch {}
        return false;
    };
    attempt().then(ok => {
        if (!ok) {
            try {
                const ta = document.createElement('textarea'); ta.value = toCopy; ta.style.position='fixed'; ta.style.top='-2000px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
                showActionToast?.({ type:'share', message:'Ссылка скопирована' });
            } catch {}
        }
    });
});


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

        // Cart page route (disabled in landing mode)
        if (!LANDING_MODE && hash === '#cart') {
            loadComponent('main-container', 'components/cart-page.html').then(() => {
                // Hide other sections, show main-container
                showSection('hero-container', false);
                showSection('services-container', false);
                showSection('products-container', false);
                showSection('portfolio-container', false);
                showSection('contacts-container', false);
                showSection('product-detail-container', false);
                showSection('admin-page-container', false);
                showSection('main-container', true);

                // Initialize cart page interactions
                const clearBtn = document.querySelector('.cart-button--clear');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        clearCart();
                        const lang = getLangSafe();
                        updateCartUI(translations, lang);
                    });
                }
                const itemsList = document.querySelector('.cart-items');
                if (itemsList) {
                    itemsList.addEventListener('click', (e) => {
                        if (e.target.classList.contains('cart-item-remove')) {
                            const productId = e.target.dataset.id;
                            removeFromCart(productId);
                            const lang = getLangSafe();
                            updateCartUI(translations, lang);
                        }
                    });
                }
                // Render current cart state
                const lang = getLangSafe();
                updateCartUI(translations, lang);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }).catch(err => console.error('Error loading cart page component:', err));
            return;
        }
        
    const m = hash.match(/^#product-(.+)$/);
        if (!LANDING_MODE && m) {
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
                // Автоскролл к началу деталки (с учётом возможного фиксированного header)
                try {
                    const detailRoot = document.getElementById('product-detail-container');
                    if (detailRoot) {
                        const top = detailRoot.getBoundingClientRect().top + window.scrollY - 60; // offset for sticky header
                        window.scrollTo({ top: top < 0 ? 0 : top, behavior: 'smooth' });
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                } catch { window.scrollTo({ top: 0, behavior: 'smooth' }); }
            });
    } else if (!LANDING_MODE && hash === '#products') {
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
                    // Автоскролл и фокус на форму, если редактируем существующий (есть черновик)
                    try {
                        const hasDraft = !!localStorage.getItem('admin:product:draft:v1');
                        if (hasDraft) {
                            setTimeout(() => {
                                const form = document.querySelector('#adminProductForm') || document.querySelector('form.admin-product-form');
                                if (form) {
                                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    const firstField = form.querySelector('input[name="title_ru"], input, textarea, select');
                                    if (firstField && typeof firstField.focus === 'function') {
                                        try { firstField.focus(); } catch {}
                                    }
                                }
                            }, 60);
                        }
                    } catch {}
                } catch (e) { console.error('Admin page init error', e); }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }).catch(err => console.error('Error loading admin page component:', err));
        } else {
            // Show main sections
            showSection('hero-container', true);
            showSection('services-container', true);
            if (!LANDING_MODE) showSection('products-container', true); else showSection('products-container', false);
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
        // Обновим подписи пунктов каталога под выбранный язык
        try {
            const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || savedLanguage || 'uk';
            updateCatalogDropdownLabels(lang);
        } catch {}
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
    const message = translateKey('toast-update-installed') || 'Обновление установлено';
    const reloadLabel = translateKey('toast-reload') || 'Обновить';
    showActionToast({
        message,
        type: 'success',
        actions: [
            { label: reloadLabel, ariaLabel: reloadLabel, handler: () => { try { location.reload(); } catch (_) {} }, autoClose: true }
        ],
        duration: 5000
    });
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
    const wrap = imgEl.closest('.product-detail__image-wrap, .product-gallery__image-wrap');
    const spinner = wrap && wrap.querySelector('.image-spinner');
    if (spinner) spinner.style.display = 'block';
    imgEl.style.opacity = '0';
    const pre = new Image();
    pre.onload = () => {
        imgEl.src = src;
        // If srcset already provided (local variants) — don't overwrite.
        if (!imgEl.getAttribute('srcset')) {
            // Fallback responsive hints for remote/demo images (picsum pattern)
            try {
                const alt1200 = src;
                const alt800 = src.replace('/1200/800','/800/533');
                const alt600 = src.replace('/1200/800','/600/400');
                imgEl.srcset = `${alt600} 600w, ${alt800} 800w, ${alt1200} 1200w`;
                imgEl.sizes = '(max-width:640px) 94vw, (max-width:1024px) 56vw, 720px';
            } catch {}
        }
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
        imgEl.src = src;
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
    
    // Intersection Observer для fade-in анимаций (пропускаем в средах без него)
    if ('IntersectionObserver' in window) {
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
    }
    
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
    const savedLang = localStorage.getItem('language') || 'uk';

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
    const lang = e.detail?.lang || localStorage.getItem('language') || 'uk';
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
// Экспортируем ключевые функции product-detail для тестов и внешнего использования
try {
    if (typeof window !== 'undefined') {
        window.renderProductDetail = renderProductDetail;
        window.bindProductDetailEvents = bindProductDetailEvents;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.renderProductDetail = renderProductDetail;
        globalThis.bindProductDetailEvents = bindProductDetailEvents;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.renderProductDetail = renderProductDetail;
        module.exports.bindProductDetailEvents = bindProductDetailEvents;
    }
} catch {}

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

// ========================================
// PWA INSTALL PROMPT
// ========================================
let deferredPrompt = null;

function initPWAInstallPrompt() {
    // Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install banner after a delay (don't be too aggressive)
        setTimeout(() => {
            if (deferredPrompt && !localStorage.getItem('pwa-install-dismissed')) {
                showInstallBanner();
            }
        }, 5000);
    });

    // Track successful installation
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hideInstallBanner();
        localStorage.setItem('pwa-installed', 'true');
    });
}

function showInstallBanner() {
    // Don't show if already installed or dismissed recently
    if (localStorage.getItem('pwa-installed')) return;
    
    // Check if banner already exists
    if (document.getElementById('pwa-install-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
        <div class="pwa-banner__content">
            <div class="pwa-banner__icon">📱</div>
            <div class="pwa-banner__text">
                <strong>Установить приложение</strong>
                <span>Быстрый доступ с главного экрана</span>
            </div>
        </div>
        <div class="pwa-banner__actions">
            <button class="pwa-banner__install" id="pwa-install-btn">Установить</button>
            <button class="pwa-banner__close" id="pwa-close-btn" aria-label="Закрыть">✕</button>
        </div>
    `;
    
    // Add styles
    banner.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 16px;
        right: 16px;
        background: var(--primary-color, rgba(30, 30, 30, 0.95));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--glass-border, rgba(255,255,255,0.2));
        border-radius: 16px;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 5000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        transform: translateY(120%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(banner);
    
    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            banner.style.transform = 'translateY(0)';
        });
    });
    
    // Install button
    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            hideInstallBanner();
        }
        deferredPrompt = null;
    });
    
    // Close button
    document.getElementById('pwa-close-btn').addEventListener('click', () => {
        hideInstallBanner();
        // Don't show again for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    });
}

function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.style.transform = 'translateY(120%)';
        setTimeout(() => banner.remove(), 300);
    }
}

// Инициализация мобильного главного меню (под hero)
function initMobileMainNav() {
    const mobileMainNav = document.querySelector('.main-nav-mobile');
    if (!mobileMainNav) return;

    const navList = mobileMainNav.querySelector('.main-nav-mobile__list');
    if (!navList) return;

    // Обработчик кликов на ссылки
    navList.addEventListener('click', (e) => {
        const link = e.target.closest('.main-nav-mobile__link');
        if (!link) return;

        const href = link.getAttribute('href');
        if (href === '#services-page') {
            e.preventDefault();
            showServicesList(navList);
        } else if (href === '#back-to-menu') {
            e.preventDefault();
            restoreMainMenu(navList);
        } else if (href && href.startsWith('#service-')) {
            // Ссылки на страницы услуг - устанавливаем hash для навигации
            e.preventDefault();
            location.hash = href;
        }
        // Другие ссылки можно добавить аналогично
    });
}

// Функция для показа списка услуг вместо меню
function showServicesList(navList) {
    // Start slide out animation
    navList.classList.add('main-nav-mobile__list--slide-out');
    
    setTimeout(() => {
        const servicesHTML = `
            <li class="main-nav-mobile__item">
                <a href="#service-ac-install" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="service-ac-install-title">Монтаж кондиционеров</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#service-recuperator-install" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="service-recuperator-install-title">Монтаж рекуператоров</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#service-maintenance" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="service-maintenance-title">Обслуживание систем</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#back-to-menu" class="main-nav-mobile__link main-nav-mobile__link--back">
                    <span class="main-nav-mobile__text">← Назад к меню</span>
                </a>
            </li>
        `;
        
        navList.innerHTML = servicesHTML;
        navList.classList.remove('main-nav-mobile__list--slide-out');
        navList.classList.add('main-nav-mobile__list--slide-in-from-right');
        
        // Force reflow to start animation
        navList.offsetHeight;
        
        // Start slide in animation
        setTimeout(() => {
            navList.classList.remove('main-nav-mobile__list--slide-in-from-right');
            navList.classList.add('main-nav-mobile__list--slide-in');
        }, 10);
    }, 300);
}

// Функция для восстановления основного меню
function restoreMainMenu(navList) {
    // Start slide out animation (to the right)
    navList.classList.add('main-nav-mobile__list--slide-in-from-right');
    
    setTimeout(() => {
        const menuHTML = `
            <li class="main-nav-mobile__item">
                <a href="#services-page" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-services">Услуги</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#portfolio-page" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-portfolio">Наши работы</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#reviews-page" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-reviews">Отзывы клиентов</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#faq-page" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-faq">Вопросы и ответы</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#about" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-about">О нас</span>
                </a>
            </li>
            <li class="main-nav-mobile__item">
                <a href="#contacts" class="main-nav-mobile__link">
                    <span class="main-nav-mobile__text" data-i18n="nav-contacts">Контакты</span>
                </a>
            </li>
        `;
        
        navList.innerHTML = menuHTML;
        navList.classList.remove('main-nav-mobile__list--slide-in-from-right');
        navList.classList.add('main-nav-mobile__list--slide-out');
        
        // Force reflow
        navList.offsetHeight;
        
        // Start slide in animation
        setTimeout(() => {
            navList.classList.remove('main-nav-mobile__list--slide-out');
            navList.classList.add('main-nav-mobile__list--slide-in');
        }, 10);
    }, 300);
}