import { products } from './products.js';
import { translations } from './i18n.js';
import { gesturesConfig as defaultGesturesConfig } from './gestures-config.js';

// Глобальная настройка жестов (общая с меню)
const G = (window.gesturesConfig = { ...defaultGesturesConfig, ...(window.gesturesConfig || {}) });

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

export function addToCart(productId, productsList, quantity = 1) {
    const catalog = Array.isArray(productsList) && productsList.length ? productsList : products;
    const product = catalog.find(p => p.id == productId);
    if (!product) return;
    const cartItem = cart.find(item => item.id == productId);
    const safeQuantity = Math.max(1, Math.min(99, Number(quantity) || 1));
    if (cartItem) {
        cartItem.quantity += safeQuantity;
    } else {
        cart.push({ id: productId, quantity: safeQuantity });
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
let __cartDrag = null; // жест закрытия на мобильных
let __cartEdgeOpen = null; // edge-swipe открытие на мобильных

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
    // Test-friendly fallback: if modal exists in DOM, open it; otherwise navigate to cart page
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const cartModal = document.querySelector('#cartModal');
    if (!cartModal) {
        try { location.hash = '#cart'; } catch(_) {}
        return;
    }

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
        backdrop.classList.add('overlay--full'); // на время корзины затемняем весь экран
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
        // Haptic (если доступно)
        try { navigator.vibrate && navigator.vibrate(20); } catch(_) {}
        // Навешиваем жест свайпа для закрытия
        attachCartDrawerGestures(cartModal);
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
            // снимаем жесты
            detachCartDrawerGestures(cartModal);
            cartModal.classList.remove('cart-modal--active');
            // Дадим анимации закончиться перед скрытием
            setTimeout(() => { cartModal.style.display = 'none'; }, 250);
            try { navigator.vibrate && navigator.vibrate(10); } catch(_) {}
        } else {
            cartModal.style.display = 'none';
        }
    }
    if (backdrop) {
        backdrop.classList.remove('is-visible');
        backdrop.classList.remove('overlay--full');
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

// Жест свайпа для закрытия мобильной корзины (drawer)
function attachCartDrawerGestures(panel) {
    if (!panel) return;
    if (__cartDrag && __cartDrag.bound) return; // уже навешано
    const state = {
        startX: 0,
        startY: 0,
        dx: 0,
        dy: 0,
        active: false,
        moved: false,
        angleLocked: false,
        allow: false,
        samples: [] // {t, dx}
    };
    const maxAngle = G.angleMax; // градусы, фильтрация диагонали
    const threshold = G.startThreshold; // px до начала трека
    const closeThreshold = Math.max(80, Math.floor((window.innerWidth || 360) * G.closeThresholdRatio));

    const onStart = (evt) => {
        const t = getPoint(evt);
        state.startX = t.x;
        state.startY = t.y;
        state.dx = 0;
        state.dy = 0;
        state.active = true;
        state.moved = false;
        state.angleLocked = false;
        state.allow = false;
        state.samples = [];
        // убираем transition на время перетаскивания
        panel.style.transition = 'none';
    };
    const onMove = (evt) => {
        if (!state.active) return;
        const p = getPoint(evt);
        state.dx = p.x - state.startX;
        state.dy = p.y - state.startY;
        if (!state.moved) {
            const absDx = Math.abs(state.dx);
            const absDy = Math.abs(state.dy);
            if (absDx < threshold && absDy < threshold) return; // ещё не двигаем
            // угол
            const angle = Math.atan2(absDy, absDx) * 180 / Math.PI;
            if (angle > maxAngle) {
                // вертикальный жест — не перехватываем
                state.active = false;
                // восстановим transition если прервали
                panel.style.transition = '';
                return;
            }
            state.angleLocked = true;
            state.allow = true; // горизонтально
            state.moved = true;
        }
        if (!state.allow) return;
        // Разрешаем сдвиг только вправо (закрытие)
        const translate = Math.max(0, state.dx);
        panel.style.transform = `translateX(${translate}px)`;
        // сэмпл для скорости (dx вправо положительный)
        const now = Date.now();
        state.samples.push({ t: now, dx: state.dx });
        const cutoff = now - G.flingWindowMs;
        while (state.samples.length && state.samples[0].t < cutoff) state.samples.shift();
        evt.preventDefault();
    };
    const onEnd = () => {
        if (!state.active) return;
        state.active = false;
        // вернём transition
        panel.style.transition = '';
        // вычислим скорость жеста
        const sLen = state.samples.length;
        let fast = false;
        if (sLen >= 2) {
            const first = state.samples[0];
            const last = state.samples[sLen - 1];
            const dt = Math.max(1, last.t - first.t);
            const v = (last.dx - first.dx) / dt; // px/ms (вправо положительно)
            fast = v > G.flingVelocity;
        }
        const translateApplied = extractTranslateX(panel);
        if (translateApplied >= closeThreshold || fast) {
            // закрываем
            panel.style.transform = ''; // пусть класс анимации обработает закрытие
            closeCartModal();
        } else {
            // откатываем назад со spring-back
            panel.style.transition = `transform ${G.springBackDuration}ms ease-out`;
            panel.style.transform = '';
        }
    };

    const bound = {
        start: onStart,
        move: onMove,
        end: onEnd
    };
    panel.addEventListener('touchstart', bound.start, { passive: true });
    panel.addEventListener('touchmove', bound.move, { passive: false });
    panel.addEventListener('touchend', bound.end, { passive: true });
    panel.addEventListener('pointerdown', bound.start, { passive: true });
    window.addEventListener('pointermove', bound.move, { passive: false });
    window.addEventListener('pointerup', bound.end, { passive: true });
    __cartDrag = { bound, panel };
}

function detachCartDrawerGestures(panel) {
    if (!__cartDrag) return;
    const { bound } = __cartDrag;
    try {
        panel.removeEventListener('touchstart', bound.start);
        panel.removeEventListener('touchmove', bound.move);
        panel.removeEventListener('touchend', bound.end);
        panel.removeEventListener('pointerdown', bound.start);
        window.removeEventListener('pointermove', bound.move);
        window.removeEventListener('pointerup', bound.end);
    } catch(_) {}
    __cartDrag = null;
}

function getPoint(evt) {
    if (evt.touches && evt.touches[0]) {
        return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
    }
    return { x: evt.clientX, y: evt.clientY };
}

function extractTranslateX(el) {
    const st = window.getComputedStyle(el);
    const tr = st.transform || st.webkitTransform || 'none';
    if (tr === 'none') return 0;
    const m = tr.match(/matrix\(([^)]+)\)/) || tr.match(/matrix\d?\(([^)]+)\)/);
    if (m && m[1]) {
        const parts = m[1].split(',').map(parseFloat);
        // matrix(a,b,c,d,tx,ty)
        const tx = parts[4] || 0;
        return tx;
    }
    return 0;
}

// Edge-swipe open (правый край) для мобильной корзины
function enableCartEdgeSwipeOpen() {
    if (typeof window === 'undefined') return;
    if (__cartEdgeOpen) return; // уже включено
    const state = {
        active: false,
        startX: 0,
        startY: 0,
        dx: 0,
        dy: 0,
        moved: false,
        angleLocked: false,
        allow: false,
        panel: null,
    };
    const EDGE = 18; // px от правого края
    const threshold = Math.max(6, G.startThreshold + 2);
    const maxAngle = G.angleMax;
    const openFraction = G.openThresholdRatio; // доля ширины

    const onDown = (evt) => {
        // игнорируем если уже открыта корзина
        const cartModal = document.querySelector('#cartModal');
        if (!cartModal || cartModal.classList.contains('cart-modal--active') || cartModal.style.display === 'block') return;
        const pt = getPoint(evt);
        const vw = window.innerWidth || 360;
        const vh = window.innerHeight || 640;
        const distRight = vw - pt.x;
        if (distRight > EDGE) return;
        // Нижняя половина экрана — зона жеста корзины (верхняя — для меню)
        if (pt.y < vh * 0.5) return;
        state.active = true;
        state.startX = pt.x;
        state.startY = pt.y;
        state.dx = 0; state.dy = 0;
        state.moved = false; state.angleLocked = false; state.allow = false;
        state.panel = cartModal;
        // подготовка панели и overlay
        const overlay = document.querySelector('.mobile-nav-overlay') || (() => {
            const el = document.createElement('div'); el.className = 'mobile-nav-overlay'; document.body.appendChild(el); return el;
        })();
        overlay.classList.add('is-visible');
        overlay.classList.add('overlay--full');
        cartModal.style.display = 'block';
        cartModal.style.transition = 'none';
        // начальное положение за экраном (ширина = 100vw)
        cartModal.style.transform = `translateX(${vw}px)`;
    };

    const onMove = (evt) => {
        if (!state.active || !state.panel) return;
        const p = getPoint(evt);
        state.dx = p.x - state.startX;
        state.dy = p.y - state.startY;
        if (!state.moved) {
            const absDx = Math.abs(state.dx);
            const absDy = Math.abs(state.dy);
            if (absDx < threshold && absDy < threshold) return;
            const angle = Math.atan2(absDy, absDx) * 180 / Math.PI;
            if (angle > maxAngle) { // вертикально — отменяем
                cancelInteractive();
                return;
            }
            // Для открытия нужен жест влево (dx < 0) от правого края
            if (state.dx >= 0) { // двигается вправо — не открываем
                cancelInteractive();
                return;
            }
            state.allow = true;
            state.moved = true;
        }
        if (!state.allow) return;
        const vw = window.innerWidth || 360;
        const progress = Math.min(vw, Math.max(0, -state.dx));
        state.panel.style.transform = `translateX(${vw - progress}px)`;
        evt.preventDefault();
    };

    const onUp = () => {
        if (!state.active || !state.panel) return;
        const vw = window.innerWidth || 360;
        const progress = Math.min(vw, Math.max(0, -state.dx));
        const needOpen = progress >= vw * openFraction;
        // очистка inline-transition
        state.panel.style.transition = '';
        if (needOpen) {
            // Убираем временный transform и используем нормальное открытие (фокус/esc/trap)
            state.panel.style.transform = '';
            openCartModal();
        } else {
            // Откат назад с spring-back
            state.panel.style.transition = `transform ${G.springBackDuration}ms ease-out`;
            state.panel.style.transform = '';
            state.panel.style.display = 'none';
            const overlay = document.querySelector('.mobile-nav-overlay');
            if (overlay) {
                overlay.classList.remove('is-visible');
                overlay.classList.remove('overlay--full');
            }
        }
        state.active = false;
        state.panel = null;
    };

    const cancelInteractive = () => {
        if (!state.active || !state.panel) return;
        state.panel.style.transition = '';
        state.panel.style.transform = '';
        state.panel.style.display = 'none';
        const overlay = document.querySelector('.mobile-nav-overlay');
        overlay && overlay.classList.remove('is-visible');
        overlay && overlay.classList.remove('overlay--full');
        state.active = false;
        state.panel = null;
    };

    const bound = {
        down: onDown,
        move: onMove,
        up: onUp,
        cancel: cancelInteractive
    };
    window.addEventListener('touchstart', bound.down, { passive: true });
    window.addEventListener('touchmove', bound.move, { passive: false });
    window.addEventListener('touchend', bound.up, { passive: true });
    window.addEventListener('pointerdown', bound.down, { passive: true });
    window.addEventListener('pointermove', bound.move, { passive: false });
    window.addEventListener('pointerup', bound.up, { passive: true });
    __cartEdgeOpen = { bound };
}

function disableCartEdgeSwipeOpen() {
    if (!__cartEdgeOpen) return;
    const { bound } = __cartEdgeOpen;
    window.removeEventListener('touchstart', bound.down);
    window.removeEventListener('touchmove', bound.move);
    window.removeEventListener('touchend', bound.up);
    window.removeEventListener('pointerdown', bound.down);
    window.removeEventListener('pointermove', bound.move);
    window.removeEventListener('pointerup', bound.up);
    __cartEdgeOpen = null;
}

// Авто-инициализация edge-swipe отключена: корзина как отдельная страница
(() => {
    if (typeof window === 'undefined') return;
    disableCartEdgeSwipeOpen();
})();

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
    const fmt = (v) => Math.round(Number(v)).toLocaleString('uk-UA', { maximumFractionDigits: 0 });
    if (cartTotalText) cartTotalText.textContent = `${fmt(totalPrice)} грн`;
    // Robust update for summaries: derive label before ':' from i18n and always append formatted UAH total
    const totalTemplate = (translations && translations[lang] && translations[lang]['cart-total']) || (translations && translations['ru'] && translations['ru']['cart-total']) || 'Итого: $0.00';
    const totalLabel = String(totalTemplate).split(':')[0] || 'Итого';
    const totalText = `${totalLabel}: ${fmt(totalPrice)} грн`;
    if (cartDropdownSummary) cartDropdownSummary.textContent = totalText;
    if (cartSummary) cartSummary.textContent = totalText;
    // Update mobile sticky cart summary on the cart page
    const stickySummary = document.querySelector('.cart-sticky__summary');
    if (stickySummary) stickySummary.textContent = totalText;

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
                            <span class="cart-dropdown__item-price">${fmt(product.price * item.quantity)} грн (x${item.quantity})</span>
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
                if (!product) return;
                const li = document.createElement('li');
                const name = (product.name && (product.name[lang] || product.name.ru)) || '';
                const imgSrc = Array.isArray(product.images) && product.images.length ? product.images[0] : product.image;
                const desc = (product.summary && (product.summary[lang] || product.summary.ru)) || '';
                const oldPrice = Number(product.oldPrice);
                const price = Number(product.price) || 0;
                const qty = Number(item.quantity) || 1;
                const total = price * qty;
                const hasDiscount = oldPrice && oldPrice > price;
                const pct = hasDiscount ? Math.max(1, Math.round(100 - (price / oldPrice) * 100)) : 0;
                // simple specs block: try common fields with graceful fallbacks
                const energy = product.energyClass ? String(product.energyClass) : '';
                const brand = product.brand || product.brandName || '';
                const specItems = [];
                if (energy) specItems.push(`${translations?.[lang]?.['energy-class'] || 'Класс энергоэффективности'}: ${energy}`);
                if (brand) specItems.push(`${translations?.[lang]?.['brand'] || 'Бренд'}: ${brand}`);
                // Optional capacity or area if present
                if (product.capacity) specItems.push(`${translations?.[lang]?.['capacity'] || 'Мощность'}: ${product.capacity}`);
                if (product.area) specItems.push(`${translations?.[lang]?.['area'] || 'Площадь'}: ${product.area}`);
                const specsHtml = specItems.length ? `<div class="cart-item-specs">${specItems.map(s => `<div class="cart-item-spec">${s}</div>`).join('')}</div>` : '';

                li.className = 'cart-item';
                li.innerHTML = `
                    <img class="cart-item-thumb" src="${imgSrc}" alt="${name}" loading="lazy" onerror="this.src='https://placehold.co/84x84/blue/white?text=No+Image'">
                    <div class="cart-item-meta">
                        <span class="cart-item-name">${name}</span>
                        ${desc ? `<span class="cart-item-desc">${desc}</span>` : ''}
                        ${specsHtml}
                        <div class="cart-item-prices">
                          ${hasDiscount ? `<span class="cart-item-old">${fmt(oldPrice)} грн</span>` : ''}
                          <span class="cart-item-price">${fmt(price)} грн</span>
                          ${hasDiscount ? `<span class="cart-item-discount">−${pct}%</span>` : ''}
                          <span class="cart-item-total">×${qty} = <b>${fmt(total)} грн</b></span>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-stepper quantity-stepper--vertical" aria-label="Количество">
                            <button class="quantity-stepper__btn" data-action="decrement" aria-label="Уменьшить">−</button>
                            <input class="quantity-stepper__input" type="number" min="1" max="99" value="${qty}" aria-label="Количество">
                            <button class="quantity-stepper__btn" data-action="increment" aria-label="Увеличить">+</button>
                        </div>
                        <button class="cart-item-remove" data-id="${item.id}" aria-label="Удалить ${name} из корзины" title="Удалить">✕</button>
                    </div>
                `;
                li.setAttribute('tabindex', '0');
                // attach local handlers for quantity
                const dec = li.querySelector('.quantity-stepper__btn[data-action="decrement"]');
                const inc = li.querySelector('.quantity-stepper__btn[data-action="increment"]');
                const input = li.querySelector('.quantity-stepper__input');
                const applyQty = (next) => {
                    const n = Math.max(1, Math.min(99, Number(next) || 1));
                    // update in cart
                    const ci = cart.find(x => String(x.id) === String(item.id));
                    if (ci) ci.quantity = n;
                    saveCart();
                    updateCartUI(translations, lang);
                };
                if (dec) dec.addEventListener('click', () => applyQty(qty - 1));
                if (inc) inc.addEventListener('click', () => applyQty(qty + 1));
                if (input) input.addEventListener('change', (e) => applyQty(e.target.value));
                cartItems.appendChild(li);
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
        const msg = translations[getCurrentLang()]?.['toast-item-removed'] || 'Товар удалён';
        showUndoToast(msg, () => {
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
    const lang = getCurrentLang();
    undo.textContent = translations[lang]?.['toast-undo'] || 'Отменить';
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