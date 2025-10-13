export const products = [
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
        ]
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

export function renderProducts(lang, translations, filteredProducts = products) {
    const productsGrid = document.querySelector('.products__grid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.id = String(product.id);
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name[lang]}" class="product-card__image" loading="lazy" onerror="this.src='https://placehold.co/150x150/blue/white?text=Image+Not+Found'">
            <h3 class="product-card__title">${product.name[lang]}</h3>
            <p class="product-card__description">${product.description[lang]}</p>
            <p class="product-card__price">${product.price.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} грн</p>
            <button class="product-card__button" data-id="${product.id}" data-i18n="service-order">${translations[lang]['service-order']}</button>
            <a class="product-card__more" href="#product-${product.id}" data-i18n="details">${translations[lang]['details'] || 'Подробнее'}</a>
        `;
        productsGrid.appendChild(productCard);
    });
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