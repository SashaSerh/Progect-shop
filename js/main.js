import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme, bindThemeEvents } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { initWelcomeOverlay, needsWelcomeOverlay } from './welcome.js';
import { products, renderProducts, filterProducts, getMergedProducts } from './products.js';
import { contentConfig } from './content-config.js';
import { initMarketing } from './marketing.js';
import { initNavigation } from './navigation.js';
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

function toggleCatalogDropdown(e) {
    e.stopPropagation();
    const catalogDropdown = document.querySelector('#catalogDropdown');
    const catalogButton = document.querySelector('#catalogButton');
    if (catalogDropdown) {
        catalogDropdown.classList.toggle('catalog-dropdown--open');
        if (catalogButton) {
            catalogButton.setAttribute('aria-expanded', catalogDropdown.classList.contains('catalog-dropdown--open'));
        }
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

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadComponent('header-container', 'components/header.html'),
        loadComponent('hero-container', 'components/hero.html'),
        loadComponent('services-container', 'components/services.html'),
        loadComponent('products-container', 'components/products.html'),
        // product-detail загружается по маршруту, но подключаем шаблон заранее (скрыт)
        loadComponent('product-detail-container', 'components/product-detail.html').catch(() => {}),
        loadComponent('contacts-container', 'components/contacts.html'),
        loadComponent('portfolio-container', 'components/portfolio.html'),
        loadComponent('footer-container', 'components/footer.html'),
        loadComponent('cart-modal-container', 'components/cart.html')
    ]);

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
    let savedLanguage = localStorage.getItem('language');
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
    try {
        const merged = getMergedProducts();
        // expose to window for other modules/tests
        window.products = merged;
        renderProducts(savedLanguage, translations, merged);
    } catch (err) {
        renderProducts(savedLanguage, translations);
    }

    // Загружаем компонент приветствия (лениво) и отображаем, если первый визит
    // Show overlay if cookie missing (first visit or expired manual clear scenario)
    try {
        await loadComponent('welcome-container', 'components/welcome.html');
        initWelcomeOverlay(savedLanguage);
    } catch (e) { /* ignore */ }
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
        const admin = await import('./admin-products.js');
        if (admin && typeof admin.initAdminProducts === 'function') {
            admin.initAdminProducts(translations, savedLanguage);
        }
    } catch (err) { /* ignore */ }

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
    bindThemeEvents();

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
        catalogButton.addEventListener('click', toggleCatalogDropdown);
        document.addEventListener('click', (e) => {
            if (!catalogDropdown.contains(e.target) && !catalogButton.contains(e.target)) {
                catalogDropdown.classList.remove('catalog-dropdown--open');
                catalogButton.setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && catalogDropdown.classList.contains('catalog-dropdown--open')) {
                catalogDropdown.classList.remove('catalog-dropdown--open');
                catalogButton.setAttribute('aria-expanded', 'false');
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

    // Старый обработчик удален - теперь bindThemeEvents() обрабатывает все кнопки тем

    const checkoutButton = document.querySelector('.cart-button--checkout');
    if (checkoutButton) checkoutButton.addEventListener('click', openCartModal);

    const clearCartButton = document.querySelector('.cart-button--clear');
    if (clearCartButton) clearCartButton.addEventListener('click', () => {
        clearCart();
        updateCartUI(translations, savedLanguage);
    });

    const productsGrid = document.querySelector('.products__grid');
    if (productsGrid) {
        productsGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-card__button')) {
                const productId = e.target.dataset.id;
                addToCart(productId, products);
                updateCartUI(translations, savedLanguage);
            } else if (e.target.classList.contains('product-card__image') || e.target.classList.contains('product-card__title')) {
                // переход на страницу детали товара
                const card = e.target.closest('.product-card');
                const id = card?.dataset.id;
                if (id) {
                    location.hash = `#product-${id}`;
                }
            }
        });
    }

    const servicesGrid = document.querySelector('.services__grid');
    if (servicesGrid) {
        servicesGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('service-card__button')) {
                const productId = e.target.dataset.id;
                addToCart(productId, products);
                updateCartUI(translations, savedLanguage);
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
});


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
    section.querySelector('.product-detail__price').textContent = `${Number(product.price).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн`;
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
        btn.onclick = () => { addToCart(product.id, products); updateCartUI(translations, lang); };
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
    function handleRoute() {
        const hash = location.hash || '';
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
        } else {
            // Show main sections
            showSection('hero-container', true);
            showSection('services-container', true);
            showSection('products-container', true);
            showSection('portfolio-container', true);
            showSection('contacts-container', true);
            showSection('product-detail-container', false);
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

// Toast helper to prompt user to refresh when SW updates
function showUpdateToast() {
    const host = document.getElementById('toast-container');
    if (!host) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.maxWidth = '520px';
    toast.style.margin = '8px auto';
    toast.style.background = 'var(--surface, #222)';
    toast.style.color = 'var(--on-surface, #fff)';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,.25)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.zIndex = '5000';
    const text = document.createElement('div');
    text.textContent = 'Доступно обновление. Обновить страницу?';
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Обновить';
    btn.addEventListener('click', () => {
        // Reload to pick latest assets
        location.reload();
    });
    const close = document.createElement('button');
    close.className = 'btn btn--ghost';
    close.textContent = 'Позже';
    close.addEventListener('click', () => toast.remove());
    toast.appendChild(text);
    toast.appendChild(btn);
    toast.appendChild(close);
    host.appendChild(toast);
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