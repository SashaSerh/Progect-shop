/**
 * Lazy Module Loader
 * Динамическая загрузка модулей для оптимизации производительности
 */

// Кэш загруженных модулей
const moduleCache = new Map();

// Статус загрузки
const loadingStatus = new Map();

/**
 * Загрузить модуль лениво
 * @param {string} modulePath - путь к модулю
 * @returns {Promise<any>} - экспорты модуля
 */
export async function loadModule(modulePath) {
    // Проверяем кэш
    if (moduleCache.has(modulePath)) {
        return moduleCache.get(modulePath);
    }
    
    // Проверяем, не загружается ли уже
    if (loadingStatus.has(modulePath)) {
        return loadingStatus.get(modulePath);
    }
    
    // Показать прогресс
    if (typeof window.showProgress === 'function') {
        window.showProgress(200);
    }
    
    // Создаём промис загрузки
    // Vite can't statically analyze dynamic import vars; suppress its warning with @vite-ignore
    const loadPromise = import(/* @vite-ignore */ modulePath)
        .then(module => {
            moduleCache.set(modulePath, module);
            loadingStatus.delete(modulePath);
            
            if (typeof window.completeProgress === 'function') {
                window.completeProgress();
            }
            
            return module;
        })
        .catch(err => {
            loadingStatus.delete(modulePath);
            console.error(`[LazyLoader] Failed to load module: ${modulePath}`, err);
            throw err;
        });
    
    loadingStatus.set(modulePath, loadPromise);
    return loadPromise;
}

/**
 * Загрузить калькулятор лениво
 */
export async function loadCalculator() {
    const module = await loadModule('./calculator.js');
    if (module && typeof module.initCalculator === 'function') {
        module.initCalculator();
    }
    return module;
}

/**
 * Загрузить админ-модули лениво
 */
export async function loadAdminModules() {
    const [adminPage, adminProducts] = await Promise.all([
        loadModule('./admin-page.js'),
        loadModule('./admin-products.js')
    ]);
    return { adminPage, adminProducts };
}

/**
 * Загрузить модули сравнения лениво
 */
export async function loadCompareModules() {
    const [compareBar, compareModal] = await Promise.all([
        loadModule('./compare-bar.js'),
        loadModule('./compare-modal.js')
    ]);
    return { compareBar, compareModal };
}

/**
 * Загрузить форму валидации лениво
 */
export async function loadFormValidation() {
    return loadModule('./form-validation.js');
}

/**
 * Предзагрузить модуль (без выполнения)
 * Использует <link rel="modulepreload"> для браузерной оптимизации
 */
export function preloadModule(modulePath) {
    // Проверяем, что модуль ещё не загружен
    if (moduleCache.has(modulePath)) return;
    
    // Создаём preload link
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = modulePath;
    document.head.appendChild(link);
}

/**
 * Предзагрузить модули при простое
 * Использует requestIdleCallback для загрузки в фоне
 */
export function preloadOnIdle(modulePaths) {
    const load = () => {
        modulePaths.forEach(path => preloadModule(path));
    };
    
    if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 2000 });
    } else {
        setTimeout(load, 1000);
    }
}

// Экспорт в window для доступа из не-ESM скриптов
if (typeof window !== 'undefined') {
    window.lazyLoader = {
        loadModule,
        loadCalculator,
        loadAdminModules,
        loadCompareModules,
        loadFormValidation,
        preloadModule,
        preloadOnIdle
    };
}
