/**
 * Стандартизована система анімацій для мобільної версії
 * Забезпечує плавні swipe-переходи для всіх секцій
 */

// Конфігурація анімацій (токени з main.css)
export const mobileAnimationConfig = {
    // Тривалості з CSS змінних
    duration: {
        fast: 150,
        micro: 200,
        normal: 300,
        slow: 500
    },
    // Easing функції
    easing: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.22, 0.9, 0.32, 1)',
        decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0, 1, 1)'
    },
    // Напрямки свайпів
    directions: {
        LEFT: 'left',
        RIGHT: 'right',
        UP: 'up',
        DOWN: 'down'
    },
    // Порогові значення для свайпів
    threshold: {
        distance: 50,  // мінімальна дистанція для активації свайпа (px)
        velocity: 0.3  // мінімальна швидкість для активації (px/ms)
    }
};

/**
 * Клас для управління swipe-анімаціями секцій
 */
export class SectionSwipeManager {
    constructor(sectionId, options = {}) {
        this.sectionId = sectionId;
        this.element = document.getElementById(sectionId);
        this.options = {
            direction: options.direction || 'horizontal',
            duration: options.duration || mobileAnimationConfig.duration.normal,
            easing: options.easing || mobileAnimationConfig.easing.standard,
            ...options
        };
        this.isAnimating = false;
    }

    /**
     * Анімація входу секції справа
     */
    slideInFromRight() {
        if (!this.element || this.isAnimating) return Promise.resolve();
        
        this.isAnimating = true;
        const sectionClass = this._getSectionClass();
        
        return new Promise((resolve) => {
            // Очищаємо попередні класи анімації
            this.element.classList.remove(
                `${sectionClass}--slide-in-from-right`,
                `${sectionClass}--slide-in`,
                `${sectionClass}--slide-out-to-right`
            );
            
            // Робимо секцію видимою
            this.element.style.display = '';
            
            // Trigger reflow
            void this.element.offsetWidth;
            
            // Додаємо початковий стан
            this.element.classList.add(`${sectionClass}--slide-in-from-right`);
            
            // В наступному фреймі запускаємо анімацію
            requestAnimationFrame(() => {
                this.element.classList.remove(`${sectionClass}--slide-in-from-right`);
                this.element.classList.add(`${sectionClass}--slide-in`);
                
                // Чекаємо завершення анімації
                setTimeout(() => {
                    this.isAnimating = false;
                    resolve();
                }, this.options.duration);
            });
        });
    }

    /**
     * Анімація входу секції зліва
     */
    slideInFromLeft() {
        if (!this.element || this.isAnimating) return Promise.resolve();
        
        this.isAnimating = true;
        const sectionClass = this._getSectionClass();
        
        return new Promise((resolve) => {
            // Очищаємо попередні класи
            this.element.classList.remove(
                `${sectionClass}--slide-in-from-left`,
                `${sectionClass}--slide-in`,
                `${sectionClass}--slide-out-to-left`
            );
            
            this.element.style.display = '';
            void this.element.offsetWidth;
            
            this.element.classList.add(`${sectionClass}--slide-in-from-left`);
            
            requestAnimationFrame(() => {
                this.element.classList.remove(`${sectionClass}--slide-in-from-left`);
                this.element.classList.add(`${sectionClass}--slide-in`);
                
                setTimeout(() => {
                    this.isAnimating = false;
                    resolve();
                }, this.options.duration);
            });
        });
    }

    /**
     * Анімація виходу секції вправо
     */
    slideOutToRight() {
        if (!this.element || this.isAnimating) return Promise.resolve();
        
        this.isAnimating = true;
        const sectionClass = this._getSectionClass();
        
        return new Promise((resolve) => {
            this.element.classList.remove(`${sectionClass}--slide-in`);
            this.element.classList.add(`${sectionClass}--slide-out-to-right`);
            
            setTimeout(() => {
                this.element.style.display = 'none';
                this.element.classList.remove(`${sectionClass}--slide-out-to-right`);
                this.isAnimating = false;
                resolve();
            }, this.options.duration);
        });
    }

    /**
     * Анімація виходу секції вліво
     */
    slideOutToLeft() {
        if (!this.element || this.isAnimating) return Promise.resolve();
        
        this.isAnimating = true;
        const sectionClass = this._getSectionClass();
        
        return new Promise((resolve) => {
            this.element.classList.remove(`${sectionClass}--slide-in`);
            this.element.classList.add(`${sectionClass}--slide-out-to-left`);
            
            setTimeout(() => {
                this.element.style.display = 'none';
                this.element.classList.remove(`${sectionClass}--slide-out-to-left`);
                this.isAnimating = false;
                resolve();
            }, this.options.duration);
        });
    }

    /**
     * Отримати базовий клас секції для анімацій
     */
    _getSectionClass() {
        if (!this.element) return '';
        
        // Пріоритетні класи секцій
        const classMap = {
            'service-page': 'service-page',
            'about-page': 'about-page',
            'portfolio': 'portfolio',
            'reviews': 'reviews',
            'faq': 'faq',
            'contacts': 'contacts',
            'welcome': 'welcome'
        };
        
        for (const [className, prefix] of Object.entries(classMap)) {
            if (this.element.querySelector(`.${className}`)) {
                return prefix;
            }
        }
        
        // Fallback для main-container
        if (this.sectionId === 'main-container') {
            return 'main-container';
        }
        
        return '';
    }

    /**
     * Скинути всі анімаційні класи
     */
    reset() {
        if (!this.element) return;
        
        const sectionClass = this._getSectionClass();
        if (!sectionClass) return;
        
        this.element.classList.remove(
            `${sectionClass}--slide-in-from-right`,
            `${sectionClass}--slide-in-from-left`,
            `${sectionClass}--slide-in`,
            `${sectionClass}--slide-out-to-right`,
            `${sectionClass}--slide-out-to-left`
        );
        this.isAnimating = false;
    }
}

/**
 * Глобальний менеджер анімацій для всіх секцій
 */
class MobileAnimationsManager {
    constructor() {
        this.sections = new Map();
        this.isMobile = window.innerWidth <= 768;
        this._initResizeHandler();
    }

    /**
     * Зареєструвати секцію для анімацій
     */
    registerSection(sectionId, options = {}) {
        if (!this.sections.has(sectionId)) {
            this.sections.set(sectionId, new SectionSwipeManager(sectionId, options));
        }
        return this.sections.get(sectionId);
    }

    /**
     * Отримати менеджер секції
     */
    getSection(sectionId) {
        return this.sections.get(sectionId);
    }

    /**
     * Виконати анімований перехід між секціями
     */
    async transitionBetween(fromSectionId, toSectionId, direction = 'right') {
        if (!this.isMobile) {
            // На десктопі просто показуємо/ховаємо без анімації
            const fromEl = document.getElementById(fromSectionId);
            const toEl = document.getElementById(toSectionId);
            if (fromEl) fromEl.style.display = 'none';
            if (toEl) toEl.style.display = '';
            return;
        }

        const fromSection = this.getSection(fromSectionId) || this.registerSection(fromSectionId);
        const toSection = this.getSection(toSectionId) || this.registerSection(toSectionId);

        // Анімуємо вихід та вхід паралельно
        await Promise.all([
            direction === 'right' ? fromSection.slideOutToRight() : fromSection.slideOutToLeft(),
            direction === 'right' ? toSection.slideInFromRight() : toSection.slideInFromLeft()
        ]);
    }

    /**
     * Показати секцію з анімацією
     */
    async show(sectionId, direction = 'right') {
        if (!this.isMobile) {
            const el = document.getElementById(sectionId);
            if (el) el.style.display = '';
            return;
        }

        const section = this.getSection(sectionId) || this.registerSection(sectionId);
        return direction === 'right' ? section.slideInFromRight() : section.slideInFromLeft();
    }

    /**
     * Сховати секцію з анімацією
     */
    async hide(sectionId, direction = 'right') {
        if (!this.isMobile) {
            const el = document.getElementById(sectionId);
            if (el) el.style.display = 'none';
            return;
        }

        const section = this.getSection(sectionId) || this.registerSection(sectionId);
        return direction === 'right' ? section.slideOutToRight() : section.slideOutToLeft();
    }

    /**
     * Обробник зміни розміру вікна
     */
    _initResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.isMobile = window.innerWidth <= 768;
            }, 150);
        }, { passive: true });
    }

    /**
     * Скинути всі анімації
     */
    resetAll() {
        this.sections.forEach(section => section.reset());
    }
}

// Експортуємо глобальний інстанс
export const mobileAnimations = new MobileAnimationsManager();

// Також експортуємо в window для доступу з інших скриптів
if (typeof window !== 'undefined') {
    window.mobileAnimations = mobileAnimations;
    window.SectionSwipeManager = SectionSwipeManager;
    window.mobileAnimationConfig = mobileAnimationConfig;
}
