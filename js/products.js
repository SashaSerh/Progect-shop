export const products = [
    {
        id: 1,
        name: { ru: "Кондиционер EcoCool", uk: "Кондиціонер EcoCool" },
        description: { ru: "Энергоэффективный кондиционер", uk: "Енергоефективний кондиціонер" },
        price: 15000,
        category: "ac",
        image: "https://picsum.photos/150"
    },
    {
        id: 2,
        name: { ru: "Рекуператор FreshAir", uk: "Рекуператор FreshAir" },
        description: { ru: "Система вентиляции для дома", uk: "Система вентиляції для дому" },
        price: 25000,
        category: "recuperator",
        image: "https://picsum.photos/150"
    }
];

let lastFiltered = null;
let lastLang = null;

export function renderProducts(lang, translations, filteredProducts = products) {
    if (lastFiltered === filteredProducts && lastLang === lang) return;
    lastFiltered = filteredProducts;
    lastLang = lang;

    const productsGrid = document.querySelector('.products__grid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '';
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name[lang]}" class="product-card__image" loading="lazy" onerror="this.src='https://placehold.co/150x150/blue/white?text=Image+Not+Found'">
            <h3 class="product-card__title">${product.name[lang]}</h3>
            <p class="product-card__description">${product.description[lang]}</p>
            <p class="product-card__price">$${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <button class="product-card__button" data-id="${product.id}" data-i18n="service-order">${translations[lang]['service-order']}</button>
        `;
        productsGrid.appendChild(productCard);
    });
}

export function filterProducts(lang, translations) {
    const category = document.getElementById('category')?.value || 'all';
    const price = document.getElementById('price')?.value || 'all';
    let filteredProducts = [...products];

    if (category !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === category);
    }

    if (price !== 'all') {
        filteredProducts.sort((a, b) => price === 'low' ? a.price - b.price : b.price - a.price);
    }

    renderProducts(lang, translations, filteredProducts);
}