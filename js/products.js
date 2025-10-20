export let products = [
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
        specs: [
            { key: 'power', value: { ru: '—', uk: '—' } },
            { key: 'area', value: { ru: '—', uk: '—' } },
            { key: 'noise', value: { ru: '—', uk: '—' } },
            { key: 'energy', value: { ru: '—', uk: '—' } },
            { key: 'dimensions', value: { ru: '—', uk: '—' } }
        ]
    }
];

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
                    try {
                        const flags = Array.isArray(product.flags) ? product.flags : [];
                        if (flags.length) {
                            const dict = (translations && translations[lang] && translations[lang].flags) || {};
                                    const colorMap = {};
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
                    <h3 class="product-card__title">${product.name[lang]}</h3>
                    <p class="product-card__description">${product.description[lang]}</p>
                                        <p class="product-card__price">${priceHtml}</p>
                    <button class="product-card__button" data-id="${product.id}" data-i18n="service-order">${(translations && translations[lang] && translations[lang]['service-order']) || 'Заказать'}</button>
                    <button class="product-card__more card-actions-size--compact" data-id="${product.id}" data-i18n="details">${(translations && translations[lang] && translations[lang]['details']) || 'Подробнее'}</button>
                    ${adminHtml}
                `;
        productsGrid.appendChild(productCard);
        // Apply CSS variables for flag colors on the product card and add local style rules to use them
        try {
            if (typeof colorMap !== 'undefined' && colorMap && Object.keys(colorMap).length) {
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
        // Навигация по клику на кнопку 'Подробнее'
        const moreBtn = productCard.querySelector('.product-card__more');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                window.location.hash = `product-${product.id}`;
            });
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

// Возвращает объединённый список: сначала встроенные products, затем локальные (localStorage) с приоритетом локальных
export function getMergedProducts() {
    try {
        const locals = JSON.parse(localStorage.getItem('products_local_v1') || '[]');
        if (!Array.isArray(locals) || locals.length === 0) return products;
        // локальные переопределяют встроенные по id
        const merged = [...products.filter(p => !locals.some(l => String(l.id) === String(p.id))), ...locals];
        return merged;
    } catch (err) {
        return products;
    }
}

export function setProducts(list) {
    try {
        if (Array.isArray(list)) {
            products = list;
        }
    } catch {}
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