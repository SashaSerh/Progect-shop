/**
 * Unified Page Transitions System
 * Оптимизированная система переходов между страницами для мобильной версии
 * 
 * Features:
 * - Hardware-accelerated CSS transforms
 * - Bidirectional animations (forward/back)
 * - Navigation history stack
 * - Smooth 60fps animations
 * - Respects prefers-reduced-motion
 */

// Guard for SSR/Node.js environments
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// ===== Configuration =====
const CONFIG = {
    // Animation timings (optimized for 60fps)
    duration: 280,
    easing: 'cubic-bezier(0.32, 0.72, 0, 1)', // iOS-like spring easing
    
    // Breakpoint for mobile
    mobileBreakpoint: 768,
    
    // CSS classes
    classes: {
        entering: 'page-entering',
        leaving: 'page-leaving',
        enterFromRight: 'page-enter-from-right',
        enterFromLeft: 'page-enter-from-left',
        leaveToRight: 'page-leave-to-right',
        leaveToLeft: 'page-leave-to-left',
        active: 'page-active',
        hidden: 'page-hidden'
    }
};

// ===== Navigation History Stack =====
class NavigationStack {
    constructor() {
        this.stack = [];
        this.maxSize = 20;
    }
    
    push(entry) {
        // Prevent duplicate consecutive entries
        if (this.stack.length > 0) {
            const last = this.stack[this.stack.length - 1];
            if (last.hash === entry.hash) return;
        }
        
        this.stack.push({
            hash: entry.hash,
            scrollY: entry.scrollY || 0,
            timestamp: Date.now()
        });
        
        // Limit stack size
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        }
        
        this._persist();
    }
    
    pop() {
        const entry = this.stack.pop();
        this._persist();
        return entry;
    }
    
    peek() {
        return this.stack[this.stack.length - 1] || null;
    }
    
    clear() {
        this.stack = [];
        this._persist();
    }
    
    get length() {
        return this.stack.length;
    }
    
    _persist() {
        try {
            sessionStorage.setItem('navStack', JSON.stringify(this.stack));
        } catch (e) { /* quota exceeded or private mode */ }
    }
    
    _restore() {
        try {
            const stored = sessionStorage.getItem('navStack');
            if (stored) {
                this.stack = JSON.parse(stored);
            }
        } catch (e) {
            this.stack = [];
        }
    }
}

// ===== Page Transition Manager =====
class PageTransitionManager {
    constructor() {
        this.navStack = new NavigationStack();
        this.navStack._restore();
        this.isAnimating = false;
        this.isMobile = isBrowser ? window.innerWidth <= CONFIG.mobileBreakpoint : false;
        this.prefersReducedMotion = isBrowser && window.matchMedia ? 
            window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
        
        if (isBrowser) {
            this._injectStyles();
            this._initResizeHandler();
            this._initReducedMotionHandler();
        }
    }
    
    /**
     * Navigate forward to a new page/section
     * @param {string} targetHash - Target hash (e.g., '#service-ac-install', '#pricelist')
     * @param {Object} options - Animation options
     */
    async navigateTo(targetHash, options = {}) {
        if (this.isAnimating) return false;
        
        const {
            savePosition = true,
            direction = 'right',
            scrollToTop = true
        } = options;
        
        // Save current position to stack
        if (savePosition) {
            this.navStack.push({
                hash: location.hash || '#',
                scrollY: window.scrollY
            });
        }
        
        // Find target element
        const targetId = targetHash.replace('#', '');
        const targetElement = document.getElementById(targetId);
        
        if (!targetElement) {
            // Fallback: just change hash
            location.hash = targetHash;
            return true;
        }
        
        // Animate if on mobile and motion allowed
        if (this.isMobile && !this.prefersReducedMotion) {
            await this._animateTransition(targetElement, direction, 'in');
        } else {
            targetElement.style.display = '';
            targetElement.removeAttribute('hidden');
        }
        
        // Scroll to element or top
        if (scrollToTop) {
            targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        
        // Update hash without triggering hashchange
        if (targetHash !== location.hash) {
            history.pushState(null, '', targetHash);
        }
        
        return true;
    }
    
    /**
     * Navigate back to previous page
     */
    async navigateBack() {
        if (this.isAnimating) return false;
        
        const prevEntry = this.navStack.pop();
        
        if (!prevEntry) {
            // No history, go to home
            location.hash = '';
            window.scrollTo({ top: 0, behavior: 'instant' });
            return true;
        }
        
        // Find current visible section to animate out
        const currentSection = this._findCurrentSection();
        
        // Animate out current section
        if (this.isMobile && !this.prefersReducedMotion && currentSection) {
            await this._animateTransition(currentSection, 'right', 'out');
        }
        
        // Navigate to previous hash
        location.hash = prevEntry.hash;
        
        // Restore scroll position after navigation
        requestAnimationFrame(() => {
            window.scrollTo({
                top: prevEntry.scrollY,
                behavior: 'instant'
            });
        });
        
        return true;
    }
    
    /**
     * Scroll to a section within the same page with animation
     */
    async scrollToSection(targetId, options = {}) {
        if (this.isAnimating) return false;
        
        const {
            savePosition = true,
            animate = true
        } = options;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return false;
        
        // Save current scroll position
        if (savePosition) {
            this.navStack.push({
                hash: location.hash || '#',
                scrollY: window.scrollY
            });
        }
        
        // Animate the target section
        if (animate && this.isMobile && !this.prefersReducedMotion) {
            // Slide in animation for the target
            targetElement.classList.add(CONFIG.classes.enterFromRight);
            
            // Force reflow
            void targetElement.offsetWidth;
            
            // Start animation
            targetElement.classList.add(CONFIG.classes.entering);
            targetElement.classList.remove(CONFIG.classes.enterFromRight);
            
            // Scroll to target
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Cleanup after animation
            await this._waitForAnimation();
            targetElement.classList.remove(CONFIG.classes.entering);
        } else {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        return true;
    }
    
    /**
     * Return from section scroll (reverse of scrollToSection)
     */
    async returnFromSection() {
        if (this.isAnimating) return false;
        
        const prevEntry = this.navStack.pop();
        if (!prevEntry) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        }
        
        // Find current section to animate out
        const visibleSections = document.querySelectorAll('[id*="pricelist"], .pricelist-section');
        
        if (this.isMobile && !this.prefersReducedMotion) {
            visibleSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    section.classList.add(CONFIG.classes.leaveToRight);
                    section.classList.add(CONFIG.classes.leaving);
                }
            });
            
            await this._waitForAnimation();
            
            // Cleanup
            visibleSections.forEach(section => {
                section.classList.remove(CONFIG.classes.leaveToRight, CONFIG.classes.leaving);
            });
        }
        
        // Scroll back
        window.scrollTo({
            top: prevEntry.scrollY,
            behavior: 'smooth'
        });
        
        return true;
    }
    
    /**
     * Core animation method
     */
    async _animateTransition(element, direction, type) {
        if (!element) return;
        
        this.isAnimating = true;
        
        const enterClass = direction === 'right' ? CONFIG.classes.enterFromRight : CONFIG.classes.enterFromLeft;
        const leaveClass = direction === 'right' ? CONFIG.classes.leaveToRight : CONFIG.classes.leaveToLeft;
        const animClass = type === 'in' ? CONFIG.classes.entering : CONFIG.classes.leaving;
        const startClass = type === 'in' ? enterClass : '';
        const endClass = type === 'out' ? leaveClass : '';
        
        // Setup initial state
        if (type === 'in') {
            element.style.display = '';
            element.removeAttribute('hidden');
            element.classList.add(startClass);
        }
        
        // Force reflow for animation
        void element.offsetWidth;
        
        // Start animation
        element.classList.add(animClass);
        if (startClass) element.classList.remove(startClass);
        if (endClass) element.classList.add(endClass);
        
        // Wait for animation to complete
        await this._waitForAnimation();
        
        // Cleanup
        element.classList.remove(animClass, enterClass, leaveClass);
        
        if (type === 'out') {
            element.style.display = 'none';
        }
        
        this.isAnimating = false;
    }
    
    /**
     * Wait for animation duration
     */
    _waitForAnimation() {
        return new Promise(resolve => {
            setTimeout(resolve, CONFIG.duration + 20); // Small buffer
        });
    }
    
    /**
     * Find currently visible section
     */
    _findCurrentSection() {
        const sections = [
            '.service-page:not([hidden])',
            '.calculator-page:not([hidden])',
            '.about-page:not([hidden])',
            '#main-container:not(.is-hidden)'
        ];
        
        for (const selector of sections) {
            const el = document.querySelector(selector);
            if (el && el.offsetParent !== null) {
                return el;
            }
        }
        return null;
    }
    
    /**
     * Inject CSS styles for animations
     */
    _injectStyles() {
        if (document.getElementById('page-transitions-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'page-transitions-styles';
        style.textContent = `
            /* Page Transition Animations - Hardware Accelerated */
            .page-entering,
            .page-leaving {
                will-change: transform, opacity;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            }
            
            .page-enter-from-right {
                transform: translate3d(100%, 0, 0);
                opacity: 0;
            }
            
            .page-enter-from-left {
                transform: translate3d(-100%, 0, 0);
                opacity: 0;
            }
            
            .page-leave-to-right {
                transform: translate3d(100%, 0, 0);
                opacity: 0;
            }
            
            .page-leave-to-left {
                transform: translate3d(-100%, 0, 0);
                opacity: 0;
            }
            
            .page-entering {
                animation: pageEnter ${CONFIG.duration}ms ${CONFIG.easing} forwards;
            }
            
            .page-leaving {
                animation: pageLeave ${CONFIG.duration}ms ${CONFIG.easing} forwards;
            }
            
            @keyframes pageEnter {
                from {
                    transform: translate3d(30%, 0, 0);
                    opacity: 0;
                }
                to {
                    transform: translate3d(0, 0, 0);
                    opacity: 1;
                }
            }
            
            @keyframes pageLeave {
                from {
                    transform: translate3d(0, 0, 0);
                    opacity: 1;
                }
                to {
                    transform: translate3d(30%, 0, 0);
                    opacity: 0;
                }
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .page-entering,
                .page-leaving {
                    animation: none !important;
                    transition: opacity 0.15s ease !important;
                }
                
                .page-enter-from-right,
                .page-enter-from-left,
                .page-leave-to-right,
                .page-leave-to-left {
                    transform: none !important;
                }
            }
            
            /* Smooth scroll behavior */
            @media (max-width: ${CONFIG.mobileBreakpoint}px) {
                html {
                    scroll-behavior: smooth;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Handle window resize
     */
    _initResizeHandler() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.isMobile = window.innerWidth <= CONFIG.mobileBreakpoint;
            }, 150);
        }, { passive: true });
    }
    
    /**
     * Handle reduced motion preference changes
     */
    _initReducedMotionHandler() {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        mq.addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
        });
    }
    
    /**
     * Clear navigation history
     */
    clearHistory() {
        this.navStack.clear();
    }
    
    /**
     * Get navigation stack length
     */
    get historyLength() {
        return this.navStack.length;
    }
}

// ===== Create singleton instance =====
const pageTransitions = new PageTransitionManager();

// ===== Event Handlers =====
function initPageTransitions() {
    // Handle pricelist link clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.pricelist-link');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const targetId = href.substring(1);
        pageTransitions.scrollToSection(targetId);
    }, { capture: true });
    
    // Handle back-to-main clicks for pricelist return
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('.back-to-main');
        if (!backBtn) return;
        
        // Check if we came from pricelist (have entries in stack)
        if (pageTransitions.historyLength > 0) {
            const lastEntry = pageTransitions.navStack.peek();
            // Only intercept if returning from a scroll-based navigation (same page)
            if (lastEntry && lastEntry.hash === location.hash) {
                e.preventDefault();
                e.stopPropagation();
                pageTransitions.returnFromSection();
                return;
            }
        }
        // Otherwise let the default back-to-main handler work
    }, { capture: true });
}

// Initialize when DOM is ready (only in browser)
if (isBrowser) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageTransitions);
    } else {
        initPageTransitions();
    }
}

// ===== Exports =====
export { pageTransitions, PageTransitionManager, CONFIG as transitionConfig };

// Expose to window for global access
if (isBrowser) {
    window.pageTransitions = pageTransitions;
}
