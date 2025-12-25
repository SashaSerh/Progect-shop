/**
 * LQIP (Low Quality Image Placeholder) - Quick Reference Examples
 * 
 * Система для плавной загрузки изображений с blur-up эффектом.
 * Использование: добавьте data-src атрибут к img элементам.
 */

// ===== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ =====

/**
 * ПРИМЕР 1: Базовое использование с автоматической генерацией blur placeholder
 * 
 * HTML:
 * <img data-src="/picture/my-image.jpg" alt="Описание изображения">
 * 
 * Система:
 * 1. Автоматически генерирует размытый placeholder (1x1 pixel)
 * 2. Загружает изображение в фоне с Intersection Observer
 * 3. При появлении в viewport - начинает загрузку
 * 4. После загрузки: blur(8px) → blur(0) с transition 300ms
 */

/**
 * ПРИМЕР 2: С пользовательским placeholder
 * 
 * HTML:
 * <img 
 *   data-src="/picture/hero-large.jpg" 
 *   data-placeholder="/picture/hero-thumb.jpg"
 *   alt="Герой баннер"
 * >
 * 
 * Система:
 * 1. Сразу показывает /picture/hero-thumb.jpg (низкое качество)
 * 2. В фоне загружает /picture/hero-large.jpg (высокое качество)
 * 3. После загрузки: плавный переход с blur
 */

/**
 * ПРИМЕР 3: Критические изображения (above the fold)
 * 
 * JavaScript:
 * import { preloadCriticalImages } from './image-loader.js';
 * 
 * preloadCriticalImages([
 *   '/picture/hero-banner.jpg',
 *   '/picture/service-icon-1.jpg',
 *   '/picture/service-icon-2.jpg'
 * ]);
 * 
 * Результат: добавляет <link rel="preload" as="image"> для критических изображений
 */

/**
 * ПРИМЕР 4: В компонентах (автоматическая инициализация)
 * 
 * HTML компонента (components/portfolio.html):
 * <div class="portfolio__item">
 *   <img 
 *     data-src="/picture/project-1.jpg"
 *     alt="Проект 1"
 *     class="portfolio__image"
 *   >
 * </div>
 * 
 * JavaScript (main.js):
 * await loadComponent('portfolio-container', 'components/portfolio.html');
 * // Автоматически вызывается reinitLazyLoading() после загрузки
 * 
 * Результат: все img[data-src] в компоненте автоматически обработаны
 */

/**
 * ПРИМЕР 5: CSS стили для управления загрузкой
 * 
 * /* Изначально размыто во время загрузки */
 * img[data-src] {
 *   filter: blur(8px);
 *   background-color: #f0f0f0;
 *   transition: filter var(--transition-normal);
 * }
 * 
 * /* После успешной загрузки */
 * img.img-loaded {
 *   filter: blur(0);
 *   opacity: 1;
 * }
 * 
 * /* При ошибке загрузки */
 * img.img-error {
 *   filter: blur(0);
 *   opacity: 0.6; /* осветляем как индикатор ошибки */
 * }
 * 
 * /* Во время загрузки */
 * img.img-loading {
 *   animation: pulse 2s infinite;
 * }
 * 
 * @keyframes pulse {
 *   0%, 100% { opacity: 1; }
 *   50% { opacity: 0.7; }
 * }
 */

/**
 * ПРИМЕР 6: Интеграция с продуктами
 * 
 * HTML (components/product-card.html):
 * <article class="product-card">
 *   <img 
 *     data-src="/picture/product-{{id}}.jpg"
 *     data-placeholder="/picture/product-{{id}}-thumb.jpg"
 *     alt="{{name}}"
 *     class="product-card__image"
 *   >
 * </article>
 * 
 * Результат: каждая карточка товара загружает изображение с blur эффектом
 */

/**
 * ПРИМЕР 7: Ручная инициализация отдельного изображения
 * 
 * JavaScript:
 * import { enhanceImageWithLQIP } from './image-loader.js';
 * 
 * const img = document.querySelector('.my-image');
 * enhanceImageWithLQIP(img); // Применить LQIP к одному элементу
 */

/**
 * ПРИМЕР 8: Переинициализация после DOM изменений
 * 
 * JavaScript:
 * import { reinitLazyLoading } from './image-loader.js';
 * 
 * // После добавления новых элементов в DOM
 * container.innerHTML = '<img data-src="/new-image.jpg" alt="...">';
 * 
 * // Переинициализировать lazy loading
 * reinitLazyLoading();
 */

// ===== API СПРАВКА =====

/**
 * @function enhanceImageWithLQIP
 * @description Применить LQIP к одному img элементу
 * @param {HTMLImageElement} img - Элемент изображения
 * @example enhanceImageWithLQIP(document.querySelector('img.hero'))
 */

/**
 * @function initLazyLoading
 * @description Инициализировать lazy loading для всех img[data-src]
 * @description Использует Intersection Observer (50px margin)
 * @example initLazyLoading()
 */

/**
 * @function reinitLazyLoading
 * @description Переинициализировать lazy loading после загрузки компонента
 * @description Безопасно вызывается из loadComponent() автоматически
 * @example reinitLazyLoading()
 */

/**
 * @function preloadCriticalImages
 * @description Предзагрузить критические изображения (above the fold)
 * @param {string[]} srcs - Массив путей к изображениям
 * @example preloadCriticalImages(['/hero.jpg', '/logo.jpg'])
 */

// ===== АТРИБУТЫ HTML =====

/**
 * data-src (REQUIRED)
 * Полный путь к изображению высокого качества
 * <img data-src="/picture/image.jpg" alt="...">
 */

/**
 * data-placeholder (OPTIONAL)
 * Путь к placeholder изображению (низкое качество)
 * Если не указан - генерируется автоматический blur
 * <img data-src="/full.jpg" data-placeholder="/thumb.jpg" alt="...">
 */

/**
 * alt (REQUIRED)
 * Всегда добавляйте описание для доступности
 * <img data-src="/image.jpg" alt="Описание изображения">
 */

// ===== CSS КЛАССЫ =====

/**
 * img-loading
 * Добавляется при начале загрузки полного изображения
 * Используется для CSS анимаций во время загрузки
 */

/**
 * img-loaded
 * Добавляется после успешной загрузки изображения
 * Удаляет blur и показывает полное изображение
 */

/**
 * img-error
 * Добавляется если загрузка изображения не удалась
 * Используется для стилизации ошибочного состояния
 */

// ===== ПРОИЗВОДИТЕЛЬНОСТЬ =====

/**
 * Lazy Loading (Intersection Observer)
 * - Загрузка начинается за 50px до входа в viewport
 * - Значительно улучшает производительность на мобильных
 * - Автоматически отписывается от наблюдения после загрузки
 * 
 * Blur Placeholder
 * - Генерируется на лету (1x1 pixel canvas)
 * - Очень маленький размер (~1KB или меньше)
 * - Расчитывается один раз при инициализации
 * 
 * CSS Transitions
 * - Используются CSS transitions вместо JavaScript анимаций
 * - Лучше работает с GPU, меньше нагрузка на CPU
 * - Уважает prefers-reduced-motion для доступности
 */

// ===== СОВМЕСТИМОСТЬ =====

/**
 * IntersectionObserver API
 * - Поддержка: все современные браузеры (Chrome 51+, Safari 12.1+, Firefox 55+)
 * - Fallback: если не поддерживается - загружаются все изображения сразу
 * 
 * Canvas API
 * - Для генерации blur placeholder
 * - Очень широко поддерживается
 * 
 * prefers-reduced-motion
 * - Уважает настройки доступности пользователя
 * - Отключает blur переходы если пользователь включил reduced motion
 */

export default {
  example: 'See documentation above'
};
