/**
 * UI PATTERNS USAGE EXAMPLES
 * Примеры использования всех компонентов и паттернов дизайн-системы
 */

import { Toast, Modal, ConfirmDialog, Dropdown, LoadingState, FormField } from './ui-patterns.js';
import { ValidationRules, FormValidator } from './form-validation.js';

// ============================================
// 1. TOAST NOTIFICATIONS
// ============================================

export function toastExamples() {
  // Простое уведомление
  Toast.success('Операция выполнена успешно!');
  
  // Ошибка
  Toast.error('Произошла ошибка. Попробуйте позже.');
  
  // Предупреждение
  Toast.warning('Внимание: это действие нельзя отменить!');
  
  // Информация
  Toast.info('Это информационное сообщение');
  
  // Управляемое уведомление
  const toast = Toast.show('Загрузка...', 'info', 0); // 0 = не закрывается автоматически
  
  setTimeout(() => {
    toast.update('Загрузка завершена');
    setTimeout(() => toast.close(), 1000);
  }, 2000);
}

// ============================================
// 2. MODAL DIALOGS
// ============================================

export async function modalExamples() {
  // Простой modal
  await Modal.open('Это содержимое modal окна', {
    title: 'Заголовок модального окна',
    size: 'md'
  });
  
  // Modal с HTML контентом
  const htmlContent = `
    <div class="custom-modal-content">
      <p>Это может быть любой HTML контент</p>
      <button class="btn" data-variant="primary">Кнопка внутри modal</button>
    </div>
  `;
  
  const result = await Modal.open(htmlContent, {
    title: 'Пример с HTML',
    closeButton: true,
    dismissible: true,
    size: 'lg'
  });
  
  console.log('Modal результат:', result);
}

// ============================================
// 3. CONFIRM DIALOGS
// ============================================

export async function confirmExamples() {
  // Стандартный диалог подтверждения
  const confirmed = await ConfirmDialog.show(
    'Удалить товар?',
    'Это действие нельзя отменить. Товар будет удалён из каталога.',
    {
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger'
    }
  );
  
  if (confirmed) {
    Toast.success('Товар удалён');
  } else {
    Toast.info('Отменено');
  }
}

// ============================================
// 4. FORM VALIDATION
// ============================================

export function formValidationExamples() {
  // Валидация контактной формы
  const contactForm = document.getElementById('contact-form');
  
  const validator = new FormValidator(contactForm, {
    name: ValidationRules.required,
    email: [ValidationRules.required, ValidationRules.email],
    message: [
      ValidationRules.required,
      ValidationRules.minLength(10),
      ValidationRules.maxLength(1000)
    ],
    phone: [
      ValidationRules.required,
      ValidationRules.phone
    ]
  }, {
    showErrors: true,
    realTimeValidation: true
  });
  
  // Обработка отправки
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (validator.validate()) {
      const formData = validator.getFormData();
      console.log('Данные формы:', formData);
      
      // Отправить данные на сервер
      Toast.success('Сообщение отправлено!');
      validator.reset();
    }
  });
}

// ============================================
// 5. REGISTRATION FORM WITH PASSWORD VALIDATION
// ============================================

export function registerFormExample() {
  const registerForm = document.getElementById('register-form');
  
  const validator = new FormValidator(registerForm, {
    username: [
      ValidationRules.required,
      ValidationRules.minLength(3),
      ValidationRules.alphanumeric
    ],
    email: [
      ValidationRules.required,
      ValidationRules.email
    ],
    password: [
      ValidationRules.required,
      ValidationRules.password
    ],
    confirmPassword: [
      ValidationRules.required,
      ValidationRules.matchPassword('register-form_password')
    ]
  });
  
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (validator.validate()) {
      // Показываем загрузчик
      const loader = LoadingState.attach(registerForm, {
        message: 'Регистрация...'
      });
      
      try {
        // Имитация API запроса
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        loader.remove();
        Toast.success('Вы зарегистрировались!');
        validator.reset();
      } catch (error) {
        loader.remove();
        Toast.error('Ошибка при регистрации');
      }
    }
  });
}

// ============================================
// 6. LOADING STATES
// ============================================

export async function loadingStateExample() {
  const container = document.getElementById('content');
  
  // Показать загрузчик
  const loader = LoadingState.attach(container, {
    message: 'Загрузка данных...'
  });
  
  try {
    // Имитация загрузки
    const response = await fetch('/api/data');
    const data = await response.json();
    
    loader.remove();
    container.innerHTML = '<p>Данные загружены</p>';
  } catch (error) {
    loader.remove();
    Toast.error('Ошибка загрузки данных');
  }
}

// ============================================
// 7. PRODUCT ACTIONS WITH INTERACTIONS
// ============================================

export function productActionsExample() {
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  
  addToCartBtn?.addEventListener('click', async () => {
    // Показываем состояние загрузки
    addToCartBtn.setAttribute('data-loading','true');
    addToCartBtn.disabled = true;
    
    try {
      // Имитация добавления в корзину
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addToCartBtn.removeAttribute('data-loading');
      addToCartBtn.disabled = false;
      
      Toast.success('Товар добавлен в корзину');
    } catch (error) {
      addToCartBtn.removeAttribute('data-loading');
      addToCartBtn.disabled = false;
      
      Toast.error('Ошибка при добавлении');
    }
  });
  
  // Удаление с подтверждением
  const deleteBtn = document.getElementById('delete-product-btn');
  
  deleteBtn?.addEventListener('click', async () => {
    const confirmed = await ConfirmDialog.show(
      'Удалить товар?',
      'Это действие нельзя отменить.',
      {
        confirmText: 'Удалить',
        type: 'danger'
      }
    );
    
    if (confirmed) {
      deleteBtn.setAttribute('data-loading','true');
      deleteBtn.disabled = true;
      
      setTimeout(() => {
        Toast.success('Товар удалён');
        // Перенаправить на каталог
        window.location.href = '/products';
      }, 1000);
    }
  });
}

// ============================================
// 8. BULK ACTIONS WITH SELECTION
// ============================================

export function bulkActionsExample() {
  const selectAllCheckbox = document.getElementById('select-all');
  const itemCheckboxes = document.querySelectorAll('.item-checkbox');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
  
  selectAllCheckbox?.addEventListener('change', () => {
    itemCheckboxes.forEach(cb => {
      cb.checked = selectAllCheckbox.checked;
    });
    updateBulkActionsUI();
  });
  
  itemCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateBulkActionsUI);
  });
  
  function updateBulkActionsUI() {
    const selectedCount = document.querySelectorAll('.item-checkbox:checked').length;
    bulkDeleteBtn.disabled = selectedCount === 0;
    bulkDeleteBtn.textContent = `Удалить (${selectedCount})`;
  }
  
  bulkDeleteBtn?.addEventListener('click', async () => {
    const selected = Array.from(itemCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.dataset.id);
    
    if (selected.length === 0) return;
    
    const confirmed = await ConfirmDialog.show(
      `Удалить ${selected.length} элемент(ов)?`,
      'Это действие нельзя отменить.',
      { confirmText: 'Удалить', type: 'danger' }
    );
    
    if (confirmed) {
      const loader = LoadingState.attach(bulkDeleteBtn.closest('.toolbar'), {
        message: `Удаление ${selected.length} элементов...`
      });
      
      setTimeout(() => {
        loader.remove();
        Toast.success(`${selected.length} элемент(ов) удалено`);
        // Перезагрузить список
        location.reload();
      }, 2000);
    }
  });
}

// ============================================
// 9. DYNAMIC FORM FIELDS
// ============================================

export function dynamicFormExample() {
  const form = document.getElementById('dynamic-form');
  const addFieldBtn = document.getElementById('add-field-btn');
  let fieldCount = 1;
  
  addFieldBtn?.addEventListener('click', () => {
    fieldCount++;
    
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-group';
    fieldContainer.innerHTML = `
      <label class="form-label" for="field-${fieldCount}">Поле ${fieldCount}</label>
      <div class="form-control">
        <input 
          type="text" 
          id="field-${fieldCount}"
          name="field-${fieldCount}"
          class="form-input"
          placeholder="Введите значение"
        />
        <button type="button" class="btn remove-field-btn" data-variant="secondary" data-size="sm">
          Удалить
        </button>
      </div>
    `;
    
    form.appendChild(fieldContainer);
    
    // Обработчик удаления
    fieldContainer.querySelector('.remove-field-btn').addEventListener('click', () => {
      fieldContainer.remove();
      Toast.info('Поле удалено');
    });
  });
}

// ============================================
// 10. REAL-TIME SEARCH WITH DEBOUNCE
// ============================================

export function searchExample() {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');
  let debounceTimer;
  
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }
    
    // Показать скелетон
    resultsContainer.innerHTML = `
      <div class="skeleton skeleton--card">
        <div class="skeleton__line skeleton__line--xl"></div>
        <div class="skeleton__line skeleton__line--md"></div>
      </div>
    `;
    
    debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        if (results.length === 0) {
          resultsContainer.innerHTML = '<p class="text-muted">Ничего не найдено</p>';
          return;
        }
        
        resultsContainer.innerHTML = results
          .map(item => `
            <div class="search-result-item">
              <h3>${item.name}</h3>
              <p>${item.description}</p>
              <a href="${item.url}" class="btn" data-variant="ghost" data-size="sm">Подробнее</a>
            </div>
          `)
          .join('');
      } catch (error) {
        Toast.error('Ошибка поиска');
      }
    }, 300); // 300ms debounce
  });
}

// ============================================
// Initialize all examples
// ============================================

export function initializeExamples() {
  // Инициализировать при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      formValidationExamples();
      productActionsExample();
      bulkActionsExample();
      dynamicFormExample();
      searchExample();
    });
  } else {
    formValidationExamples();
    productActionsExample();
    bulkActionsExample();
    dynamicFormExample();
    searchExample();
  }
}

export default {
  toastExamples,
  modalExamples,
  confirmExamples,
  formValidationExamples,
  registerFormExample,
  loadingStateExample,
  productActionsExample,
  bulkActionsExample,
  dynamicFormExample,
  searchExample,
  initializeExamples
};
