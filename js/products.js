const baseProducts = [
    {
        id: 1,
        name: { ru: "Кондиционер EcoCool", uk: "Кондиціонер EcoCool" },
        description: { ru: "Энергоэффективный кондиционер", uk: "Енергоефективний кондиціонер" },
        price: 15000,
        category: "ac",
        image: "https://picsum.photos/600?random=11",
        images: [
            "https://picsum.photos/1200/800?random=11",
            "https://picsum.photos/1200/800?random=12",
            "https://picsum.photos/1200/800?random=13"
        ],
        sku: "EC-AC-001",
        brand: "EcoCool",
        inStock: true,
        warrantyMonths: 12,
        rating: { value: 4.8, count: 164 },
        specs: [
            { key: 'power', value: { ru: '2,5 кВт', uk: '2,5 кВт' } },
            { key: 'area', value: { ru: 'до 25 м²', uk: 'до 25 м²' } },
            { key: 'noise', value: { ru: '22 дБ', uk: '22 дБ' } },
            { key: 'energy', value: { ru: 'A++', uk: 'A++' } },
            { key: 'dimensions', value: { ru: '800×300×200 мм', uk: '800×300×200 мм' } }
        ],
        // demo flags to showcase left-side badges (can be edited via admin later)
        flags: ['sale','top','popular']
    },
    {
        id: 2,
        name: { ru: "Рекуператор FreshAir", uk: "Рекуператор FreshAir" },
        description: { ru: "Система вентиляции для дома", uk: "Система вентиляції для дому" },
        price: 25000,
        category: "recuperator",
        image: "https://picsum.photos/600?random=21",
        images: [
            "https://picsum.photos/1200/800?random=21",
            "https://picsum.photos/1200/800?random=22"
        ],
        sku: "FR-REC-002",
        brand: "FreshAir",
        inStock: false,
        warrantyMonths: 24,
        rating: { value: 4.6, count: 98 },
        specs: [
            { key: 'power', value: { ru: '80 м³/ч', uk: '80 м³/год' } },
            { key: 'area', value: { ru: 'до 60 м²', uk: 'до 60 м²' } },
            { key: 'noise', value: { ru: '18 дБ', uk: '18 дБ' } },
            { key: 'energy', value: { ru: 'A+', uk: 'A+' } },
            { key: 'dimensions', value: { ru: '500×250×150 мм', uk: '500×250×150 мм' } }
        ]
    },
    {
        id: "s1",
        name: { ru: "Монтаж кондиционера", uk: "Монтаж кондиціонера" },
        description: { ru: "Профессиональная установка любой сложности", uk: "Професійна установка будь-якої складності" },
        price: 5000,
        category: "service",
        image: "https://picsum.photos/600?random=31",
        images: ["https://picsum.photos/1200/800?random=31"],
        sku: "SRV-AC-001",
        brand: "ClimaTech",
        inStock: true,
        warrantyMonths: 6,
        rating: { value: 4.9, count: 72 },
        specs: [
            { key: 'power', value: { ru: '—', uk: '—' } },
            { key: 'area', value: { ru: '—', uk: '—' } },
            { key: 'noise', value: { ru: '—', uk: '—' } },
            { key: 'energy', value: { ru: '—', uk: '—' } },
            { key: 'dimensions', value: { ru: '—', uk: '—' } }
        ]
    },
    {
        id: "s2",
        name: { ru: "Монтаж рекуператора", uk: "Монтаж рекуператора" },
        description: { ru: "Вентиляционные системы для свежего воздуха", uk: "Вентиляційні системи для свіжого повітря" },
        price: 6000,
        category: "service",
        image: "https://picsum.photos/600?random=32",
        images: ["https://picsum.photos/1200/800?random=32"],
        sku: "SRV-REC-002",
        brand: "ClimaTech",
        inStock: true,
        warrantyMonths: 6,
    rating: { value: 4.8, count: 54 },
        specs: [
            { key: 'power', value: { ru: '—', uk: '—' } },
            { key: 'area', value: { ru: '—', uk: '—' } },
            { key: 'noise', value: { ru: '—', uk: '—' } },
            { key: 'energy', value: { ru: '—', uk: '—' } },
            { key: 'dimensions', value: { ru: '—', uk: '—' } }
        ]
    },
    {
        id: "s3",
        name: { ru: "Обслуживание систем", uk: "Обслуговування систем" },
        description: { ru: "Чистка и ремонт климатического оборудования", uk: "Чищення та ремонт кліматичного обладнання" },
        price: 2000,
        category: "service",
        image: "https://picsum.photos/600?random=33",
        images: ["https://picsum.photos/1200/800?random=33"],
        sku: "SRV-MNT-003",
        brand: "ClimaTech",
        inStock: true,
        warrantyMonths: 3,
    rating: { value: 4.7, count: 91 },
        specs: [
            { key: 'power', value: { ru: '—', uk: '—' } },
            { key: 'area', value: { ru: '—', uk: '—' } },
            { key: 'noise', value: { ru: '—', uk: '—' } },
            { key: 'energy', value: { ru: '—', uk: '—' } },
            { key: 'dimensions', value: { ru: '—', uk: '—' } }
        ]
    },
    // Additional test products for lazy loading demo
    {
        id: 3,
        name: { ru: "Сплит-система ComfortAir", uk: "Спліт-система ComfortAir" },
        description: { ru: "Тихая и эффективная сплит-система", uk: "Тиха та ефективна спліт-система" },
        price: 22000,
        category: "ac",
        image: "https://picsum.photos/600?random=41",
        images: ["https://picsum.photos/1200/800?random=41"],
        sku: "CA-AC-003",
        brand: "ComfortAir",
        inStock: true,
        warrantyMonths: 36,
        rating: { value: 4.9, count: 203 },
        specs: [
            { key: 'power', value: { ru: '3,5 кВт', uk: '3,5 кВт' } },
            { key: 'area', value: { ru: 'до 35 м²', uk: 'до 35 м²' } },
            { key: 'noise', value: { ru: '19 дБ', uk: '19 дБ' } },
            { key: 'energy', value: { ru: 'A+++', uk: 'A+++' } },
            { key: 'dimensions', value: { ru: '900×320×220 мм', uk: '900×320×220 мм' } }
        ]
    },
    {
        id: 4,
        name: { ru: "Мульти-сплит PureZone", uk: "Мульти-спліт PureZone" },
        description: { ru: "Система для нескольких помещений", uk: "Система для декількох приміщень" },
        price: 45000,
        category: "ac",
        image: "https://picsum.photos/600?random=51",
        images: ["https://picsum.photos/1200/800?random=51"],
        sku: "PZ-MS-004",
        brand: "PureZone",
        inStock: true,
        warrantyMonths: 24,
        rating: { value: 4.7, count: 156 },
        specs: [
            { key: 'power', value: { ru: '7 кВт', uk: '7 кВт' } },
            { key: 'area', value: { ru: 'до 80 м²', uk: 'до 80 м²' } },
            { key: 'noise', value: { ru: '21 дБ', uk: '21 дБ' } },
            { key: 'energy', value: { ru: 'A++', uk: 'A++' } },
            { key: 'dimensions', value: { ru: '1200×400×300 мм', uk: '1200×400×300 мм' } }
        ]
    },
    {
        id: 5,
        name: { ru: "Рекуператор EcoVent", uk: "Рекуператор EcoVent" },
        description: { ru: "Экологичная система вентиляции", uk: "Екологічна система вентиляції" },
        price: 32000,
        category: "recuperator",
        image: "https://picsum.photos/600?random=61",
        images: ["https://picsum.photos/1200/800?random=61"],
        sku: "EV-REC-005",
        brand: "EcoVent",
        inStock: true,
        warrantyMonths: 48,
        rating: { value: 4.8, count: 89 },
        specs: [
            { key: 'power', value: { ru: '120 м³/ч', uk: '120 м³/год' } },
            { key: 'area', value: { ru: 'до 100 м²', uk: 'до 100 м²' } },
            { key: 'noise', value: { ru: '16 дБ', uk: '16 дБ' } },
            { key: 'energy', value: { ru: 'A+', uk: 'A+' } },
            { key: 'dimensions', value: { ru: '600×300×180 мм', uk: '600×300×180 мм' } }
        ]
    }
];

export let products = [...baseProducts];

export function setProducts(list) {
    products = Array.isArray(list) ? [...list] : [...baseProducts];
    if (typeof window !== 'undefined') {
        window.products = products;
        // Инвалидация кеша фильтров, чтобы новые локальные товары отображались сразу
        try {
            if (window.__productsFilterCache && typeof window.__productsFilterCache.clear === 'function') {
                window.__productsFilterCache.clear();
            }
        } catch (_) { /* no-op */ }
    }
}

export function getProductsByCategory(categorySlug) {
    // Prefer single source of truth from content-config (window.getCategoryBySlug),
    // fallback to legacy mapping to stay compatible in tests/env without content-config.
    let productCategory = null;
    try {
        if (typeof window !== 'undefined' && typeof window.getCategoryBySlug === 'function') {
            const cat = window.getCategoryBySlug(categorySlug);
            if (cat && cat.group) productCategory = cat.group;
        }
    } catch (_) { /* ignore */ }

    if (!productCategory) {
        const legacyMap = {
            'conditioners': 'ac',
            'commercial-ac': 'ac',
            'multi-split': 'ac',
            'indoor-units': 'ac',
            'outdoor-units': 'ac',
            'mobile-ac': 'ac',
            'fan-coils': 'ac',
            'humidifiers': 'ac',
            'air-purifiers': 'ac',
            'dehumidifiers': 'ac',
            'controllers': 'ac',
            'heat-pumps': 'ac',
            'electric-heaters': 'ac',
            'accessories': 'accessory'
        };
        productCategory = legacyMap[categorySlug] || null;
    }

    if (!productCategory) return [];
    return products.filter(product => String(product.category) === String(productCategory));
}

export function getMergedProducts() {
    try {
        const localRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('products_local_v1') : null;
        const localProducts = localRaw ? JSON.parse(localRaw) : [];
        if (Array.isArray(localProducts) && localProducts.length) {
            return [...baseProducts, ...localProducts];
        }
    } catch (_) { /* ignore malformed local storage */ }
    return [...baseProducts];
}

// Check if admin mode is enabled via sessionStorage
export function isAdminMode() {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('admin_mode') === 'true';
}

// Enable admin mode
export function enableAdminMode() {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_mode', 'true');
    }
}

// Disable admin mode
export function disableAdminMode() {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_mode');
    }
}

const FAVORITES_STORAGE_KEY = 'products_favorites_v1';
const COMPARE_STORAGE_KEY = 'products_compare_v1';

function loadStoredIds(key) {
    if (typeof localStorage === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return new Set(parsed.map((value) => String(value)));
        }
    } catch (_) { /* ignore broken payload */ }
    return new Set();
}

let favoriteIds = loadStoredIds(FAVORITES_STORAGE_KEY);
let compareIds = loadStoredIds(COMPARE_STORAGE_KEY);

function persistIds(key, idsSet) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(idsSet)));
    } catch (_) { /* ignore storage quota */ }
}

function hydrateCollectionsFromStorage() {
    if (typeof localStorage === 'undefined') return;
    favoriteIds = loadStoredIds(FAVORITES_STORAGE_KEY);
    compareIds = loadStoredIds(COMPARE_STORAGE_KEY);
}

function dispatchCollectionEvent(name, ids) {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(name, { detail: { ids } }));
    } catch (_) { /* ignore event issues */ }
}

export function getFavoriteIds() {
    return Array.from(favoriteIds);
}

export function getCompareIds() {
    return Array.from(compareIds);
}

export function isFavorite(id) {
    return favoriteIds.has(String(id));
}

export function isCompared(id) {
    return compareIds.has(String(id));
}

export function toggleFavorite(id) {
    const key = String(id);
    let isActive;
    if (favoriteIds.has(key)) {
        favoriteIds.delete(key);
        isActive = false;
    } else {
        favoriteIds.add(key);
        isActive = true;
    }
    persistIds(FAVORITES_STORAGE_KEY, favoriteIds);
    if (typeof window !== 'undefined') {
        window.productsFavorites = getFavoriteIds();
    }
    dispatchCollectionEvent('favorites:change', getFavoriteIds());
    return isActive;
}

export function toggleCompare(id) {
    const key = String(id);
    let isActive;
    if (compareIds.has(key)) {
        compareIds.delete(key);
        isActive = false;
    } else {
        compareIds.add(key);
        isActive = true;
    }
    persistIds(COMPARE_STORAGE_KEY, compareIds);
    if (typeof window !== 'undefined') {
        window.productsCompare = getCompareIds();
    }
    dispatchCollectionEvent('compare:change', getCompareIds());
    return isActive;
}

export function clearCompare() {
    if (!compareIds.size) {
        return [];
    }
    compareIds.clear();
    persistIds(COMPARE_STORAGE_KEY, compareIds);
    if (typeof window !== 'undefined') {
        window.productsCompare = [];
    }
    dispatchCollectionEvent('compare:change', []);
    return [];
}

// При загрузке модуля публикуем актуальную коллекцию в window (если доступен)
if (typeof window !== 'undefined') {
    window.products = products;
    window.productsFavorites = getFavoriteIds();
    window.productsCompare = getCompareIds();
    window.addEventListener('storage', (event) => {
        if (event.key === FAVORITES_STORAGE_KEY || event.key === COMPARE_STORAGE_KEY) {
            hydrateCollectionsFromStorage();
            window.productsFavorites = getFavoriteIds();
            window.productsCompare = getCompareIds();
            dispatchCollectionEvent('favorites:change', getFavoriteIds());
            dispatchCollectionEvent('compare:change', getCompareIds());
        }
    });
}

// Convert a string to a deterministic hue (0..360) using a small hash.
function hashCodeToHue(str) {
    if (!str) return 210; // default blue
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0; // keep 32-bit
    }
    // map to 0..360
    return Math.abs(h) % 360;
}

export function renderProducts(lang, translations, filteredProducts = products) {
    const productsGrid = document.querySelector('.products__grid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    const elevated = { set: false };
    const imgs = [];
    hydrateCollectionsFromStorage();

    filteredProducts.forEach((product, idx) => {
        const productCard = renderProductCard(product, lang, translations);
        productsGrid.appendChild(productCard);

        // LQIP: снимаем блюр после загрузки
        const imgEl = productCard.querySelector('img.product-card__image');
        if (imgEl) {
            const markLoaded = () => imgEl.classList.add('lqip--loaded');
            imgEl.addEventListener('load', markLoaded, { once: true });
            if (imgEl.complete && imgEl.naturalWidth > 0) {
                markLoaded();
            }
            imgs.push(imgEl);
        }
    });

    // Elevate the first actually visible product image via IntersectionObserver
    try {
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries, obs) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !elevated.set) {
                        const el = entry.target;
                        el.setAttribute('fetchpriority','high');
                        // Attempt to hint eager; may be ignored if already fetching
                        el.setAttribute('loading','eager');
                        elevated.set = true;
                        // We can stop observing once selected
                        imgs.forEach(img => io.unobserve(img));
                        break;
                    }
                }
            }, { root: null, rootMargin: '0px', threshold: 0.25 });
            imgs.forEach(img => io.observe(img));
        }
    } catch {}
}

export function filterProducts(lang, translations) {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    const category = categoryParam || document.getElementById('category')?.value || 'all';
    const price = document.getElementById('price')?.value || 'all';
    let filteredProducts = [...products];

    // Кеш ключ (без учета языка, т.к. данные локализуются при рендере)
    if (!window.__productsFilterCache) {
        window.__productsFilterCache = new Map();
    }
    const cacheKey = `${category}|${price}`;
    if (window.__productsFilterCache.has(cacheKey)) {
        filteredProducts = window.__productsFilterCache.get(cacheKey);
    } else {
        let computed = [...products];
        if (category !== 'all') {
            let productCategory = null;
            try {
                if (typeof window !== 'undefined' && typeof window.getCategoryBySlug === 'function') {
                    const cat = window.getCategoryBySlug(category);
                    if (cat && cat.group) productCategory = cat.group;
                }
            } catch (_) { /* ignore */ }
            if (!productCategory) {
                const legacyMap = {
                    'conditioners': 'ac',
                    'commercial-ac': 'ac',
                    'multi-split': 'ac',
                    'indoor-units': 'ac',
                    'outdoor-units': 'ac',
                    'mobile-ac': 'ac',
                    'fan-coils': 'ac',
                    'humidifiers': 'ac',
                    'air-purifiers': 'ac',
                    'dehumidifiers': 'ac',
                    'controllers': 'ac',
                    'heat-pumps': 'ac',
                    'electric-heaters': 'ac',
                    'accessories': 'accessory'
                };
                productCategory = legacyMap[category] || category;
            }
            computed = computed.filter(product => String(product.category) === String(productCategory));
        }
        if (price !== 'all') {
            computed.sort((a, b) => price === 'low' ? a.price - b.price : b.price - a.price);
        }
        window.__productsFilterCache.set(cacheKey, computed);
        filteredProducts = computed;
    }

    renderProducts(lang, translations, filteredProducts);
}

// Автоперерисовка товаров при смене языка (если секция уже на странице)
if (typeof window !== 'undefined') {
    window.addEventListener('languagechange', (e) => {
    const lang = e.detail?.lang || (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'uk';
        // Пытаемся получить глобальные translations, если доступны в window
        try {
            const globalTranslations = window.translations || undefined;
            if (globalTranslations) {
                // Перечитываем текущие фильтры и перерисовываем
                filterProducts(lang, globalTranslations);
            }
        } catch (err) {
            console.warn('Не удалось обновить товары при смене языка', err);
        }
    });
}

// Skeleton helpers
export function showProductsSkeleton(count = 6) {
    const productsGrid = document.querySelector('.products__grid');
    if (!productsGrid) return;
    productsGrid.classList.add('loading');
    productsGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.innerHTML = `
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
            <div class="skeleton skeleton-price"></div>
            <div class="skeleton skeleton-btn"></div>
        `;
        productsGrid.appendChild(card);
    }
}

// Обертка для использования скелетона перед фильтрацией (искусственная задержка для UX)
export function filterProductsWithSkeleton(lang, translations) {
    showProductsSkeleton();
    setTimeout(() => {
        filterProducts(lang, translations);
        const grid = document.querySelector('.products__grid');
        if (grid) grid.classList.remove('loading');
    }, 300); // 300мс имитация загрузки
}

// Единая функция для рендеринга карточки товара
export function renderProductCard(product, lang, translations) {
    const langDict = (translations && translations[lang]) || (translations && translations['ru']) || {};
    const fallbackDict = (translations && translations['ru']) || {};
    const quantityLabel = langDict['quantity-label'] || fallbackDict['quantity-label'] || 'Количество';
    const quantityDecreaseLabel = langDict['quantity-decrease'] || fallbackDict['quantity-decrease'] || 'Уменьшить количество';
    const quantityIncreaseLabel = langDict['quantity-increase'] || fallbackDict['quantity-increase'] || 'Увеличить количество';
    const quickActionsLabel = langDict['quick-actions'] || fallbackDict['quick-actions'] || 'Quick actions';
    const favoriteAddLabel = langDict['favorite-add'] || fallbackDict['favorite-add'] || 'Add to favorites';
    const favoriteRemoveLabel = langDict['favorite-remove'] || fallbackDict['favorite-remove'] || 'Remove from favorites';
    const compareAddLabel = langDict['compare-add'] || fallbackDict['compare-add'] || 'Add to compare';
    const compareRemoveLabel = langDict['compare-remove'] || fallbackDict['compare-remove'] || 'Remove from compare';
    const viewDetailsLabel = langDict['view-details'] || fallbackDict['view-details'] || 'View details';
    const orderLabel = langDict['service-order'] || fallbackDict['service-order'] || 'Заказать';
    const specsLabel = langDict['specs'] || fallbackDict['specs'] || 'Характеристики';
    const brandChipLabel = langDict['chips-brand'] || fallbackDict['chips-brand'] || (lang === 'uk' ? 'Бренд' : 'Бренд');
    const categoryChipLabel = langDict['chips-category'] || fallbackDict['chips-category'] || (lang === 'uk' ? 'Категорія' : 'Категория');
    const ratingLabel = langDict['rating-label'] || fallbackDict['rating-label'] || 'Рейтинг';
    const reviewsOne = langDict['reviews-one'] || fallbackDict['reviews-one'] || (lang === 'uk' ? 'відгук' : 'отзыв');
    const reviewsFew = langDict['reviews-few'] || fallbackDict['reviews-few'] || (lang === 'uk' ? 'відгуки' : 'отзыва');
    const reviewsMany = langDict['reviews-many'] || fallbackDict['reviews-many'] || (lang === 'uk' ? 'відгуків' : 'отзывов');

    const escapeHtml = (value) => {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
             .replace(/'/g, '&#39;');
    };

    const selectPluralForm = (count) => {
        const absCount = Math.abs(Number(count) || 0);
        const mod10 = absCount % 10;
        const mod100 = absCount % 100;
        if (lang === 'uk') {
            if (mod10 === 1 && mod100 !== 11) return reviewsOne;
            if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return reviewsFew;
            return reviewsMany;
        }
        if (mod10 === 1 && mod100 !== 11) return reviewsOne;
        if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return reviewsFew;
        return reviewsMany;
    };

    const specsLabelSafe = escapeHtml(specsLabel);

    const productCard = document.createElement('div');
    productCard.classList.add('product-card');
    productCard.dataset.id = String(product.id);
    // Add microdata for SEO
    productCard.setAttribute('itemscope', '');
    productCard.setAttribute('itemtype', 'https://schema.org/Product');

    const isPrimary = false; // Для универсальности всегда false
    const loadingAttr = 'lazy';
    const fetchPrio = 'low';

    // Local marker (удалено по требованию: не показывать бейдж "Локально")
    let adminHtml = '';
    let isLocal = false;
    let localBadgeHtml = '';
    try {
        const locals = JSON.parse(localStorage.getItem('products_local_v1') || '[]');
        isLocal = String(product.id).startsWith('p_') || (Array.isArray(locals) && locals.some(lp => String(lp.id) === String(product.id)));
        // Не добавляем локальный бейдж в UI
        localBadgeHtml = '';
    } catch (err) { adminHtml = ''; isLocal = false; localBadgeHtml = ''; }

    // Badges
    let badgesHtml = '';
    try {
        const inStock = !!product.inStock;
        // Бейдж наличия скрыт (не показываем на карточках)
        badgesHtml = '';
        // Микроданные наличия оставляем через meta
        const availabilityMeta = `<meta itemprop="availability" content="${inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}" />`;
        badgesHtml += availabilityMeta;
    } catch(_) { /* ignore badge errors */ }

    // Flag badges
    let flagBadgesHtml = '';
    let colorMap = null;
    try {
        const flags = Array.isArray(product.flags) ? product.flags : [];
        if (flags.length || isLocal) {
            const dict = (translations && translations[lang] && translations[lang].flags) || {};
            colorMap = {};
            const items = flags.map(f => {
                const key = typeof f === 'string' ? f : (f?.key || '');
                const text = dict[key] || (typeof f === 'string' ? f : (f?.label || ''));
                if (!text) return '';
                const variant = `flag-badge--${key}`;
                const providedColor = (typeof f === 'object' && f?.color) ? f.color : null;
                const h = hashCodeToHue(key || text);
                const color = providedColor || `hsl(${h} 70% 45%)`;
                colorMap[key] = color;
                return `<span class="flag-badge ${variant}" data-flag-key="${key}" role="note">${text}</span>`;
            }).join('');
            const combined = `${items}${localBadgeHtml}`;
            if (combined.trim().length) {
                flagBadgesHtml = `<div class="product-card__flag-badges" aria-label="badges">${combined}</div>`;
            }
        }
    } catch(_) { /* ignore flags */ }

    // Image
    const placeholder = 'https://placehold.co/600x400?text=No+Image';
    const baseSrc = (product.image && String(product.image).trim().length) ? product.image : placeholder;
    let srcsetAttr = '';
    let pictureHtml = '';
    let imgInlineStyle = '';
    try {
        const isPicsum600 = /^https?:\/\/picsum\.photos\/600/i.test(baseSrc);
        if (isPicsum600) {
            const s320 = baseSrc.replace('600','320');
            const s480 = baseSrc.replace('600','480');
            const s600 = baseSrc;
            const s1200 = (product.images?.[0] && product.images[0].startsWith('http')) ? product.images[0] : s600;
            srcsetAttr = `${s320} 320w, ${s480} 480w, ${s600} 600w, ${s1200} 1200w`;
        } else if (baseSrc.startsWith('http')) {
            srcsetAttr = `${baseSrc} 600w`;
        } else if (baseSrc.startsWith('data:')) {
            srcsetAttr = '';
        } else {
            // Local image path (e.g., picture/name.jpg). Use source-format-only variants (-320w/-480w/-768w/-1200w)
            const m = baseSrc.match(/^(.*)(\.[a-zA-Z0-9]+)$/);
            if (m) {
                const base = m[1]; const ext = m[2];
                const orig320 = `${base}-320w${ext}`;
                const orig480 = `${base}-480w${ext}`;
                const orig768 = `${base}-768w${ext}`;
                const orig1200 = `${base}-1200w${ext}`;
                srcsetAttr = `${orig320} 320w, ${orig480} 480w, ${orig768} 768w, ${orig1200} 1200w`;
                // Keep simple <img> (no AVIF/WEBP sources) to avoid 404s when only original-format variants exist
                pictureHtml = '';
            } else {
                srcsetAttr = `${baseSrc} 600w`;
            }
        }
    } catch {}

    const srcsetLine = srcsetAttr ? `srcset="${srcsetAttr}"` : '';

    // Price (bottom-left with optional discount line above)
    const formatPriceInt = (v) => Math.round(v).toLocaleString('uk-UA', { maximumFractionDigits: 0 });
    let priceHtml = `<span class="product-card__price-current">${formatPriceInt(product.price)} грн</span>`;
    if (typeof product.oldPrice === 'number' && product.oldPrice > (product.price || 0)) {
        const discountPercent = Math.max(1, Math.round(100 - (product.price / product.oldPrice) * 100));
        priceHtml = `
            <span class="product-card__price-oldline">
                <s class="product-card__price-old" aria-label="Старая цена">${formatPriceInt(product.oldPrice)} грн</s>
                <span class="product-card__discount-pct">−${discountPercent}%</span>
            </span>
            <span class="product-card__price-current">${formatPriceInt(product.price)} грн</span>
        `;
    }

    const favoriteActive = isFavorite(product.id);
    const compareActive = isCompared(product.id);
    const favoriteLabel = favoriteActive ? `${favoriteRemoveLabel} ${product.name[lang]}` : `${favoriteAddLabel} ${product.name[lang]}`;
    const compareLabel = compareActive ? `${compareRemoveLabel} ${product.name[lang]}` : `${compareAddLabel} ${product.name[lang]}`;
    const orderButtonLabel = `${orderLabel} ${product.name[lang]}`;

    // Chips
    const brandNameRaw = typeof product.brand === 'string' ? product.brand.trim() : '';
    const categoryKey = `filter-${product.category}`;
    const categoryNameRaw = (product && product.category)
        ? (langDict[categoryKey] || fallbackDict[categoryKey] || String(product.category))
        : '';
    const chips = [];
    if (brandNameRaw) {
        const brandNameSafe = escapeHtml(brandNameRaw);
        const brandAria = escapeHtml(`${brandChipLabel}: ${brandNameRaw}`);
        chips.push(`<span class="product-card__chip product-card__chip--brand" role="listitem" aria-label="${brandAria}" itemprop="brand">${brandNameSafe}</span>`);
    }
    // Категорию больше не показываем как chip на карточке (по требованию). Оставляем бренд.
    const metaHtml = chips.length ? `<div class="product-card__meta" role="list">${chips.join('')}</div>` : '';

    // Rating
    let ratingValue = null;
    let ratingCount = null;
    if (product && typeof product.rating === 'object' && product.rating !== null) {
        if (typeof product.rating.value === 'number') {
            ratingValue = product.rating.value;
        } else if (typeof product.rating.score === 'number') {
            ratingValue = product.rating.score;
        }
        if (typeof product.rating.count === 'number') {
            ratingCount = product.rating.count;
        } else if (typeof product.rating.reviews === 'number') {
            ratingCount = product.rating.reviews;
        }
    } else if (typeof product.rating === 'number') {
        ratingValue = product.rating;
    }
    if (typeof product.reviews === 'number' && ratingCount === null) {
        ratingCount = product.reviews;
    }

    let ratingHtml = '';
    if (typeof ratingValue === 'number' && Number.isFinite(ratingValue)) {
        const clampedRating = Math.min(Math.max(ratingValue, 0), 5);
        const ratingRounded = Math.round(clampedRating * 10) / 10;
        const ratingDisplay = ratingRounded.toFixed(1);
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const diff = clampedRating - (i - 1);
            let starClass = 'product-card__star--empty';
            if (diff >= 1) {
                starClass = 'product-card__star--full';
            } else if (diff >= 0.5) {
                starClass = 'product-card__star--half';
            }
            stars.push(`<span class="product-card__star ${starClass}" aria-hidden="true"></span>`);
        }
        const reviewsNumber = typeof ratingCount === 'number' && Number.isFinite(ratingCount) ? Math.max(0, Math.round(ratingCount)) : null;
        const reviewsText = reviewsNumber !== null ? `${reviewsNumber} ${selectPluralForm(reviewsNumber)}` : '';
        const ratingAriaParts = [`${ratingLabel} ${ratingDisplay} / 5`];
        if (reviewsText) {
            ratingAriaParts.push(reviewsText);
        }
        const ratingAria = escapeHtml(ratingAriaParts.join(', '));
        const ratingDisplaySafe = escapeHtml(ratingDisplay);
        const reviewsTextSafe = escapeHtml(reviewsText);
        const starsHtml = stars.join('');
        const reviewsPart = reviewsText ? `<span class="product-card__rating-count">(${reviewsTextSafe})</span>` : '';
        ratingHtml = `<div class="product-card__rating" aria-label="${ratingAria}"><div class="product-card__stars" aria-hidden="true">${starsHtml}</div><span class="product-card__rating-value">${ratingDisplaySafe}</span>${reviewsPart}</div>`;
    }

    // Specs
    const preferredSpecs = ['power', 'area', 'noise'];
    const productSpecs = Array.isArray(product.specs) ? product.specs : [];
    const prioritizedSpecs = productSpecs.filter(spec => preferredSpecs.includes(spec.key));
    const visibleSpecsSource = prioritizedSpecs.length ? prioritizedSpecs : productSpecs;
    const specEntries = visibleSpecsSource.slice(0, 3).map((spec) => {
        const label = langDict[`spec-${spec.key}`] || fallbackDict[`spec-${spec.key}`] || spec.key;
        const specValueObj = spec.value;
        let valueText = '';
        if (specValueObj && typeof specValueObj === 'object') {
            valueText = specValueObj[lang] || specValueObj.ru || specValueObj.uk || '';
        } else if (specValueObj) {
            valueText = String(specValueObj);
        }
        if (!valueText) return '';
        const labelSafe = escapeHtml(label);
        const valueSafe = escapeHtml(valueText);
        return `<li class="product-card__spec" role="listitem"><span class="product-card__spec-label">${labelSafe}</span><span class="product-card__spec-value">${valueSafe}</span></li>`;
    }).filter(Boolean);
    const specsHtml = specEntries.length
        ? `<ul class="product-card__specs" role="list" aria-label="${specsLabelSafe}">${specEntries.join('')}</ul>`
        : '';

    productCard.innerHTML = `
         ${flagBadgesHtml}
         ${badgesHtml}
  ${pictureHtml || `<img src="${baseSrc}"
      alt="${product.name[lang]}" title="${viewDetailsLabel}" class="product-card__image lqip" loading="${loadingAttr}" decoding="async" fetchpriority="${fetchPrio}" ${srcsetLine} sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, 240px" onerror="this.src='https://placehold.co/150x150/blue/white?text=Image+Not+Found'">`}
        <meta itemprop="name" content="${escapeHtml(product.name[lang])}">
    ${metaHtml}
                ${ratingHtml}
    <p class="product-card__description">${product.description[lang]}</p>
    ${specsHtml}
                <p class="product-card__price" itemprop="price" content="${product.price}">${priceHtml}</p>
    <div class="product-card__purchase">
        <button class="product-card__button product-card__button--icon" data-id="${product.id}" data-i18n="service-order" aria-label="${orderButtonLabel}">
            <span class="sr-only">${orderLabel}</span>
            <img src="icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="product-card__button-icon">
        </button>
    </div>
    <!-- Быстрые действия перемещены на страницу детального описания -->
    ${adminHtml}
`;

    // Apply CSS variables for flag colors
    try {
        if (colorMap && Object.keys(colorMap).length) {
            Object.entries(colorMap).forEach(([k, v]) => {
                productCard.style.setProperty(`--flag-${k}-bg`, v);
                productCard.style.setProperty(`--flag-${k}-color`, '#fff');
            });
            const styleEl = document.createElement('style');
            const rules = Object.keys(colorMap).map(k => {
                return `.product-card[data-id="${product.id}"] .flag-badge[data-flag-key="${k}"]{ background: var(--flag-${k}-bg); color: var(--flag-${k}-color); }`;
            }).join('\n');
            styleEl.textContent = rules;
            productCard.appendChild(styleEl);
        }
    } catch (_) {}

    // LQIP
    const imgEl = productCard.querySelector('img.product-card__image');
    if (imgEl) {
        const markLoaded = () => imgEl.classList.add('lqip--loaded');
        imgEl.addEventListener('load', markLoaded, { once: true });
        if (imgEl.complete && imgEl.naturalWidth > 0) {
            markLoaded();
        }
    }

    // Упрощённая навигация по карточке (без админ-меню)
    try {
        // Make whole card focusable & keyboard-navigable to details
        productCard.setAttribute('tabindex','0');
        productCard.setAttribute('role','link');
        productCard.setAttribute('aria-label', `${viewDetailsLabel} ${product.name[lang]}`);
        productCard.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                location.hash = `#product-${product.id}`;
            }
        });
    } catch {}

    return productCard;
}