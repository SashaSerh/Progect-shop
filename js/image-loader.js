/**
 * Image Loader with LQIP (Low Quality Image Placeholder)
 * Provides smooth image loading with blur-up effect
 */

/**
 * Generate a small blurred placeholder (1x1 pixel blurred)
 * @param {string} src - Original image source
 * @returns {string} Data URL for blurred placeholder
 */
function generateBlurPlaceholder(src) {
    // Create a canvas with a single blurred pixel
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    
    // Default fallback color (light gray)
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, 10, 10);
    
    // Apply blur effect by drawing multiple semi-transparent rectangles
    ctx.filter = 'blur(8px)';
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, 10, 10);
    
    return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Enhance image element with LQIP loading
 * Expects: data-src attribute with full image URL
 * Optional: data-placeholder attribute with placeholder image URL
 * @param {HTMLImageElement} img - Image element to enhance
 */
export function enhanceImageWithLQIP(img) {
    if (!img) return;
    
    // Skip if already processed
    if (img.hasAttribute('data-lqip-processed')) return;
    img.setAttribute('data-lqip-processed', 'true');
    
    const fullSrc = img.getAttribute('data-src');
    const placeholderSrc = img.getAttribute('data-placeholder');
    
    if (!fullSrc) return; // No data-src, skip
    
    // Add loading class for CSS styling
    img.classList.add('img-loading');
    
    // Set initial blur effect
    if (!img.src && !placeholderSrc) {
        // Use generated blur placeholder if no src and no custom placeholder
        img.src = generateBlurPlaceholder(fullSrc);
    } else if (placeholderSrc) {
        // Use custom placeholder if provided
        img.src = placeholderSrc;
    }
    
    // Load full resolution image
    const fullImg = new Image();
    fullImg.onload = () => {
        img.src = fullSrc;
        img.classList.remove('img-loading');
        img.classList.add('img-loaded');
        
        // Remove data-src after loading to save memory
        img.removeAttribute('data-src');
        img.removeAttribute('data-placeholder');
    };
    fullImg.onerror = () => {
        // On error, keep placeholder visible
        img.classList.remove('img-loading');
        img.classList.add('img-error');
        console.warn(`Failed to load image: ${fullSrc}`);
    };
    
    // Start loading
    fullImg.src = fullSrc;
}

/**
 * Initialize lazy loading for all images with data-src
 * Uses Intersection Observer if available
 */
export function initLazyLoading() {
    if (!('IntersectionObserver' in window)) {
        // Fallback: load all images immediately if IntersectionObserver not supported
        document.querySelectorAll('img[data-src]').forEach(enhanceImageWithLQIP);
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                enhanceImageWithLQIP(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '50px' // Start loading 50px before image enters viewport
    });
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}

/**
 * Re-init lazy loading after DOM changes (component loading)
 */
export function reinitLazyLoading() {
    // Give DOM time to settle after component loading
    requestAnimationFrame(() => {
        initLazyLoading();
    });
}

/**
 * Preload critical images (above the fold)
 * @param {string[]} srcs - Array of image sources to preload
 */
export function preloadCriticalImages(srcs) {
    srcs.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// Auto-init on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
    initLazyLoading();
}

// Named exports (repeat for compatibility)
export {
    enhanceImageWithLQIP,
    initLazyLoading,
    reinitLazyLoading,
    preloadCriticalImages
};

export default {
    enhanceImageWithLQIP,
    initLazyLoading,
    reinitLazyLoading,
    preloadCriticalImages
};
