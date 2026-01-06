# INTEGRATION GUIDE - Интеграция дизайн-системы

## 📋 Как начать использовать новую дизайн-систему

### 1. Добавить импорты в main.js

```javascript
// В начало файла добавить:
import { Toast, Modal, ConfirmDialog, LoadingState, FormField } from './ui-patterns.js';
import { FormValidator, ValidationRules } from './form-validation.js';

// Сделать доступными глобально для консоли и других модулей
window.Toast = Toast;
window.Modal = Modal;
window.ConfirmDialog = ConfirmDialog;
window.LoadingState = LoadingState;
window.FormValidator = FormValidator;
window.ValidationRules = ValidationRules;
```

### 2. Обновить существующие кнопки

**Было:**
```html
<button class="product-card__button">Заказать</button>
<button class="service-card__button modern-button">Выбрать</button>
<button class="back-button">← Назад</button>
```

**Стало:**
```html
<button class="btn" data-variant="primary" data-size="md">Заказать</button>
<button class="btn" data-variant="primary" data-size="md">Выбрать</button>
<button class="btn" data-variant="secondary" data-size="sm">← Назад</button>
```

### 3. Заменить старые Toast уведомления

**Было:**
```javascript
alert('Успешно добавлено!');
console.log('Error:', error);
```

**Стало:**
```javascript
Toast.success('Успешно добавлено!');
Toast.error('Произошла ошибка');
```

### 4. Обновить формы с валидацией

**Было:**
```html
<form id="contact-form">
  <input type="text" name="email" placeholder="Email" />
  <button type="submit">Отправить</button>
</form>
```

**Стало:**
```html
<form id="contact-form">
  <div class="form-group">
    <label class="form-label">Email</label>
    <input 
      type="email" 
      name="email" 
      class="form-input"
      placeholder="your@email.com"
    />
  </div>
  <button type="submit" class="btn" data-variant="primary" data-block="true">Отправить</button>
</form>
```

```javascript
const validator = new FormValidator(form, {
  email: [ValidationRules.required, ValidationRules.email]
});
```

### 5. Подготовить компоненты к миграции

**Этап 1 - Spacing (неделя 1):**
- Заменить все `padding`, `margin` на `var(--spacing-*)`
- Файлы: `css/main.css`

**Этап 2 - Buttons (неделя 2):**
- Заменить все классы кнопок на `.btn`
- Файлы: `components/*.html`, `js/*.js`

**Этап 3 - Forms (неделя 3):**
- Добавить валидацию всем формам
- Файлы: `components/contact-form.html`, `components/admin-products.html`

**Этап 4 - Colors (неделя 4):**
- Заменить все цвета на CSS переменные
- Файлы: `css/main.css`

### 6. Обновить существующие компоненты

#### Пример: Product Card

**До:**
```html
<div class="product-card">
  <img src="{image}" alt="{name}">
  <h3>{name}</h3>
  <p>${price}</p>
  <button class="product-btn" data-id="{id}">Заказать</button>
</div>
```

**После:**
```html
<div class="product-card">
  <img src="{image}" alt="{name}" class="product-card__image">
  <h3 class="product-card__title">{name}</h3>
  <p class="product-card__price">${price}</p>
  <button class="btn" data-variant="primary" data-size="md" data-id="{id}">Заказать</button>
</div>
```

#### Пример: Contact Form

**До:**
```html
<form id="contact-form">
  <input type="text" name="name" placeholder="Имя" required />
  <input type="email" name="email" placeholder="Email" required />
  <textarea name="message" placeholder="Сообщение" required></textarea>
  <button type="submit">Отправить</button>
</form>
```

**После:**
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
  
  <div class="form-group">
    <label class="form-label" for="message">Сообщение</label>
    <textarea 
      id="message"
      name="message" 
      class="form-input"
      placeholder="Ваше сообщение"
      rows="5"
    ></textarea>
  </div>
  
  <button type="submit" class="btn" data-variant="primary" data-block="true">Отправить</button>
</form>

<script>
  import { FormValidator, ValidationRules } from './form-validation.js';
  
  const form = document.getElementById('contact-form');
  const validator = new FormValidator(form, {
    name: ValidationRules.required,
    email: [ValidationRules.required, ValidationRules.email],
    message: [ValidationRules.required, ValidationRules.minLength(10)]
  });
</script>
```

### 7. Тестирование после миграции

```bash
# Запустить тесты
npm test

# Проверить в браузере
- Все кнопки работают и стилизованы
- Формы валидируют корректно
- Toast уведомления появляются
- Modal окна открываются/закрываются
- Loading states работают
- Dark theme поддерживается
- Мобильная адаптация работает
```

## 🚀 Быстрый старт для новых разработчиков

### Для новой страницы/компонента:

1. **Создать HTML с правильной структурой:**
```html
<div class="component">
  <h1 class="component__title">Заголовок</h1>
  <p class="component__description">Описание</p>
  <button class="btn" data-variant="primary" data-size="md">Действие</button>
</div>
```

2. **Использовать CSS переменные:**
```css
.component {
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  background: var(--surface-0);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}
```

3. **Добавить интерактивность:**
```javascript
import { Toast, Modal, ConfirmDialog, FormValidator } from './ui-patterns.js';

button.addEventListener('click', async () => {
  const confirmed = await ConfirmDialog.show('Продолжить?', 'Вы уверены?');
  if (confirmed) {
    Toast.success('Выполнено!');
  }
});
```

## 📚 Файлы для изучения

1. **`docs/UI-DESIGN-SYSTEM.md`** - Полная документация
2. **`js/QUICK-REFERENCE.js`** - Быстрые примеры
3. **`js/ui-patterns-examples.js`** - Реальные примеры использования
4. **`css/main.css`** - CSS переменные в начале файла (строки 1-120)

## ✅ Чеклист миграции

- [ ] Добавлены импорты в main.js
- [ ] Все `<button>` используют класс `.btn`
- [ ] Все `padding/margin` используют `--spacing-*`
- [ ] Все цвета используют CSS переменные
- [ ] Все формы имеют валидацию
- [ ] Все API запросы имеют LoadingState
- [ ] Все уведомления используют Toast
- [ ] Все модали используют Modal/ConfirmDialog
- [ ] Все skeleton loaders установлены
- [ ] Темная тема работает корректно
- [ ] Мобильная адаптация проверена
- [ ] Тесты проходят

## 🆘 Часто задаваемые вопросы

### Q: Как изменить глобальный цвет бренда?

**A:** Измените переменную в `:root` блоке:
```css
:root {
  --color-primary: #FF6B6B; /* Новый цвет */
}
```

### Q: Как добавить новое правило валидации?

**A:** Добавьте в `js/form-validation.js`:
```javascript
ValidationRules.customRule = {
  validate: (value) => /* ваша проверка */,
  message: 'Сообщение об ошибке'
};
```

### Q: Как сделать кнопку полной ширины?

**A:** Установите атрибут `data-block="true"`:
```html
<button class="btn" data-variant="primary" data-block="true">Полная ширина</button>
```

### Q: Как показать loading в кнопке?

**A:** Установите атрибут `data-loading="true"`:
```html
<button class="btn" data-variant="primary" data-loading="true" disabled>
  <span class="btn__label">Сохранение...</span>
  <span class="btn__loader"></span>
</button>
```

## 📞 Поддержка

Если возникли вопросы, смотрите:
1. `docs/UI-DESIGN-SYSTEM.md` - полная документация
2. `js/ui-patterns-examples.js` - примеры кода
3. `js/QUICK-REFERENCE.js` - шпаргалка

---

**Дата**: 25 декабря 2025 г.
**Статус**: ✅ Готово к использованию
