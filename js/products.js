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
    }
}

export function getProducts() {
    return products;
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
    const langDict = (translations && translations[lang]) || (translations && translations['ru']) || {};
    const fallbackDict = (translations && translations['ru']) || {};
    const quantityLabel = langDict['quantity-label'] || fallbackDict['quantity-label'] || 'Количество';
    const quantityDecreaseLabel = langDict['quantity-decrease'] || fallbackDict['quantity-decrease'] || 'Уменьшить количество';
    const quantityIncreaseLabel = langDict['quantity-increase'] || fallbackDict['quantity-increase'] || 'Увеличить количество';
    hydrateCollectionsFromStorage();
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
    filteredProducts.forEach((product, idx) => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.id = String(product.id);
    const isPrimary = idx === 0; // fallback: первый элемент
    const loadingAttr = isPrimary ? 'eager' : 'lazy';
    const fetchPrio = isPrimary ? 'high' : 'low';
                // compute admin action buttons if this product exists in localStorage or has local id
        let adminHtml = '';
        let localBadge = '';
                try {
                        const locals = JSON.parse(localStorage.getItem('products_local_v1') || '[]');
                        const isLocal = String(product.id).startsWith('p_') || (Array.isArray(locals) && locals.some(lp => String(lp.id) === String(product.id)));
                        if (isLocal) {
                adminHtml = `<div class="product-card__admin-actions"><button class="product-card__button" data-edit data-id="${product.id}">Редактировать</button><button class="product-card__button" data-delete data-id="${product.id}">Удалить</button></div>`;
                localBadge = `<span class="badge badge--local" title="Локально (localStorage)">Локально</span>`;
                        }
                } catch (err) { adminHtml = ''; }

                // Badges: stock status and sale/discount
                    // Badges: stock status and sale/discount (top-right)
                    let badgesHtml = '';
                try {
                    const inStock = !!product.inStock;
                    const stockLabel = inStock
                        ? ((translations && translations[lang] && translations[lang]['in-stock']) || 'В наличии')
                        : ((translations && translations[lang] && translations[lang]['on-order']) || 'Под заказ');
                    const stockClass = inStock ? 'badge--ok' : 'badge--warn';
                    // Sale badge if oldPrice > price or discountPercent provided
                    const hasOld = typeof product.oldPrice === 'number' && product.oldPrice > (product.price || 0);
                    const hasDiscount = typeof product.discountPercent === 'number' && product.discountPercent > 0;
                    let saleBadge = '';
                    if (hasOld || hasDiscount) {
                        const lbl = (lang === 'uk') ? 'Знижка' : 'Скидка';
                        const pct = hasDiscount ? ` −${Math.round(product.discountPercent)}%` : '';
                        saleBadge = `<span class="badge badge--sale" aria-label="${lbl}${pct}">${lbl}${pct}</span>`;
                    }
                        badgesHtml = `
                            <div class="product-card__badges product-card__badges--top-right">
                                <span class="badge ${stockClass}">${stockLabel}</span>
                                ${saleBadge}
                            </div>`;
                } catch(_) { /* ignore badge errors */ }

                    // Flag badges (из i18n.flags) stacked vertically at top-left over the image
                        let flagBadgesHtml = '';
                        let colorMap = null;
                        try {
                        const flags = Array.isArray(product.flags) ? product.flags : [];
                        if (flags.length) {
                            const dict = (translations && translations[lang] && translations[lang].flags) || {};
                                        colorMap = {};
                                    const items = flags.map(f => {
                                                const key = typeof f === 'string' ? f : (f?.key || '');
                                                const text = dict[key] || (typeof f === 'string' ? f : (f?.label || ''));
                                                if (!text) return '';
                                                const variant = `flag-badge--${key}`;
                                                // determine color from product flags (object) or fallback hash
                                                const providedColor = (typeof f === 'object' && f?.color) ? f.color : null;
                                                const h = hashCodeToHue(key || text);
                                                const color = providedColor || `hsl(${h} 70% 45%)`;
                                                colorMap[key] = color;
                                                return `<span class="flag-badge ${variant}" data-flag-key="${key}" role="note">${text}</span>`;
                                            }).join('');
                            if (items.trim().length) {
                                flagBadgesHtml = `<div class="product-card__flag-badges" aria-label="badges">${items}</div>`;
                            }
                        }
                    } catch(_) { /* ignore flags */ }

                // Build safe src and srcset (avoid empty URLs that cause '320w' requests)
                const placeholder = 'https://placehold.co/600x400?text=No+Image';
                const baseSrc = (product.image && String(product.image).trim().length) ? product.image : placeholder;
                let srcsetAttr = '';
                try {
                    const isPicsum600 = /^https?:\/\/picsum\.photos\/600/i.test(baseSrc);
                    if (isPicsum600) {
                        const s320 = baseSrc.replace('600','320');
                        const s480 = baseSrc.replace('600','480');
                        const s600 = baseSrc;
                        const s1200 = (product.images?.[0] && product.images[0].startsWith('http')) ? product.images[0] : s600;
                        srcsetAttr = `${s320} 320w, ${s480} 480w, ${s600} 600w, ${s1200} 1200w`;
                    } else if (baseSrc.startsWith('http')) {
                        // Keep single candidate to avoid bad URLs
                        srcsetAttr = `${baseSrc} 600w`;
                    } else if (baseSrc.startsWith('data:')) {
                        // data URL: don't add srcset to avoid duplicate heavy requests
                        srcsetAttr = '';
                    }
                } catch {}

                const srcsetLine = srcsetAttr ? `srcset="${srcsetAttr}"` : '';

                                // Price block with optional old price
                const formatPriceInt = (v) => Math.round(v).toLocaleString('uk-UA', { maximumFractionDigits: 0 });
                let priceHtml = `${formatPriceInt(product.price)} грн ${localBadge}`;
                                if (typeof product.oldPrice === 'number' && product.oldPrice > product.price) {
                    priceHtml = `<span class="product-card__price-current">${formatPriceInt(product.price)} грн</span> <s class="product-card__price-old" aria-label="Старая цена">${formatPriceInt(product.oldPrice)} грн</s> ${localBadge}`;
                                }
                const favoriteActive = isFavorite(product.id);
                const compareActive = isCompared(product.id);
    const favoriteLabel = favoriteActive ? `${favoriteRemoveLabel} ${product.name[lang]}` : `${favoriteAddLabel} ${product.name[lang]}`;
    const compareLabel = compareActive ? `${compareRemoveLabel} ${product.name[lang]}` : `${compareAddLabel} ${product.name[lang]}`;
    const orderButtonLabel = `${orderLabel} ${product.name[lang]}`;                const brandNameRaw = typeof product.brand === 'string' ? product.brand.trim() : '';
                const categoryKey = `filter-${product.category}`;
                const categoryNameRaw = (product && product.category)
                    ? (langDict[categoryKey] || fallbackDict[categoryKey] || String(product.category))
                    : '';
                const chips = [];
                if (brandNameRaw) {
                    const brandNameSafe = escapeHtml(brandNameRaw);
                    const brandAria = escapeHtml(`${brandChipLabel}: ${brandNameRaw}`);
                    chips.push(`<span class="product-card__chip product-card__chip--brand" role="listitem" aria-label="${brandAria}">${brandNameSafe}</span>`);
                }
                if (categoryNameRaw) {
                    const normalizedCategory = typeof categoryNameRaw === 'string' ? categoryNameRaw.trim() : String(categoryNameRaw);
                    const categoryText = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
                    const categorySafe = escapeHtml(categoryText);
                    const categoryAria = escapeHtml(`${categoryChipLabel}: ${categoryText}`);
                    chips.push(`<span class="product-card__chip product-card__chip--category" role="listitem" aria-label="${categoryAria}">${categorySafe}</span>`);
                }
                const metaHtml = chips.length ? `<div class="product-card__meta" role="list">${chips.join('')}</div>` : '';

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
                  <img src="${baseSrc}"
                      alt="${product.name[lang]}"
                      class="product-card__image lqip"
                      loading="${loadingAttr}" decoding="async" fetchpriority="${fetchPrio}"
                      ${srcsetLine}
                      sizes="(max-width: 480px) 45vw, (max-width: 768px) 30vw, 240px"
                      onerror="this.src='https://placehold.co/150x150/blue/white?text=Image+Not+Found'">
                    <h3 class="product-card__title"><a href="#product-${product.id}" class="product-card__title-link" aria-label="${viewDetailsLabel} ${product.name[lang]}">${product.name[lang]}</a></h3>
                    ${metaHtml}
                                        ${ratingHtml}
                    <p class="product-card__description">${product.description[lang]}</p>
                    ${specsHtml}
                                        <p class="product-card__price">${priceHtml}</p>
                    <div class="product-card__purchase">
                        <button class="product-card__button product-card__button--icon" data-id="${product.id}" data-i18n="service-order" aria-label="${orderButtonLabel}">
                            <span class="sr-only">${orderLabel}</span>
                            <img src="icons/shopping-bag-icon.svg" alt="" aria-hidden="true" class="product-card__button-icon">
                        </button>
                        <div class="quantity-stepper quantity-stepper--vertical" role="group" aria-label="${quantityLabel}">
                            <button type="button" class="quantity-stepper__btn quantity-stepper__btn--increment" data-action="increment" data-id="${product.id}" aria-label="${quantityIncreaseLabel}" aria-controls="qty-${product.id}">▲</button>
                            <input type="number" id="qty-${product.id}" class="quantity-stepper__input" value="1" min="1" max="99" data-id="${product.id}" inputmode="numeric" pattern="\\d*" aria-label="${quantityLabel}">
                            <button type="button" class="quantity-stepper__btn quantity-stepper__btn--decrement" data-action="decrement" data-id="${product.id}" aria-label="${quantityDecreaseLabel}" aria-controls="qty-${product.id}">▼</button>
                        </div>
                    </div>
                    <div class="product-card__quick-actions" role="group" aria-label="${quickActionsLabel}">
                        <button type="button" class="product-card__quick-btn${favoriteActive ? ' is-active' : ''}" data-action="favorite" data-id="${product.id}" aria-label="${favoriteLabel}" aria-pressed="${favoriteActive}" title="${favoriteLabel}">
                            <svg class="product-card__quick-icon" aria-hidden="true" focusable="false">
                                <use href="icons/icons-sprite.svg#icon-heart"></use>
                            </svg>
                        </button>
                        <button type="button" class="product-card__quick-btn${compareActive ? ' is-active' : ''}" data-action="compare" data-id="${product.id}" aria-label="${compareLabel}" aria-pressed="${compareActive}" title="${compareLabel}">
                            <svg class="product-card__quick-icon" aria-hidden="true" focusable="false">
                                <use href="icons/icons-sprite.svg#icon-compare"></use>
                            </svg>
                        </button>
                    </div>
                    ${adminHtml}
                `;
        productsGrid.appendChild(productCard);
        // Apply CSS variables for flag colors on the product card and add local style rules to use them
        try {
            if (colorMap && Object.keys(colorMap).length) {
                Object.entries(colorMap).forEach(([k, v]) => {
                    productCard.style.setProperty(`--flag-${k}-bg`, v);
                    productCard.style.setProperty(`--flag-${k}-color`, '#fff');
                });
                // create a small style block scoped to this card to map data-flag-key -> variable
                const styleEl = document.createElement('style');
                const rules = Object.keys(colorMap).map(k => {
                    return `.product-card[data-id="${product.id}"] .flag-badge[data-flag-key="${k}"]{ background: var(--flag-${k}-bg); color: var(--flag-${k}-color); }`;
                }).join('\n');
                styleEl.textContent = rules;
                productCard.appendChild(styleEl);
            }
        } catch (_) {}
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
    const category = document.getElementById('category')?.value || 'all';
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
            computed = computed.filter(product => product.category === category);
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
        const lang = e.detail?.lang || (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'ru';
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