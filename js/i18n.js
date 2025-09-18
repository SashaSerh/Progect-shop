export const translations = {
    ru: {
        "site-title": "Климат Контроль",
        "header-title": "Климат Контроль",
        "nav-home": "Главная",
        "nav-services": "Услуги",
        "nav-products": "Товары",
        "nav-contacts": "Контакты",
        "hero-title": "Комфортный климат в вашем доме",
        "hero-subtitle": "Профессиональный монтаж и продажа кондиционеров и рекуператоров.",
        "hero-cta": "Посмотреть товары",
        "services-title": "Наши услуги",
        "service-ac-install-title": "Монтаж кондиционеров",
        "service-ac-install-desc": "Профессиональная установка любой сложности.",
        "service-recuperator-install-title": "Монтаж рекуператоров",
        "service-recuperator-install-desc": "Вентиляционные системы для свежего воздуха.",
        "service-maintenance-title": "Обслуживание систем",
        "service-maintenance-desc": "Чистка и ремонт климатического оборудования.",
        "service-order": "Заказать",
        "products-title": "Наши товары",
        "filter-category": "Категория:",
        "filter-price": "Цена:",
        "filter-all": "Все",
        "filter-ac": "Кондиционеры",
        "filter-recuperator": "Рекуператоры",
        "filter-low-to-high": "От низкой к высокой",
        "filter-high-to-low": "От высокой к низкой",
        "contacts-title": "Свяжитесь с нами",
        "contacts-email": "Email: info@climat-control.com",
        "contacts-phone": "Телефон: +380-800-555-1234",
        "contacts-address": "Адрес: ул. Климатическая, 123, Киев",
        "form-name": "Ваше имя",
        "form-email": "Ваш email",
        "form-message": "Ваше сообщение",
        "form-submit": "Отправить сообщение",
        "footer-title": "Климат Контроль",
        "footer-copyright": "© 2025 Климат Контроль. Все права защищены.",
        "cart-items": "0 товаров",
        "cart-total": "Итого: $0.00",
        "cart-clear": "Очистить корзину",
        "cart-checkout": "Оформить заказ",
        "cart-modal-title": "Ваша корзина",
        "login": "Войти",
        "login-title": "Вход",
        "username": "Имя пользователя",
        "password": "Пароль",
        "profile": "Личный кабинет",
        "profile-title": "Личный кабинет",
        "welcome": "Добро пожаловать",
        "logout": "Выйти",
        "cart-empty": "Корзина пуста"
    },
    uk: {
        "site-title": "Клімат Контроль",
        "header-title": "Клімат Контроль",
        "nav-home": "Головна",
        "nav-services": "Послуги",
        "nav-products": "Товари",
        "nav-contacts": "Контакти",
        "hero-title": "Комфортний клімат у вашому домі",
        "hero-subtitle": "Професійний монтаж та продаж кондиціонерів і рекуператорів.",
        "hero-cta": "Переглянути товари",
        "services-title": "Наші послуги",
        "service-ac-install-title": "Монтаж кондиціонерів",
        "service-ac-install-desc": "Професійна установка будь-якої складності.",
        "service-recuperator-install-title": "Монтаж рекуператорів",
        "service-recuperator-install-desc": "Вентиляційні системи для свіжого повітря.",
        "service-maintenance-title": "Обслуговування систем",
        "service-maintenance-desc": "Чищення та ремонт кліматичного обладнання.",
        "service-order": "Замовити",
        "products-title": "Наші товари",
        "filter-category": "Категорія:",
        "filter-price": "Ціна:",
        "filter-all": "Усі",
        "filter-ac": "Кондиціонери",
        "filter-recuperator": "Рекуператори",
        "filter-low-to-high": "Від низької до високої",
        "filter-high-to-low": "Від високої до низької",
        "contacts-title": "Зв’яжіться з нами",
        "contacts-email": "Email: info@climat-control.com",
        "contacts-phone": "Телефон: +380-800-555-1234",
        "contacts-address": "Адреса: вул. Кліматична, 123, Київ",
        "form-name": "Ваше ім’я",
        "form-email": "Ваш email",
        "form-message": "Ваше повідомлення",
        "form-submit": "Надіслати повідомлення",
        "footer-title": "Клімат Контроль",
        "footer-copyright": "© 2025 Клімат Контроль. Усі права захищені.",
        "cart-items": "0 товарів",
        "cart-total": "Разом: $0.00",
        "cart-clear": "Очистити кошик",
        "cart-checkout": "Оформити замовлення",
        "cart-modal-title": "Ваш кошик",
        "login": "Увійти",
        "login-title": "Вхід",
        "username": "Ім'я користувача",
        "password": "Пароль",
        "profile": "Особистий кабінет",
        "profile-title": "Особистий кабінет",
        "welcome": "Вітаємо",
        "logout": "Вийти",
        "cart-empty": "Кошик порожній"
    }
};

export function switchLanguage(lang) {
    console.log(`Switching language to: ${lang}`);
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) {
            element.placeholder = translations[lang][key];
        }
    });

    localStorage.setItem('language', lang);
}