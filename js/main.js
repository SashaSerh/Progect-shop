import { cart, saveCart, updateCartUI, addToCart, removeFromCart, clearCart, toggleCartDropdown, openCartModal, closeCartModal } from './cart.js';
import { toggleTheme, initTheme } from './theme.js';
import { translations, switchLanguage } from './i18n.js';
import { products, renderProducts, filterProducts } from './products.js';
import { initNavigation } from './navigation.js';
import { updateProfileButton, openModal, closeModal } from './auth.js';

async function loadComponent(containerId, componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Failed to load ${componentPath}: ${response.status}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        } else {
            console.error(`Container ${containerId} not found`);
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing components');
    
    // Загрузка компонентов
    await Promise.all([
        loadComponent('header-container', 'components/header.html'),
        loadComponent('hero-container', 'components/hero.html'),
        loadComponent('services-container', 'components/services.html'),
        loadComponent('products-container', 'components/products.html'),
        loadComponent('contacts-container', 'components/contacts.html'),
        loadComponent('footer-container', 'components/footer.html'),
        loadComponent('cart-modal-container', 'components/cart.html')
    ]);

    // Проверка и исправление языка
    let savedLanguage = localStorage.getItem('language') || 'ru';
    if (!['ru', 'uk'].includes(savedLanguage)) {
        console.warn(`Некорректный язык "${savedLanguage}", устанавливаем ru`);
        savedLanguage = 'ru';
        localStorage.setItem('language', savedLanguage);
    }

    // Инициализация
    initTheme();
    switchLanguage(savedLanguage);
    renderProducts(savedLanguage, translations);
    updateCartUI(translations, savedLanguage);
    initNavigation();

    // Инициализация авторизации
    const profileButton = document.getElementById('profileButton');
    const profileModal = document.getElementById('profileModal');
    const modalClose = document.querySelector('.modal__close');
    
    if (profileButton && profileModal && modalClose) {
        updateProfileButton(translations, savedLanguage); // Инициализация кнопки профиля
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
        console.log('Profile button initialized successfully');
    } else {
        console.error('Ошибка: Не найдены элементы #profileButton, #profileModal или .modal__close');
    }

    // Обработчики событий
    const categorySelect = document.getElementById('category');
    const priceSelect = document.getElementById('price');
    if (categorySelect) categorySelect.addEventListener('change', () => filterProducts(savedLanguage, translations));
    if (priceSelect) priceSelect.addEventListener('change', () => filterProducts(savedLanguage, translations));

    document.querySelectorAll('.language-switcher').forEach(button => {
        button.addEventListener('click', () => {
            const lang = button.dataset.lang;
            if (!['ru', 'uk'].includes(lang)) {
                console.warn(`Некорректный язык "${lang}", пропускаем`);
                return;
            }
            switchLanguage(lang);
            renderProducts(lang, translations);
            updateCartUI(translations, lang);
            updateProfileButton(translations, lang);
        });
    });

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const openCartModalButton = document.querySelector('#openCartModal');
    if (openCartModalButton) openCartModalButton.addEventListener('click', openCartModal);

    const cartDropdownToggle = document.querySelector('#cartDropdownToggle');
    if (cartDropdownToggle) cartDropdownToggle.addEventListener('click', toggleCartDropdown);

    const checkoutButton = document.querySelector('.cart-button--checkout');
    if (checkoutButton) checkoutButton.addEventListener('click', openCartModal);

    const closeModalButton = document.querySelector('.cart-modal__close');
    if (closeModalButton) closeModalButton.addEventListener('click', closeCartModal);

    const clearCartButton = document.querySelector('.cart-button--clear');
    if (clearCartButton) clearCartButton.addEventListener('click', () => {
        clearCart();
        updateCartUI(translations, savedLanguage);
    });

    const productsGrid = document.querySelector('.products__grid');
    if (productsGrid) {
        productsGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-card__button')) {
                const productId = parseInt(e.target.dataset.id);
                addToCart(productId, products);
                updateCartUI(translations, savedLanguage);
            }
        });
    }

    const servicesGrid = document.querySelector('.services__grid');
    if (servicesGrid) {
        servicesGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('service-card__button')) {
                const button = e.target;
                const productId = button.dataset.id;
                const lang = localStorage.getItem('language') || 'ru';
                const product = {
                    id: productId,
                    name: { ru: button.dataset.nameRu, uk: button.dataset.nameUk },
                    price: parseFloat(button.dataset.price),
                    image: 'https://picsum.photos/150'
                };
                const cartItem = cart.find(item => item.id === productId);
                if (cartItem) {
                    cartItem.quantity += 1;
                } else {
                    cart.push({ ...product, quantity: 1 });
                }
                saveCart();
                updateCartUI(translations, lang);
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

    // Обработка ошибок изображений
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'https://placehold.co/150x150/red/white?text=Image+Error';
        }
    }, true);
});