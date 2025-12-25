/**
 * Form Validation Patterns
 * Единая система валидации и правила для всех форм в приложении
 */

export const ValidationRules = {
  // Basic validations
  required: {
    validate: (value) => value && value.trim().length > 0,
    message: 'Это поле обязательно'
  },
  
  minLength: (min) => ({
    validate: (value) => value.length >= min,
    message: `Минимум ${min} символов`
  }),
  
  maxLength: (max) => ({
    validate: (value) => value.length <= max,
    message: `Максимум ${max} символов`
  }),
  
  // Email validation
  email: {
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Введите корректный email'
  },
  
  // Phone validation (international)
  phone: {
    validate: (value) => /^\+?[\d\s\-()]{10,}$/.test(value),
    message: 'Введите корректный номер телефона'
  },
  
  // URL validation
  url: {
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Введите корректный URL'
  },
  
  // Number validations
  number: {
    validate: (value) => !isNaN(value) && value !== '',
    message: 'Введите число'
  },
  
  min: (minValue) => ({
    validate: (value) => parseFloat(value) >= minValue,
    message: `Число должно быть не менее ${minValue}`
  }),
  
  max: (maxValue) => ({
    validate: (value) => parseFloat(value) <= maxValue,
    message: `Число должно быть не более ${maxValue}`
  }),
  
  // Password validation
  password: {
    validate: (value) => {
      // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
    },
    message: 'Пароль должен быть минимум 8 символов, содержать прописные и строчные буквы, цифру'
  },
  
  // Strong password
  strongPassword: {
    validate: (value) => {
      // At least 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(value);
    },
    message: 'Пароль должен быть минимум 12 символов с прописными, строчными буквами, цифрой и спецсимволом'
  },
  
  // Match password
  matchPassword: (fieldId) => ({
    validate: (value) => {
      const otherField = document.getElementById(fieldId);
      return otherField && otherField.value === value;
    },
    message: 'Пароли не совпадают'
  }),
  
  // Custom regex pattern
  pattern: (regex, message) => ({
    validate: (value) => new RegExp(regex).test(value),
    message: message || 'Неверный формат'
  }),
  
  // Custom function
  custom: (validationFn, message) => ({
    validate: validationFn,
    message: message || 'Ошибка валидации'
  }),
  
  // Cyrillic letters only
  cyrillic: {
    validate: (value) => /^[а-яА-ЯёЁ\s\-']+$/.test(value),
    message: 'Используйте только русские буквы'
  },
  
  // Latin letters only
  latin: {
    validate: (value) => /^[a-zA-Z\s\-']+$/.test(value),
    message: 'Используйте только латинские буквы'
  },
  
  // Alphanumeric
  alphanumeric: {
    validate: (value) => /^[a-zA-Z0-9]+$/.test(value),
    message: 'Используйте только буквы и цифры'
  }
};

/**
 * Form Validator Class
 * Управляет валидацией всей формы или отдельных полей
 */
export class FormValidator {
  constructor(formElement, rules = {}, options = {}) {
    this.form = formElement;
    this.rules = rules;
    this.options = {
      showErrors: true,
      realTimeValidation: true,
      submitOnValid: false,
      ...options
    };
    this.errors = {};
    this.isValid = true;
    this.#init();
  }

  #init() {
    if (!this.form) return;

    // Setup field validations
    Object.entries(this.rules).forEach(([fieldName, fieldRules]) => {
      const field = this.form.querySelector(`[name="${fieldName}"]`);
      if (field && this.options.realTimeValidation) {
        field.addEventListener('blur', () => this.validateField(fieldName));
        field.addEventListener('input', () => this.clearFieldError(fieldName));
      }
    });

    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.validate()) {
        if (this.options.submitOnValid) {
          this.form.submit();
        }
      }
    });
  }

  validateField(fieldName) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (!field) return true;

    const fieldRules = this.rules[fieldName];
    if (!fieldRules) return true;

    const value = field.value.trim();
    const rulesToCheck = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

    for (const rule of rulesToCheck) {
      const ruleObj = typeof rule === 'function' ? rule(value) : rule;
      
      if (!ruleObj.validate(value)) {
        this.setFieldError(fieldName, ruleObj.message);
        return false;
      }
    }

    this.clearFieldError(fieldName);
    return true;
  }

  validate() {
    this.errors = {};
    this.isValid = true;

    Object.keys(this.rules).forEach((fieldName) => {
      if (!this.validateField(fieldName)) {
        this.isValid = false;
      }
    });

    return this.isValid;
  }

  setFieldError(fieldName, message) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (!field) return;

    this.errors[fieldName] = message;

    if (this.options.showErrors) {
      field.classList.add('form-input--error');
      field.classList.remove('form-input--success');

      let errorEl = field.nextElementSibling;
      if (!errorEl?.classList.contains('form-error')) {
        errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        field.after(errorEl);
      }
      errorEl.textContent = message;
      errorEl.setAttribute('role', 'alert');
    }
  }

  clearFieldError(fieldName) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (!field) return;

    delete this.errors[fieldName];
    field.classList.remove('form-input--error');

    const errorEl = field.nextElementSibling;
    if (errorEl?.classList.contains('form-error')) {
      errorEl.remove();
    }
  }

  clearAllErrors() {
    Object.keys(this.rules).forEach((fieldName) => {
      this.clearFieldError(fieldName);
    });
    this.errors = {};
  }

  getErrors() {
    return { ...this.errors };
  }

  getFormData() {
    const formData = new FormData(this.form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    return data;
  }

  reset() {
    this.form.reset();
    this.clearAllErrors();
  }

  setFieldValue(fieldName, value) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.value = value;
    }
  }

  getFieldValue(fieldName) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    return field ? field.value.trim() : '';
  }
}

/**
 * Inline Field Validation Helper
 * Для быстрой валидации отдельных полей
 */
export class FieldValidator {
  constructor(field, rules = {}) {
    this.field = field;
    this.rules = rules;
    this.isValid = true;
  }

  validate() {
    const value = this.field.value.trim();
    const rulesToCheck = Array.isArray(this.rules) ? this.rules : [this.rules];

    for (const rule of rulesToCheck) {
      const ruleObj = typeof rule === 'function' ? rule(value) : rule;
      
      if (!ruleObj.validate(value)) {
        this.showError(ruleObj.message);
        this.isValid = false;
        return false;
      }
    }

    this.showSuccess();
    this.isValid = true;
    return true;
  }

  showError(message) {
    this.field.classList.add('form-input--error');
    this.field.classList.remove('form-input--success');

    let errorEl = this.field.nextElementSibling;
    if (!errorEl?.classList.contains('form-error')) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      this.field.after(errorEl);
    }
    errorEl.textContent = message;
  }

  showSuccess() {
    this.field.classList.remove('form-input--error');
    this.field.classList.add('form-input--success');

    const errorEl = this.field.nextElementSibling;
    if (errorEl?.classList.contains('form-error')) {
      errorEl.remove();
    }
  }

  clearError() {
    this.field.classList.remove('form-input--error');
    const errorEl = this.field.nextElementSibling;
    if (errorEl?.classList.contains('form-error')) {
      errorEl.remove();
    }
  }
}

export default {
  ValidationRules,
  FormValidator,
  FieldValidator
};
