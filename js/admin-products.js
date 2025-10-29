import { renderProducts, getMergedProducts, setProducts, isAdminMode, enableAdminMode, disableAdminMode } from './products.js';

const STORAGE_KEY = 'products_local_v1';
const DRAFT_KEY = 'admin:product:draft:v1';

// Provider helpers (safe fallback to legacy localStorage flow)
function getProvider() {
  try { return (typeof window !== 'undefined' && window.getDataProvider) ? window.getDataProvider() : null; } catch { return null; }
}
function providerKind() {
  const p = getProvider();
  return p && p.kind || 'localStorage';
}

function uid(prefix = 'p') {
  return `${prefix}_${Math.random().toString(36).slice(2,9)}`;
}

// Deterministic hash -> hue (0..360)
function hashCodeToHue(str) {
  if (!str) return 210;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

// Convert hsl to hex (#rrggbb)
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

export function getLocalProducts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || [];
  } catch { return []; }
}

export function saveLocalProducts(list) {
  // Защита от переполнения localStorage, особенно из-за base64 изображений
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // Если превышена квота — пробуем обрезать изображения и сохранить заново
    try {
      const shrunk = (list || []).map(p => ({
        ...p,
        // если data URL слишком длинный, уменьшаем до заглушки
        image: (p.image && typeof p.image === 'string' && p.image.length > 200000) ? '' : p.image,
        images: Array.isArray(p.images) ? p.images.map(src => (src && src.length > 200000 ? '' : src)) : []
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shrunk));
    } catch (_) {
      // Последний шанс — удалить самый старый элемент и попробовать снова
      try {
        const cur = Array.isArray(list) ? [...list] : [];
        cur.sort((a,b) => new Date(a.createdAt||0) - new Date(b.createdAt||0));
        cur.shift();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
      } catch (_) { /* give up */ }
    }
  }
}

export function upsertLocalProduct(product) {
  const list = getLocalProducts();
  const idx = list.findIndex(p => p.id === product.id);
  const now = new Date().toISOString();
  product.updatedAt = now;
  if (idx >= 0) list[idx] = product; else { product.createdAt = now; list.push(product); }
  saveLocalProducts(list);
  return product;
}

// Export local products to JSON file
export function exportLocalProducts() {
  const products = getLocalProducts();
  if (!products.length) {
    alert('Нет локальных товаров для экспорта');
    return;
  }
  const dataStr = JSON.stringify(products, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `local-products-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import local products from JSON file
export function importLocalProducts(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const products = JSON.parse(e.target.result);
        if (!Array.isArray(products)) {
          throw new Error('Неверный формат файла');
        }
        // Validate products structure
        const validProducts = products.filter(p => p && typeof p === 'object' && p.id && p.name);
        if (validProducts.length !== products.length) {
          alert(`Импортировано ${validProducts.length} из ${products.length} товаров (некоторые были пропущены из-за неверного формата)`);
        }
        // Generate new IDs to avoid conflicts
        const importedWithNewIds = validProducts.map(p => ({
          ...p,
          id: uid(),
          // Keep original ID for reference
          originalId: p.id
        }));
        const existing = getLocalProducts();
        const merged = [...existing, ...importedWithNewIds];
        saveLocalProducts(merged);
        resolve(importedWithNewIds.length);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

export function initAdminProducts(translations, lang = 'ru') {
  const modal = document.getElementById('adminProductModal');
  const form = document.getElementById('adminProductForm');
  const dp = getProvider();
  // small toast helper
  const toastHost = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div'); el.id = 'toast-container'; document.body.appendChild(el); return el;
  })();

  // Admin login modal
  const loginModal = document.getElementById('adminLoginModal');
  const loginForm = document.getElementById('adminLoginForm');
  const loginCloseBtn = document.getElementById('adminLoginClose');
  const loginCancelBtn = document.getElementById('adminLoginCancel');
  const adminLoginBtn = document.getElementById('adminLoginBtn');

  console.log('Admin modal initialization:', {
    loginModal: !!loginModal,
    loginForm: !!loginForm,
    loginCloseBtn: !!loginCloseBtn,
    loginCancelBtn: !!loginCancelBtn,
    isAdminMode: isAdminMode()
  });

  // Show/hide admin login button based on admin mode
  function updateAdminControlsVisibility() {
    const addBtn = document.querySelector('.header-add-product');
    const clearBtn = document.querySelector('.header-clear-products');
    const adminLink = document.getElementById('adminPageLink');

    if (addBtn) {
      addBtn.style.display = isAdminMode() ? 'inline-block' : 'none';
    }
    if (clearBtn) {
      clearBtn.style.display = isAdminMode() ? 'inline-block' : 'none';
    }
    if (adminLink) {
      adminLink.style.display = isAdminMode() ? 'inline-block' : 'none';
    }
  }

  // Initialize admin controls visibility
  updateAdminControlsVisibility();

  // Header admin toggle button (simple enable/disable without password)
  const adminToggleBtn = document.getElementById('adminToggleBtn');
  function reflectAdminToggleBtn() {
    if (!adminToggleBtn) return;
    const on = isAdminMode();
    adminToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    adminToggleBtn.textContent = on ? 'Admin: ON' : 'Admin';
    adminToggleBtn.title = on ? 'Отключить админ-режим' : 'Включить админ-режим';
  }
  reflectAdminToggleBtn();
  if (adminToggleBtn) {
    adminToggleBtn.addEventListener('click', () => {
      if (!isAdminMode()) {
        enableAdminMode();
        showToast('Админ‑режим включён');
      } else {
        disableAdminMode();
        showToast('Админ‑режим выключен');
      }
      // обновить видимость контролов и перерендерить каталог,
      // чтобы показать/скрыть админские кнопки на карточках
      updateAdminControlsVisibility();
      reflectAdminToggleBtn();
      const merged = getMergedProducts();
      setProducts(merged);
      window.products = merged;
      renderProducts(lang, translations, merged);
    });
  }

  // Keyboard shortcut for admin login (Ctrl+Alt+A)
  document.addEventListener('keydown', (e) => {
    console.log('Key event:', {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });

    // Check for Ctrl+Alt+A or Cmd+Alt+A (case insensitive)
    const isAdminShortcut = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'A' || e.key === 'a');
    if (isAdminShortcut) {
      e.preventDefault();
      console.log('Admin shortcut triggered, isAdminMode:', isAdminMode(), 'loginModal exists:', !!loginModal);

      if (!isAdminMode() && loginModal) {
        console.log('Opening admin login modal');
        loginModal.style.display = 'flex';
        console.log('Modal display style set to flex, computed style:', getComputedStyle(loginModal).display);
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
          passwordInput.focus();
          console.log('Focused password input');
        }
        showToast('Режим администратора: введите пароль (Ctrl+Alt+A)', 2000);
      } else if (isAdminMode()) {
        console.log('Already in admin mode');
        showToast('Вы уже в режиме администратора (Ctrl+Alt+A для входа)', 2000);
      } else {
        console.error('Cannot open admin modal: not in admin mode or modal not found');
      }
    }
  });

  // Admin login button click (removed - using keyboard shortcut)
  // if (adminLoginBtn) {
  //   adminLoginBtn.addEventListener('click', () => {
  //     if (loginModal) {
  //       loginModal.style.display = 'flex';
  //       const passwordInput = document.getElementById('adminPassword');
  //       if (passwordInput) {
  //         passwordInput.focus();
  //       }
  //     }
  //   });
  // }

  // Admin login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const password = formData.get('password');

      // Simple password check (in production, use proper authentication)
      if (password === 'admin123') {
        enableAdminMode();
        updateAdminControlsVisibility();
        showToast('Вход выполнен успешно');
        if (loginModal) {
          console.log('Closing admin login modal after successful login');
          loginModal.style.display = 'none';
          console.log('Modal display style set to none');
        }
        loginForm.reset();

        // Re-render products to show admin controls
        const merged = getMergedProducts();
        setProducts(merged);
        window.products = merged;
        renderProducts(lang, translations, merged);
      } else {
        showToast('Неверный пароль', 3000);
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.select();
        }
      }
    });
  }

  // Close login modal
  [loginCloseBtn, loginCancelBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        console.log('Closing admin login modal via button');
        if (loginModal) {
          loginModal.style.display = 'none';
          console.log('Modal display style set to none');
        }
        loginForm.reset();
      });
    }
  });

  // Close modal on backdrop click
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        console.log('Closing admin login modal via backdrop click');
        loginModal.style.display = 'none';
        console.log('Modal display style set to none');
        loginForm.reset();
      }
    });
  }
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Add Product';
  openBtn.className = 'btn btn--primary header-add-product';
  openBtn.type = 'button';
  openBtn.style.display = 'none'; // Hidden by default

  // Кнопка очистки локальных товаров
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Products';
  clearBtn.className = 'btn btn--ghost header-clear-products';
  clearBtn.type = 'button';
  clearBtn.style.display = 'none'; // Hidden by default
  // Добавляем в header controls если есть
  const headerControls = document.querySelector('.header__controls');
  if (headerControls) {
    headerControls.insertBefore(openBtn, headerControls.firstChild);
    headerControls.insertBefore(clearBtn, openBtn.nextSibling);
  }

  const closeBtn = document.getElementById('adminProductModalClose');
  const cancelBtn = document.getElementById('adminProductCancel');
  const fileInput = form.querySelector('input[name="image"]');
  const preview = document.getElementById('adminImagePreview');
  const flagSelector = document.getElementById('flagSelector');
  const availableFlagsContainer = document.getElementById('availableFlags');
  const selectedFlagsContainer = document.getElementById('selectedFlags');
  const flagsHiddenInput = form.querySelector('input[name="_flags"]');

  function serializeSelectedFlags() {
    if (!selectedFlagsContainer || !flagsHiddenInput) return;
    const items = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => ({ key: el.getAttribute('data-flag-key'), color: el.getAttribute('data-flag-color') || '' }));
    flagsHiddenInput.value = JSON.stringify(items);
  }

  function renderSelectedFlags(list) {
    if (!selectedFlagsContainer) return;
    selectedFlagsContainer.innerHTML = '';
    // list is array of objects { key, color } or strings
    list.forEach(item => {
      const key = typeof item === 'string' ? item : (item?.key || '');
      const color = (typeof item === 'object' && item?.color) ? item.color : (localStorage.getItem('flag_color_defaults') ? (JSON.parse(localStorage.getItem('flag_color_defaults') || '{}')[key] || '') : '');
      const wrapper = document.createElement('div');
      wrapper.className = 'selected-flag';
      wrapper.setAttribute('data-flag-key', key);
      wrapper.setAttribute('data-flag-color', color || '');
  wrapper.draggable = true;
  wrapper.tabIndex = 0; // make focusable for keyboard reordering
  wrapper.setAttribute('role','listitem');
      wrapper.innerHTML = `
        <span class="selected-flag__label">${key}</span>
        <input type="color" class="selected-flag__color" value="${color || '#007aff'}" title="Цвет флага">
        <button type="button" class="selected-flag__remove" aria-label="Удалить">✕</button>
      `;
      // drag handlers
      wrapper.addEventListener('dragstart', (e) => {
        wrapper.classList.add('dragging');
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); } catch(_){}
      });
      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        serializeSelectedFlags();
      });
      // keyboard reorder: ArrowUp/ArrowDown/Home/End
      wrapper.addEventListener('keydown', (ev) => {
        const keyName = ev.key;
        if (['ArrowUp','ArrowDown','Home','End'].includes(keyName)) {
          ev.preventDefault();
          if (keyName === 'ArrowUp') {
            const prev = wrapper.previousElementSibling;
            if (prev) selectedFlagsContainer.insertBefore(wrapper, prev);
          } else if (keyName === 'ArrowDown') {
            const next = wrapper.nextElementSibling;
            if (next) selectedFlagsContainer.insertBefore(next, wrapper);
          } else if (keyName === 'Home') {
            selectedFlagsContainer.insertBefore(wrapper, selectedFlagsContainer.firstChild);
          } else if (keyName === 'End') {
            selectedFlagsContainer.appendChild(wrapper);
          }
          serializeSelectedFlags();
          // keep focus on moved item
          wrapper.focus();
        }
      });
      // remove
      wrapper.querySelector('.selected-flag__remove').addEventListener('click', () => {
        wrapper.remove();
        serializeSelectedFlags();
      });
      // color change
      const colorInput = wrapper.querySelector('.selected-flag__color');
      if (colorInput) {
        colorInput.addEventListener('input', (ev) => {
          const v = ev.target.value;
          wrapper.setAttribute('data-flag-color', v);
          serializeSelectedFlags();
        });
      }
      selectedFlagsContainer.appendChild(wrapper);
    });

    // allow reordering via dragover/drop
    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.selected-flag:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > (closest.offset || -Infinity)) {
          return { offset, element: child };
        } else return closest;
      }, { offset: -Infinity }).element;
    }

    selectedFlagsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = selectedFlagsContainer.querySelector('.dragging');
      if (!dragging) return;
      const after = getDragAfterElement(selectedFlagsContainer, e.clientY);
      if (!after) selectedFlagsContainer.appendChild(dragging);
      else selectedFlagsContainer.insertBefore(dragging, after);
    });

    serializeSelectedFlags();
  }

  function initFlagSelector() {
    if (!availableFlagsContainer || !selectedFlagsContainer) return;
    availableFlagsContainer.innerHTML = '';
    const dict = (translations && translations[lang] && translations[lang].flags) || {};
    const defaults = JSON.parse(localStorage.getItem('flag_color_defaults') || '{}');
    // populate available flags with color pickers
    Object.keys(dict).forEach(key => {
      const wrap = document.createElement('div');
      wrap.className = 'available-flag-item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flag-chip';
      btn.setAttribute('data-flag-key', key);
      btn.textContent = dict[key] || key;
      const color = defaults[key] || `#${((hashCodeToHue && ((hashCodeToHue(key)%360)|0))||210).toString(16)}`;
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'flag-default-color';
      colorInput.value = defaults[key] || `#${hslToHex(hashCodeToHue(key),70,45)}`;
      // save default color on change
      colorInput.addEventListener('input', (e) => {
        const cur = JSON.parse(localStorage.getItem('flag_color_defaults') || '{}');
        cur[key] = e.target.value;
        localStorage.setItem('flag_color_defaults', JSON.stringify(cur));
      });
      btn.addEventListener('click', () => {
        // add to selected if not present, include current color
        const exists = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).some(el => el.getAttribute('data-flag-key') === key);
        if (exists) return;
        const cur = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => ({ key: el.getAttribute('data-flag-key'), color: el.getAttribute('data-flag-color') }));
        cur.push({ key, color: colorInput.value });
        renderSelectedFlags(cur);
      });
      wrap.appendChild(btn);
      wrap.appendChild(colorInput);
      availableFlagsContainer.appendChild(wrap);
    });
  }

  function initFlagSelector() {
    if (!availableFlagsContainer || !selectedFlagsContainer) return;
    availableFlagsContainer.innerHTML = '';
    const dict = (translations && translations[lang] && translations[lang].flags) || {};
    // populate available flags
    Object.keys(dict).forEach(key => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flag-chip';
      btn.setAttribute('data-flag-key', key);
      btn.textContent = dict[key] || key;
      btn.addEventListener('click', () => {
        // add to selected if not present
        const exists = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).some(el => el.getAttribute('data-flag-key') === key);
        if (exists) return;
        const cur = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => el.getAttribute('data-flag-key'));
        cur.push(key);
        renderSelectedFlags(cur);
      });
      availableFlagsContainer.appendChild(btn);
    });
  }

  // Initialize flag selector UI
  initFlagSelector();

  function openModal() {
    form.reset();
    // reset flags UI
    selectedFlagsContainer && (selectedFlagsContainer.innerHTML = '');
    flagsHiddenInput && (flagsHiddenInput.value = '[]');
    const hid = form.querySelector('input[name="_image_data"]'); if (hid) hid.remove();
    modal.style.display = 'flex';
    const first = form.querySelector('input[name="title_ru"]');
    first?.focus();
    // Подставляем черновик, если есть
    try {
      const d = (function(){ try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || null; } catch { return null; } })();
      if (d) {
        for (const [k, v] of Object.entries(d)) {
          const field = form.querySelector(`[name="${k}"]`);
          if (field) field.value = v;
        }
        if (d._flags) {
          try { const fl = JSON.parse(d._flags); if (Array.isArray(fl)) renderSelectedFlags(fl); } catch {}
        }
      }
    } catch {}
  }
  function closeModal() {
    if (modal) {
      modal.style.display = 'none';
    }
    form?.reset();
    if (preview) preview.innerHTML = '';
  }

  // Вместо модалки переходим на отдельную страницу админки
  openBtn.addEventListener('click', () => { location.hash = '#admin/products'; });
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Очистка локальных товаров (оставляем кнопку, действует только на локальные)
  clearBtn.addEventListener('click', () => {
    if (!confirm('Очистить все локальные товары? Это действие нельзя отменить.')) return;
    saveLocalProducts([]);
    try {
      const merged = getMergedProducts();
      setProducts(merged);
      window.products = merged;
      renderProducts(lang, translations, merged);
      showToast('Локальные товары очищены');
    } catch (err) { console.error('clear error', err); }
  });

  // preview image
  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      preview.innerHTML = `<img src="${ev.target.result}" alt="preview" style="max-width:200px;max-height:120px;"/>`;
      // set hidden input value to base64 image for localStorage
      const hidden = form.querySelector('input[name="_image_data"]');
      if (!hidden) {
        const inp = document.createElement('input'); inp.type = 'hidden'; inp.name = '_image_data'; inp.value = ev.target.result; form.appendChild(inp);
      } else hidden.value = ev.target.result;
    };
    reader.readAsDataURL(f);
  });

  // Автосохранение черновика
  function readFormDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || null; } catch { return null; }
  }
  function writeFormDraft() {
    if (!form) return;
    const data = new FormData(form);
    const draft = Object.fromEntries(data.entries());
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }
  function clearFormDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }
  let draftTimer = null;
  form?.addEventListener('input', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(writeFormDraft, 300);
  });
  form?.addEventListener('change', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(writeFormDraft, 100);
  });

  // При открытии пробуем подставить черновик — реализовано внутри openModal

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const data = new FormData(form);
    // parse flags
    let flags = [];
    try { flags = JSON.parse(data.get('_flags') || '[]'); } catch(_) { flags = []; }
    const product = {
      id: data.get('id') || uid('p'),
      name: { ru: data.get('title_ru') || '', uk: data.get('title_uk') || '' },
      description: { ru: data.get('description_ru') || '', uk: data.get('description_uk') || '' },
      price: Number(data.get('price') || 0),
      sku: data.get('sku') || '',
      category: data.get('category') || 'service',
      image: data.get('_image_data') || '',
      images: data.get('_image_data') ? [data.get('_image_data')] : [],
      inStock: data.get('inStock') === 'true',
      flags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Если доступен общий провайдер — используем его, иначе локальный upsert
    try {
      if (dp && typeof dp.create === 'function') {
        const res = await dp.create(product);
        if (!res?.ok) {
          console.warn('Provider create validation errors:', res?.errors);
          showToast('Ошибка сохранения (валидация)');
        }
      } else {
        upsertLocalProduct(product);
      }
    } catch (e) {
      console.error('Provider create error', e);
      upsertLocalProduct(product);
    }
    clearFormDraft();
    showToast('Товар сохранён');
    // Re-render products with localStorage + bundled products
    try {
      const merged = getMergedProducts();
      // обновляем модульное состояние и глобальную переменную для вспомогательных модулей
      setProducts(merged);
      window.products = merged;
      renderProducts(lang, translations, merged);
    } catch (err) { console.error('render error', err); }
    closeModal();
  });

  function showToast(text, ms = 2500) {
    const t = document.createElement('div');
    t.className = 'toast toast--info';
    t.textContent = text;
    toastHost.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function fillFormWithProduct(product) {
    if (!product) return;
    form.querySelector('input[name="id"]').value = product.id || '';
    form.querySelector('input[name="title_ru"]').value = product.name?.ru || '';
    form.querySelector('input[name="title_uk"]').value = product.name?.uk || '';
    form.querySelector('textarea[name="description_ru"]').value = product.description?.ru || '';
    form.querySelector('textarea[name="description_uk"]').value = product.description?.uk || '';
    form.querySelector('input[name="price"]').value = product.price || 0;
    form.querySelector('input[name="sku"]').value = product.sku || '';
    form.querySelector('input[name="category"]').value = product.category || '';
    form.querySelector('select[name="inStock"]').value = product.inStock ? 'true' : 'false';
    const preview = document.getElementById('adminImagePreview');
    preview.innerHTML = '';
    if (product.image) preview.innerHTML = `<img src="${product.image}" style="max-width:200px;max-height:120px;"/>`;
    // prefill flags UI
    try {
      const f = Array.isArray(product.flags) ? product.flags.map(x => (typeof x === 'string' ? x : x.key || '')) : [];
      if (f.length) renderSelectedFlags(f);
    } catch(_){}
  }

  // Delegate edit/delete actions from product cards
  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    // edit button: .product-card__button with data-edit
    if (el.matches('.product-card__button[data-edit]')) {
      const id = el.getAttribute('data-id');
      const locals = getLocalProducts();
      const prod = locals.find(p => String(p.id) === String(id));
      if (prod) {
        try {
          // Сохраняем как черновик, чтобы страница подтянула значения
          const draft = {
            id: prod.id || '',
            title_ru: prod.name?.ru || '',
            title_uk: prod.name?.uk || '',
            description_ru: prod.description?.ru || '',
            description_uk: prod.description?.uk || '',
            price: String(prod.price || 0),
            sku: prod.sku || '',
            category: prod.category || 'service',
            inStock: prod.inStock ? 'true' : 'false',
            _flags: JSON.stringify(Array.isArray(prod.flags) ? prod.flags : [])
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch {}
        location.hash = '#admin/products';
      }
    }
    // delete button: .product-card__button with data-delete
    if (el.matches('.product-card__button[data-delete]')) {
      const id = el.getAttribute('data-id');
      if (!confirm('Удалить товар?')) return;
      const list = getLocalProducts().filter(p => String(p.id) !== String(id));
      saveLocalProducts(list);
      // re-render
  const merged = getMergedProducts();
  setProducts(merged);
  window.products = merged;
  renderProducts(lang, translations, merged);
      showToast('Товар удалён');
    }
  });

  // Admin controls visibility and handlers
  const adminControls = document.getElementById('adminControls');
  if (adminControls) {
    adminControls.style.display = isAdminMode() ? 'flex' : 'none';

    // Export button
    const exportBtn = document.getElementById('exportProductsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // Для Git‑CMS экспорт в файл не имеет смысла — оставляем только для локального
        if (providerKind() !== 'localStorage') {
          showToast('Экспорт файла доступен только для LocalStorage');
          return;
        }
        exportLocalProducts();
        showToast('Экспорт завершён');
      });
    }

    // Import input
    const importInput = document.getElementById('importProductsInput');
    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          // Импорт файла поддерживаем только для LocalStorage
          if (providerKind() !== 'localStorage') {
            showToast('Импорт файла доступен только для LocalStorage');
            e.target.value = '';
            return;
          }
          const count = await importLocalProducts(file);
          showToast(`Импортировано ${count} товаров`);
          // Re-render products
          const merged = getMergedProducts();
          setProducts(merged);
          window.products = merged;
          renderProducts(lang, translations, merged);
        } catch (error) {
          showToast(`Ошибка импорта: ${error.message}`);
        }
        // Reset input
        e.target.value = '';
      });
    }

    // Git‑CMS settings panel bindings
    const providerSelect = document.getElementById('dataProviderSelect');
    const repoInp = document.getElementById('gitcmsRepo');
    const branchInp = document.getElementById('gitcmsBranch');
    const pathInp = document.getElementById('gitcmsPath');
    const tokenInp = document.getElementById('gitcmsToken');
    const saveBtn = document.getElementById('gitcmsSaveBtn');
  const loadBtn = document.getElementById('gitcmsLoadBtn');
  const pushBtn = document.getElementById('gitcmsPushBtn');

    // hydrate current values
    try {
      const currentPref = (localStorage.getItem('admin:dataProvider') || 'localStorage');
      if (providerSelect) providerSelect.value = currentPref;
      if (repoInp) repoInp.value = localStorage.getItem('admin:gitcms:repo') || '';
      if (branchInp) branchInp.value = localStorage.getItem('admin:gitcms:branch') || 'main';
      if (pathInp) pathInp.value = localStorage.getItem('admin:gitcms:path') || 'data/products.json';
      if (tokenInp) tokenInp.value = localStorage.getItem('admin:gitcms:token') || '';
    } catch {}

    providerSelect?.addEventListener('change', (ev) => {
      const v = ev.target.value;
      localStorage.setItem('admin:dataProvider', v);
      showToast(`Провайдер: ${v}`);
    });
    saveBtn?.addEventListener('click', () => {
      try {
        if (repoInp) localStorage.setItem('admin:gitcms:repo', repoInp.value.trim());
        if (branchInp) localStorage.setItem('admin:gitcms:branch', branchInp.value.trim() || 'main');
        if (pathInp) localStorage.setItem('admin:gitcms:path', pathInp.value.trim() || 'data/products.json');
        if (tokenInp) localStorage.setItem('admin:gitcms:token', tokenInp.value.trim());
        showToast('Настройки Git‑CMS сохранены');
      } catch (e) {
        console.error('Save gitcms settings error', e);
        showToast('Ошибка сохранения настроек Git‑CMS');
      }
    });

    // Git‑CMS: загрузить товары из Git в локальные (безопасно для оффлайна)
    loadBtn?.addEventListener('click', async () => {
      try {
        const p = getProvider();
        if (!p || p.kind !== 'gitcms' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          showToast('Git‑CMS не настроен');
          return;
        }
        const list = await p.loadAll();
        if (!Array.isArray(list)) {
          showToast('Не удалось загрузить товары');
          return;
        }
        saveLocalProducts(list);
        const merged = getMergedProducts();
        setProducts(merged);
        window.products = merged;
        renderProducts(lang, translations, merged);
        showToast(`Загружено из Git: ${list.length}`);
      } catch (e) {
        console.error('GitCMS load error', e);
        showToast('Ошибка загрузки из Git‑CMS');
      }
    });

    // Git‑CMS: записать локальные товары в Git (полная замена файла)
    pushBtn?.addEventListener('click', async () => {
      try {
        const p = getProvider();
        if (!p || p.kind !== 'gitcms' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          showToast('Git‑CMS не настроен');
          return;
        }
        const list = getLocalProducts();
        if (!list.length && !confirm('Локальный список пуст. Очистить удалённый файл в Git?')) return;
        await p.replaceAll(list, 'feat(admin): sync local products to git');
        showToast('Товары записаны в Git');
      } catch (e) {
        console.error('GitCMS push error', e);
        showToast('Ошибка записи в Git‑CMS');
      }
    });
  }

  // On init: cache initial products available on window (from products.js)
  try { window.__initialProducts = window.products || []; } catch {}

  // Log keyboard shortcut hint for developers
  console.log('💡 Admin mode: Press Ctrl+Shift+A to open admin login');
}

export default { initAdminProducts };
