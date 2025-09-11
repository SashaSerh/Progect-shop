document.addEventListener('DOMContentLoaded', () => {
    // Объект переводов
    const translations = {
        ru: {
            'site-title': 'Монтаж и продажа кондиционеров и рекуператоров',
            'header-title': 'Климат Контроль',
            'nav-home': 'Главная',
            'nav-services': 'Услуги',
            'nav-products': 'Товары',
            'nav-contacts': 'Контакты',
            'lang-ru': 'Русский',
            'lang-uk': 'Українська',
            'cart-items': 'товаров на',
            'cart-total': 'Итого: ',
            'cart-view': 'Посмотреть корзину',
            'cart-checkout': 'Оформить заказ',
            'cart-title': 'Корзина',
            'cart-clear': 'Очистить корзину',
            'hero-title': 'Комфортный климат в вашем доме',
            'hero-subtitle': 'Профессиональный монтаж и продажа кондиционеров и вентиляционных рекуператоров',
            'hero-cta': 'Заказать консультацию',
            'services-title': 'Наши услуги',
            'service-ac-install-title': 'Монтаж кондиционеров',
            'service-ac-install-desc': 'Профессиональная установка кондиционеров любой сложности с гарантией.',
            'service-recuperator-install-title': 'Монтаж рекуператоров',
            'service-recuperator-install-desc': 'Установка вентиляционных систем для свежего воздуха в помещении.',
            'service-maintenance-title': 'Обслуживание систем',
            'service-maintenance-desc': 'Чистка, диагностика и ремонт кондиционеров и рекуператоров.',
            'service-order': 'Заказать',
            'advantages-title': 'Почему выбирают нас',
            'advantage-experience-title': 'Опыт',
            'advantage-experience-desc': 'Более 10 лет на рынке климатических систем.',
            'advantage-quality-title': 'Качество',
            'advantage-quality-desc': 'Используем только сертифицированное оборудование.',
            'advantage-warranty-title': 'Гарантия',
            'advantage-warranty-desc': 'Гарантия на монтаж и оборудование до 5 лет.',
            'products-title': 'Наши товары',
            'filter-price-label': 'Фильтр по цене:',
            'filter-category-label': 'Фильтр по категории:',
            'filter-all': 'Все',
            'filter-low': 'До 15000 грн',
            'filter-medium': '15000–30000 грн',
            'filter-high': 'Выше 30000 грн',
            'filter-ac': 'Кондиционеры',
            'filter-recuperator': 'Рекуператоры',
            'product-lg-title': 'Кондиционер LG Standard',
            'product-lg-desc': 'Мощность 2.5 кВт, энергоэффективность A++.',
            'product-samsung-title': 'Кондиционер Samsung Premium',
            'product-samsung-desc': 'Мощность 3.5 кВт, инверторный компрессор.',
            'product-daikin-title': 'Кондиционер Daikin Elite',
            'product-daikin-desc': 'Мощность 5 кВт, Wi-Fi управление.',
            'product-prana-title': 'Рекуператор Prana 150',
            'product-prana-desc': 'Производительность 135 м³/ч, компактный дизайн.',
            'product-ventoxx-title': 'Рекуператор Ventoxx Comfort',
            'product-ventoxx-desc': 'Производительность 200 м³/ч, низкий уровень шума.',
            'product-zehnder-title': 'Рекуператор Zehnder ComfoAir',
            'product-zehnder-desc': 'Производительность 350 м³/ч, высокоэффективный теплообменник.',
            'add-to-cart': 'Добавить в корзину',
            'reviews-title': 'Отзывы наших клиентов',
            'review-1-text': '"Быстро и качественно установили кондиционер. Очень довольны!"',
            'review-1-author': 'Анна, Киев',
            'review-2-text': '"Рекуператор работает идеально, воздух всегда свежий!"',
            'review-2-author': 'Игорь, Одесса',
            'review-3-text': '"Профессиональная команда, рекомендую!"',
            'review-3-author': 'Олег, Львов',
            'contacts-title': 'Свяжитесь с нами',
            'contacts-email-label': 'Email:',
            'contacts-phone-label': 'Телефон:',
            'contacts-address-label': 'Адрес:',
            'form-name-placeholder': 'Ваше имя',
            'form-email-placeholder': 'Ваш email',
            'form-message-placeholder': 'Ваше сообщение',
            'form-submit': 'Отправить',
            'footer-contacts-title': 'Контакты',
            'footer-copyright': '© 2025 Климат Контроль. Все права защищены.'
        },
        uk: {
            'site-title': 'Монтаж та продаж кондиціонерів і рекуператорів',
            'header-title': 'Клімат Контроль',
            'nav-home': 'Головна',
            'nav-services': 'Послуги',
            'nav-products': 'Товари',
            'nav-contacts': 'Контакти',
            'lang-ru': 'Русский',
            'lang-uk': 'Українська',
            'cart-items': 'товарів на',
            'cart-total': 'Разом: ',
            'cart-view': 'Переглянути кошик',
            'cart-checkout': 'Оформити замовлення',
            'cart-title': 'Кошик',
            'cart-clear': 'Очистити кошик',
            'hero-title': 'Комфортний клімат у вашому домі',
            'hero-subtitle': 'Професійний монтаж та продаж кондиціонерів і вентиляційних рекуператорів',
            'hero-cta': 'Замовити консультацію',
            'services-title': 'Наші послуги',
            'service-ac-install-title': 'Монтаж кондиціонерів',
            'service-ac-install-desc': 'Професійна установка кондиціонерів будь-якої складності з гарантією.',
            'service-recuperator-install-title': 'Монтаж рекуператорів',
            'service-recuperator-install-desc': 'Встановлення вентиляційних систем для свіжого повітря у приміщенні.',
            'service-maintenance-title': 'Обслуговування систем',
            'service-maintenance-desc': 'Чищення, діагностика та ремонт кондиціонерів і рекуператорів.',
            'service-order': 'Замовити',
            'advantages-title': 'Чому обирають нас',
            'advantage-experience-title': 'Досвід',
            'advantage-experience-desc': 'Понад 10 років на ринку кліматичних систем.',
            'advantage-quality-title': 'Якість',
            'advantage-quality-desc': 'Використовуємо лише сертифіковане обладнання.',
            'advantage-warranty-title': 'Гарантія',
            'advantage-warranty-desc': 'Гарантія на монтаж та обладнання до 5 років.',
            'products-title': 'Наші товари',
            'filter-price-label': 'Фільтр за ціною:',
            'filter-category-label': 'Фільтр за категорією:',
            'filter-all': 'Усі',
            'filter-low': 'До 15000 грн',
            'filter-medium': '15000–30000 грн',
            'filter-high': 'Вище 30000 грн',
            'filter-ac': 'Кондиціонери',
            'filter-recuperator': 'Рекуператори',
            'product-lg-title': 'Кондиціонер LG Standard',
            'product-lg-desc': 'Потужність 2.5 кВт, енергоефективність A++.',
            'product-samsung-title': 'Кондиціонер Samsung Premium',
            'product-samsung-desc': 'Потужність 3.5 кВт, інверторний компресор.',
            'product-daikin-title': 'Кондиціонер Daikin Elite',
            'product-daikin-desc': 'Потужність 5 кВт, керування через Wi-Fi.',
            'product-prana-title': 'Рекуператор Prana 150',
            'product-prana-desc': 'Продуктивність 135 м³/год, компактний дизайн.',
            'product-ventoxx-title': 'Рекуператор Ventoxx Comfort',
            'product-ventoxx-desc': 'Продуктивність 200 м³/год, низький рівень шуму.',
            'product-zehnder-title': 'Рекуператор Zehnder ComfoAir',
            'product-zehnder-desc': 'Продуктивність 350 м³/год, високо ефективний теплообмінник.',
            'add-to-cart': 'Додати до кошика',
            'reviews-title': 'Відгуки наших клієнтів',
            'review-1-text': '"Швидко та якісно встановили кондиціонер. Дуже задоволені!"',
            'review-1-author': 'Анна, Київ',
            'review-2-text': '"Рекуператор працює ідеально, повітря завжди свіже!"',
            'review-2-author': 'Ігор, Одеса',
            'review-3-text': '"Професійна команда, рекомендую!"',
            'review-3-author': 'Олег, Львів',
            'contacts-title': 'Зв’яжіться з нами',
            'contacts-email-label': 'Email:',
            'contacts-phone-label': 'Телефон:',
            'contacts-address-label': 'Адреса:',
            'form-name-placeholder': 'Ваше ім’я',
            'form-email-placeholder': 'Ваш email',
            'form-message-placeholder': 'Ваше повідомлення',
            'form-submit': 'Надіслати',
            'footer-contacts-title': 'Контакти',
            'footer-copyright': '© 2025 Клімат Контроль. Усі права захищені.'
        }
    };

    // Функция для смены языка
    function setLanguage(lang) {
        // Обновление текста элементов
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });

        // Обновление placeholder'ов
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (translations[lang][key]) {
                element.placeholder = translations[lang][key];
            }
        });

        // Обновление заголовка страницы
        document.title = translations[lang]['site-title'];

        // Сохранение языка в localStorage
        localStorage.setItem('language', lang);
    }

    // Инициализация языка
    const savedLanguage = localStorage.getItem('language') || 'ru';
    setLanguage(savedLanguage);
    document.getElementById('languageSwitcher').value = savedLanguage;

    // Обработчик смены языка
    document.getElementById('languageSwitcher').addEventListener('change', (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        updateCart(); // Обновляем корзину для перевода названий товаров и услуг
    });

    // Управление мобильным меню
    const toggleButton = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');

    toggleButton.addEventListener('click', () => {
        nav.classList.toggle('header__nav--open');
        toggleButton.classList.toggle('header__toggle--open');
    });

    // Логика корзины
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

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
    const goToCart = document.getElementById('goToCart');
    const checkoutCart = document.getElementById('checkoutCart');

    // Функция сохранения корзины в localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    // Функция обновления корзины
    function updateCart() {
        const lang = localStorage.getItem('language') || 'ru';
        cartItemsList.innerHTML = '';
        cartDropdownItems.innerHTML = '';

        cart.forEach(item => {
            const name = item[`name_${lang}`] || item.name;
            const li = document.createElement('li');
            li.innerHTML = `
                ${name} - ${item.quantity} шт. - ${item.price * item.quantity} грн
                <button onclick="removeItem('${item.id}')">Удалить</button>
            `;
            cartItemsList.appendChild(li);

            const dropdownLi = document.createElement('li');
            dropdownLi.innerHTML = `
                <img src="https://placehold.co/50x50" alt="${name}" class="cart-dropdown__item-image">
                <div class="cart-dropdown__item-info">
                    <div class="cart-dropdown__item-name">${name}</div>
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
                const id = button.dataset.id;
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

    // Добавление товара или услуги в корзину
    function addToCart(button) {
        const id = button.dataset.id;
        const name_ru = button.dataset.nameRu;
        const name_uk = button.dataset.nameUk;
        const price = parseInt(button.dataset.price);

        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id, name_ru, name_uk, price, quantity: 1 });
        }

        updateCart();
    }

    document.querySelectorAll('.product-card__button').forEach(button => {
        button.addEventListener('click', () => addToCart(button));
    });

    document.querySelectorAll('.service-card__button').forEach(button => {
        button.addEventListener('click', () => addToCart(button));
    });

    // Открытие модала
    cartButton.addEventListener('click', (e) => {
        if (e.target === cartDropdownToggle) return;
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
            const lang = localStorage.getItem('language') || 'ru';
            alert(translations[lang]['cart-empty'] || 'Корзина пуста!');
            return;
        }
        cartDropdown.classList.remove('cart-dropdown--open');
        alert(translations[lang]['cart-checkout-message'] || 'Переход к оформлению заказа... (заглушка для реальной логики)');
    });

    // Закрытие выпадающего окна при клике вне
    document.addEventListener('click', (e) => {
        if (!cartButton.contains(e.target) && !cartDropdown.contains(e.target)) {
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

            if (priceValue === 'low' && price > 15000) priceMatch = false;
            if (priceValue === 'medium' && (price < 15000 || price > 30000)) priceMatch = false;
            if (priceValue === 'high' && price <= 30000) priceMatch = false;

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