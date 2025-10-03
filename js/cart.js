import { products } from './products.js';

export let cart = JSON.parse(localStorage.getItem('cart')) || [];

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

export function openCartModal(e) {
    e.stopPropagation();
    const cartModal = document.querySelector('#cartModal');
    if (cartModal) {
        cartModal.style.display = 'block';
    }
}

export function closeCartModal() {
    const cartModal = document.querySelector('#cartModal');
    if (cartModal) {
        cartModal.style.display = 'none';
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