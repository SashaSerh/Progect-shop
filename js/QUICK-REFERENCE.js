/**
 * QUICK REFERENCE - Дизайн система в примерах
 * Copy-paste готовые примеры для быстрого внедрения
 */

// ============================================
// 1. TOAST NOTIFICATIONS - Быстро уведомить пользователя
// ============================================

// Импорт в вашу компоненту
import { Toast } from './ui-patterns.js';

// Использование
Toast.success('Товар добавлен!');
Toast.error('Ошибка подключения');
Toast.warning('Действие необратимо!');
Toast.info('Информация');

// С контролем закрытия
const toast = Toast.show('Загрузка...', 'info', 0); // 0 = вручную
toast.update('Готово!');
toast.close();

// ============================================
// 2. BUTTON SYSTEM - Унифицированные кнопки
// ============================================

// HTML примеры
/*
<button class="btn btn--primary btn--md">Primary</button>
<button class="btn btn--secondary btn--md">Secondary</button>
<button class="btn btn--success btn--sm">Success</button>
<button class="btn btn--error btn--lg">Delete</button>
<button class="btn btn--ghost btn--xl">Ghost</button>

<!-- Размеры: xs, sm, md (default), lg, xl -->
<!-- Блочная кнопка (полная ширина) -->
<button class="btn btn--primary btn--block">Полная ширина</button>

<!-- С loading состоянием -->
<button class="btn btn--primary btn--loading" disabled>
  <span class="btn__label">Отправка...</span>
  <span class="btn__loader"></span>
</button>
*/

// ============================================
// 3. MODAL - Модальные окна
// ============================================

import { Modal } from './ui-patterns.js';

// Простой modal с текстом
await Modal.open('Это содержимое modal окна', {
  title: 'Заголовок',
  size: 'md' // sm, md, lg
});

// Modal с HTML контентом
const htmlContent = `
  <div class="form-group">
    <label>Ваше имя</label>
    <input type="text" class="form-input" />
  </div>
`;
const result = await Modal.open(htmlContent, {
  title: 'Введите данные',
  closeButton: true,
  dismissible: true,
  size: 'md'
});

// ============================================
// 4. CONFIRM DIALOG - Подтверждение действий
// ============================================

import { ConfirmDialog } from './ui-patterns.js';

// Стандартное подтверждение
const ok = await ConfirmDialog.show(
  'Удалить товар?',
  'Это действие нельзя отменить.',
  { 
    confirmText: 'Да, удалить',
    cancelText: 'Нет, отмена',
    type: 'danger'
  }
);

if (ok) {
  Toast.success('Товар удалён');
}

// ============================================
// 5. FORM VALIDATION - Валидация форм
// ============================================

import { FormValidator, ValidationRules } from './form-validation.js';

// HTML форма
const form = document.getElementById('contact-form');

// Создать валидатор
const validator = new FormValidator(form, {
  // Простые правила
  name: ValidationRules.required,
  
  // Множественные правила
  email: [
    ValidationRules.required,
    ValidationRules.email
  ],
  
  // С параметрами
  password: [
    ValidationRules.required,
    ValidationRules.password // Минимум: 8 символов, буквы и цифры
  ],
  
  // Числа с границами
  age: [
    ValidationRules.number,
    ValidationRules.min(18),
    ValidationRules.max(120)
  ],
  
  // Кастомная валидация
  website: [
    ValidationRules.url
  ]
}, {
  showErrors: true,
  realTimeValidation: true
});

// Обработка отправки
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (validator.validate()) {
    const data = validator.getFormData();
    console.log('Отправляем:', data);
    
    // Отправить на сервер
    Toast.success('Отправлено!');
    validator.reset();
  }
});

// ============================================
// 6. LOADING STATES - Индикатор загрузки
// ============================================

import { LoadingState } from './ui-patterns.js';

// Показать загрузчик
const loader = LoadingState.attach(container, {
  message: 'Загрузка данных...'
});

// Обновить сообщение
loader.update('Обработка...');

// Убрать загрузчик
loader.remove();

// ============================================
// 7. SKELETON LOADER - Плейсхолдеры загрузки
// ============================================

/*
<!-- HTML для skeleton -->
<div class="skeleton skeleton--card">
  <div class="skeleton__image"></div>
  <div class="skeleton__line skeleton__line--xl"></div>
  <div class="skeleton__line skeleton__line--md"></div>
</div>
*/

// ============================================
// 8. FORM INPUT VALIDATION - Отдельное поле
// ============================================

import { FieldValidator, ValidationRules } from './form-validation.js';

const emailField = document.getElementById('email');

const emailValidator = new FieldValidator(emailField, [
  ValidationRules.required,
  ValidationRules.email
]);

emailField.addEventListener('blur', () => {
  emailValidator.validate();
});

emailField.addEventListener('input', () => {
  emailValidator.clearError();
});

// ============================================
// 9. DESIGN TOKENS - CSS переменные
// ============================================

/*
Spacing:
var(--spacing-xs)   = 4px
var(--spacing-sm)   = 8px
var(--spacing-md)   = 12px
var(--spacing-lg)   = 16px
var(--spacing-xl)   = 24px
var(--spacing-2xl)  = 32px
var(--spacing-3xl)  = 48px

Typography:
var(--font-size-xs)  = 12px
var(--font-size-sm)  = 14px
var(--font-size-base) = 16px
var(--font-size-lg)  = 18px
var(--font-size-xl)  = 20px
var(--font-size-2xl) = 24px

Colors:
var(--color-primary)      = #007AFF
var(--color-success)      = #10B981
var(--color-error)        = #EF4444
var(--color-warning)      = #F59E0B
var(--color-info)         = #3B82F6

Border Radius:
var(--radius-sm)  = 8px
var(--radius-md)  = 12px
var(--radius-lg)  = 16px
var(--radius-xl)  = 20px

Shadows:
var(--shadow-sm)       = 0 1px 2px rgba(0, 0, 0, 0.05)
var(--shadow-md)       = 0 4px 6px rgba(0, 0, 0, 0.1)
var(--shadow-lg)       = 0 10px 15px rgba(0, 0, 0, 0.1)
var(--shadow-elevation) = 0 8px 32px rgba(0, 0, 0, 0.15)

Transitions:
var(--transition-fast)   = 150ms ease
var(--transition-normal) = 300ms ease
var(--transition-slow)   = 500ms ease
*/

// Использование в CSS
/*
.my-element {
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  background-color: var(--surface-0);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
}
*/

// ============================================
// 10. REALISTIC EXAMPLE - E-COMMERCE FLOW
// ============================================

// Пример: Форма добавления товара в корзину

import { Toast, Modal, ConfirmDialog, LoadingState } from './ui-patterns.js';
import { FormValidator, ValidationRules } from './form-validation.js';

// HTML
const addToCartForm = document.getElementById('add-to-cart-form');
const addBtn = addToCartForm.querySelector('button[type="submit"]');

// Валидация количества
const validator = new FormValidator(addToCartForm, {
  quantity: [
    ValidationRules.required,
    ValidationRules.number,
    ValidationRules.min(1),
    ValidationRules.max(99)
  ]
});

// Обработка добавления
addToCartForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validator.validate()) return;
  
  // Показать loading
  const loader = LoadingState.attach(addBtn, { message: 'Добавляю...' });
  addBtn.disabled = true;
  
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: productId,
        quantity: parseInt(addToCartForm.quantity.value)
      })
    });
    
    if (response.ok) {
      loader.remove();
      addBtn.disabled = false;
      
      const quantity = addToCartForm.quantity.value;
      Toast.success(`Добавлено ${quantity} товар(ов) в корзину`);
      validator.reset();
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    loader.remove();
    addBtn.disabled = false;
    Toast.error('Ошибка при добавлении в корзину');
  }
});

// Пример: Удаление товара
const deleteBtn = document.getElementById('delete-product');

deleteBtn?.addEventListener('click', async () => {
  const confirmed = await ConfirmDialog.show(
    'Удалить товар?',
    'Это действие нельзя отменить.',
    {
      confirmText: 'Да, удалить',
      type: 'danger'
    }
  );
  
  if (confirmed) {
    const loader = LoadingState.attach(deleteBtn, { message: 'Удаляю...' });
    deleteBtn.disabled = true;
    
    await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    
    loader.remove();
    Toast.success('Товар удалён');
    
    setTimeout(() => {
      window.location.href = '/products';
    }, 1000);
  }
});

// ============================================
// ЧЕКЛИСТ ДЛЯ НОВЫХ КОМПОНЕНТОВ
// ============================================

/*
При создании нового компонента/страницы используйте:

☐ Дизайн токены вместо hardcoded значений
☐ Унифицированный .btn класс для всех кнопок
☐ Toast для уведомлений пользователю
☐ Modal/ConfirmDialog для критичных действий
☐ FormValidator для всех форм
☐ LoadingState при загрузке данных
☐ Skeleton для плейсхолдеров
☐ Правильные ARIA атрибуты
☐ Focus-visible для доступности
☐ Responsive дизайн (mobile-first)
☐ Error handling с Toast уведомлениями
☐ Debounce для search/input событий
*/

export default {
  // Все примеры для импорта
};
