/**
 * Haptic Feedback Module
 * Тактильная обратная связь через Vibration API (Android)
 * iOS Safari не поддерживает Vibration API — там fallback на CSS-анимацию
 */

const HapticPatterns = {
    // Лёгкое касание (tap)
    light: 10,
    // Стандартное нажатие
    medium: 25,
    // Усиленная вибрация
    heavy: 50,
    // Успех — двойная короткая
    success: [20, 50, 20],
    // Ошибка — длинная
    error: [100],
    // Клик по кнопке
    button: 15,
    // Открытие меню
    menuOpen: [15, 30, 15],
    // Закрытие меню
    menuClose: 20,
    // Добавление в корзину
    cartAdd: [10, 20, 30],
    // Переключение темы/языка
    toggle: [10, 15, 10]
};

/**
 * Проверка поддержки Vibration API
 */
function isVibrationSupported() {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

/**
 * Проверка, что это мобильное устройство
 */
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || ('ontouchstart' in window);
}

/**
 * Основная функция вибрации
 * @param {string|number|number[]} pattern - паттерн вибрации или ключ из HapticPatterns
 */
function vibrate(pattern = 'medium') {
    // Только для мобильных устройств
    if (!isMobileDevice()) return false;
    
    // Проверка поддержки
    if (!isVibrationSupported()) return false;
    
    // Получаем паттерн
    const vibrationPattern = typeof pattern === 'string' 
        ? HapticPatterns[pattern] || HapticPatterns.medium 
        : pattern;
    
    try {
        return navigator.vibrate(vibrationPattern);
    } catch (e) {
        // Некоторые браузеры могут блокировать vibrate() без user gesture
        return false;
    }
}

/**
 * Остановить вибрацию
 */
function stopVibration() {
    if (isVibrationSupported()) {
        navigator.vibrate(0);
    }
}

// Короткие алиасы для удобства
const haptic = {
    // Основные
    light: () => vibrate('light'),
    medium: () => vibrate('medium'),
    heavy: () => vibrate('heavy'),
    
    // Семантические
    success: () => vibrate('success'),
    error: () => vibrate('error'),
    button: () => vibrate('button'),
    
    // Специфичные для UI
    menuOpen: () => vibrate('menuOpen'),
    menuClose: () => vibrate('menuClose'),
    cartAdd: () => vibrate('cartAdd'),
    toggle: () => vibrate('toggle'),
    
    // Служебные
    stop: stopVibration,
    isSupported: isVibrationSupported,
    isMobile: isMobileDevice,
    
    // Кастомный паттерн
    custom: (pattern) => vibrate(pattern)
};

// Экспорт
export { haptic, vibrate, HapticPatterns, isVibrationSupported, isMobileDevice };
export default haptic;
