import { switchLanguage } from './i18n.js';

// Overlay теперь показывается каждый визит (cookie убраны)
export function needsWelcomeOverlay() { return true; }

export function initWelcomeOverlay(currentLang, options = {}) {
    const overlay = document.getElementById('welcomeOverlay');
    if (!overlay) return;
    const langButtons = overlay.querySelectorAll('.welcome-lang-btn');
    const continueBtn = overlay.querySelector('#welcomeContinue');
    const langValue = overlay.querySelector('#welcomeLangValue');
    let activeLang = currentLang || 'uk';
    let invokeBtn = null;

    const focusableSelector = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    let focusableNodes = [];
    let firstNode, lastNode;

    const trapHandler = (e) => {
        if (e.key === 'Tab') {
            if (focusableNodes.length === 0) return;
            if (e.shiftKey && document.activeElement === firstNode) {
                e.preventDefault();
                lastNode.focus();
            } else if (!e.shiftKey && document.activeElement === lastNode) {
                e.preventDefault();
                firstNode.focus();
            }
        }
    };

    const applyLang = (lang) => {
        activeLang = lang;
        localStorage.setItem('language', lang);
        switchLanguage(lang);
        if (langValue) langValue.textContent = lang.toUpperCase();
        langButtons.forEach(btn => {
            const isActive = btn.dataset.lang === lang;
            btn.classList.toggle('is-active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    };

    const setupFocusTrap = () => {
        focusableNodes = Array.from(overlay.querySelectorAll(focusableSelector)).filter(n => !n.disabled);
        firstNode = focusableNodes[0];
        lastNode = focusableNodes[focusableNodes.length - 1];
        // Фокусируем кнопку "Продолжить", чтобы Enter сразу продолжал
        if (continueBtn) {
            continueBtn.focus();
        } else if (firstNode) {
            firstNode.focus();
        }
        overlay.addEventListener('keydown', trapHandler);
    };

    const open = (invoker = null) => {
        invokeBtn = invoker;
        overlay.classList.add('is-visible');
        overlay.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        setupFocusTrap();
        applyLang(activeLang);
    };
    const close = () => {
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden','true');
        document.body.style.overflow = '';
        overlay.removeEventListener('keydown', trapHandler);
        if (invokeBtn) {
            try { invokeBtn.focus(); } catch {}
        }
    };

    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (['ru','uk'].includes(lang)) applyLang(lang);
        });
    });

    continueBtn?.addEventListener('click', () => {
        close();
        if (options.onContinue) {
            try { options.onContinue(activeLang); } catch {}
        }
    });

    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
    });

    open();
    window.showWelcomeOverlay = (invoker) => open(invoker);
    window.hideWelcomeOverlay = () => close();
}

export function ensureWelcomeOverlay(language) {
    if (needsWelcomeOverlay()) {
        return import('./welcome.js'); // pointless self import for bundlers; kept for pattern
    }
}