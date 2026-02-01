/**
 * Catalog Dropdown Module
 * Управление выпадающим меню каталога с поддержкой A11y
 */

// Configurable Tab behavior: 'trap' (Tab циклично по пунктам меню) | 'classic' (Tab выходит наружу)
const catalogA11yConfig = {
    tabBehavior: (typeof localStorage !== 'undefined' && localStorage.getItem('catalogTabBehavior')) || 'classic'
};

// Состояние модуля
let catalogTrapActive = false;
let catalogLastActive = null;
let catalogKeydownHandler = null;
let catalogFocusinHandler = null;
let catalogMenuItems = [];
let catalogActiveIndex = 0;
let catalogCloseTimeoutId = null;
let catalogOnEndRef = null;

/**
 * Установить режим поведения Tab
 * @param {'trap' | 'classic'} mode
 */
export function setCatalogTabBehavior(mode) {
    if (mode !== 'trap' && mode !== 'classic') return;
    catalogA11yConfig.tabBehavior = mode;
    try { localStorage.setItem('catalogTabBehavior', mode); } catch(_) {}
}

/**
 * Получить фокусируемые элементы в контейнере
 */
export function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
}

/**
 * Обновить метки категорий в dropdown под текущий язык
 */
export function updateCatalogDropdownLabels(lang) {
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

/**
 * Открыть dropdown каталога
 */
export function openCatalogDropdown({ withTrap = false, savedLanguage = 'uk' } = {}) {
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
            const lang = savedLanguage || 'uk';
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
        updateCatalogDropdownLabels(savedLanguage || 'uk');
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
                closeCatalogAnimated({ restoreFocus: true });
                return;
            }
            if (key === 'Tab' && catalogA11yConfig.tabBehavior === 'trap') {
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

/**
 * Закрыть dropdown каталога с анимацией
 */
export function closeCatalogAnimated({ restoreFocus = false } = {}) {
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
            try { (catalogLastActive.isConnected ? catalogLastActive : catalogButton).focus(); } catch(_) {}
        }
        catalogLastActive = null;
        if (catalogOnEndRef) {
            catalogDropdown.removeEventListener('transitionend', catalogOnEndRef);
            catalogOnEndRef = null;
        }
    };
    const onEnd = (ev) => {
        if (ev && ev.target !== catalogDropdown) return;
        done();
    };
    catalogOnEndRef = onEnd;
    catalogDropdown.addEventListener('transitionend', onEnd, { once: true });
    catalogCloseTimeoutId = setTimeout(done, 200);
}

/**
 * Переключить dropdown каталога
 */
export function toggleCatalogDropdown(e, savedLanguage = 'uk') {
    if (e) e.stopPropagation();
    const catalogDropdown = document.querySelector('#catalogDropdown');
    if (!catalogDropdown) return;
    const isOpen = catalogDropdown.classList.contains('catalog-dropdown--open');
    if (isOpen) {
        closeCatalogAnimated({ restoreFocus: true });
    } else {
        openCatalogDropdown({ withTrap: catalogA11yConfig.tabBehavior === 'trap', savedLanguage });
    }
}

/**
 * Инициализация обработчиков каталога
 */
export function initCatalogDropdown(savedLanguage = 'uk') {
    const catalogButton = document.querySelector('#catalogButton');
    const catalogDropdown = document.querySelector('#catalogDropdown');
    
    if (catalogButton && catalogDropdown) {
        catalogButton.addEventListener('click', (e) => {
            toggleCatalogDropdown(e, savedLanguage);
        });
        
        document.addEventListener('click', (e) => {
            const isOnButton = e && e.target && e.target.closest ? e.target.closest('#catalogButton') : null;
            if (!catalogDropdown.contains(e.target) && !isOnButton) {
                closeCatalogAnimated({ restoreFocus: false });
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && catalogDropdown.classList.contains('catalog-dropdown--open')) {
                closeCatalogAnimated({ restoreFocus: true });
            }
        });

        catalogDropdown.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && catalogDropdown.contains(link)) {
                closeCatalogAnimated({ restoreFocus: false });
            }
        });

        window.addEventListener('hashchange', () => {
            closeCatalogAnimated({ restoreFocus: false });
        });
    }
}

// Экспорт конфига для внешнего использования
export { catalogA11yConfig };
