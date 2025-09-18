export let cart = JSON.parse(localStorage.getItem('cart')) || [];

export function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('Cart saved:', cart);
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
    cartItemsText.textContent = `${itemCount} ${translations[lang]['cart-items'].split(' ')[1]}`;
    cartTotalText.textContent = `$${totalPrice.toFixed(2)}`;
    cartDropdownSummary.textContent = `${translations[lang]['cart-total'].split(':')[0]}: $${totalPrice.toFixed(2)}`;
    cartSummary.textContent = `${translations[lang]['cart-total'].split(':')[0]}: $${totalPrice.toFixed(2)}`;

    cartDropdownItems.innerHTML = '';
    cartModalItems.innerHTML = '';

    cart.forEach(item => {
        const dropdownItem = document.createElement('li');
        dropdownItem.innerHTML = `
            <img src="${item.image}" alt="${item.name[lang]}">
            <div class="cart-dropdown__item-info">
                <p class="cart-dropdown__item-name">${item.name[lang]}</p>
                <p class="cart-dropdown__item-price">$${item.price.toFixed(2)} x ${item.quantity}</p>
            </div>
            <button class="cart-dropdown__item-remove" data-id="${item.id}">􀆄</button>
        `;
        cartDropdownItems.appendChild(dropdownItem);

        const modalItem = document.createElement('li');
        modalItem.innerHTML = `
            ${item.name[lang]} - $${item.price.toFixed(2)} x ${item.quantity}
            <button class="cart-item-remove" data-id="${item.id}">${translations[lang]['cart-clear'].split(' ')[0]}</button>
        `;
        cartModalItems.appendChild(modalItem);
    });
}

export function addToCart(productId, products) {
    console.log('Adding to cart:', productId);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
}

export function removeFromCart(productId) {
    console.log('Removing from cart:', productId);
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

export function clearCart() {
    console.log('Clearing cart');
    cart = [];
    saveCart();
}

export function toggleCartDropdown(e) {
    console.log('Toggling cart dropdown');
    e.stopPropagation();
    const cartDropdown = document.querySelector('.cart-dropdown');
    if (cartDropdown) {
        cartDropdown.classList.toggle('cart-dropdown--open');
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
    console.log('Opening cart modal');
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
    console.log('Closing cart modal');
    const cartModal = document.querySelector('.cart-modal');
    if (cartModal) {
        cartModal.animate([
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(0.95)', opacity: 0 }
        ], {
            duration: 300,
            easing: 'ease-in-out'
        }).onfinish = () => cartModal.close();
    }
}