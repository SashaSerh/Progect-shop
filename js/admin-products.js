import { renderProducts, getMergedProducts, setProducts } from './products.js';

const STORAGE_KEY = 'products_local_v1';

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

export function initAdminProducts(translations, lang = 'ru') {
  const modal = document.getElementById('adminProductModal');
  const form = document.getElementById('adminProductForm');
  // small toast helper
  const toastHost = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div'); el.id = 'toast-container'; document.body.appendChild(el); return el;
  })();
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Add Product';
  openBtn.className = 'btn btn--primary header-add-product';
  openBtn.type = 'button';
  // Кнопка очистки локальных товаров
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Products';
  clearBtn.className = 'btn btn--ghost header-clear-products';
  clearBtn.type = 'button';
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
  }
  function closeModal() {
    modal.style.display = 'none';
    form.reset();
    preview.innerHTML = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Очистка локальных товаров
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

  form.addEventListener('submit', (evt) => {
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
    upsertLocalProduct(product);
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
        fillFormWithProduct(prod);
        modal.style.display = 'flex';
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

  // On init: cache initial products available on window (from products.js)
  try { window.__initialProducts = window.products || []; } catch {}
}

export default { initAdminProducts };
