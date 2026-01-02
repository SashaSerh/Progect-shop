/**
 * Приклади використання стандартизованої системи мобільних анімацій
 * 
 * Цей файл містить практичні приклади інтеграції системи анімацій
 * у різні частини додатку.
 */

import { mobileAnimations, mobileAnimationConfig } from './mobile-animations.js';

// ============================================
// ПРИКЛАД 1: Базове використання
// ============================================

/**
 * Показати секцію з анімацією справа (типовий сценарій)
 */
async function showAboutPage() {
    // Перевіряємо чи це мобільний пристрій
    if (window.innerWidth <= 768) {
        // Завантажуємо контент
        await loadComponent('main-container', 'components/about.html');
        
        // Анімуємо появу
        await mobileAnimations.show('main-container', 'right');
        
        console.log('About page показана з анімацією!');
    } else {
        // На десктопі просто показуємо
        document.getElementById('main-container').style.display = '';
    }
}

// ============================================
// ПРИКЛАД 2: Перехід між секціями
// ============================================

/**
 * Плавний перехід від героя до about
 */
async function navigateToAbout() {
    if (window.innerWidth > 768) {
        // Десктоп: миттєвий перехід
        document.getElementById('hero-container').style.display = 'none';
        document.getElementById('main-container').style.display = '';
        return;
    }
    
    // Мобільний: анімований перехід
    // Спочаткуховаємо hero вліво
    await mobileAnimations.hide('hero-container', 'left');
    
    // Потім показуємо about справа
    await mobileAnimations.show('main-container', 'right');
}

// ============================================
// ПРИКЛАД 3: Повернення назад
// ============================================

/**
 * Повернення з about на головну (зворотна анімація)
 */
async function goBackToHome() {
    if (window.innerWidth > 768) {
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('hero-container').style.display = '';
        return;
    }
    
    // Анімуємо вихід about вправо (як при Back)
    await mobileAnimations.hide('main-container', 'right');
    
    // Показуємо hero зліва
    await mobileAnimations.show('hero-container', 'left');
}

// ============================================
// ПРИКЛАД 4: Послідовність анімацій
// ============================================

/**
 * Складна послідовність переходів
 */
async function showServiceThenCalculator() {
    // Крок 1: Завантажити та показати сервіс
    await loadComponent('main-container', 'components/service-ac-install.html');
    await mobileAnimations.show('main-container', 'right');
    
    // Чекаємо поки користувач прочитає (або тригер події)
    await waitForUserInteraction();
    
    // Крок 2: Переходимо до калькулятора
    await mobileAnimations.hide('main-container', 'left');
    await loadComponent('calculator-container', 'components/calculator-page.html');
    await mobileAnimations.show('calculator-container', 'right');
}

// ============================================
// ПРИКЛАД 5: Кастомна конфігурація
// ============================================

/**
 * Створення менеджера з власними налаштуваннями
 */
import { SectionSwipeManager } from './mobile-animations.js';

function createCustomAnimatedSection() {
    const customManager = new SectionSwipeManager('special-section', {
        duration: mobileAnimationConfig.duration.slow, // 500ms замість 300ms
        easing: mobileAnimationConfig.easing.emphasized // Більш виразна анімація
    });
    
    return customManager;
}

// Використання
async function showSpecialSection() {
    const manager = createCustomAnimatedSection();
    await manager.slideInFromRight();
}

// ============================================
// ПРИКЛАД 6: Обробка помилок
// ============================================

/**
 * Безпечна анімація з fallback
 */
async function safeAnimatedTransition(fromId, toId) {
    try {
        // Спробуємо анімувати
        if (window.innerWidth <= 768) {
            await mobileAnimations.transitionBetween(fromId, toId, 'right');
        } else {
            // Fallback для десктопу
            document.getElementById(fromId).style.display = 'none';
            document.getElementById(toId).style.display = '';
        }
    } catch (error) {
        console.error('Animation error:', error);
        
        // Якщо щось пішло не так, робимо миттєвий перехід
        document.getElementById(fromId).style.display = 'none';
        document.getElementById(toId).style.display = '';
    }
}

// ============================================
// ПРИКЛАД 7: Інтеграція з Router
// ============================================

/**
 * Приклад інтеграції в hash-based роутер
 */
function setupAnimatedRouter() {
    window.addEventListener('hashchange', async (e) => {
        const hash = location.hash;
        
        if (hash === '#about') {
            await loadComponent('main-container', 'components/about.html');
            
            if (window.innerWidth <= 768) {
                // Реєструємо секцію один раз
                mobileAnimations.registerSection('main-container');
                await mobileAnimations.show('main-container', 'right');
            }
        } else if (hash === '#services') {
            if (window.innerWidth <= 768) {
                await mobileAnimations.hide('main-container', 'left');
            }
            // ... показати services
        }
    });
}

// ============================================
// ПРИКЛАД 8: Lifecycle hooks
// ============================================

/**
 * Хуки для контролю анімації
 */
class AnimatedPage {
    constructor(containerId) {
        this.containerId = containerId;
        this.manager = mobileAnimations.registerSection(containerId);
    }
    
    async show(direction = 'right') {
        await this.onBeforeShow();
        await this.manager[direction === 'right' ? 'slideInFromRight' : 'slideInFromLeft']();
        await this.onAfterShow();
    }
    
    async hide(direction = 'right') {
        await this.onBeforeHide();
        await this.manager[direction === 'right' ? 'slideOutToRight' : 'slideOutToLeft']();
        await this.onAfterHide();
    }
    
    // Хуки для розширення
    async onBeforeShow() {
        console.log('Before show animation');
    }
    
    async onAfterShow() {
        console.log('After show animation');
        // Наприклад, фокус на першому елементі
        this.focusFirstElement();
    }
    
    async onBeforeHide() {
        console.log('Before hide animation');
    }
    
    async onAfterHide() {
        console.log('After hide animation');
        // Очистка ресурсів
        this.cleanup();
    }
    
    focusFirstElement() {
        const container = document.getElementById(this.containerId);
        const firstFocusable = container?.querySelector('button, a, input, textarea, select');
        firstFocusable?.focus();
    }
    
    cleanup() {
        // Очистка event listeners, таймерів тощо
    }
}

// Використання
const aboutPage = new AnimatedPage('main-container');
await aboutPage.show('right');

// ============================================
// ПРИКЛАД 9: Performance моніторинг
// ============================================

/**
 * Вимірювання продуктивності анімації
 */
async function measureAnimationPerformance() {
    const startTime = performance.now();
    
    await mobileAnimations.show('main-container', 'right');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Animation took ${duration.toFixed(2)}ms`);
    
    // Відправити метрики в analytics
    if (window.gtag) {
        gtag('event', 'animation_duration', {
            'event_category': 'performance',
            'event_label': 'mobile_swipe',
            'value': Math.round(duration)
        });
    }
}

// ============================================
// ПРИКЛАД 10: Скасування анімації
// ============================================

/**
 * Скасування анімації при швидкій навігації
 */
let currentAnimation = null;

async function navigateWithCancel(toSection) {
    // Скасовуємо попередню анімацію якщо вона ще йде
    if (currentAnimation) {
        mobileAnimations.resetAll();
    }
    
    // Запускаємо нову
    currentAnimation = mobileAnimations.show(toSection, 'right');
    await currentAnimation;
    currentAnimation = null;
}

// ============================================
// ЕКСПОРТ ДЛЯ ВИКОРИСТАННЯ В ІНШИХ МОДУЛЯХ
// ============================================

export {
    showAboutPage,
    navigateToAbout,
    goBackToHome,
    showServiceThenCalculator,
    createCustomAnimatedSection,
    safeAnimatedTransition,
    setupAnimatedRouter,
    AnimatedPage,
    measureAnimationPerformance,
    navigateWithCancel
};

// Також доступно глобально
if (typeof window !== 'undefined') {
    window.mobileAnimationExamples = {
        showAboutPage,
        navigateToAbout,
        goBackToHome,
        AnimatedPage
    };
}
