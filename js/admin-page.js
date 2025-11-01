import { getLocalProducts, saveLocalProducts, upsertLocalProduct, exportLocalProducts, importLocalProducts } from './admin-products.js';
import { autoFlagColor } from './flags-color.js';
import { getMergedProducts, setProducts, renderProducts } from './products.js';
import { mergeProduct, computeDiff } from './merge-utils.js';

const DRAFT_KEY = 'admin:product:draft:v1';

export async function initAdminPage(translations, lang = 'ru') {
  const t = (key, vars) => {
    let s = (translations && translations[lang] && translations[lang][key]) ?? (translations && translations.ru && translations.ru[key]) ?? key;
    if (vars && typeof vars === 'object') {
      for (const [k, v] of Object.entries(vars)) {
        s = String(s).replaceAll(`{{${k}}}`, String(v));
      }
    }
    return s;
  };
  const listEl = document.getElementById('adminLocalProductsList');
  const form = document.getElementById('adminProductForm');
  const preview = document.getElementById('adminImagePreview');
  const availableFlagsContainer = document.getElementById('availableFlags');
  const selectedFlagsContainer = document.getElementById('selectedFlags');
  const flagsHiddenInput = form?.querySelector('input[name="_flags"]');
  const exportBtn = document.getElementById('adminExportBtn');
  const importInput = document.getElementById('adminImportInput');
  const clearConflictsBtn = document.getElementById('clearConflictsBtn');

  function showToast(text) {
    const host = document.getElementById('toast-container');
    if (!host) return;
    const n = document.createElement('div');
    n.className = 'toast toast--success';
    n.textContent = text;
    host.appendChild(n);
    requestAnimationFrame(() => n.classList.add('is-visible'));
    setTimeout(() => { n.classList.remove('is-visible'); setTimeout(()=>n.remove(), 280); }, 2200);
  }

  function renderList() {
    if (!listEl) return;
    let conflictMap = {};
    try { conflictMap = JSON.parse(localStorage.getItem('admin:merge:conflicts') || '{}') || {}; } catch {}
    let remoteById = {}; let remoteBySku = {};
    try { remoteById = JSON.parse(localStorage.getItem('admin:merge:lastRemoteById') || '{}') || {}; } catch {}
    try { remoteBySku = JSON.parse(localStorage.getItem('admin:merge:lastRemoteBySku') || '{}') || {}; } catch {}
    const items = getLocalProducts();
    if (!items.length) {
      listEl.innerHTML = `<li class="admin-list__empty">${t('admin-list-empty')}</li>`;
      return;
    }
    listEl.innerHTML = '';
    items.forEach(p => {
      const li = document.createElement('li');
      const pid = String(p.id);
      const conf = conflictMap[pid];
      const conflictBadge = conf ? `<span class="admin-badge admin-badge--conflict">${conf === 'both' ? t('admin-conflict-both') : (conf === 'sku' ? t('admin-conflict-sku') : t('admin-conflict-id'))}</span>` : '';
      const actions = conf ? `
        <div class="admin-conflict-actions" data-id="${pid}" data-type="${conf}">
          <button type="button" class="btn btn--tiny" data-act="conf-merge">${t('admin-conf-merge')}</button>
          <button type="button" class="btn btn--tiny" data-act="conf-keep-local">${t('admin-conf-keep-local')}</button>
          <button type="button" class="btn btn--tiny btn--danger" data-act="conf-replace-git">${t('admin-conf-replace-git')}</button>
        </div>` : '';
      li.innerHTML = `
        <div class="admin-list__meta">
          <div class="admin-list__meta-title">${(p.name?.[lang] || p.name?.ru || '').slice(0,120) || t('admin-untitled')} ${conflictBadge}</div>
          <div class="admin-list__meta-sub">ID: ${p.id} · SKU: ${p.sku || '—'}</div>
        </div>
        <div class="admin-list__actions">
          <button type="button" data-act="edit" data-id="${p.id}" class="btn btn--small">${t('admin-edit')}</button>
          <button type="button" data-act="del" data-id="${p.id}" class="btn btn--danger btn--small">${t('admin-delete')}</button>
        </div>`;
      const wrap = document.createElement('div');
      wrap.appendChild(li);
      if (conf) {
        // attach conflict actions UI
        const cont = document.createElement('div');
        cont.innerHTML = actions + ` <button type="button" class="btn btn--tiny" data-act="conf-show-diff">${t('admin-conf-show-diff')}</button>`;
        wrap.appendChild(cont);
      }
      listEl.appendChild(wrap);
    });

    // bind conflict actions
    listEl.querySelectorAll('.admin-conflict-actions').forEach(box => {
      box.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const id = box.getAttribute('data-id');
        const type = box.getAttribute('data-type');
        const localList = getLocalProducts();
        const idx = localList.findIndex(p => String(p.id) === String(id));
        if (idx < 0) return;
        const localItem = localList[idx];
        const remoteItem = remoteById[id] || (localItem?.sku ? remoteBySku[String(localItem.sku).toLowerCase()] : null);
        const act = btn.getAttribute('data-act');
        if (act === 'conf-show-diff') {
          if (!remoteItem) return;
          const diffs = computeDiff(localItem, remoteItem);
          const modal = document.getElementById('conflictDiffModal');
          const content = document.getElementById('conflictDiffContent');
          if (modal && content) {
            content.innerHTML = renderDiffTable(diffs);
            modal.style.display = 'flex';
            modal.querySelector('.modal__close')?.focus();
          }
          return;
        } else if (act === 'conf-keep-local') {
          delete conflictMap[id];
          saveLocalProducts(localList);
        } else if (act === 'conf-replace-git') {
          if (remoteItem) {
            const keptId = localItem.id; // preserve current ID
            localList[idx] = { ...remoteItem, id: keptId, updatedAt: new Date().toISOString() };
            delete conflictMap[id];
            saveLocalProducts(localList);
          }
        } else if (act === 'conf-merge') {
          if (remoteItem) {
            localList[idx] = mergeProduct(localItem, remoteItem);
            delete conflictMap[id];
            saveLocalProducts(localList);
          }
        }
        try { localStorage.setItem('admin:merge:conflicts', JSON.stringify(conflictMap)); } catch {}
        renderList();
        try {
          const mergedAll = getMergedProducts(); setProducts(mergedAll); window.products = mergedAll; renderProducts(lang, translations, mergedAll);
        } catch {}
      });
    });
  }

  function serializeSelectedFlags() {
    if (!selectedFlagsContainer || !flagsHiddenInput) return;
    const items = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => ({ key: el.getAttribute('data-flag-key'), color: el.getAttribute('data-flag-color') || '' }));
    flagsHiddenInput.value = JSON.stringify(items);
  }
  function renderSelectedFlags(list) {
    if (!selectedFlagsContainer) return;
    selectedFlagsContainer.innerHTML = '';
    list.forEach(item => {
      const key = typeof item === 'string' ? item : (item?.key || '');
      const color = (typeof item === 'object' && item?.color) ? item.color : '#007aff';
      const wrap = document.createElement('div');
      wrap.className = 'selected-flag';
      wrap.setAttribute('data-flag-key', key);
      wrap.setAttribute('data-flag-color', color);
  wrap.innerHTML = `<span class="selected-flag__label">${key}</span>
        <input type="color" class="selected-flag__color" value="${color}">
        <button type="button" class="selected-flag__remove" aria-label="${t('admin-selected-flag-remove-aria')}">✕</button>`;
      wrap.querySelector('.selected-flag__remove').addEventListener('click', () => { wrap.remove(); serializeSelectedFlags(); });
      wrap.querySelector('.selected-flag__color').addEventListener('input', (e) => { wrap.setAttribute('data-flag-color', e.target.value); serializeSelectedFlags(); });
      selectedFlagsContainer.appendChild(wrap);
    });
    serializeSelectedFlags();
  }
  function initFlagSelector() {
    if (!availableFlagsContainer) return;
    const dict = (translations && translations[lang] && translations[lang].flags) || {};
    availableFlagsContainer.innerHTML = '';
    Object.keys(dict).forEach(key => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flag-chip';
      btn.textContent = dict[key] || key;
      btn.addEventListener('click', () => {
        const exists = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).some(el => el.getAttribute('data-flag-key') === key);
        if (exists) return;
        const cur = Array.from(selectedFlagsContainer.querySelectorAll('.selected-flag')).map(el => ({ key: el.getAttribute('data-flag-key'), color: el.getAttribute('data-flag-color') || autoFlagColor(el.getAttribute('data-flag-key')) }));
        cur.push({ key, color: autoFlagColor(key) });
        renderSelectedFlags(cur);
      });
      availableFlagsContainer.appendChild(btn);
    });
  }

  function fillForm(p) {
    if (!form) return;
    form.reset();
    preview.innerHTML = '';
    form.querySelector('[name="id"]').value = p.id || '';
    form.querySelector('[name="title_ru"]').value = p.name?.ru || '';
    form.querySelector('[name="title_uk"]').value = p.name?.uk || '';
    form.querySelector('[name="description_ru"]').value = p.description?.ru || '';
    form.querySelector('[name="description_uk"]').value = p.description?.uk || '';
    form.querySelector('[name="price"]').value = Number(p.price||0) || 0;
    form.querySelector('[name="sku"]').value = p.sku || '';
    form.querySelector('[name="category"]').value = p.category || 'service';
    form.querySelector('[name="inStock"]').value = p.inStock ? 'true' : 'false';
    const flags = Array.isArray(p.flags) ? p.flags : [];
    renderSelectedFlags(flags);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        id: p.id || '',
        title_ru: p.name?.ru || '',
        title_uk: p.name?.uk || '',
        description_ru: p.description?.ru || '',
        description_uk: p.description?.uk || '',
        price: String(p.price || 0),
        sku: p.sku || '',
        category: p.category || 'service',
        inStock: p.inStock ? 'true' : 'false',
        _flags: JSON.stringify(flags)
      }));
    } catch {}
  }

  // Bind list actions
  listEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act === 'edit') {
      const item = getLocalProducts().find(p => String(p.id) === String(id));
      if (item) fillForm(item);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (act === 'del') {
      if (!confirm(t('admin-confirm-delete'))) return;
      const rest = getLocalProducts().filter(p => String(p.id) !== String(id));
      saveLocalProducts(rest);
      renderList();
      try {
        const merged = getMergedProducts();
        setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
      } catch {}
      showToast(t('admin-toast-removed'));
    }
  });

  // Image preview
  form?.querySelector('input[name="image"]').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
  preview.innerHTML = `<img src="${ev.target.result}" alt="${t('admin-preview-alt')}" style="max-width:200px;max-height:120px;"/>`;
      let hidden = form.querySelector('input[name="_image_data"]');
      if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = '_image_data'; form.appendChild(hidden); }
      hidden.value = ev.target.result;
    };
    reader.readAsDataURL(f);
  });

  // Draft autosave
  function writeDraft() {
    if (!form) return;
    const data = new FormData(form);
    const draft = Object.fromEntries(data.entries());
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }
  form?.addEventListener('input', () => setTimeout(writeDraft, 200));
  form?.addEventListener('change', () => setTimeout(writeDraft, 100));

  // Submit
  function clearErrors() {
    form.querySelectorAll('.form-error').forEach(n => n.textContent = '');
    form.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid'));
  }
  function setError(name, message) {
    const field = form.querySelector(`[name="${name}"]`);
    const err = form.querySelector(`.form-error[data-for="${name}"]`);
    if (field) field.classList.add('is-invalid');
    if (err) err.textContent = message || '';
  }
  function sanitizePriceInput() {
    const inp = form.querySelector('[name="price"]');
    if (!inp) return;
    const v = Math.max(0, Math.floor(Number(inp.value || 0)));
    if (String(inp.value) !== String(v)) inp.value = String(v);
  }
  function isUnique(field, value, currentId) {
    if (!value) return true;
    const merged = getMergedProducts();
    return !merged.some(p => String(p[field] || '').toLowerCase() === String(value).toLowerCase() && String(p.id) !== String(currentId));
  }

  form?.addEventListener('input', (e) => {
    if (e.target?.name === 'price') sanitizePriceInput();
  });

  form?.addEventListener('submit', (evt) => {
    evt.preventDefault();
    clearErrors();
    sanitizePriceInput();
    // basic required
    const titleRu = form.querySelector('[name="title_ru"]').value.trim();
    const priceVal = Number(form.querySelector('[name="price"]').value || 0);
    const categoryVal = form.querySelector('[name="category"]').value.trim();
  const skuVal = form.querySelector('[name="sku"]').value.trim();
    const idVal = form.querySelector('[name="id"]').value.trim();
    let ok = true;
  if (!titleRu) { setError('title_ru', t('admin-error-title-ru')); ok = false; }
  if (!Number.isFinite(priceVal) || priceVal < 0) { setError('price', t('admin-error-price')); ok = false; }
  if (!skuVal) { setError('sku', t('admin-error-sku-required')); ok = false; }
  if (!categoryVal) { setError('category', t('admin-error-category')); ok = false; }
  if (skuVal && !isUnique('sku', skuVal, idVal)) { setError('sku', t('admin-error-sku-unique')); ok = false; }
  if (idVal && !isUnique('id', idVal, idVal)) { setError('id', t('admin-error-id-unique')); ok = false; }
    if (!ok) return;
    const data = new FormData(form);
    let flags = [];
    try { flags = JSON.parse(data.get('_flags') || '[]'); } catch {}
    const product = {
      id: data.get('id') || `p_${Math.random().toString(36).slice(2,9)}`,
      name: { ru: data.get('title_ru') || '', uk: data.get('title_uk') || '' },
      description: { ru: data.get('description_ru') || '', uk: data.get('description_uk') || '' },
      price: Number(data.get('price') || 0),
      sku: data.get('sku') || '',
      category: data.get('category') || 'service',
      image: data.get('_image_data') || '',
      images: data.get('_image_data') ? [data.get('_image_data')] : [],
      inStock: data.get('inStock') === 'true',
      flags,
      updatedAt: new Date().toISOString()
    };
    const res = upsertLocalProduct(product);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    renderList();
    try {
      const merged = getMergedProducts(); setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
    } catch {}
    showToast(t('admin-toast-saved'));
  });

  // Export/Import bindings
  exportBtn?.addEventListener('click', () => {
    exportLocalProducts();
    showToast(t('admin-export-done'));
  });
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const count = await importLocalProducts(file);
      showToast(t('admin-import-done', { count }));
      renderList();
      const merged = getMergedProducts(); setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
    } catch (err) {
      showToast(t('admin-import-error', { message: err?.message || 'неизвестная ошибка' }));
    } finally {
      e.target.value = '';
    }
  });

  // Initial
  initFlagSelector();
  renderList();
  clearConflictsBtn?.addEventListener('click', () => {
    try { localStorage.removeItem('admin:merge:conflicts'); } catch {}
    renderList();
  });
  // Prefill from draft
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || null;
    if (draft) {
      // apply draft to form fields
      for (const [k, v] of Object.entries(draft)) {
        const field = form.querySelector(`[name="${k}"]`);
        if (field) field.value = v;
      }
      if (draft._flags) { try { const fl = JSON.parse(draft._flags); if (Array.isArray(fl)) renderSelectedFlags(fl); } catch {} }
    }
  } catch {}
}

function renderDiffTable(diffs) {
  if (!Array.isArray(diffs) || !diffs.length) return '<div class="diff-empty">Нет различий</div>';
  const label = (f) => {
    const map = {
      'name.ru':'Название (RU)', 'name.uk':'Название (UK)', 'description.ru':'Описание (RU)', 'description.uk':'Описание (UK)',
      'price':'Цена', 'sku':'SKU', 'category':'Категория', 'image':'Главное изображение', 'images':'Галерея', 'inStock':'В наличии', 'flags':'Флаги'
    };
    return map[f] || f;
  };
  const rows = diffs.map(d => `
    <tr>
      <th>${label(d.field)}</th>
      <td>${formatVal(d.local)}</td>
      <td>${formatVal(d.remote)}</td>
    </tr>`).join('');
  return `<table class="diff-table">
    <thead><tr><th>Поле</th><th>Локально</th><th>Git</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function formatVal(v) {
  if (Array.isArray(v)) return v.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  if (v === undefined) return '<i>—</i>';
  return String(v ?? '');
}

export default { initAdminPage };
