// Управление мобильным меню
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');

    toggleButton.addEventListener('click', () => {
        nav.classList.toggle('header__nav--open');
    });

    // Логика корзины
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const cartButton = document.getElementById('cartButton');
    const cartButtonSecondary = document.getElementById('cartButtonSecondary');
    const cartModal = document.getElementById('cartModal');
    const closeCart = document.getElementById('closeCart');
    const clearCart = document.getElementById('clearCart');
    const cartItemsList = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const cartModalTotal = document.getElementById('cartModalTotal');
    const cartDropdownToggle = document.getElementById('cartDropdownToggle');
    const cartDropdown = document.getElementById('cartDropdown');
    const cartDropdownItems = document.getElementById('cartDropdownItems');
    const cartDropdownTotal = document.getElementById('cartDropdownTotal');
    const goToCart = document.getElementById('goToCart');
    const checkoutCart = document.getElementById('checkoutCart');

    // Функция сохранения корзины в localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Функция обновления корзины
    function updateCart() {
        cartItemsList.innerHTML = '';
        cartDropdownItems.innerHTML = '';

        cart.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${item.name} - ${item.quantity} шт. - ${item.price * item.quantity} грн
                <button onclick="removeItem(${item.id})">Удалить</button>
            `;
            cartItemsList.appendChild(li);

            const dropdownLi = document.createElement('li');
            dropdownLi.innerHTML = `
                <img src="https://placehold.co/50x50" alt="${item.name}" class="cart-dropdown__item-image">
                <div class="cart-dropdown__item-info">
                    <div class="cart-dropdown__item-name">${item.name}</div>
                    <div class="cart-dropdown__item-price">${item.quantity} шт. × ${item.price} грн = ${item.price * item.quantity} грн</div>
                </div>
                <button class="cart-dropdown__item-remove" data-id="${item.id}" aria-label="Удалить товар">🗑</button>
            `;
            cartDropdownItems.appendChild(dropdownLi);
        });

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartCount.textContent = totalItems;
        cartTotal.textContent = totalPrice;
        cartModalTotal.textContent = `${totalPrice} грн`;
        cartDropdownTotal.textContent = `${totalPrice} грн`;

        saveCart();

        document.querySelectorAll('.cart-dropdown__item-remove').forEach(button => {
            button.addEventListener('click', () => {
                const id = parseInt(button.dataset.id);
                removeItem(id);
            });
        });
    }

    // Функция удаления товара
    window.removeItem = function(id) {
        const index = cart.findIndex(item => item.id === id);
        if (index !== -1) {
            cart.splice(index, 1);
            updateCart();
        }
    };

    // Добавление товара в корзину
    document.querySelectorAll('.product-card__button').forEach(button => {
        button.addEventListener('click', () => {
            const id = parseInt(button.dataset.id);
            const name = button.dataset.name;
            const price = parseInt(button.dataset.price);

            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ id, name, price, quantity: 1 });
            }

            updateCart();
        });
    });

    // Открытие модала (основная кнопка)
    cartButton.addEventListener('click', (e) => {
        if (e.target === cartDropdownToggle) return;
        cartDropdown.classList.remove('cart-dropdown--open');
        updateCart();
        cartModal.showModal();
    });

    // Открытие модала (вторая кнопка)
    cartButtonSecondary.addEventListener('click', () => {
        cartDropdown.classList.remove('cart-dropdown--open');
        updateCart();
        cartModal.showModal();
    });

    // Закрытие модала
    closeCart.addEventListener('click', () => {
        cartModal.close();
    });

    // Очистка корзины
    clearCart.addEventListener('click', () => {
        cart.length = 0;
        updateCart();
    });

    // Открытие/закрытие выпадающего окна
    cartDropdownToggle.addEventListener('click', () => {
        cartDropdown.classList.toggle('cart-dropdown--open');
        if (cartDropdown.classList.contains('cart-dropdown--open')) {
            updateCart();
        }
    });

    // Кнопка "Посмотреть корзину"
    goToCart.addEventListener('click', () => {
        cartDropdown.classList.remove('cart-dropdown--open');
        updateCart();
        cartModal.showModal();
    });

    // Кнопка "Оформить заказ"
    checkoutCart.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Корзина пуста!');
            return;
        }
        cartDropdown.classList.remove('cart-dropdown--open');
        alert('Переход к оформлению заказа... (заглушка для реальной логики)');
    });

    // Закрытие выпадающего окна при клике вне
    document.addEventListener('click', (e) => {
        if (!cartButton.contains(e.target) && !cartButtonSecondary.contains(e.target) && !cartDropdown.contains(e.target)) {
            cartDropdown.classList.remove('cart-dropdown--open');
        }
    });

    // Логика фильтров
    const priceFilter = document.getElementById('price-filter');
    const categoryFilter = document.getElementById('category-filter');
    const productCards = document.querySelectorAll('.product-card');

    function applyFilters() {
        const priceValue = priceFilter.value;
        const categoryValue = categoryFilter.value;

        productCards.forEach(card => {
            const price = parseInt(card.dataset.price);
            const category = card.dataset.category;

            let priceMatch = true;
            let categoryMatch = true;

            if (priceValue === 'low' && price > 200) priceMatch = false;
            if (priceValue === 'medium' && (price < 200 || price > 300)) priceMatch = false;
            if (priceValue === 'high' && price <= 300) priceMatch = false;

            if (categoryValue !== 'all' && category !== categoryValue) categoryMatch = false;

            if (priceMatch && categoryMatch) {
                card.style.display = 'block';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transition = 'opacity 0.3s ease';
                }, 10);
            } else {
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    }

    priceFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);

    // Инициализация
    updateCart();
    applyFilters();
});