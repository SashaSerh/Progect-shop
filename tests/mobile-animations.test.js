import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mobileAnimationConfig, SectionSwipeManager, mobileAnimations } from '../js/mobile-animations.js';

describe('Mobile Animations System', () => {
    describe('mobileAnimationConfig', () => {
        it('має правильні тривалості', () => {
            expect(mobileAnimationConfig.duration.fast).toBe(150);
            expect(mobileAnimationConfig.duration.micro).toBe(200);
            expect(mobileAnimationConfig.duration.normal).toBe(300);
            expect(mobileAnimationConfig.duration.slow).toBe(500);
        });

        it('має правильні easing функції', () => {
            expect(mobileAnimationConfig.easing.standard).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
            expect(mobileAnimationConfig.easing.emphasized).toBe('cubic-bezier(0.22, 0.9, 0.32, 1)');
        });

        it('має правильні порогові значення', () => {
            expect(mobileAnimationConfig.threshold.distance).toBe(50);
            expect(mobileAnimationConfig.threshold.velocity).toBe(0.3);
        });
    });

    describe('SectionSwipeManager', () => {
        let manager;
        let mockElement;

        beforeEach(() => {
            // Створюємо mock елемент
            mockElement = document.createElement('div');
            mockElement.id = 'test-section';
            mockElement.innerHTML = '<div class="about-page"></div>';
            document.body.appendChild(mockElement);

            manager = new SectionSwipeManager('test-section');
        });

        afterEach(() => {
            if (mockElement && mockElement.parentNode) {
                mockElement.parentNode.removeChild(mockElement);
            }
        });

        it('створюється з правильними параметрами', () => {
            expect(manager.sectionId).toBe('test-section');
            expect(manager.element).toBe(mockElement);
            expect(manager.isAnimating).toBe(false);
        });

        it('визначає правильний клас секції', () => {
            const sectionClass = manager._getSectionClass();
            expect(sectionClass).toBe('about-page');
        });

        it('slideInFromRight змінює стан анімації', async () => {
            const promise = manager.slideInFromRight();
            expect(manager.isAnimating).toBe(true);
            
            await promise;
            expect(manager.isAnimating).toBe(false);
        });

        it('reset очищає всі анімаційні класи', () => {
            mockElement.classList.add('about-page--slide-in-from-right');
            mockElement.classList.add('about-page--slide-in');
            
            manager.reset();
            
            expect(mockElement.classList.contains('about-page--slide-in-from-right')).toBe(false);
            expect(mockElement.classList.contains('about-page--slide-in')).toBe(false);
            expect(manager.isAnimating).toBe(false);
        });
    });

    describe('MobileAnimationsManager', () => {
        let testElement;

        beforeEach(() => {
            testElement = document.createElement('div');
            testElement.id = 'test-container';
            testElement.innerHTML = '<div class="portfolio"></div>';
            document.body.appendChild(testElement);
        });

        afterEach(() => {
            if (testElement && testElement.parentNode) {
                testElement.parentNode.removeChild(testElement);
            }
            mobileAnimations.sections.clear();
        });

        it('реєструє секцію', () => {
            const section = mobileAnimations.registerSection('test-container');
            expect(section).toBeInstanceOf(SectionSwipeManager);
            expect(mobileAnimations.sections.has('test-container')).toBe(true);
        });

        it('повертає існуючу секцію при повторній реєстрації', () => {
            const section1 = mobileAnimations.registerSection('test-container');
            const section2 = mobileAnimations.registerSection('test-container');
            expect(section1).toBe(section2);
        });

        it('getSection повертає зареєстровану секцію', () => {
            mobileAnimations.registerSection('test-container');
            const section = mobileAnimations.getSection('test-container');
            expect(section).toBeInstanceOf(SectionSwipeManager);
        });

        it('показує секцію з анімацією на мобільних', async () => {
            // Симулюємо мобільний екран
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375
            });
            
            mobileAnimations.isMobile = true;
            
            await mobileAnimations.show('test-container', 'right');
            
            const section = mobileAnimations.getSection('test-container');
            expect(section).toBeDefined();
        });

        it('на десктопі показує без анімації', async () => {
            // Симулюємо десктопний екран
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1920
            });
            
            mobileAnimations.isMobile = false;
            
            await mobileAnimations.show('test-container', 'right');
            
            expect(testElement.style.display).toBe('');
        });

        it('resetAll скидає всі секції', () => {
            mobileAnimations.registerSection('test-container');
            const section = mobileAnimations.getSection('test-container');
            
            section.isAnimating = true;
            testElement.classList.add('portfolio--slide-in');
            
            mobileAnimations.resetAll();
            
            expect(section.isAnimating).toBe(false);
            expect(testElement.classList.contains('portfolio--slide-in')).toBe(false);
        });
    });

    describe('Window exports', () => {
        it('експортує mobileAnimations в window', () => {
            expect(window.mobileAnimations).toBeDefined();
            expect(window.mobileAnimations).toBe(mobileAnimations);
        });

        it('експортує SectionSwipeManager в window', () => {
            expect(window.SectionSwipeManager).toBeDefined();
            expect(window.SectionSwipeManager).toBe(SectionSwipeManager);
        });

        it('експортує mobileAnimationConfig в window', () => {
            expect(window.mobileAnimationConfig).toBeDefined();
            expect(window.mobileAnimationConfig).toBe(mobileAnimationConfig);
        });
    });
});
