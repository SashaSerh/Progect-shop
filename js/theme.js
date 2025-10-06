/**
 * Инициализация системы тем
 * Работает с множественными иконками тем в мобильной и десктопной версиях
 */
export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', savedTheme === 'light');
    
    // Обновляем все иконки тем
    updateAllThemeIcons(savedTheme);
}

/**
 * Переключение темы
 * Обрабатывает все кнопки тем одновременно
 */
export function toggleTheme() {
    // Добавляем класс для плавного перехода
    document.body.classList.add('theme-transition');
    document.body.classList.toggle('light-theme');
    const isLightTheme = document.body.classList.contains('light-theme');
    const currentTheme = isLightTheme ? 'light' : 'dark';
    
    // Сохраняем в localStorage
    localStorage.setItem('theme', currentTheme);
    
    // Обновляем все иконки тем
    updateAllThemeIcons(currentTheme);
    
    // Добавляем тактильную обратную связь для мобильных устройств
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    // Кастомное событие для синхронизации UI (мобильные компактные элементы и др.)
    try {
        const event = new CustomEvent('themechange', { detail: { theme: currentTheme } });
        window.dispatchEvent(event);
    } catch (err) {
        console.warn('Не удалось отправить событие themechange', err);
    }

    // Убираем класс после завершения перехода (fallback таймер)
    setTimeout(() => {
        document.body.classList.remove('theme-transition');
    }, 400);
}

/**
 * Обновление всех иконок тем в DOM
 * Находит все элементы .theme-icon и обновляет их
 * @param {string} theme - текущая тема ('light' или 'dark')
 */
function updateAllThemeIcons(theme) {
    // Находим все иконки тем (мобильные и десктопные)
    const themeIcons = document.querySelectorAll('.theme-icon');
    
    themeIcons.forEach(icon => {
        if (theme === 'light') {
            icon.textContent = '🌞'; // Солнце для светлой темы
        } else {
            icon.textContent = '🌙'; // Луна для темной темы
        }
    });
    
    // Также обновляем ARIA-метки для кнопок переключения тем
    const themeButtons = document.querySelectorAll('.theme-toggle, .mobile-theme-toggle');
    themeButtons.forEach(button => {
        const newLabel = theme === 'light' 
            ? 'Переключить на темную тему' 
            : 'Переключить на светлую тему';
        button.setAttribute('aria-label', newLabel);
        // Обновляем aria-pressed если это кнопка в компактной мобильной панели
        if (button.id === 'mobileThemeToggle') {
            button.setAttribute('aria-pressed', theme === 'light');
        }
    });
    
    console.log(`Обновлено ${themeIcons.length} иконок тем для темы: ${theme}`);
}

/**
 * Привязка обработчиков событий ко всем кнопкам переключения тем
 * Вызывается после загрузки компонентов
 */
export function bindThemeEvents() {
    // Находим все кнопки переключения тем (исключаем мобильные - они обрабатываются отдельно)
    const themeButtons = document.querySelectorAll('.theme-toggle:not(.mobile-theme-toggle)');
    
    themeButtons.forEach(button => {
        // Удаляем старые обработчики для избежания дублирования
        button.removeEventListener('click', toggleTheme);
        // Добавляем новый обработчик
        button.addEventListener('click', toggleTheme);
    });
}

/**
 * Получение текущей темы
 * @returns {string} 'light' или 'dark'
 */
export function getCurrentTheme() {
    return localStorage.getItem('theme') || 'dark';
}

/**
 * Установка конкретной темы
 * @param {string} theme - 'light' или 'dark'
 */
export function setTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    localStorage.setItem('theme', theme);
    updateAllThemeIcons(theme);
}

// Экспорт в глобальную область для совместимости
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.setTheme = setTheme;