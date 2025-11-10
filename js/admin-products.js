import * as Products from './products.js';
import { autoFlagColor } from './flags-color.js';

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
// Append or update a single product into data/products.json using File System Access API (Chromium-based browsers)
export async function appendProductToProductsJsonFS(product) {
  if (!product || typeof product !== 'object') throw new Error('Нет данных товара');
  const hasOpenPicker = typeof window !== 'undefined' && (window.showOpenFilePicker || window.showDirectoryPicker);
  if (!hasOpenPicker) throw new Error('File System Access API не поддерживается');

  async function pickProductsJsonFile() {
    // Try file picker first
    if (window.showOpenFilePicker) {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      const handle = Array.isArray(handles) ? handles[0] : handles;
      if (!handle) throw new Error('Файл не выбран');
      // Optional: warn if not products.json
      try { if (handle.name && !/products\.json$/i.test(handle.name)) {
        const ok = confirm('Вы выбрали не products.json. Продолжить запись в выбранный файл?');
        if (!ok) throw new Error('Отменено пользователем');
      } } catch {}
      return handle;
    }
    // Fallback: pick directory and create/get products.json inside
    const dir = await window.showDirectoryPicker();
    const fileHandle = await dir.getFileHandle('products.json', { create: true });
    return fileHandle;
  }

  function mergeOne(list, item) {
    const arr = Array.isArray(list) ? [...list] : [];
    const idKey = String(item.id || '').trim();
    const skuKey = String(item.sku || '').trim().toLowerCase();
    const byId = idKey ? arr.findIndex(p => String(p.id) === idKey) : -1;
    const bySku = skuKey ? arr.findIndex(p => String(p.sku || '').toLowerCase() === skuKey) : -1;
    const now = new Date().toISOString();
    const normalized = { ...item, updatedAt: now };
    if (byId >= 0) {
      arr[byId] = { ...arr[byId], ...normalized, updatedAt: now };
      return arr;
    }
    if (bySku >= 0) {
      arr[bySku] = { ...arr[bySku], ...normalized, updatedAt: now };
      return arr;
    }
    arr.push({ ...normalized, createdAt: item.createdAt || now });
    return arr;
  }

  const fileHandle = await pickProductsJsonFile();
  // Request write permission
  if (fileHandle.requestPermission) {
    const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Нет разрешения на запись файла');
  }
  const file = await fileHandle.getFile();
  let text = '';
  try { text = await file.text(); } catch {}
  let data;
  try { data = JSON.parse(text || '[]'); } catch { data = []; }
  const merged = mergeOne(data, product);
  const pretty = JSON.stringify(merged, null, 2) + '\n';
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(new Blob([pretty], { type: 'application/json' }));
  } finally {
    await writable.close();
  }
  return { ok: true, count: merged.length };
}

// Save selected image file into picture/conditioners via File System Access API and return relative path
export async function saveMainImageToPictureConditionersFS(file, filenameSuggestion = '') {
  if (!(file instanceof File)) throw new Error('Файл изображения не найден');
  if (!('showDirectoryPicker' in window)) throw new Error('File System Access API не поддерживается');
  // Ask user to pick the target directory (recommend picking the repo's picture/conditioners)
  const dirHandle = await window.showDirectoryPicker({
    // startIn is a hint; may be ignored by browser
    id: 'pick-picture-conditioners-dir'
  });
  // Optionally ensure directory name ends with 'conditioners'
  try {
    // We cannot read real path, so we warn by file name suggestion instead
    // noop
  } catch {}
  // Sanitize filename
  const safe = (name) => name
    .normalize('NFKD')
    .replace(/[^\w\-\.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-\.]+|[-\.]+$/g, '')
    .toLowerCase();
  const origName = file.name || 'image.jpg';
  const extNoDot = (origName.includes('.') ? origName.split('.').pop() : 'jpg')?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const extWithDot = `.${extNoDot}`;
  // Имя файла оставляем как у источника (sanitize), без принудительного переименования по SKU
  const base = origName.slice(0, Math.max(0, origName.lastIndexOf('.')));
  let fn = safe(base) || `img-${Date.now()}`;
  fn = `${fn}${extWithDot}`;
  // Write original file
  const origHandle = await dirHandle.getFileHandle(fn, { create: true });
  const origWritable = await origHandle.createWritable();
  try {
    await origWritable.write(await file.arrayBuffer());
  } finally {
    await origWritable.close();
  }

  // Try to generate responsive variants: только оригинальный формат (320,480,768,1200)
  try {
    const sizes = [320, 480, 768, 1200];
    const mimeForExt = (e) => {
      if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
      if (e === '.png') return 'image/png';
      if (e === '.webp') return 'image/webp';
      if (e === '.avif') return 'image/avif';
      return 'image/jpeg';
    };
    const srcMime = mimeForExt(extWithDot);
    const blob = file;
    let bitmap = null;
    try {
      if ('createImageBitmap' in window) {
        bitmap = await createImageBitmap(blob);
      }
    } catch {}
    if (!bitmap) {
      const imgUrl = URL.createObjectURL(blob);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imgUrl;
      });
      // draw helper to canvas
      const drawToCanvas = (w) => {
        const scale = Math.min(1, w / img.naturalWidth);
        const cw = Math.round(img.naturalWidth * scale);
        const ch = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cw, ch);
        return canvas;
      };
      const toBlob = (canvas, type, quality) => new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), type, quality));
      // Derive name base and extension from final filename
      const dotPos = fn.lastIndexOf('.');
      const nameBase = dotPos >= 0 ? fn.slice(0, dotPos) : fn;
      const extDot = dotPos >= 0 ? fn.slice(dotPos) : extWithDot;
      // Generate per-size variants: оригинальный формат
      for (const w of sizes) {
        const canvas = drawToCanvas(w);
        try {
          const outBlob = await toBlob(canvas, srcMime, 0.9);
          const h = await dirHandle.getFileHandle(`${nameBase}-${w}w${extDot}`, { create: true });
          const wr = await h.createWritable(); await wr.write(outBlob); await wr.close();
        } catch {}
      }
      // LQIP отключён
    } else {
      // createImageBitmap path using OffscreenCanvas if available
      const drawBitmap = (bm, w) => {
        const scale = Math.min(1, w / bm.width);
        const cw = Math.round(bm.width * scale);
        const ch = Math.round(bm.height * scale);
        let canvas;
        if ('OffscreenCanvas' in window) canvas = new OffscreenCanvas(cw, ch);
        else { canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch; }
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bm, 0, 0, cw, ch);
        return canvas;
      };
      const toBlob = (canvas, type, quality) => new Promise((res, rej) => {
        if (canvas.convertToBlob) {
          canvas.convertToBlob({ type, quality }).then(res).catch(() => {
            try { canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), type, quality); } catch (e) { rej(e); }
          });
        } else {
          try { canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), type, quality); } catch (e) { rej(e); }
        }
      });
      const dotPos = fn.lastIndexOf('.');
      const nameBase = dotPos >= 0 ? fn.slice(0, dotPos) : fn;
      const extDot = dotPos >= 0 ? fn.slice(dotPos) : extWithDot;
      for (const w of sizes) {
        const canvas = drawBitmap(bitmap, w);
        try {
          const outBlob = await toBlob(canvas, srcMime, 0.9);
          const h = await dirHandle.getFileHandle(`${nameBase}-${w}w${extDot}`, { create: true });
          const wr = await h.createWritable(); await wr.write(outBlob); await wr.close();
        } catch {}
      }
      // LQIP отключён
      try { bitmap.close && bitmap.close(); } catch {}
    }
  } catch (e) {
    console.warn('Responsive generation failed, you can run npm run images:gen later', e);
  }

  // Return relative repo path expectation (base file path)
  return `picture/conditioners/${fn}`;
}

// Save a set of images (FileList or Array<File>) into picture/conditioners with one directory pick
export async function saveImagesSetToPictureConditionersFS(files, baseSuggestion = '') {
  const arr = Array.from(files || []).filter(f => f instanceof File);
  if (!arr.length) throw new Error('Файлы изображений не выбраны');
  if (!('showDirectoryPicker' in window)) throw new Error('File System Access API не поддерживается');
  const dirHandle = await window.showDirectoryPicker({ id: 'pick-picture-conditioners-dir' });

  const safe = (name) => String(name || '')
    .normalize('NFKD')
    .replace(/[^\w\-\.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[\-\.]+|[\-\.]+$/g, '')
    .toLowerCase();

  const results = [];
  for (let i = 0; i < arr.length; i++) {
    const file = arr[i];
    const origName = file.name || `image-${i+1}.jpg`;
    const extNoDot = (origName.includes('.') ? origName.split('.').pop() : 'jpg')?.replace(/[^a-z0-9]/gi,'').toLowerCase() || 'jpg';
    const extWithDot = `.${extNoDot}`;
    // Сохраняем оригинальное имя (sanitize), без переименования по SKU
    const base = origName.slice(0, Math.max(0, origName.lastIndexOf('.')));
    let fn = `${safe(base)}${extWithDot}`;

    // write original
    const fileHandle = await dirHandle.getFileHandle(fn, { create: true });
    const writable = await fileHandle.createWritable();
    try { await writable.write(await file.arrayBuffer()); } finally { await writable.close(); }

    // generate variants в оригинальном формате
    try {
      const imgUrl = URL.createObjectURL(file);
      const image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = imgUrl; });
      const sizes = [320, 480, 768, 1200];
      const draw = (w) => { const scale = Math.min(1, w / image.naturalWidth); const cw = Math.round(image.naturalWidth * scale); const ch = Math.round(image.naturalHeight * scale); const c = document.createElement('canvas'); c.width=cw; c.height=ch; const ctx=c.getContext('2d'); ctx.imageSmoothingQuality='high'; ctx.drawImage(image,0,0,cw,ch); return c; };
      const toBlob = (canvas, type, quality) => new Promise((res, rej) => canvas.toBlob(b => b?res(b):rej(new Error('encode failed')), type, quality));
      const dot = fn.lastIndexOf('.'); const nameBase = dot >= 0 ? fn.slice(0,dot) : fn;
      const srcMime = (extWithDot === '.png') ? 'image/png' : (extWithDot === '.webp' ? 'image/webp' : 'image/jpeg');
      for (const w of sizes) {
        try {
          const canvas = draw(w);
          const blob = await toBlob(canvas, srcMime, 0.9);
          const h = await dirHandle.getFileHandle(`${nameBase}-${w}w${extWithDot}`, { create: true });
          const wr = await h.createWritable(); await wr.write(blob); await wr.close();
        } catch {}
      }
    } catch {}

    results.push(`picture/conditioners/${fn}`);
  }

  return results;
}

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
  // Safe wrappers for test/mocked environments
  const getProductsApiFn = (key) => { try { return Products[key]; } catch { return undefined; } };
  const isAdmin = () => {
    const fromWin = (typeof window !== 'undefined' && typeof window.isAdminMode === 'function') ? window.isAdminMode : undefined;
    const fromMod = getProductsApiFn('isAdminMode');
    const fn = fromWin || fromMod;
    return typeof fn === 'function' ? fn() : false;
  };
  const enableAdmin = () => {
    const fromWin = (typeof window !== 'undefined' && typeof window.enableAdminMode === 'function') ? window.enableAdminMode : undefined;
    const fromMod = getProductsApiFn('enableAdminMode');
    const fn = fromWin || fromMod;
    if (typeof fn === 'function') fn();
  };
  const disableAdmin = () => {
    const fromWin = (typeof window !== 'undefined' && typeof window.disableAdminMode === 'function') ? window.disableAdminMode : undefined;
    const fromMod = getProductsApiFn('disableAdminMode');
    const fn = fromWin || fromMod;
    if (typeof fn === 'function') fn();
  };
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
    isAdminMode: isAdmin()
  });

  // Show/hide admin login button based on admin mode
  function updateAdminControlsVisibility() {
    const adminLink = document.getElementById('adminPageLink');

    if (adminLink) {
      adminLink.style.display = isAdmin() ? 'inline-block' : 'none';
    }
  }

  // Initialize admin controls visibility
  updateAdminControlsVisibility();

  // Header admin toggle button (simple enable/disable without password)
  const adminToggleBtn = document.getElementById('adminToggleBtn');
  function reflectAdminToggleBtn() {
    if (!adminToggleBtn) return;
    const on = isAdmin();
    adminToggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    adminToggleBtn.textContent = on ? 'Admin: ON' : 'Admin';
    adminToggleBtn.title = on ? 'Отключить админ-режим' : 'Включить админ-режим';
  }
  reflectAdminToggleBtn();
  if (adminToggleBtn) {
    adminToggleBtn.addEventListener('click', () => {
      if (!isAdmin()) {
        enableAdmin();
        showToast('Админ‑режим включён');
      } else {
        disableAdmin();
        showToast('Админ‑режим выключен');
      }
      // обновить видимость контролов и перерендерить каталог,
      // чтобы показать/скрыть админские кнопки на карточках
      updateAdminControlsVisibility();
      reflectAdminToggleBtn();
      const merged = Products.getMergedProducts();
      Products.setProducts(merged);
      window.products = merged;
      Products.renderProducts(lang, translations, merged);
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
      console.log('Admin shortcut triggered, isAdminMode:', isAdmin(), 'loginModal exists:', !!loginModal);

      if (!isAdmin() && loginModal) {
        console.log('Opening admin login modal');
        loginModal.style.display = 'flex';
        console.log('Modal display style set to flex, computed style:', getComputedStyle(loginModal).display);
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
          passwordInput.focus();
          console.log('Focused password input');
        }
        showToast('Режим администратора: введите пароль (Ctrl+Alt+A)', 2000);
      } else if (isAdmin()) {
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
  enableAdmin();
        updateAdminControlsVisibility();
        showToast('Вход выполнен успешно');
        if (loginModal) {
          console.log('Closing admin login modal after successful login');
          loginModal.style.display = 'none';
          console.log('Modal display style set to none');
        }
        loginForm.reset();

  // Re-render products to show admin controls
  const merged = Products.getMergedProducts();
  Products.setProducts(merged);
        window.products = merged;
  Products.renderProducts(lang, translations, merged);
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
  // Кнопки управления в хедере (Add Product / Clear Products) убраны как дублирующие админ‑страницу

  const closeBtn = document.getElementById('adminProductModalClose');
  const cancelBtn = document.getElementById('adminProductCancel');
  const fileInput = form ? form.querySelector('input[name="image"]') : null;
  const preview = document.getElementById('adminImagePreview');
  const flagSelector = document.getElementById('flagSelector');
  const availableFlagsContainer = document.getElementById('availableFlags');
  const selectedFlagsContainer = document.getElementById('selectedFlags');
  const flagsHiddenInput = form ? form.querySelector('input[name="_flags"]') : null;

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
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'flag-default-color';
      colorInput.value = defaults[key] || autoFlagColor(key);
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
        cur.push({ key, color: colorInput.value || autoFlagColor(key) });
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
        const cur = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => ({ key: el.getAttribute('data-flag-key'), color: el.getAttribute('data-flag-color') || autoFlagColor(el.getAttribute('data-flag-key')) }));
        cur.push({ key, color: autoFlagColor(key) });
        renderSelectedFlags(cur);
      });
      availableFlagsContainer.appendChild(btn);
    });
  }

  // Initialize flag selector UI
  initFlagSelector();

  // Модальное окно добавления из хедера удалено; используем полноценную страницу админки

  // Очистка локальных товаров доступна через админ‑страницу; отдельно в хедере не отображается

  // preview image
  fileInput?.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      preview.innerHTML = `<img src="${ev.target.result}" alt="preview" style="max-width:200px;max-height:120px;"/>`;
      // set hidden input value to base64 image for localStorage
      const hidden = form ? form.querySelector('input[name="_image_data"]') : null;
      if (!hidden) {
        if (form) { const inp = document.createElement('input'); inp.type = 'hidden'; inp.name = '_image_data'; inp.value = ev.target.result; form.appendChild(inp); }
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

  form?.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const data = new FormData(form);
    // parse flags
    let flags = [];
    try { flags = JSON.parse(data.get('_flags') || '[]'); } catch(_) { flags = []; }
    // parse specs from textarea(s)
    function parseSpecs(textRu = '', textUk = '') {
      const lines = String(textRu || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const arr = lines.map(line => {
        const m = line.split(/\s*[:\-–—]\s*/);
        const key = (m.shift() || '').trim();
        const valRu = (m.join(' - ').trim()) || '';
        const valUk = (String(textUk).split(/\r?\n/).find(l => l.trim().startsWith(key + ':')) || '').split(/\s*[:\-–—]\s*/).slice(1).join(' - ').trim();
        return key && (valRu || valUk) ? { key, value: { ru: valRu || valUk, uk: valUk || valRu } } : null;
      }).filter(Boolean);
      return arr;
    }
    const specs = parseSpecs(data.get('specs_ru') || '', data.get('specs_uk') || '');
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
      specs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Bridge to ProductSchema shape (non-breaking: дополняем, не ломая текущий рендер)
    try {
      // categories as slugs[] — пока кладём один выбранный slug
      product.categories = Array.isArray(product.categories) ? product.categories : [product.category].filter(Boolean);
      // imagesV2: расширенный формат с alt i18n (не трогаем product.images как массив строк)
      const altUk = product.name?.uk || '';
      const altRu = product.name?.ru || '';
      product.imagesV2 = product.image ? [{ src: product.image, alt: { uk: altUk, ru: altRu, en: '' }, featured: true }] : [];
    } catch (_) { /* noop */ }

    // Валидация против ProductSchema, если доступна
    try {
      const validate = (typeof window !== 'undefined' && typeof window.validateProduct === 'function') ? window.validateProduct : null;
      if (validate) {
        const candidate = {
          id: product.id,
          sku: product.sku,
          categories: Array.isArray(product.categories) ? product.categories : [product.category].filter(Boolean),
          name: { uk: product.name?.uk || '', ru: product.name?.ru || '', en: '' },
          shortDesc: { uk: product.description?.uk || '', ru: product.description?.ru || '', en: '' },
          fullDesc: { uk: '', ru: '', en: '' },
          price: Number.isFinite(product.price) ? product.price : 0,
          inStock: !!product.inStock,
          images: (product.image ? [{ src: product.image, alt: { uk: product.name?.uk || '', ru: product.name?.ru || '', en: '' }, featured: true }] : [])
        };
        // Собираем существующие id/sku для проверки уникальности
  const mergedForUniq = (function(){ try { return Products.getMergedProducts(); } catch { return []; } })();
        const existingIds = new Set(mergedForUniq.map(p => String(p.id)).filter(id => id !== String(candidate.id)));
        const existingSkus = new Set(mergedForUniq.map(p => String(p.sku || '')).filter(s => s && s !== String(candidate.sku)));
        const res = validate(candidate, { existingIds, existingSkus });
        if (!res.valid) {
          const errs = res.errors || {};
          const msg = Object.values(errs).join('; ') || 'Ошибка валидации';
          showToast(msg);
          return; // Прерываем сохранение
        }
      }
    } catch (e) {
      // Не блокируем сохранение, если валидатор недоступен
    }

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
      const merged = Products.getMergedProducts();
      // обновляем модульное состояние и глобальную переменную для вспомогательных модулей
      Products.setProducts(merged);
      window.products = merged;
      Products.renderProducts(lang, translations, merged);
    } catch (err) { console.error('render error', err); }
    // На админ‑странице форма остаётся открытой; здесь модалки нет
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
    // specs backfill
    try {
      const list = Array.isArray(product.specs) ? product.specs : [];
      const ru = list.map(s => `${s.key}: ${(s.value && (s.value.ru || s.value.uk || ''))}`).join('\n');
      const uk = list.map(s => `${s.key}: ${(s.value && (s.value.uk || s.value.ru || ''))}`).join('\n');
      const ruEl = form.querySelector('textarea[name="specs_ru"]');
      const ukEl = form.querySelector('textarea[name="specs_uk"]');
      if (ruEl) ruEl.value = ru;
      if (ukEl) ukEl.value = uk;
    } catch {}
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
            specs_ru: (Array.isArray(prod.specs) ? prod.specs.map(s => `${s.key}: ${(s.value && (s.value.ru || s.value.uk || ''))}`).join('\n') : ''),
            specs_uk: (Array.isArray(prod.specs) ? prod.specs.map(s => `${s.key}: ${(s.value && (s.value.uk || s.value.ru || ''))}`).join('\n') : ''),
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
  const merged = Products.getMergedProducts();
  Products.setProducts(merged);
  window.products = merged;
  Products.renderProducts(lang, translations, merged);
      showToast('Товар удалён');
    }
  });

  // Admin controls visibility and handlers
  const adminControls = document.getElementById('adminControls');
  if (adminControls) {
    adminControls.style.display = isAdmin() ? 'flex' : 'none';

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
          const merged = Products.getMergedProducts();
          Products.setProducts(merged);
          window.products = merged;
          Products.renderProducts(lang, translations, merged);
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
  const mergeBtn = document.getElementById('gitcmsMergeBtn');
  const statusEl = document.getElementById('gitcmsStatus');

    // i18n helper
    const tr = (key, vars) => {
      let s = (translations && translations[lang] && translations[lang][key]) ?? (translations && translations.ru && translations.ru[key]) ?? '';
      if (vars && typeof vars === 'object') {
        for (const [k, v] of Object.entries(vars)) s = String(s).replaceAll(`{{${k}}}`, String(v));
      }
      return s;
    };

    function setGitStatus(text, isError = false) {
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.style.color = isError ? 'var(--color-danger, #c0392b)' : 'inherit';
    }
    function withLoading(btn, fn, statusText) {
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      if (statusEl) {
        statusEl.innerHTML = `<span class="spinner spinner--inline" aria-hidden="true"></span> ${statusText || ''}`;
      }
      return Promise.resolve()
        .then(fn)
        .finally(() => { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } });
    }

    // hydrate current values
    try {
      const currentPref = (localStorage.getItem('admin:dataProvider') || 'localStorage');
      if (providerSelect) providerSelect.value = currentPref;
  // Prefill repo with current project as a sensible default if nothing saved yet
  if (repoInp) repoInp.value = localStorage.getItem('admin:gitcms:repo') || 'SashaSerh/Progect-shop';
      if (branchInp) branchInp.value = localStorage.getItem('admin:gitcms:branch') || 'main';
      if (pathInp) pathInp.value = localStorage.getItem('admin:gitcms:path') || 'data/products.json';
      if (tokenInp) tokenInp.value = localStorage.getItem('admin:gitcms:token') || '';
    } catch {}

    function updateGitButtonsEnabled() {
      const v = (providerSelect && providerSelect.value) || (localStorage.getItem('admin:dataProvider') || 'localStorage');
      const isGit = v === 'gitcms';
      [loadBtn, pushBtn, mergeBtn].forEach(btn => { if (btn) { btn.disabled = !isGit; btn.title = isGit ? '' : 'Доступно только для Git‑CMS'; } });
      if (statusEl) statusEl.textContent = '';
    }
    providerSelect?.addEventListener('change', (ev) => {
      const v = ev.target.value;
      localStorage.setItem('admin:dataProvider', v);
      updateGitButtonsEnabled();
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

  // Initialize buttons enabled state
  updateGitButtonsEnabled();

    // Git‑CMS: загрузить товары из Git в локальные (безопасно для оффлайна)
    loadBtn?.addEventListener('click', async () => {
      await withLoading(loadBtn, async () => {
        try {
        const p = getProvider();
        if (!p || p.kind !== 'gitcms' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          setGitStatus(tr('git-not-configured') || 'Git‑CMS не настроен', true);
          showToast('Git‑CMS не настроен');
          return;
        }
        setGitStatus(tr('git-loading') || 'Загрузка…');
        const list = await p.loadAll();
        if (!Array.isArray(list)) {
          setGitStatus(tr('git-load-failed') || 'Не удалось загрузить товары', true);
          showToast('Не удалось загрузить товары');
          return;
        }
        saveLocalProducts(list);
  const merged = Products.getMergedProducts();
  Products.setProducts(merged);
  window.products = merged;
  Products.renderProducts(lang, translations, merged);
        setGitStatus(tr('git-load-success', { count: list.length }) || `Загружено: ${list.length}`);
        showToast(`Загружено из Git: ${list.length}`);
      } catch (e) {
        console.error('GitCMS load error', e);
        setGitStatus((tr('git-error') || 'Ошибка') + `: ${e?.message || e}`, true);
        showToast('Ошибка загрузки из Git‑CMS');
      }
      });
    });

    // Git‑CMS: записать локальные товары в Git (полная замена файла)
    pushBtn?.addEventListener('click', async () => {
      await withLoading(pushBtn, async () => {
        try {
        const p = getProvider();
        if (!p || p.kind !== 'gitcms' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          setGitStatus(tr('git-not-configured') || 'Git‑CMS не настроен', true);
          showToast('Git‑CMS не настроен');
          return;
        }
        const list = getLocalProducts();
        if (!list.length && !confirm('Локальный список пуст. Очистить удалённый файл в Git?')) return;
        setGitStatus(tr('git-pushing') || 'Запись…');
        await p.replaceAll(list, 'feat(admin): sync local products to git');
        setGitStatus(tr('git-push-success') || 'Записано');
        showToast('Товары записаны в Git');
      } catch (e) {
        console.error('GitCMS push error', e);
        setGitStatus((tr('git-error') || 'Ошибка') + `: ${e?.message || e}`, true);
        showToast('Ошибка записи в Git‑CMS');
      }
      });
    });

    // Smart merge: load from git and merge into local with conflict detection
    mergeBtn?.addEventListener('click', async () => {
      await withLoading(mergeBtn, async () => {
        try {
          const p = getProvider();
          if (!p || p.kind !== 'gitcms' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
            setGitStatus(tr('git-not-configured') || 'Git‑CMS не настроен', true);
            showToast('Git‑CMS не настроен');
            return;
          }
          setGitStatus(tr('git-loading') || 'Загрузка…');
          const remote = await p.loadAll();
          if (!Array.isArray(remote)) {
            setGitStatus(tr('git-load-failed') || 'Не удалось загрузить товары', true);
            return;
          }
          const local = getLocalProducts();
          const byId = new Map(local.map(p => [String(p.id), p]));
          const bySku = new Map(local.filter(p => p.sku).map(p => [String(p.sku).toLowerCase(), p]));

          const conflicts = {};
          let added = 0, updated = 0, conflicted = 0;
          const result = [...local];
          const upsert = (item) => {
            const idKey = String(item.id);
            const skuKey = String(item.sku || '').toLowerCase();
            const idMatch = byId.get(idKey);
            const skuMatch = skuKey ? bySku.get(skuKey) : null;
            if (idMatch && skuMatch && idMatch.id !== skuMatch.id) {
              // id and sku refer to different local items — conflict
              conflicts[idKey] = conflicts[idKey] ? 'both' : 'both';
              conflicted++;
              return; // skip merge for this item
            }
            if (idMatch) {
              // Update existing by ID
              const idx = result.findIndex(p => String(p.id) === idKey);
              if (idx >= 0) { result[idx] = { ...idMatch, ...item, updatedAt: new Date().toISOString() }; updated++; }
            } else if (skuMatch) {
              // IDs differ but same SKU — treat as update, but mark conflict on ID
              const idx = result.findIndex(p => String(p.id) === String(skuMatch.id));
              if (idx >= 0) { result[idx] = { ...skuMatch, ...item, updatedAt: new Date().toISOString() }; updated++; }
              conflicts[String(skuMatch.id)] = 'id';
              conflicted++;
            } else {
              // New item
              result.push(item);
              added++;
            }
          };
          // Persist last remote snapshot for conflict resolution UI
          try {
            const byIdObj = Object.fromEntries(remote.filter(r => r && r.id).map(r => [String(r.id), r]));
            const bySkuObj = Object.fromEntries(remote.filter(r => r && r.sku).map(r => [String(r.sku).toLowerCase(), r]));
            localStorage.setItem('admin:merge:lastRemoteById', JSON.stringify(byIdObj));
            localStorage.setItem('admin:merge:lastRemoteBySku', JSON.stringify(bySkuObj));
          } catch {}

          remote.forEach(upsert);
          saveLocalProducts(result);
          try { localStorage.setItem('admin:merge:conflicts', JSON.stringify(conflicts)); } catch {}

          const merged = Products.getMergedProducts();
          Products.setProducts(merged); window.products = merged; Products.renderProducts(lang, translations, merged);
          setGitStatus(tr('git-merge-result', { added, updated, conflicts: conflicted }) || `Добавлено: ${added}, Обновлено: ${updated}, Конфликты: ${conflicted}`);
          showToast('Слияние завершено');
        } catch (e) {
          console.error('GitCMS merge error', e);
          setGitStatus((tr('git-error') || 'Ошибка') + `: ${e?.message || e}`, true);
          showToast('Ошибка слияния');
        }
      });
    });
  }

  // On init: cache initial products available on window (from products.js)
  try { window.__initialProducts = window.products || []; } catch {}

  // Log keyboard shortcut hint for developers
  console.log('💡 Admin mode: Press Ctrl+Shift+A to open admin login');
}

export default { initAdminProducts };
