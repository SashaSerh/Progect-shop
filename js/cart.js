import { products } from './products.js';

// Безопасно читаем localStorage (в средах без window/localStorage, например в тестах, fallback к пустому массиву)
function safeReadInitialCart() {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem('cart');
            return raw ? JSON.parse(raw) : [];
        }
    } catch (_) {/* ignore */}
    return [];
}

export let cart = safeReadInitialCart();

export function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

export function addToCart(productId, products) {
    const product = products.find(p => p.id == productId);
    if (!product) return;
    const cartItem = cart.find(item => item.id == productId);
    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ id: productId, quantity: 1 });
    }
    saveCart();
}

export function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    saveCart();
}

export function clearCart() {
    cart = [];
    saveCart();
}

export function toggleCartDropdown(e) {
    e.stopPropagation();
    const cartDropdown = document.querySelector('#cartDropdown');
    const cartDropdownToggle = document.querySelector('#cartDropdownToggle');
    if (cartDropdown && cartDropdownToggle) {
        cartDropdown.classList.toggle('cart-dropdown--open');
        cartDropdownToggle.setAttribute('aria-expanded', cartDropdown.classList.contains('cart-dropdown--open'));
    }
}

// Внутренние утилиты для блокировки прокрутки body с сохранением позиции
let __cartScrollY = 0;
let __cartEscHandler = null;
let __cartTrapHandler = null;
let __cartLastFocus = null;

function getFocusable(container) {
    if (!container) return [];
    const selector = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';
    const nodes = Array.from(container.querySelectorAll(selector));
    return nodes.filter(el => el.getAttribute('tabindex') !== '-1');
}

function lockBodyScroll() {
    try {
        __cartScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${__cartScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    } catch (_) { /* ignore */ }
}

function unlockBodyScroll() {
    try {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, __cartScrollY || 0);
    } catch (_) { /* ignore */ }
}

export function openCartModal(e) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const cartModal = document.querySelector('#cartModal');
    if (!cartModal) return;

    // Сохраняем последний фокусированный элемент для возврата после закрытия
    __cartLastFocus = document.activeElement;

    // Создаём/показываем подложку под модалкой
    let backdrop = document.querySelector('.cart-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'cart-backdrop';
        document.body.appendChild(backdrop);
    }
    backdrop.classList.add('is-visible');
    backdrop.addEventListener('click', closeCartModal, { once: true });

    // Показываем модалку
    cartModal.style.display = 'block';

    // Блокируем прокрутку фона
    lockBodyScroll();

    // Закрытие по Esc
    __cartEscHandler = (evt) => {
        if (evt.key === 'Escape') {
            closeCartModal();
        }
    };
    document.addEventListener('keydown', __cartEscHandler);

    // Перемещаем фокус внутрь модалки и включаем trap
    const focusables = getFocusable(cartModal);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first && typeof first.focus === 'function') first.focus();
    __cartTrapHandler = (evt) => {
        if (evt.key !== 'Tab') return;
        if (focusables.length === 0) return;
        if (evt.shiftKey && document.activeElement === first) {
            evt.preventDefault();
            last.focus();
        } else if (!evt.shiftKey && document.activeElement === last) {
            evt.preventDefault();
            first.focus();
        }
    };
    cartModal.addEventListener('keydown', __cartTrapHandler);
}

export function closeCartModal() {
    const cartModal = document.querySelector('#cartModal');
    const backdrop = document.querySelector('.cart-backdrop');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
    if (backdrop) {
        backdrop.classList.remove('is-visible');
        // удаляем элемент после анимации (если будет)
        backdrop.parentElement && backdrop.parentElement.removeChild(backdrop);
    }
    // Возвращаем прокрутку
    unlockBodyScroll();
    // Снимаем обработчик Esc
    if (__cartEscHandler) {
        document.removeEventListener('keydown', __cartEscHandler);
        __cartEscHandler = null;
    }
    // Снимаем trap и возвращаем фокус
    if (__cartTrapHandler && cartModal) {
        cartModal.removeEventListener('keydown', __cartTrapHandler);
        __cartTrapHandler = null;
    }
    if (__cartLastFocus && typeof __cartLastFocus.focus === 'function') {
        try { __cartLastFocus.focus(); } catch(_) {}
        __cartLastFocus = null;
    }
}

export function updateCartUI(translations, lang) {
    // Обновляем ВСЕ счетчики корзины (мобильный и десктопный)
    const cartCounts = document.querySelectorAll('.cart-count');
    const cartItemsText = document.querySelector('.cart-text__items');
    const cartTotalText = document.querySelector('.cart-text__total');
    const cartDropdownItems = document.querySelector('.cart-dropdown__items');
    const cartDropdownSummary = document.querySelector('.cart-dropdown__summary');
    const cartItems = document.querySelector('.cart-items');
    const cartSummary = document.querySelector('.cart-summary');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => {
        const product = products.find(p => p.id == item.id);
        return product ? sum + product.price * item.quantity : sum;
    }, 0);

    // Обновляем все счетчики корзины (мобильный и десктопный)
    cartCounts.forEach(cartCount => {
        if (cartCount) cartCount.textContent = totalItems;
    });
    
    if (cartItemsText) cartItemsText.textContent = translations[lang]['cart-items'].replace('0', totalItems);
    if (cartTotalText) cartTotalText.textContent = `${totalPrice.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн`;
    if (cartDropdownSummary) cartDropdownSummary.textContent = translations[lang]['cart-total'].replace('$0.00', `${totalPrice.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн`);
    if (cartSummary) cartSummary.textContent = translations[lang]['cart-total'].replace('$0.00', `${totalPrice.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн`);

    if (cartDropdownItems) {
        cartDropdownItems.innerHTML = '';
        if (cart.length === 0) {
            const li = document.createElement('li');
            li.textContent = translations[lang]['cart-empty'];
            cartDropdownItems.appendChild(li);
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id == item.id);
                if (product) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <img src="${product.image}" alt="${product.name[lang]}" loading="lazy" onerror="this.src='https://placehold.co/150x150/blue/white?text=Image+Not+Found'">
                        <div>
                            <span class="cart-dropdown__item-name">${product.name[lang]}</span>
                            <span class="cart-dropdown__item-price">${(product.price * item.quantity).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн (x${item.quantity})</span>
                        </div>
                        <button class="cart-dropdown__item-remove" data-id="${item.id}" aria-label="Удалить ${product.name[lang]}">✕</button>
                    `;
                    cartDropdownItems.appendChild(li);
                }
            });
        }
    }

    if (cartItems) {
        cartItems.innerHTML = '';
        if (cart.length === 0) {
            const li = document.createElement('li');
            li.textContent = translations[lang]['cart-empty'];
            cartItems.appendChild(li);
        } else {
            cart.forEach(item => {
                const product = products.find(p => p.id == item.id);
                if (product) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div>
                            <span class="cart-item-name">${product.name[lang]}</span>
                            <span class="cart-item-price">${(product.price * item.quantity).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн (x${item.quantity})</span>
                        </div>
                        <button class="cart-item-remove" data-id="${item.id}" aria-label="Удалить ${product.name[lang]}">✕</button>
                    `;
                    cartItems.appendChild(li);
                }
            });
        }
    }
}