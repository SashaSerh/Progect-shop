# Система дизайна и UI паттерны

Полная документация унифицированной системы дизайна и компонентов для проекта ClimaTech.

## 📚 Содержание

1. [Дизайн-система (Design Tokens)](#дизайн-система)
2. [Компоненты UI](#компоненты-ui)
3. [Форм и валидация](#формы-и-валидация)
4. [Примеры использования](#примеры-использования)

---

## 🎨 Дизайн-система

### Spacing Scale

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 24px
--spacing-2xl: 32px
--spacing-3xl: 48px
```

**Использование:**
```html
<div style="padding: var(--spacing-md); margin: var(--spacing-lg);">
  Элемент с унифицированными отступами
</div>
```

### Typography Scale

```css
--font-size-xs: 12px
--font-size-sm: 14px
--font-size-base: 16px
--font-size-lg: 18px
--font-size-xl: 20px
--font-size-2xl: 24px
--font-size-3xl: 28px
--font-size-4xl: 32px
```

### Color Palette

```css
/* Primary Colors */
--color-primary: #007AFF
--color-primary-dark: #0051D5
--color-primary-light: #E8F4FF

/* Semantic Colors */
--color-success: #10B981
--color-error: #EF4444
--color-warning: #F59E0B
--color-info: #3B82F6
```

### Shadow Scale

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15)
--shadow-elevation: 0 8px 32px rgba(0, 0, 0, 0.15)
```

### Border Radius

```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
--radius-full: 9999px
```

---

## 🧩 Компоненты UI

### Кнопки (Buttons)

#### Основное использование

```html
<!-- Primary кнопка -->
<button class="btn" data-variant="primary" data-size="md">Заказать</button>

<!-- Secondary кнопка -->
<button class="btn" data-variant="secondary" data-size="md">Отмена</button>

<!-- Success кнопка -->
<button class="btn" data-variant="success" data-size="md">Подтвердить</button>

<!-- Error кнопка -->
<button class="btn" data-variant="error" data-size="md">Удалить</button>

<!-- Ghost кнопка -->
<button class="btn" data-variant="ghost" data-size="md">Подробнее</button>
```

#### Размеры кнопок

```html
<button class="btn" data-variant="primary" data-size="xs">Extra Small</button>
<button class="btn" data-variant="primary" data-size="sm">Small</button>
<button class="btn" data-variant="primary" data-size="md">Medium</button>
<button class="btn" data-variant="primary" data-size="lg">Large</button>
<button class="btn" data-variant="primary" data-size="xl">Extra Large</button>
```

#### Состояния

```html
<!-- Disabled -->
<button class="btn" data-variant="primary" disabled>Заказать</button>

<!-- Loading -->
<button class="btn" data-variant="primary" data-loading="true">
  <span class="btn__label">Сохранение...</span>
  <span class="btn__loader"></span>
</button>

<!-- Block (полная ширина) -->
<button class="btn" data-variant="primary" data-block="true">Полная ширина</button>
```

### Toast уведомления

```javascript
import { Toast } from './js/ui-patterns.js';

// Success уведомление
Toast.success('Операция выполнена!');

// Error уведомление
Toast.error('Произошла ошибка');

// Warning уведомление
Toast.warning('Внимание!');

// Info уведомление
Toast.info('Информация');

// Управляемое уведомление
const toast = Toast.show('Загрузка...', 'info', 0);
setTimeout(() => {
  toast.update('Готово!');
  toast.close();
}, 2000);
```

### Модальные окна (Modal)

```javascript
import { Modal } from './js/ui-patterns.js';

// Простой modal
await Modal.open('Содержимое modal', {
  title: 'Заголовок',
  size: 'md', // sm, md, lg
  closeButton: true,
  dismissible: true
});

// Modal с HTML
const content = `
  <div class="custom-content">
    <p>Это может быть любой HTML</p>
    <button class="btn" data-variant="primary">Действие</button>
  </div>
`;

const result = await Modal.open(content, {
  title: 'Modal с HTML',
  size: 'lg'
});

console.log('Результат:', result);
```

### Диалоги подтверждения

```javascript
import { ConfirmDialog } from './js/ui-patterns.js';

const confirmed = await ConfirmDialog.show(
  'Удалить товар?',
  'Это действие нельзя отменить.',
  {
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    type: 'danger' // default, warning, danger
  }
);

if (confirmed) {
  // Выполнить действие
}
```

### Loading state

```javascript
import { LoadingState } from './js/ui-patterns.js';

const container = document.getElementById('content');

// Показать загрузчик
const loader = LoadingState.attach(container, {
  message: 'Загрузка данных...'
});

// Обновить сообщение
loader.update('Почти готово...');

// Убрать загрузчик
loader.remove();
```

### Skeleton loaders

```html
<!-- Skeleton для карточки -->
<div class="skeleton skeleton--card">
  <div class="skeleton__image"></div>
  <div class="skeleton__line skeleton__line--xl"></div>
  <div class="skeleton__line skeleton__line--md"></div>
  <div class="skeleton__line skeleton__line--sm"></div>
</div>
```

---

## 📝 Формы и валидация

### Базовое использование

```html
<form id="contact-form">
  <div class="form-group">
    <label class="form-label" for="name">Имя</label>
    <input 
      type="text" 
      id="name"
      name="name"
      class="form-input"
      placeholder="Ваше имя"
    />
  </div>
  
  <div class="form-group">
    <label class="form-label" for="email">Email</label>
    <input 
      type="email" 
      id="email"
      name="email"
      class="form-input"
      placeholder="your@email.com"
    />
  </div>
  
  <button type="submit" class="btn" data-variant="primary" data-block="true">
    Отправить
  </button>
</form>
```

### Валидация с FormValidator

```javascript
import { FormValidator, ValidationRules } from './js/form-validation.js';

const form = document.getElementById('contact-form');

const validator = new FormValidator(form, {
  name: ValidationRules.required,
  email: [
    ValidationRules.required,
    ValidationRules.email
  ],
  phone: [
    ValidationRules.required,
    ValidationRules.phone
  ],
  message: [
    ValidationRules.required,
    ValidationRules.minLength(10),
    ValidationRules.maxLength(1000)
  ]
}, {
  showErrors: true,
  realTimeValidation: true
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (validator.validate()) {
    const data = validator.getFormData();
    console.log('Данные:', data);
    
    // Отправить на сервер
    Toast.success('Отправлено!');
    validator.reset();
  }
});
```

### Доступные правила валидации

```javascript
ValidationRules.required           // Обязательное поле
ValidationRules.minLength(n)       // Минимум n символов
ValidationRules.maxLength(n)       // Максимум n символов
ValidationRules.email              // Email адрес
ValidationRules.phone              // Телефон
ValidationRules.url                // URL
ValidationRules.number             // Число
ValidationRules.min(n)             // Минимальное число
ValidationRules.max(n)             // Максимальное число
ValidationRules.password           // Строгий пароль
ValidationRules.strongPassword     // Очень строгий пароль
ValidationRules.matchPassword(id)  // Совпадение паролей
ValidationRules.pattern(regex)     // Кастомное регулярное выражение
ValidationRules.cyrillic           // Только русские буквы
ValidationRules.latin              // Только латинские буквы
ValidationRules.alphanumeric       // Буквы и цифры
```

### Валидация отдельного поля

```javascript
import { FieldValidator, ValidationRules } from './js/form-validation.js';

const emailField = document.getElementById('email');

const emailValidator = new FieldValidator(emailField, [
  ValidationRules.required,
  ValidationRules.email
]);

emailField.addEventListener('blur', () => {
  emailValidator.validate();
});
```

---

## 💡 Примеры использования

### Пример 1: Форма заказа товара

```html
<form id="order-form">
  <div class="form-group">
    <label class="form-label">Количество</label>
    <input type="number" name="quantity" class="form-input" min="1" max="99" value="1" />
  </div>
  
  <button type="submit" class="btn" data-variant="primary" data-block="true" data-size="lg">
    Добавить в корзину
  </button>
</form>
```

```javascript
import { Toast, LoadingState } from './js/ui-patterns.js';

const form = document.getElementById('order-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = form.querySelector('button[type="submit"]');
  const loader = LoadingState.attach(btn, { message: 'Добавление...' });
  
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      body: new FormData(form)
    });
    
    if (response.ok) {
      loader.remove();
      Toast.success('Товар добавлен в корзину!');
    } else {
      throw new Error('Ошибка');
    }
  } catch (error) {
    loader.remove();
    Toast.error('Ошибка при добавлении товара');
  }
});
```

### Пример 2: Удаление с подтверждением

```javascript
import { ConfirmDialog, Toast } from './js/ui-patterns.js';

const deleteBtn = document.getElementById('delete-btn');

deleteBtn.addEventListener('click', async () => {
  const confirmed = await ConfirmDialog.show(
    'Удалить товар?',
    'Это действие нельзя отменить.',
    {
      confirmText: 'Удалить',
      type: 'danger'
    }
  );
  
  if (confirmed) {
    await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    Toast.success('Товар удалён');
    window.location.href = '/products';
  }
});
```

### Пример 3: Поиск в реальном времени

```javascript
import { Toast } from './js/ui-patterns.js';

const searchInput = document.getElementById('search');
const resultsContainer = document.getElementById('results');
let debounceTimer;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value.trim();
  
  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }
  
  debounceTimer = setTimeout(async () => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const results = await response.json();
      
      resultsContainer.innerHTML = results
        .map(item => `
          <div class="result-item">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
        `)
        .join('');
    } catch (error) {
      Toast.error('Ошибка поиска');
    }
  }, 300); // debounce 300ms
});
```

---

## 🎯 Best Practices

### 1. Используйте переменные вместо hardcoded значений

```css
/* ❌ Плохо */
.card {
  padding: 16px;
  margin: 12px;
  border-radius: 12px;
}

/* ✅ Хорошо */
.card {
  padding: var(--spacing-lg);
  margin: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

### 2. Используйте унифицированные кнопки

```html
<!-- ❌ Плохо - разные классы -->
<button class="product-btn">Заказать</button>
<button class="service-btn">Выбрать</button>

<!-- ✅ Хорошо - единый btn класс -->
<button class="btn" data-variant="primary" data-size="md">Заказать</button>
<button class="btn" data-variant="primary" data-size="md">Выбрать</button>
```

### 3. Валидируйте всегда

```javascript
// ✅ Всегда валидируйте форму перед отправкой
const validator = new FormValidator(form, rules);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (validator.validate()) {
    // Отправить данные
  }
});
```

### 4. Используйте Toast для feedback

```javascript
// ✅ Информируйте пользователя о результатах
Toast.success('Успешно сохранено');
Toast.error('Ошибка при сохранении');
Toast.info('Операция выполняется...');
```

### 5. Управляйте состояниями кнопок

```javascript
// ✅ Деактивируйте кнопку во время загрузки
button.disabled = true;
button.setAttribute('data-loading','true');

// Потом включите обратно
button.disabled = false;
button.removeAttribute('data-loading');
```

---

## 📱 Responsive Design

Все компоненты адаптивны для мобильных устройств:

- Toast уведомления выравниваются под размер экрана
- Модальные окна занимают 90% ширины на мобилях
- Dropdown меню переходит в режим fixed позиционирования
- Формы автоматически масштабируются

---

## 🔧 Импорт в main.js

```javascript
// Подключить в main.js
import { Toast, Modal, ConfirmDialog, LoadingState, FormField } from './ui-patterns.js';
import { FormValidator, ValidationRules } from './form-validation.js';

// Сделать доступным глобально для консоли
window.Toast = Toast;
window.Modal = Modal;
window.ConfirmDialog = ConfirmDialog;
window.FormValidator = FormValidator;
```

---

**Дата создания**: 25 декабря 2025 г.
**Версия**: 1.0
