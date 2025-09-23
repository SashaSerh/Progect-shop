export let cart = (() => {
    const savedCart = localStorage.getItem('cart');
    try {
        const parsedCart = JSON.parse(savedCart) || [];
        return parsedCart.filter(item => 
            item.id && 
            item.name && typeof item.name === 'object' && 
            item.price && 
            typeof item.quantity === 'number' && item.quantity > 0
        );
    } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        return [];
    }
})();

export function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

export function updateCartUI(translations, lang) {
    const cartCount = document.querySelector('.cart-count');
    const cartItemsText = document.querySelector('.cart-text__items');
    const cartTotalText = document.querySelector('.cart-text__total');
    const cartDropdownItems = document.querySelector('.cart-dropdown__items');
    const cartDropdownSummary = document.querySelector('.cart-dropdown__summary');
    const cartModalItems = document.querySelector('.cart-items');
    const cartSummary = document.querySelector('.cart-summary');

    if (!cartCount || !cartItemsText || !cartTotalText || !cartDropdownItems || !cartDropdownSummary || !cartModalItems || !cartSummary) {
        console.error('Cart UI elements not found');
        return;
    }

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    cartCount.textContent = itemCount;
    cartItemsText.textContent = `${itemCount} ${translations[lang]?.['cart-items']?.split(' ')[1] || 'товаров'}`;
    cartTotalText.textContent = `${totalPrice.toFixed(2)} грн`;
    cartDropdownSummary.textContent = `${translations[lang]?.['cart-total']?.split(':')[0] || 'Итого'}: ${totalPrice.toFixed(2)} грн`;
    cartSummary.textContent = `${translations[lang]?.['cart-total']?.split(':')[0] || 'Итого'}: ${totalPrice.toFixed(2)} грн`;

    cartDropdownItems.innerHTML = '';
    cartModalItems.innerHTML = '';

    if (cart.length === 0) {
        cartDropdownItems.innerHTML = `<li>${translations[lang]?.['cart-empty'] || 'Корзина пуста'}</li>`;
        cartModalItems.innerHTML = `<li>${translations[lang]?.['cart-empty'] || 'Корзина пуста'}</li>`;
        return;
    }

    cart.forEach(item => {
        const itemName = item.name?.[lang] || 'Неизвестный товар';
        const itemPrice = item.price || 0;
        const itemQuantity = item.quantity || 1;
        const itemImage = item.image || 'https://placehold.co/150x150/gray/white?text=No+Image';

        const dropdownItem = document.createElement('li');
        dropdownItem.innerHTML = `
            <img src="${itemImage}" alt="${itemName}" onerror="this.src='https://placehold.co/150x150/red/white?text=Image+Error'">
            <div class="cart-dropdown__item-info">
                <p class="cart-dropdown__item-name">${itemName}</p>
                <p class="cart-dropdown__item-price">${itemPrice.toFixed(2)} грн x ${itemQuantity}</p>
            </div>
            <button class="cart-dropdown__item-remove" data-id="${item.id}">✕</button>
        `;
        cartDropdownItems.appendChild(dropdownItem);

        const modalItem = document.createElement('li');
        modalItem.innerHTML = `
            ${itemName} - ${itemPrice.toFixed(2)} грн x ${itemQuantity}
            <button class="cart-item-remove" data-id="${item.id}">${translations[lang]?.['cart-clear']?.split(' ')[0] || 'Удалить'}</button>
        `;
        cartModalItems.appendChild(modalItem);
    });
}

export function addToCart(productId, products) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.warn(`Product with id ${productId} not found`);
        return;
    }
    const cartItem = cart.find(item => item.id === product.id);
    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
}

export function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

export function clearCart() {
    cart = [];
    saveCart();
}

export function toggleCartDropdown(e) {
    e.stopPropagation();
    const cartDropdown = document.querySelector('.cart-dropdown');
    const toggleBtn = document.querySelector('#cartDropdownToggle');
    if (cartDropdown) {
        cartDropdown.classList.toggle('cart-dropdown--open');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', cartDropdown.classList.contains('cart-dropdown--open'));
        }
        cartDropdown.animate([
            { opacity: 0, transform: 'translateY(-10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 300,
            easing: 'ease-in-out'
        });
    }
}

export function openCartModal(e) {
    e.stopPropagation();
    const cartModal = document.querySelector('.cart-modal');
    if (cartModal) {
        cartModal.showModal();
        cartModal.animate([
            { transform: 'translate(-50%, -50%) scale(0.95)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
        ], {
            duration: 300,
            easing: 'ease-in-out'
        });
    }
}

export function closeCartModal() {
    const cartModal = document.querySelector('.cart-modal');
    if (cartModal) {
        cartModal.close();
    }
}