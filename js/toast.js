/**
 * Toast Notification Module
 * Универсальная система уведомлений
 */

const MAX_TOAST_STACK = 3;
const TOAST_TYPE_CLASS = {
    cart: 'toast--success',
    success: 'toast--success',
    favorite: 'toast--favorite',
    compare: 'toast--compare',
    error: 'toast--error',
    warning: 'toast--warning'
};

/**
 * Показать toast-уведомление
 * @param {Object} options
 * @param {string} options.message - Текст уведомления
 * @param {string} options.type - Тип: 'success' | 'cart' | 'favorite' | 'compare' | 'error' | 'warning'
 * @param {Array} options.actions - Массив кнопок [{label, handler, ariaLabel, autoClose}]
 * @param {number} options.duration - Длительность показа в мс (default: 2600)
 * @returns {Function} hideToast - функция для ручного закрытия
 */
export function showActionToast({ message, type = 'success', actions = [], duration = 2600 } = {}) {
    if (!message) return () => {};
    const host = document.getElementById('toast-container');
    if (!host) return () => {};

    // Ограничиваем количество одновременных тостов
    while (host.children.length >= MAX_TOAST_STACK) {
        host.removeChild(host.firstElementChild);
    }

    const toast = document.createElement('div');
    const typeClass = TOAST_TYPE_CLASS[type] || TOAST_TYPE_CLASS.success;
    toast.className = ['toast', typeClass].filter(Boolean).join(' ');
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const messageEl = document.createElement('div');
    messageEl.className = 'toast__message';
    messageEl.textContent = message;
    toast.appendChild(messageEl);

    if (Array.isArray(actions) && actions.length) {
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'toast__actions';
        actions.forEach((action) => {
            if (!action || !action.label) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toast__button';
            btn.textContent = action.label;
            if (action.ariaLabel) btn.setAttribute('aria-label', action.ariaLabel);
            btn.addEventListener('click', () => {
                try { action.handler?.(); } catch (_) { /* noop */ }
                if (action.autoClose !== false) hideToast();
            });
            actionsWrap.appendChild(btn);
        });
        if (actionsWrap.childElementCount) {
            toast.appendChild(actionsWrap);
        }
    }

    host.appendChild(toast);

    // Анимация появления
    const reveal = () => toast.classList.add('is-visible');
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal);
    else setTimeout(reveal, 16);

    let removed = false;
    let timerId = null;
    const hideDelay = (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) ? duration : null;
    
    if (hideDelay !== null) {
        timerId = setTimeout(() => hideToast(), hideDelay);
    }

    function hideToast() {
        if (removed) return;
        removed = true;
        if (timerId) clearTimeout(timerId);
        toast.classList.remove('is-visible');
        const cleanup = () => toast.remove();
        toast.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 320); // fallback
    }

    // Пауза при наведении
    toast.addEventListener('mouseenter', () => {
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
    });

    toast.addEventListener('mouseleave', () => {
        if (!removed && hideDelay !== null && !timerId) {
            timerId = setTimeout(() => hideToast(), 1200);
        }
    });

    return hideToast;
}

/**
 * Быстрые методы для разных типов
 */
export const toast = {
    success: (message, options = {}) => showActionToast({ ...options, message, type: 'success' }),
    error: (message, options = {}) => showActionToast({ ...options, message, type: 'error' }),
    warning: (message, options = {}) => showActionToast({ ...options, message, type: 'warning' }),
    cart: (message, options = {}) => showActionToast({ ...options, message, type: 'cart' }),
    favorite: (message, options = {}) => showActionToast({ ...options, message, type: 'favorite' }),
    compare: (message, options = {}) => showActionToast({ ...options, message, type: 'compare' })
};

// Экспорт констант для внешнего использования
export { MAX_TOAST_STACK, TOAST_TYPE_CLASS };
