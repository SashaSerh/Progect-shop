import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme, bindThemeEvents } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { products, renderProducts, filterProducts } from './products.js';
import { contentConfig } from './content-config.js';
import { initMarketing } from './marketing.js';
import { initNavigation } from './navigation.js';
import { updateProfileButton, openModal, closeModal } from './auth.js';

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

    let savedLanguage = localStorage.getItem('language') || 'ru';
    if (!['ru', 'uk'].includes(savedLanguage)) {
        savedLanguage = 'ru';
        localStorage.setItem('language', savedLanguage);
    }

    initTheme();
    switchLanguage(savedLanguage);
    renderProducts(savedLanguage, translations);
    if (typeof initLanguageSwitchers === 'function') {
        initLanguageSwitchers();
    }
    updateCartUI(translations, savedLanguage);
    initNavigation();
    initMarketing();

    // Desktop: сворачиваем верхнюю полосу, оставляя .header__main-bar
    initDesktopHeaderCondense();

    // Рендер портфолио по конфигу
    const portfolioGrid = document.querySelector('.portfolio__grid');
    if (portfolioGrid && Array.isArray(contentConfig.portfolio)) {
        portfolioGrid.innerHTML = '';
        contentConfig.portfolio.forEach(item => {
            const fig = document.createElement('figure');
            fig.className = 'portfolio__item';
            fig.innerHTML = `
              <img src="${item.src}" alt="${item.alt}" loading="lazy">
            `;
            portfolioGrid.appendChild(fig);
        });
    }
    
    // Инициализация мобильного заголовка
    initMobileHeader();
    
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

// Экспорт функций для использования в других файлах
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
        };
        const maxAngle = 30; // градусы
        const threshold = 8; // px
        const closeThreshold = Math.max(80, Math.floor((window.innerWidth || 360) * 0.2));

        const onStart = (evt) => {
            if (!mobileNav.classList.contains('active')) return;
            const p = getPoint(evt);
            state.startX = p.x; state.startY = p.y;
            state.dx = 0; state.dy = 0; state.moved = false; state.allow = false; state.active = true;
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
            evt.preventDefault();
        };
        const onEnd = () => {
            if (!state.active) return;
            state.active = false;
            mobileNav.style.transition = '';
            const applied = extractTranslateX(mobileNav);
            if (applied >= closeThreshold) {
                mobileNav.style.transform = '';
                toggleMobileNav(false);
                try { navigator.vibrate && navigator.vibrate(10); } catch(_) {}
            } else {
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
    let ticking = false;
    let fixedApplied = false;
    let spacer = null;

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
        // Гарантируем фиксацию на десктопе (в т.ч. для Safari/сложных контейнеров): включаем fixed-режим
        let breaksSticky = true;
        if (breaksSticky && !fixedApplied) {
            // Добавляем spacer, равный текущей высоте header, чтобы не прыгал контент
            spacer = document.createElement('div');
            spacer.className = 'header-spacer';
            spacer.style.height = header.offsetHeight + 'px';
            header.classList.add('header--fixed');
            header.parentNode.insertBefore(spacer, header.nextSibling);
            fixedApplied = true;
        } else if (!breaksSticky && fixedApplied) {
            header.classList.remove('header--fixed');
            if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
            spacer = null;
            fixedApplied = false;
        } else if (fixedApplied && spacer) {
            // обновляем высоту спейсера при ресайзе
            spacer.style.height = header.offsetHeight + 'px';
        }
    };
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const isDesktop = window.innerWidth >= 769;
            if (!isDesktop) {
                header.classList.remove('header--condensed');
                ticking = false;
                return;
            }
            const y = window.pageYOffset || document.documentElement.scrollTop || 0;
            if (y > 10) header.classList.add('header--condensed');
            else header.classList.remove('header--condensed');
            ticking = false;
        });
    };
    window.addEventListener('scroll', () => { ensureStickyOrFixed(); onScroll(); }, { passive: true });
    window.addEventListener('resize', () => { ensureStickyOrFixed(); onScroll(); }, { passive: true });
    ensureStickyOrFixed();
    onScroll();
}