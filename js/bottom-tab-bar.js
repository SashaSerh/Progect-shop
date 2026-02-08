/**
 * Bottom Tab Bar — iOS/Android-style bottom navigation
 * Handles active state, scroll-hide behavior, and haptic feedback
 */

export function initBottomTabBar() {
    const tabBar = document.getElementById('bottomTabBar');
    if (!tabBar) return;

    // Only init on mobile
    if (window.innerWidth > 768) {
        tabBar.style.display = 'none';
        return;
    }

    const tabs = tabBar.querySelectorAll('.bottom-tab-bar__tab');

    // === Active Tab Tracking ===
    function updateActiveTab() {
        const hash = (location.hash || '').replace('#', '') || 'home';

        // Map hash → tab data-tab
        const tabMap = {
            '': 'home',
            'home': 'home',
            'services': 'services',
            'services-page': 'services',
            'service-ac-install': 'services',
            'service-recuperator-install': 'services',
            'service-maintenance': 'services',
            'service-maintenance-pricelist': 'services',
            'service-ac-removal': 'services',
            'service-ac-laying': 'services',
            'service-winter-kit': 'services',
            'pricelist': 'services',
            'calculator': 'calculator',
            'contacts': 'contacts',
            // Landing pages → keep current or reset
            'portfolio-page': null,
            'reviews-page': null,
            'faq-page': null,
            'about-page': null,
            'about': null,
        };

        const activeTab = tabMap[hash] !== undefined ? tabMap[hash] : null;

        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === activeTab;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    // === Scroll-Hide Behavior ===
    let lastScrollY = window.scrollY;
    let ticking = false;
    const SCROLL_THRESHOLD = 10;
    const floatingButtons = document.getElementById('floating-buttons') || document.querySelector('.floating-buttons');

    function onScroll() {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
            const currentY = window.scrollY;
            const diff = currentY - lastScrollY;

            if (diff > SCROLL_THRESHOLD && currentY > 100) {
                // Scrolling down — hide tab bar, slide floating buttons down
                tabBar.classList.add('bottom-tab-bar--hidden');
                if (floatingButtons) floatingButtons.classList.add('tab-bar-hidden');
            } else if (diff < -SCROLL_THRESHOLD || currentY < 50) {
                // Scrolling up or near top — show tab bar, slide floating buttons up
                tabBar.classList.remove('bottom-tab-bar--hidden');
                if (floatingButtons) floatingButtons.classList.remove('tab-bar-hidden');
            }

            lastScrollY = currentY;
            ticking = false;
        });
    }

    // === Haptic Feedback on Tab Tap ===
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (typeof window.haptic === 'function') {
                window.haptic('light');
            }
        });
    });

    // === Event Listeners ===
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', updateActiveTab);

    // Handle resize — show/hide tab bar
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                tabBar.style.display = 'none';
            } else {
                tabBar.style.display = '';
            }
        }, 200);
    });

    // Initial state
    updateActiveTab();
}
