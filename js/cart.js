import { products } from './products.js';
import { translations } from './i18n.js';

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

function getCurrentLang() {
    try {
        const lang = localStorage.getItem('language');
        return (lang && (lang === 'ru' || lang === 'uk')) ? lang : 'ru';
    } catch (_) { return 'ru'; }
}

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

    // Мобильный режим: используем overlay мобильного меню для единого фона
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    let backdrop;
    if (isMobile) {
        backdrop = document.querySelector('.mobile-nav-overlay');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'mobile-nav-overlay';
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('is-visible');
        // В мобильном варианте клики по overlay закрывают корзину
        const overlayClose = () => closeCartModal();
        backdrop.addEventListener('click', overlayClose, { once: true });
        // Сохраняем на элементе, чтобы снять позже (вдруг понадобится)
        backdrop.__cartOverlayClose = overlayClose;
    } else {
        // Десктопный режим: собственная подложка
        backdrop = document.querySelector('.cart-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'cart-backdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('is-visible');
        backdrop.addEventListener('click', closeCartModal, { once: true });
    }

    // Показываем модалку
    cartModal.style.display = 'block';
    if (isMobile) {
        cartModal.classList.add('cart-modal--active');
    }

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
    let focusables = getFocusable(cartModal);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (first && typeof first.focus === 'function') first.focus();
    __cartTrapHandler = (evt) => {
        if (evt.key !== 'Tab') return;
        // Пересчитываем фокусабельные элементы динамически, т.к. содержимое может меняться
        focusables = getFocusable(cartModal);
        if (focusables.length === 0) return;
        if (evt.shiftKey && document.activeElement === first) {
            evt.preventDefault();
            (focusables[focusables.length - 1] || last)?.focus?.();
        } else if (!evt.shiftKey && document.activeElement === last) {
            evt.preventDefault();
            (focusables[0] || first)?.focus?.();
        }
    };
    cartModal.addEventListener('keydown', __cartTrapHandler);
}

export function closeCartModal() {
    const cartModal = document.querySelector('#cartModal');
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const backdrop = isMobile ? document.querySelector('.mobile-nav-overlay') : document.querySelector('.cart-backdrop');
    if (cartModal) {
        if (isMobile) {
            cartModal.classList.remove('cart-modal--active');
            // Дадим анимации закончиться перед скрытием
            setTimeout(() => { cartModal.style.display = 'none'; }, 250);
        } else {
            cartModal.style.display = 'none';
        }
    }
    if (backdrop) {
        backdrop.classList.remove('is-visible');
        // Для мобильного overlay не удаляем — его использует и меню
        if (!isMobile) {
            backdrop.parentElement && backdrop.parentElement.removeChild(backdrop);
        } else if (backdrop.__cartOverlayClose) {
            backdrop.removeEventListener('click', backdrop.__cartOverlayClose);
            delete backdrop.__cartOverlayClose;
        }
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
                        <button class="cart-dropdown__item-remove" data-id="${item.id}" aria-label="Удалить ${product.name[lang]} из корзины" title="Удалить">✕</button>
                    `;
                    li.setAttribute('tabindex', '0');
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
                        <button class="cart-item-remove" data-id="${item.id}" aria-label="Удалить ${product.name[lang]} из корзины" title="Удалить">✕</button>
                    `;
                    li.setAttribute('tabindex', '0');
                    cartItems.appendChild(li);
                }
            });
        }
    }
}

// UX: клавиша Delete удаляет активный элемент корзины (модалка)
document.addEventListener('keydown', (e) => {
    const cartModal = document.querySelector('#cartModal');
    if (!cartModal || cartModal.style.display !== 'block') return;
    if (e.key !== 'Delete') return;
    const focused = document.activeElement;
    const focusedLi = focused?.closest('li');
    const removeBtn = focusedLi?.querySelector('.cart-item-remove');
    if (removeBtn) {
        const id = removeBtn.getAttribute('data-id');
        if (!id) return;
        // Сохраняем копию для Undo
        const snapshot = [...cart];
        // Индекс текущего элемента для фокус-навигции после удаления
        const list = document.querySelector('.cart-items');
        const items = list ? Array.from(list.querySelectorAll('li')) : [];
        const currentIndex = focusedLi ? items.indexOf(focusedLi) : -1;
        removeFromCart(id);
        // Обновляем UI и управляем фокусом внутри модалки
        const lang = getCurrentLang();
        updateCartUI(translations, lang);
        // Фокус: на тот же индекс, либо предыдущий, либо на кнопки футера, если пусто
        queueMicrotask(() => {
            const newList = document.querySelector('.cart-items');
            const newItems = newList ? Array.from(newList.querySelectorAll('li')) : [];
            if (newItems.length > 0) {
                const targetIndex = currentIndex >= 0 && currentIndex < newItems.length
                    ? currentIndex
                    : Math.min(currentIndex, newItems.length - 1);
                const target = newItems[Math.max(0, targetIndex)];
                target?.focus?.();
            } else {
                const fallback = document.querySelector('.cart-button--checkout') || document.querySelector('.cart-modal__close');
                fallback?.focus?.();
            }
        });
        showUndoToast('Товар удалён', () => {
            cart = snapshot;
            saveCart();
            const lang2 = getCurrentLang();
            updateCartUI(translations, lang2);
            // Возвращаем фокус к восстановленному элементу, если возможно
            queueMicrotask(() => {
                const btn = document.querySelector(`.cart-items .cart-item-remove[data-id="${id}"]`);
                const li = btn?.closest('li');
                (li || btn || document.querySelector('.cart-button--checkout') || document.querySelector('.cart-modal__close'))?.focus?.();
            });
        });
    }
});

// Простой toast с Undo
function showUndoToast(message, onUndo) {
    const host = document.getElementById('toast-container');
    if (!host) return;
    // Очищаем предыдущий
    host.innerHTML = '';
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.style.background = 'rgba(0,0,0,0.8)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '12px';
    toast.style.display = 'inline-flex';
    toast.style.gap = '12px';
    toast.style.alignItems = 'center';
    toast.textContent = message;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Отменить';
    undo.style.marginLeft = '8px';
    undo.style.background = 'transparent';
    undo.style.border = '1px solid rgba(255,255,255,0.6)';
    undo.style.color = '#fff';
    undo.style.borderRadius = '8px';
    undo.style.padding = '6px 10px';
    undo.addEventListener('click', () => {
        onUndo?.();
        host.innerHTML = '';
    });
    toast.appendChild(undo);
    host.appendChild(toast);
    // Авто-скрытие через 4 сек
    setTimeout(() => {
        if (host.contains(toast)) host.removeChild(toast);
    }, 4000);
}