/**
 * Unified Page Transitions Module
 * Обеспечивает плавные слайд-анимации для всех переходов в мобильной версии
 * 
 * Особенности:
 * - Стек навигации для корректного возврата
 * - Hardware acceleration (transform3d, will-change)
 * - Двунаправленные анимации (вперёд/назад)
 * - Интеграция с hash-роутингом
 */

// Конфигурация анимаций
const TRANSITION_CONFIG = {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Более плавный easing для возврата
    easingBack: 'cubic-bezier(0.22, 0.9, 0.32, 1)',
    // Минимальная ширина для мобильных анимаций
    mobileBreakpoint: 768
};

// Стек навигации для отслеживания истории
class NavigationStack {
    constructor() {
        this.stack = [];
        this.maxSize = 20;
        this._loadFromSession();
    }

    push(hash, scrollY = 0) {
        // Не добавляем дубликаты подряд
        if (this.stack.length > 0 && this.stack[this.stack.length - 1].hash === hash) {
            return;
        }
        this.stack.push({ hash, scrollY, timestamp: Date.now() });
        // Ограничиваем размер стека
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        }
        this._saveToSession();
    }

    pop() {
        const item = this.stack.pop();
        this._saveToSession();
        return item || null;
    }

    peek() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    clear() {
        this.stack = [];
        this._saveToSession();
    }

    get length() {
        return this.stack.length;
    }

    _saveToSession() {
        try {
            sessionStorage.setItem('nav_stack', JSON.stringify(this.stack));
        } catch (e) { /* ignore */ }
    }

    _loadFromSession() {
        try {
            const data = sessionStorage.getItem('nav_stack');
            if (data) {
                this.stack = JSON.parse(data);
            }
        } catch (e) {
            this.stack = [];
        }
    }
}

// Класс для управления переходами страниц
class PageTransitions {
    constructor() {
        this.navStack = new NavigationStack();
        this.isAnimating = false;
        this.currentContainer = null;
        this.isMobile = window.innerWidth <= TRANSITION_CONFIG.mobileBreakpoint;
        
        this._initResizeHandler();
        this._initReducedMotionCheck();
    }

    /**
     * Проверка предпочтений пользователя по анимациям
     */
    _initReducedMotionCheck() {
        this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
        
        window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
        });
    }

    /**
     * Обработчик изменения размера окна
     */
    _initResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.isMobile = window.innerWidth <= TRANSITION_CONFIG.mobileBreakpoint;
            }, 150);
        }, { passive: true });
    }

    /**
     * Применить стили для hardware acceleration
     */
    _enableHardwareAcceleration(element) {
        if (!element) return;
        element.style.willChange = 'transform, opacity';
        element.style.transform = 'translateZ(0)';
        element.style.backfaceVisibility = 'hidden';
    }

    /**
     * Убрать стили hardware acceleration
     */
    _disableHardwareAcceleration(element) {
        if (!element) return;
        element.style.willChange = '';
        element.style.backfaceVisibility = '';
    }

    /**
     * Анимация слайда элемента
     */
    _animateSlide(element, fromTransform, toTransform, duration = TRANSITION_CONFIG.duration, easing = TRANSITION_CONFIG.easing) {
        return new Promise((resolve) => {
            if (!element || this.prefersReducedMotion) {
                if (element) {
                    element.style.transform = toTransform;
                    element.style.opacity = '1';
                }
                resolve();
                return;
            }

            this._enableHardwareAcceleration(element);
            
            // Начальное состояние
            element.style.transition = 'none';
            element.style.transform = fromTransform;
            element.style.opacity = '0';
            
            // Force reflow
            void element.offsetWidth;
            
            // Анимация
            element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
            element.style.transform = toTransform;
            element.style.opacity = '1';
            
            const onEnd = () => {
                element.removeEventListener('transitionend', onEnd);
                this._disableHardwareAcceleration(element);
                element.style.transition = '';
                resolve();
            };
            
            element.addEventListener('transitionend', onEnd, { once: true });
            
            // Fallback timeout
            setTimeout(() => {
                element.removeEventListener('transitionend', onEnd);
                this._disableHardwareAcceleration(element);
                element.style.transition = '';
                resolve();
            }, duration + 50);
        });
    }

    /**
     * Переход вперёд (к новой странице)
     * @param {string} fromContainerId - ID контейнера откуда уходим
     * @param {string} toContainerId - ID контейнера куда переходим
     * @param {string} newHash - Новый hash для навигации
     */
    async navigateForward(fromContainerId, toContainerId, newHash = '') {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const fromEl = document.getElementById(fromContainerId);
        const toEl = document.getElementById(toContainerId);

        // Сохраняем текущую позицию в стек
        const currentHash = location.hash || '#';
        this.navStack.push(currentHash, window.scrollY);

        if (!this.isMobile || this.prefersReducedMotion) {
            // На десктопе или при reduced motion — без анимации
            if (fromEl) fromEl.style.display = 'none';
            if (toEl) toEl.style.display = '';
            if (newHash) location.hash = newHash;
            this.isAnimating = false;
            return;
        }

        // Подготовка
        if (toEl) {
            toEl.style.display = '';
            toEl.style.position = 'absolute';
            toEl.style.top = '0';
            toEl.style.left = '0';
            toEl.style.width = '100%';
            toEl.style.zIndex = '10';
        }

        // Параллельная анимация: текущая уходит влево, новая входит справа
        await Promise.all([
            this._animateSlide(fromEl, 'translate3d(0%, 0, 0)', 'translate3d(-30%, 0, 0)'),
            this._animateSlide(toEl, 'translate3d(100%, 0, 0)', 'translate3d(0%, 0, 0)')
        ]);

        // Финализация
        if (fromEl) fromEl.style.display = 'none';
        if (toEl) {
            toEl.style.position = '';
            toEl.style.top = '';
            toEl.style.left = '';
            toEl.style.width = '';
            toEl.style.zIndex = '';
        }

        // Скролл наверх
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Обновляем hash
        if (newHash) location.hash = newHash;

        this.isAnimating = false;
    }

    /**
     * Переход назад (к предыдущей странице)
     * @param {string} currentContainerId - ID текущего контейнера
     */
    async navigateBack(currentContainerId) {
        if (this.isAnimating) return;
        
        const prevState = this.navStack.pop();
        if (!prevState) {
            // Нет истории — переходим на главную
            location.hash = '';
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        this.isAnimating = true;

        const currentEl = document.getElementById(currentContainerId);
        
        // Определяем контейнер для возврата
        let targetContainerId = 'main-container';
        if (prevState.hash.includes('service-')) {
            targetContainerId = 'main-container';
        } else if (prevState.hash.includes('calculator')) {
            targetContainerId = 'main-container';
        }
        
        const targetEl = document.getElementById(targetContainerId);

        if (!this.isMobile || this.prefersReducedMotion) {
            if (currentEl) currentEl.style.display = 'none';
            if (targetEl) targetEl.style.display = '';
            location.hash = prevState.hash;
            window.scrollTo({ top: prevState.scrollY, behavior: 'instant' });
            this.isAnimating = false;
            return;
        }

        // Подготовка
        if (targetEl) {
            targetEl.style.display = '';
            targetEl.style.position = 'absolute';
            targetEl.style.top = '0';
            targetEl.style.left = '0';
            targetEl.style.width = '100%';
            targetEl.style.zIndex = '5';
            targetEl.style.transform = 'translate3d(-30%, 0, 0)';
            targetEl.style.opacity = '0.5';
        }

        // Параллельная анимация: текущая уходит вправо, предыдущая входит слева
        await Promise.all([
            this._animateSlide(currentEl, 'translate3d(0%, 0, 0)', 'translate3d(100%, 0, 0)', TRANSITION_CONFIG.duration, TRANSITION_CONFIG.easingBack),
            this._animateSlide(targetEl, 'translate3d(-30%, 0, 0)', 'translate3d(0%, 0, 0)', TRANSITION_CONFIG.duration, TRANSITION_CONFIG.easingBack)
        ]);

        // Финализация
        if (currentEl) currentEl.style.display = 'none';
        if (targetEl) {
            targetEl.style.position = '';
            targetEl.style.top = '';
            targetEl.style.left = '';
            targetEl.style.width = '';
            targetEl.style.zIndex = '';
            targetEl.style.opacity = '';
        }

        // Обновляем hash и восстанавливаем скролл
        location.hash = prevState.hash;
        window.scrollTo({ top: prevState.scrollY, behavior: 'instant' });

        this.isAnimating = false;
    }

    /**
     * Скролл к элементу с анимацией появления
     * @param {string} targetId - ID целевого элемента
     * @param {string} fromDirection - Направление появления ('left' | 'right' | 'top')
     */
    async scrollToWithAnimation(targetId, fromDirection = 'right') {
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        // Сохраняем позицию для возврата
        sessionStorage.setItem('scrollReturnPosition', window.scrollY.toString());
        sessionStorage.setItem('scrollReturnTarget', targetId);

        if (this.prefersReducedMotion || !this.isMobile) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // Анимация появления
        let fromTransform;
        if (fromDirection === 'top') {
            fromTransform = 'translate3d(0, -100%, 0)';
        } else {
            const fromX = fromDirection === 'right' ? '100%' : '-100%';
            fromTransform = `translate3d(${fromX}, 0, 0)`;
        }
        
        this._enableHardwareAcceleration(targetEl);
        targetEl.style.transition = 'none';
        targetEl.style.transform = fromTransform;
        targetEl.style.opacity = '0';
        
        void targetEl.offsetWidth;
        
        // Скролл + анимация
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const toTransform = fromDirection === 'top' ? 'translate3d(0, 0%, 0)' : 'translate3d(0%, 0, 0)';
        await this._animateSlide(targetEl, fromTransform, toTransform);
        
        // Фокус на заголовок для страницы прайс-листа
        if (targetId === 'pricelist') {
            const headerEl = targetEl.querySelector('.pricelist-page__header');
            if (headerEl) {
                headerEl.focus({ preventScroll: true });
                // Для screen readers - aria-live region
                headerEl.setAttribute('tabindex', '-1');
            }
        }
    }

    /**
     * Возврат от скролла к предыдущей позиции
     */
    async scrollBack() {
        const returnPosition = sessionStorage.getItem('scrollReturnPosition');
        const returnTarget = sessionStorage.getItem('scrollReturnTarget');
        
        if (!returnPosition) return;

        const targetEl = returnTarget ? document.getElementById(returnTarget) : null;

        if (this.prefersReducedMotion || !this.isMobile) {
            window.scrollTo({ top: parseInt(returnPosition, 10), behavior: 'smooth' });
            sessionStorage.removeItem('scrollReturnPosition');
            sessionStorage.removeItem('scrollReturnTarget');
            return;
        }

        // Анимация ухода
        if (targetEl) {
            await this._animateSlide(targetEl, 'translate3d(0%, 0, 0)', 'translate3d(100%, 0, 0)', TRANSITION_CONFIG.duration, TRANSITION_CONFIG.easingBack);
            targetEl.style.transform = '';
            targetEl.style.opacity = '';
        }

        // Возврат к позиции
        window.scrollTo({ top: parseInt(returnPosition, 10), behavior: 'smooth' });
        
        sessionStorage.removeItem('scrollReturnPosition');
        sessionStorage.removeItem('scrollReturnTarget');
    }

    /**
     * Очистить стек навигации
     */
    clearHistory() {
        this.navStack.clear();
    }

    /**
     * Получить предыдущее состояние без удаления из стека
     */
    getPreviousState() {
        return this.navStack.peek();
    }
}

// Создаём и экспортируем синглтон
export const pageTransitions = new PageTransitions();

// Экспорт в window для доступа из других скриптов
if (typeof window !== 'undefined') {
    window.pageTransitions = pageTransitions;
}

// Инициализация обработчиков для кнопок
export function initPageTransitionHandlers() {
    // Обработчик для кнопок "назад"
    document.addEventListener('click', async (e) => {
        const backBtn = e.target.closest('.back-to-main');
        if (!backBtn) return;
        
        e.preventDefault();
        
        // Находим текущий контейнер
        const container = backBtn.closest('[id$="-container"], .service-page, .calculator-page, .about-page');
        const containerId = container?.id || 'main-container';
        
        await pageTransitions.navigateBack(containerId);
    });

    // Обработчик для кнопок "прайс-лист" (скролл с анимацией)
    document.addEventListener('click', async (e) => {
        const pricelistLink = e.target.closest('.pricelist-link');
        if (!pricelistLink) return;
        
        const href = pricelistLink.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        
        e.preventDefault();
        
        const targetId = href.substring(1);
        await pageTransitions.scrollToWithAnimation(targetId, 'top');
    });

    console.debug('[PageTransitions] Handlers initialized');
}
