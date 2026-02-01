/**
 * Component Loader Module
 * Загрузка HTML-компонентов с кэшированием
 */

import { reinitLazyLoading } from './image-loader.js';
import { switchLanguage } from './i18n.js';

// Кэш загруженных компонентов
const componentCache = new Map();

/**
 * Загрузить HTML-компонент в контейнер
 * @param {string} containerId - ID контейнера
 * @param {string} componentPath - Путь к HTML-файлу
 * @param {Object} options - Опции
 * @param {boolean} options.cache - Использовать кэш (default: true)
 * @param {boolean} options.reinitI18n - Применить переводы после загрузки (default: true)
 */
export async function loadComponent(containerId, componentPath, options = {}) {
    const { cache = true, reinitI18n = true } = options;
    
    try {
        let html;
        
        // Проверяем кэш
        if (cache && componentCache.has(componentPath)) {
            html = componentCache.get(componentPath);
        } else {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${componentPath}: ${response.status}`);
            }
            html = await response.text();
            
            // Сохраняем в кэш
            if (cache) {
                componentCache.set(componentPath, html);
            }
        }
        
        const container = document.getElementById(containerId);
        if (container) {
            // Сохраняем состояние grid для products
            const hadGrid = containerId === 'products-container' && !!container.querySelector('.products__grid');
            container.innerHTML = html;
            
            // Восстанавливаем grid если нужно
            if (containerId === 'products-container') {
                const exists = container.querySelector('.products__grid');
                if (!exists) {
                    const grid = document.createElement('div');
                    grid.className = 'products__grid';
                    container.appendChild(grid);
                }
            }
            
            // Reinit lazy loading для изображений
            reinitLazyLoading();
            
            // Применяем переводы
            if (reinitI18n) {
                const currentLang = localStorage.getItem('language') || 'uk';
                if (typeof switchLanguage === 'function') {
                    switchLanguage(currentLang);
                }
            }
            
            return true;
        } else {
            console.error(`Container ${containerId} not found`);
            return false;
        }
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '<p>Ошибка загрузки компонента</p>';
        return false;
    }
}

/**
 * Предзагрузить компоненты в кэш
 * @param {string[]} paths - Массив путей к компонентам
 */
export async function preloadComponents(paths) {
    const promises = paths.map(async (path) => {
        if (componentCache.has(path)) return;
        try {
            const response = await fetch(path);
            if (response.ok) {
                const html = await response.text();
                componentCache.set(path, html);
            }
        } catch (_) { /* ignore */ }
    });
    await Promise.allSettled(promises);
}

/**
 * Очистить кэш компонентов
 */
export function clearComponentCache() {
    componentCache.clear();
}

/**
 * Получить размер кэша
 */
export function getComponentCacheSize() {
    return componentCache.size;
}

/**
 * Загрузить несколько компонентов параллельно
 * @param {Array<[string, string]>} components - Массив [containerId, componentPath]
 */
export async function loadComponents(components) {
    return Promise.all(
        components.map(([containerId, componentPath]) => 
            loadComponent(containerId, componentPath)
        )
    );
}
