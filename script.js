// Управление мобильным меню
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');

    toggleButton.addEventListener('click', () => {
        nav.classList.toggle('header__nav--open');
    });

    // Логика корзины
    const cart = []; // Пустая корзина, товары добавляются кнопками

    const cartButton = document.getElementById('cartButton');
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

    // Функция обновления корзины
    function updateCart() {
        // Очистка списков
        cartItemsList.innerHTML = '';
        cartDropdownItems.innerHTML = '';

        // Добавление товаров в модал
        cart.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${item.name} - ${item.quantity} шт. - ${item.price * item.quantity} грн
                <button onclick="removeItem(${item.id})">Удалить</button>
            `;
            cartItemsList.appendChild(li);

            // Добавление товаров в выпадающее окно
            const dropdownLi = document.createElement('li');
            dropdownLi.textContent = `${item.name} - ${item.quantity} шт. - ${item.price * item.quantity} грн`;
            cartDropdownItems.appendChild(dropdownLi);
        });

        // Расчёт количества и суммы
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        cartCount.textContent = totalItems;
        cartTotal.textContent = `${totalPrice} грн`;
        cartModalTotal.textContent = `${totalPrice} грн`;
        cartDropdownTotal.textContent = `${totalPrice} грн`;
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

    // Открытие модала
    cartButton.addEventListener('click', (e) => {
        if (e.target === cartDropdownToggle) return; // Игнорировать клик по стрелочке
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

    // Закрытие выпадающего окна при клике вне
    document.addEventListener('click', (e) => {
        if (!cartButton.contains(e.target) && !cartDropdown.contains(e.target)) {
            cartDropdown.classList.remove('cart-dropdown--open');
        }
    });

    // Инициализация
    updateCart();
});