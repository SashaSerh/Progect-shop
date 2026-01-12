/**
 * Tests for page-transitions.js module
 * Проверяет работу стека навигации и анимаций переходов
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock window.matchMedia
const mockMatchMedia = vi.fn().mockImplementation(query => ({
    matches: query.includes('reduce') ? false : query.includes('768') ? true : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn(key => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Import after mocks
import { pageTransitions, initPageTransitionHandlers } from '../js/page-transitions.js';

describe('PageTransitions Module', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        sessionStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('Navigation Stack', () => {
        it('should push and pop navigation states', () => {
            pageTransitions.clearHistory();
            
            pageTransitions.navStack.push('#services', 100);
            pageTransitions.navStack.push('#calculator', 200);
            
            expect(pageTransitions.navStack.length).toBe(2);
            
            const state = pageTransitions.navStack.pop();
            expect(state.hash).toBe('#calculator');
            expect(state.scrollY).toBe(200);
            
            expect(pageTransitions.navStack.length).toBe(1);
        });

        it('should not add duplicate consecutive states', () => {
            pageTransitions.clearHistory();
            
            pageTransitions.navStack.push('#services', 100);
            pageTransitions.navStack.push('#services', 100);
            pageTransitions.navStack.push('#services', 150);
            
            expect(pageTransitions.navStack.length).toBe(1);
        });

        it('should peek without removing', () => {
            pageTransitions.clearHistory();
            
            pageTransitions.navStack.push('#services', 100);
            
            const peeked = pageTransitions.navStack.peek();
            expect(peeked.hash).toBe('#services');
            expect(pageTransitions.navStack.length).toBe(1);
        });

        it('should return null when popping empty stack', () => {
            pageTransitions.clearHistory();
            
            const state = pageTransitions.navStack.pop();
            expect(state).toBeNull();
        });
    });

    describe('Handler Initialization', () => {
        it('should initialize without errors', () => {
            document.body.innerHTML = `
                <div id="main-container">
                    <a href="#" class="back-to-main">Back</a>
                    <a href="#pricelist" class="pricelist-link">Pricelist</a>
                </div>
            `;
            
            expect(() => initPageTransitionHandlers()).not.toThrow();
        });

        it('should handle back button clicks', async () => {
            document.body.innerHTML = `
                <div id="service-container" class="service-page">
                    <a href="#" class="back-to-main">Back</a>
                </div>
                <div id="main-container" style="display: none;"></div>
            `;
            
            initPageTransitionHandlers();
            
            // Push a state first
            pageTransitions.navStack.push('#', 0);
            
            const backBtn = document.querySelector('.back-to-main');
            const clickEvent = new MouseEvent('click', { bubbles: true });
            
            backBtn.dispatchEvent(clickEvent);
            
            // Wait for async navigation
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // State should be popped
            expect(pageTransitions.navStack.length).toBe(0);
        });
    });

    describe('Scroll Animation', () => {
        it('should store scroll return position', async () => {
            document.body.innerHTML = `
                <div id="pricelist" style="height: 500px;"></div>
            `;
            
            // Mock scrollIntoView (not available in JSDOM)
            const pricelistEl = document.getElementById('pricelist');
            pricelistEl.scrollIntoView = vi.fn();
            
            await pageTransitions.scrollToWithAnimation('pricelist', 'right');
            
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
                'scrollReturnPosition',
                expect.any(String)
            );
            expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
                'scrollReturnTarget',
                'pricelist'
            );
        });

        it('should clear return position on scrollBack', async () => {
            sessionStorageMock.setItem('scrollReturnPosition', '100');
            sessionStorageMock.setItem('scrollReturnTarget', 'pricelist');
            
            await pageTransitions.scrollBack();
            
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('scrollReturnPosition');
            expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('scrollReturnTarget');
        });
    });

    describe('Previous State Retrieval', () => {
        it('should get previous state without removing', () => {
            pageTransitions.clearHistory();
            
            pageTransitions.navStack.push('#services', 50);
            pageTransitions.navStack.push('#calculator', 100);
            
            const prev = pageTransitions.getPreviousState();
            
            expect(prev.hash).toBe('#calculator');
            expect(pageTransitions.navStack.length).toBe(2);
        });
    });
});
