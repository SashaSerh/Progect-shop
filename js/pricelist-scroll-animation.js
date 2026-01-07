/**
 * Animated scroll transitions for pricelist navigation
 * Provides slide animations when navigating to/from pricelist sections
 */

export function initPricelistAnimations() {
    // Handle clicks on pricelist links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.pricelist-link');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) return;
        
        e.preventDefault();
        
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (!targetElement) return;
        
        // Store scroll position for back navigation
        const currentScroll = window.scrollY;
        sessionStorage.setItem('pricelistReturnScroll', currentScroll);
        
        // Slide animation
        targetElement.style.opacity = '0';
        targetElement.style.transform = 'translateX(100%)';
        targetElement.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Scroll to target
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Animate in after scroll
        setTimeout(() => {
            targetElement.style.opacity = '1';
            targetElement.style.transform = 'translateX(0)';
            
            // Reset styles after animation
            setTimeout(() => {
                targetElement.style.transition = '';
                targetElement.style.opacity = '';
                targetElement.style.transform = '';
            }, 300);
        }, 400);
    });
    
    // Handle back-to-main with reverse animation
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('.back-to-main');
        if (!backBtn) return;
        
        const returnScroll = sessionStorage.getItem('pricelistReturnScroll');
        if (!returnScroll) return;
        
        e.preventDefault();
        
        // Find pricelist section to animate out
        const pricelistSections = document.querySelectorAll('[id*="pricelist"]');
        pricelistSections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top >= 0 && rect.top < window.innerHeight) {
                section.style.opacity = '1';
                section.style.transform = 'translateX(0)';
                section.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
                requestAnimationFrame(() => {
                    section.style.opacity = '0';
                    section.style.transform = 'translateX(100%)';
                });
            }
        });
        
        // Scroll back with animation
        setTimeout(() => {
            window.scrollTo({
                top: parseInt(returnScroll, 10),
                behavior: 'smooth'
            });
            sessionStorage.removeItem('pricelistReturnScroll');
            
            // Reset pricelist section styles
            setTimeout(() => {
                pricelistSections.forEach(section => {
                    section.style.transition = '';
                    section.style.opacity = '';
                    section.style.transform = '';
                });
            }, 400);
        }, 300);
    });
}
