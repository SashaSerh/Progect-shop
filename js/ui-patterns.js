/**
 * UI Patterns Library
 * Унифицированные компоненты для Toast, Modal, Confirm и других паттернов
 */

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

export class Toast {
  static #container = null;
  static #queue = [];
  static #isAnimating = false;

  static #ensureContainer() {
    if (!this.#container) {
      this.#container = document.createElement('div');
      this.#container.id = 'toast-container';
      this.#container.setAttribute('role', 'region');
      this.#container.setAttribute('aria-label', 'Уведомления');
      this.#container.setAttribute('aria-live', 'polite');
      this.#container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.#container);
    }
  }

  static show(message, type = 'info', duration = 3000) {
    this.#ensureContainer();
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast--${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="toast__content">
        <span class="toast__icon" aria-hidden="true"></span>
        <span class="toast__message">${this.#escapeHtml(message)}</span>
      </div>
      <button class="toast__close" type="button" aria-label="Закрыть уведомление">×</button>
    `;

    this.#container.appendChild(toastEl);

    // Trigger animation
    requestAnimationFrame(() => toastEl.classList.add('toast--visible'));

    const closeBtn = toastEl.querySelector('.toast__close');
    closeBtn?.addEventListener('click', () => this.#removeToast(toastEl));

    if (duration > 0) {
      setTimeout(() => this.#removeToast(toastEl), duration);
    }

    return {
      close: () => this.#removeToast(toastEl),
      update: (newMessage) => {
        const msgEl = toastEl.querySelector('.toast__message');
        if (msgEl) msgEl.textContent = newMessage;
      }
    };
  }

  static #removeToast(toastEl) {
    toastEl.classList.remove('toast--visible');
    setTimeout(() => toastEl.remove(), 300);
  }

  static #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  static error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  static warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  static info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }
}

// ============================================
// Button normalization helper
// Переносит классы вида btn--primary / btn--sm в data-атрибуты и удаляет старые классы
export function normalizeButtons(root = document) {
  const sizeTokens = new Set(['xs','sm','md','lg','xl','tiny']);
  const variantTokens = new Set(['primary','secondary','tertiary','ghost','outline','wa','tg','ig','fb','danger']);
  const specialTokens = new Set(['block','loading']);

  const all = root.querySelectorAll('[class*=\"btn--\"]');
  all.forEach(el => {
    const classes = Array.from(el.classList);
    classes.forEach(tok => {
      if (!tok.startsWith('btn--')) return;
      const key = tok.replace('btn--','');
      if (sizeTokens.has(key)) {
        // legacy `btn--tiny` maps to `xs`
        const sizeKey = key === 'tiny' ? 'xs' : key;
        el.setAttribute('data-size', sizeKey);
      } else if (variantTokens.has(key)) {
        el.setAttribute('data-variant', key);
      } else if (specialTokens.has(key)) {
        if (key === 'block') el.setAttribute('data-block','true');
        if (key === 'loading') el.setAttribute('data-loading','true');
      } else {
        // fallback: prefer variant
        el.setAttribute('data-variant', key);
      }
      el.classList.remove(tok);
    });
  });
}

// ============================================
// MODAL DIALOG SYSTEM
// ============================================

export class Modal {
  #element = null;
  #backdrop = null;
  #closeBtn = null;
  #focusTrap = null;
  #previousActiveElement = null;
  #closeResolver = null;

  constructor(content, options = {}) {
    this.options = {
      title: '',
      closeButton: true,
      dismissible: true,
      size: 'md', // sm, md, lg
      ...options
    };
    this.#createModal(content);
  }

  #createModal(content) {
    // Backdrop
    this.#backdrop = document.createElement('div');
    this.#backdrop.className = 'modal-backdrop';
    this.#backdrop.setAttribute('aria-hidden', 'true');

    // Modal container
    this.#element = document.createElement('div');
    this.#element.className = `modal modal--${this.options.size}`;
    this.#element.setAttribute('role', 'dialog');
    this.#element.setAttribute('aria-modal', 'true');
    if (this.options.title) {
      this.#element.setAttribute('aria-labelledby', 'modal-title');
    }

    // Header
    let headerHtml = '';
    if (this.options.title || this.options.closeButton) {
      headerHtml = `
        <div class="modal__header">
          ${this.options.title ? `<h2 id="modal-title" class="modal__title">${this.#escapeHtml(this.options.title)}</h2>` : ''}
          ${this.options.closeButton ? '<button type="button" class="modal__close" aria-label="Закрыть модальное окно">×</button>' : ''}
        </div>
      `;
    }

    // Body
    const contentHtml = typeof content === 'string' ? this.#escapeHtml(content) : '';

    this.#element.innerHTML = `
      ${headerHtml}
      <div class="modal__body">
        ${contentHtml}
      </div>
    `;

    // Setup close button
    if (this.options.closeButton) {
      this.#closeBtn = this.#element.querySelector('.modal__close');
      this.#closeBtn?.addEventListener('click', () => this.close());
    }

    // Setup backdrop click
    if (this.options.dismissible) {
      this.#backdrop.addEventListener('click', () => this.close());
    }

    // Prevent content clicks from closing modal
    this.#element.addEventListener('click', (e) => e.stopPropagation());

    // Setup ESC key
    this.#setupKeyboardHandling();

    // Setup focus trap
    this.#setupFocusTrap();
  }

  #setupKeyboardHandling() {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && this.options.dismissible) {
        this.close();
      }
    };
    this.#focusTrap = handleKeydown;
  }

  #setupFocusTrap() {
    // Focus will be managed when modal is opened
  }

  open() {
    this.#previousActiveElement = document.activeElement;
    
    document.body.appendChild(this.#backdrop);
    document.body.appendChild(this.#element);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Add keyboard listener
    document.addEventListener('keydown', this.#focusTrap);

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = this.#element.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
      this.#element.classList.add('modal--visible');
      this.#backdrop.classList.add('modal-backdrop--visible');
    });

    return new Promise((resolve) => {
      this.#closeResolver = resolve;
    });
  }

  close(result = null) {
    document.removeEventListener('keydown', this.#focusTrap);
    
    this.#element?.classList.remove('modal--visible');
    this.#backdrop?.classList.remove('modal-backdrop--visible');

    setTimeout(() => {
      this.#element?.remove();
      this.#backdrop?.remove();
      document.body.style.overflow = '';
      
      if (this.#previousActiveElement) {
        this.#previousActiveElement.focus();
      }

      if (this.#closeResolver) {
        this.#closeResolver(result);
      }
    }, 300);
  }

  #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static open(content, options = {}) {
    const modal = new Modal(content, options);
    return modal.open();
  }
}

// ============================================
// CONFIRM DIALOG SYSTEM
// ============================================

export class ConfirmDialog {
  static async show(title, message, options = {}) {
    const {
      confirmText = 'Подтвердить',
      cancelText = 'Отмена',
      type = 'default' // default, warning, danger
    } = options;

    const modal = new Modal(
      `
      <div class="confirm-dialog">
        <p class="confirm-dialog__message">${this.#escapeHtml(message)}</p>
        <div class="confirm-dialog__actions">
          <button type="button" class="btn" data-variant="secondary" data-size="md" data-action="cancel">${cancelText}</button>
          <button type="button" class="btn" data-variant="${type === 'danger' ? 'error' : 'primary'}" data-size="md" data-action="confirm">${confirmText}</button>
        </div>
      </div>
      `,
      {
        title,
        size: 'sm',
        dismissible: true
      }
    );

    const promise = modal.open();

    // Setup action buttons
    setTimeout(() => {
      const confirmBtn = document.querySelector('[data-action="confirm"]');
      const cancelBtn = document.querySelector('[data-action="cancel"]');

      confirmBtn?.addEventListener('click', () => {
        modal.close(true);
      });

      cancelBtn?.addEventListener('click', () => {
        modal.close(false);
      });
    }, 0);

    return promise;
  }

  static #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================
// DROPDOWN SYSTEM
// ============================================

export class Dropdown {
  constructor(trigger, options = {}) {
    this.trigger = trigger;
    this.options = {
      position: 'bottom', // bottom, top, left, right
      closeOnSelect: true,
      ...options
    };
    this.menu = null;
    this.isOpen = false;
    this.#init();
  }

  #init() {
    this.trigger.addEventListener('click', () => this.toggle());
    document.addEventListener('click', (e) => {
      if (!this.trigger.contains(e.target) && !this.menu?.contains(e.target)) {
        this.close();
      }
    });
  }

  open() {
    if (!this.menu) return;
    this.menu.classList.add('dropdown--open');
    this.isOpen = true;
    this.trigger.setAttribute('aria-expanded', 'true');
  }

  close() {
    if (!this.menu) return;
    this.menu.classList.remove('dropdown--open');
    this.isOpen = false;
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  setMenu(menuElement) {
    this.menu = menuElement;
    this.menu.setAttribute('role', 'menu');
  }
}

// ============================================
// LOADING STATE MANAGER
// ============================================

export class LoadingState {
  static attach(element, options = {}) {
    const {
      message = 'Загрузка...',
      overlay = true
    } = options;

    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
      <div class="loader">
        <div class="loader__spinner" aria-hidden="true"></div>
        <p class="loader__message">${this.#escapeHtml(message)}</p>
      </div>
    `;

    element.appendChild(loader);
    element.setAttribute('aria-busy', 'true');

    return {
      remove: () => {
        loader.remove();
        element.setAttribute('aria-busy', 'false');
      },
      update: (newMessage) => {
        const msgEl = loader.querySelector('.loader__message');
        if (msgEl) msgEl.textContent = newMessage;
      }
    };
  }

  static #escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================
// FORM FIELD UTILITIES
// ============================================

export class FormField {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      validationRules: {},
      errorMessage: '',
      successMessage: '',
      ...options
    };
    this.isValid = true;
    this.#init();
  }

  #init() {
    this.input.addEventListener('blur', () => this.validate());
    this.input.addEventListener('input', () => this.clearError());
  }

  validate() {
    const value = this.input.value.trim();
    const rules = this.options.validationRules;

    for (const [ruleName, ruleValue] of Object.entries(rules)) {
      if (!this.#checkRule(ruleName, value, ruleValue)) {
        this.showError(this.options.errorMessage || `Ошибка валидации`);
        return false;
      }
    }

    this.showSuccess();
    return true;
  }

  #checkRule(ruleName, value, ruleValue) {
    switch (ruleName) {
      case 'required':
        return ruleValue ? value.length > 0 : true;
      case 'minLength':
        return value.length >= ruleValue;
      case 'maxLength':
        return value.length <= ruleValue;
      case 'pattern':
        return new RegExp(ruleValue).test(value);
      case 'email':
        return ruleValue ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : true;
      case 'phone':
        return ruleValue ? /^\+?[\d\s\-()]{10,}$/.test(value) : true;
      default:
        return true;
    }
  }

  showError(message) {
    this.input.classList.add('form-input--error');
    this.input.classList.remove('form-input--success');
    this.isValid = false;

    let errorEl = this.input.nextElementSibling;
    if (!errorEl?.classList.contains('form-error')) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      this.input.after(errorEl);
    }
    errorEl.textContent = message;
  }

  showSuccess() {
    this.input.classList.remove('form-input--error');
    this.input.classList.add('form-input--success');
    this.isValid = true;

    const errorEl = this.input.nextElementSibling;
    if (errorEl?.classList.contains('form-error')) {
      errorEl.remove();
    }
  }

  clearError() {
    this.input.classList.remove('form-input--error');
    const errorEl = this.input.nextElementSibling;
    if (errorEl?.classList.contains('form-error')) {
      errorEl.remove();
    }
  }

  getValue() {
    return this.input.value.trim();
  }

  setValue(value) {
    this.input.value = value;
  }
}

export default {
  Toast,
  Modal,
  ConfirmDialog,
  Dropdown,
  LoadingState,
  FormField
};
