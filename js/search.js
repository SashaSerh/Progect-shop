/**
 * Search Module
 * Поиск товаров с подсказками
 */

/**
 * Выполнить поиск и отобразить результаты
 * @param {string} query - Поисковый запрос
 * @param {string} lang - Код языка
 * @param {Array} products - Массив товаров
 * @param {Function} renderProducts - Функция рендера
 * @param {Object} translations - Объект переводов
 */
export function performSearch(query, lang, products, renderProducts, translations) {
    const filteredProducts = products.filter(product => {
        const name = product.name?.[lang] || product.name?.uk || '';
        return name.toLowerCase().includes(query.toLowerCase());
    });
    
    renderProducts(lang, translations, filteredProducts);
    
    const container = document.querySelector('#products-container');
    if (container) {
        window.scrollTo({ 
            top: container.offsetTop, 
            behavior: 'smooth' 
        });
    }
}

/**
 * Показать подсказки поиска
 * @param {string} query - Поисковый запрос
 * @param {string} lang - Код языка
 * @param {Array} products - Массив товаров
 */
export function showSearchSuggestions(query, lang, products) {
    const searchDropdown = document.querySelector('#searchDropdown');
    const searchList = document.querySelector('.search-dropdown__list');
    if (!searchDropdown || !searchList) return;

    searchList.innerHTML = '';
    
    if (query.length < 2) {
        searchDropdown.classList.remove('search-dropdown--open');
        return;
    }

    const suggestions = products.filter(product => {
        const name = product.name?.[lang] || product.name?.uk || '';
        return name.toLowerCase().includes(query.toLowerCase());
    }).slice(0, 5); // Limit to 5 suggestions

    if (suggestions.length === 0) {
        searchDropdown.classList.remove('search-dropdown--open');
        return;
    }

    suggestions.forEach(product => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#product-${product.id}`;
        a.textContent = product.name?.[lang] || product.name?.uk || '';
        li.appendChild(a);
        searchList.appendChild(li);
    });

    searchDropdown.classList.add('search-dropdown--open');
}

/**
 * Инициализация поиска
 * @param {Object} options
 * @param {Array} options.products - Массив товаров
 * @param {string} options.lang - Код языка
 * @param {Function} options.renderProducts - Функция рендера
 * @param {Object} options.translations - Объект переводов
 */
export function initSearch({ products, lang, renderProducts, translations }) {
    const searchInput = document.querySelector('#site-search');
    const searchButton = document.querySelector('#searchButton');
    const searchDropdown = document.querySelector('#searchDropdown');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            showSearchSuggestions(e.target.value, lang, products);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                performSearch(e.target.value, lang, products, renderProducts, translations);
                if (searchDropdown) {
                    searchDropdown.classList.remove('search-dropdown--open');
                }
            }
        });
    }
    
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value, lang, products, renderProducts, translations);
            if (searchDropdown) {
                searchDropdown.classList.remove('search-dropdown--open');
            }
        });
    }
    
    if (searchDropdown) {
        document.addEventListener('click', (e) => {
            if (!searchDropdown.contains(e.target) && (!searchInput || !searchInput.contains(e.target))) {
                searchDropdown.classList.remove('search-dropdown--open');
            }
        });
    }
}
