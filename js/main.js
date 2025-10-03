import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme, bindThemeEvents } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { products, renderProducts, filterProducts } from './products.js';
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
    bindThemeEvents(); // Привязываем обработчики тем
    switchLanguage(savedLanguage);
    renderProducts(savedLanguage, translations);
    updateCartUI(translations, savedLanguage);
    initNavigation();
    
    // Инициализация мобильного заголовка
    initMobileHeader();

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
    if (categorySelect) categorySelect.addEventListener('change', () => filterProducts(savedLanguage, translations));
    if (priceSelect) priceSelect.addEventListener('change', () => filterProducts(savedLanguage, translations));

    document.querySelectorAll('.language-switcher').forEach(button => {
        button.addEventListener('click', () => {
            const lang = button.dataset.lang;
            if (!['ru', 'uk'].includes(lang)) return;
            switchLanguage(lang);
            savedLanguage = lang;
            renderProducts(lang, translations);
            updateCartUI(translations, lang);
            updateProfileButton(translations, lang);
        });
    });

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
    const hamburgerToggle = document.querySelector('.hamburger-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav__link');
    const mobileCartButton = document.querySelector('.mobile-nav__cart');
    const mobileProfileButton = document.querySelector('.mobile-nav__profile');
    const mobileNavOverlay = document.createElement('div');

    if (!hamburgerToggle || !mobileNav) {
        console.log('Мобильный заголовок не найден');
        return;
    }

    // Создаем overlay для закрытия меню при клике вне его
    mobileNavOverlay.className = 'mobile-nav-overlay';
    mobileNavOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 998;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    `;
    document.body.appendChild(mobileNavOverlay);

    // Функция открытия/закрытия мобильного меню
    function toggleMobileNav(open = null) {
        const isOpen = open !== null ? open : !mobileNav.classList.contains('active');
        
        if (isOpen) {
            hamburgerToggle.classList.add('active');
            mobileNav.classList.add('active');
            mobileNavOverlay.style.opacity = '1';
            mobileNavOverlay.style.visibility = 'visible';
            document.body.style.overflow = 'hidden'; // Блокируем прокрутку
            hamburgerToggle.setAttribute('aria-expanded', 'true');
            mobileNav.setAttribute('aria-hidden', 'false');
        } else {
            hamburgerToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            mobileNavOverlay.style.opacity = '0';
            mobileNavOverlay.style.visibility = 'hidden';
            document.body.style.overflow = ''; // Разблокируем прокрутку
            hamburgerToggle.setAttribute('aria-expanded', 'false');
            mobileNav.setAttribute('aria-hidden', 'true');
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

    // Закрытие меню при клике по overlay
    mobileNavOverlay.addEventListener('click', () => {
        toggleMobileNav(false);
    });

    // Закрытие меню при клике по ссылкам навигации
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggleMobileNav(false);
            
            // Добавляем анимацию клика
            link.style.transform = 'scale(0.95)';
            setTimeout(() => {
                link.style.transform = '';
            }, 150);
        });
    });

    // Обработчик мобильной корзины
    if (mobileCartButton) {
        mobileCartButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileNav(false);
            
            // Открываем корзину (используем существующую функцию)
            if (typeof openCartModal === 'function') {
                openCartModal();
            }
            
            // Обновляем UI корзины
            if (typeof updateCartUI === 'function' && typeof translations !== 'undefined' && typeof savedLanguage !== 'undefined') {
                updateCartUI(translations, savedLanguage);
            }
        });
    }

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
}

// Экспорт функций
window.initModernMobileEffects = initModernMobileEffects;
window.initMobileHeader = initMobileHeader;