import { getLocalProducts, saveLocalProducts, upsertLocalProduct, exportLocalProducts, importLocalProducts, appendProductToProductsJsonFS, saveMainImageToPictureConditionersFS, saveImagesSetToPictureConditionersFS } from './admin-products.js';
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
  const galleryPreview = document.getElementById('adminImagesPreview');
  const availableFlagsContainer = document.getElementById('availableFlags');
  const selectedFlagsContainer = document.getElementById('selectedFlags');
  const flagsHiddenInput = form?.querySelector('input[name="_flags"]');
  const exportBtn = document.getElementById('adminExportBtn');
  const saveImageBtn = document.getElementById('adminSaveImageBtn');
  const saveImagesBtn = document.getElementById('adminSaveImagesBtn');
  const exportToProductsBtn = document.getElementById('adminExportToProductsBtn');
  const importInput = document.getElementById('adminImportInput');
  const clearConflictsBtn = document.getElementById('clearConflictsBtn');
  // Remote provider controls
  const providerSelect = document.getElementById('dataProviderSelect');
  const saveBtn = document.getElementById('gitcmsSaveBtn');
  const loadBtn = document.getElementById('gitcmsLoadBtn');
  const loadFromGitBtn = document.getElementById('gitcmsLoadFromGitBtn');
  const pushBtn = document.getElementById('gitcmsPushBtn');
  const mergeBtn = document.getElementById('gitcmsMergeBtn');
  const statusEl = document.getElementById('gitcmsStatus');
  // Supabase settings controls
  const supabaseUrlInp = document.getElementById('supabaseUrl');
  const supabaseKeyInp = document.getElementById('supabaseKey');
  const supabaseTableInp = document.getElementById('supabaseTable');
  const supabaseSchemaInp = document.getElementById('supabaseSchema');
  // Proxy settings
  const proxyUseChk = document.getElementById('proxyUse');
  const proxyUrlInp = document.getElementById('proxyUrl');
  const proxyTokenInp = document.getElementById('proxyToken');
  // GitHub (Git-CMS) settings
  const gitRepoInp = document.getElementById('gitRepo');
  const gitBranchInp = document.getElementById('gitBranch');
  const gitPathInp = document.getElementById('gitPath');
  const gitTokenInp = document.getElementById('gitToken');
  const gitAutoCommitChk = document.getElementById('gitAutoCommit');

  // In-memory state for gallery (ordering, DnD, primary)
  let galleryFiles = []; // Array<File>
  let gallerySaved = []; // Array<string>

  function renderDropHintIfEmpty() {
    if (!galleryPreview) return;
    if (galleryPreview.children.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'images-preview__hint';
      hint.textContent = t('admin-drop-here');
      galleryPreview.appendChild(hint);
    }
  }

  function thumbTemplate(url, idx, isPrimary = false, source = 'files') {
    const wrap = document.createElement('div');
    wrap.className = 'images-preview__item gallery-item';
    wrap.setAttribute('draggable', 'true');
    wrap.setAttribute('data-index', String(idx));
    wrap.setAttribute('data-source', String(source));
    const img = document.createElement('img');
    img.src = url; img.alt = t('admin-preview-alt');
    img.loading = 'lazy';
    wrap.appendChild(img);
    const ctr = document.createElement('div');
    ctr.className = 'gallery-item__ctrls';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn--tiny'; btn.textContent = t('admin-make-primary');
    btn.setAttribute('data-act', 'make-primary');
    ctr.appendChild(btn);
    wrap.appendChild(ctr);
    if (isPrimary) {
      const badge = document.createElement('span');
      badge.textContent = t('admin-primary-badge');
      badge.className = 'gallery-item__primary';
      wrap.appendChild(badge);
    }
    return wrap;
  }

  function bindGalleryDnD(container, source) {
    if (!container) return;
    const getList = () => (source === 'files' ? galleryFiles : gallerySaved);
    const setList = (arr) => { if (source === 'files') galleryFiles = arr; else gallerySaved = arr; };
    container.addEventListener('dragstart', (e) => {
      const el = e.target?.closest('.gallery-item');
      if (!el) return; el.classList.add('dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', el.getAttribute('data-index') || ''); } catch {}
    });
    container.addEventListener('dragend', (e) => {
      const el = e.target?.closest('.gallery-item'); if (el) el.classList.remove('dragging');
    });
    function getAfterElement(container, y) {
      const els = [...container.querySelectorAll('.gallery-item:not(.dragging)')];
      return els.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > (closest.offset || -Infinity)) { return { offset, element: child }; }
        else return closest;
      }, { offset: -Infinity }).element;
    }
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.dragging'); if (!dragging) return;
      const after = getAfterElement(container, e.clientY);
      if (!after) container.appendChild(dragging); else container.insertBefore(dragging, after);
    });
    container.addEventListener('drop', () => {
      const items = [...container.querySelectorAll('.gallery-item')];
      const before = getList().slice();
      const reordered = items.map(it => before[Number(it.getAttribute('data-index')) || 0]).filter(Boolean);
      setList(reordered);
      if (source === 'files') {
        renderGalleryFromFiles();
      } else {
        renderGalleryFromSaved();
        const imagesHidden = form?.querySelector('input[name="_images_urls"]');
        if (imagesHidden) imagesHidden.value = JSON.stringify(reordered);
      }
      showToast(t('admin-reordered'));
    });
  }

  function renderGalleryFromFiles() {
    if (!galleryPreview) return;
    galleryPreview.innerHTML = '';
    galleryFiles.slice(0, 48).forEach((f, i) => {
      const url = URL.createObjectURL(f);
      galleryPreview.appendChild(thumbTemplate(url, i, (i === 0 && gallerySaved.length === 0), 'files'));
    });
    bindGalleryDnD(galleryPreview, 'files');
    renderDropHintIfEmpty();
  }
  function renderGalleryFromSaved() {
    if (!galleryPreview) return;
    galleryPreview.innerHTML = '';
    gallerySaved.slice(0, 96).forEach((p, i) => {
      galleryPreview.appendChild(thumbTemplate(p, i, i === 0, 'saved'));
    });
    bindGalleryDnD(galleryPreview, 'saved');
    renderDropHintIfEmpty();
  }

  // Visual renderer that shows both saved and files (saved first), without cross-list DnD
  function renderGalleryVisual() {
    if (!galleryPreview) return;
    galleryPreview.innerHTML = '';
    const hasSaved = gallerySaved.length > 0;
    // Saved first
    gallerySaved.slice(0, 96).forEach((p, i) => {
      galleryPreview.appendChild(thumbTemplate(p, i, i === 0, 'saved'));
    });
    // Then files
    galleryFiles.slice(0, 48).forEach((f, i) => {
      const url = URL.createObjectURL(f);
      const isPrimary = !hasSaved && i === 0; // primary only if no saved yet
      galleryPreview.appendChild(thumbTemplate(url, i, isPrimary, 'files'));
    });
    // Bind DnD only when single source is present to avoid cross-list complications
    if (hasSaved && galleryFiles.length) {
      // no DnD in mixed mode
    } else if (hasSaved) bindGalleryDnD(galleryPreview, 'saved');
    else bindGalleryDnD(galleryPreview, 'files');
    renderDropHintIfEmpty();
  }

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
          <span class="admin-list__hint">Правка и удаление отключены — редактируйте в редакторе</span>
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
    // Full description (optional)
    const fullRu = p.fullDesc?.ru || p.fullDescription?.ru || '';
    const fullUk = p.fullDesc?.uk || p.fullDescription?.uk || '';
    const fullRuEl = form.querySelector('[name="full_ru"]');
    const fullUkEl = form.querySelector('[name="full_uk"]');
    if (fullRuEl) fullRuEl.value = fullRu;
    if (fullUkEl) fullUkEl.value = fullUk;
    form.querySelector('[name="price"]').value = Number(p.price||0) || 0;
    form.querySelector('[name="sku"]').value = p.sku || '';
    form.querySelector('[name="category"]').value = p.category || 'service';
    form.querySelector('[name="inStock"]').value = p.inStock ? 'true' : 'false';
    // specs backfill
    try {
      const specs = Array.isArray(p.specs) ? p.specs : [];
      const ruLines = specs.map(s => `${s.key}: ${(s.value && (s.value.ru || s.value.uk || ''))}`).join('\n');
      const ukLines = specs.map(s => `${s.key}: ${(s.value && (s.value.uk || s.value.ru || ''))}`).join('\n');
      const ruEl = form.querySelector('[name="specs_ru"]');
      const ukEl = form.querySelector('[name="specs_uk"]');
      if (ruEl) ruEl.value = ruLines;
      if (ukEl) ukEl.value = ukLines;
    } catch {}
    const flags = Array.isArray(p.flags) ? p.flags : [];
    renderSelectedFlags(flags);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        id: p.id || '',
        title_ru: p.name?.ru || '',
        title_uk: p.name?.uk || '',
        description_ru: p.description?.ru || '',
        description_uk: p.description?.uk || '',
        full_ru: fullRu,
        full_uk: fullUk,
        price: String(p.price || 0),
        sku: p.sku || '',
        category: p.category || 'service',
        inStock: p.inStock ? 'true' : 'false',
        specs_ru: (Array.isArray(p.specs) ? p.specs.map(s => `${s.key}: ${(s.value && (s.value.ru || s.value.uk || ''))}`).join('\n') : ''),
        specs_uk: (Array.isArray(p.specs) ? p.specs.map(s => `${s.key}: ${(s.value && (s.value.uk || s.value.ru || ''))}`).join('\n') : ''),
        _flags: JSON.stringify(flags)
      }));
    } catch {}
  }

  // Действия редактирования/удаления в админ-списке отключены

  // Image preview
  form?.querySelector('input[name="image"]').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const useProxy = (localStorage.getItem('admin:push:useProxy') === 'true');
    const proxyUrl = (localStorage.getItem('admin:push:proxyUrl') || '').trim();
    const proxyToken = (localStorage.getItem('admin:push:proxyToken') || '').trim();
    const setUrlHidden = (url) => {
      // prefer URL storage
      let urlHidden = form.querySelector('input[name="_image_url"]');
      if (!urlHidden) { urlHidden = document.createElement('input'); urlHidden.type = 'hidden'; urlHidden.name = '_image_url'; form.appendChild(urlHidden); }
      urlHidden.value = url;
      // clear base64 hidden
      const b64 = form.querySelector('input[name="_image_data"]'); if (b64) b64.value = '';
    };
    const setBase64Hidden = (dataUrl) => {
      let hidden = form.querySelector('input[name="_image_data"]');
      if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = '_image_data'; form.appendChild(hidden); }
      hidden.value = dataUrl;
      const urlHidden = form.querySelector('input[name="_image_url"]'); if (urlHidden) urlHidden.value = '';
    };
    if (useProxy && proxyUrl) {
      try {
        const fd = new FormData();
        fd.append('file', f, f.name || 'image');
        // optionally pass folder, defaults handled by function
        const res = await fetch(proxyUrl.replace(/\/$/, '') + '/upload-image', {
          method: 'POST',
          headers: { ...(proxyToken ? { 'X-Admin-Sync-Token': proxyToken } : {}) },
          body: fd
        });
        if (!res.ok) {
          let msg = res.status + '';
          try { const j = await res.json(); msg += ' ' + (j.error || j.message || ''); } catch {}
          throw new Error(msg);
        }
        const data = await res.json();
        const url = data?.url;
        if (url) {
          preview.innerHTML = `<img src="${url}" alt="${t('admin-preview-alt')}" style="max-width:200px;max-height:120px;"/>`;
          setUrlHidden(url);
          showToast('Изображение загружено');
          return;
        }
      } catch (err) {
        console.error('Image upload error', err);
        showToast('Ошибка загрузки изображения, используем локальное превью');
        // fall through to base64 preview
      }
    }
    // Fallback: base64 local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="${t('admin-preview-alt')}" style="max-width:200px;max-height:120px;"/>`;
      setBase64Hidden(ev.target.result);
    };
    reader.readAsDataURL(f);
  });

  // Gallery preview (multiple images) + state
  const imagesInput = form?.querySelector('input[name="images"]');
  if (imagesInput) imagesInput.addEventListener('change', (e) => {
    const picked = Array.from(e.target.files || []);
    // Append to current list instead of replacing; keep saved paths intact
    galleryFiles = [...galleryFiles, ...picked];
    renderGalleryVisual();
  });

  // Gallery controls delegation: make primary
  galleryPreview?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act="make-primary"]');
    if (!btn) return;
    const item = btn.closest('.gallery-item'); if (!item) return;
    const idx = Number(item.getAttribute('data-index')) || 0;
    const source = item.getAttribute('data-source') || (galleryFiles.length ? 'files' : 'saved');
    if (source === 'files') {
      const arr = galleryFiles.slice(); const [sp] = arr.splice(idx, 1); if (sp) arr.unshift(sp); galleryFiles = arr;
    } else {
      const arr = gallerySaved.slice(); const [sp] = arr.splice(idx, 1); if (sp) arr.unshift(sp); gallerySaved = arr;
      const imagesHidden = form?.querySelector('input[name="_images_urls"]');
      if (imagesHidden) imagesHidden.value = JSON.stringify(gallerySaved);
    }
    renderGalleryVisual();
    showToast(t('admin-reordered'));
  });

  // Drag & drop upload onto gallery area
  if (galleryPreview) {
    ['dragenter','dragover'].forEach(evt => galleryPreview.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); galleryPreview.classList.add('is-dragover'); }));
    ['dragleave','dragend','drop'].forEach(evt => galleryPreview.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); galleryPreview.classList.remove('is-dragover'); }));
    galleryPreview.addEventListener('drop', (e) => {
      const dt = e.dataTransfer; if (!dt) return;
      const files = Array.from(dt.files || []).filter(f => /^image\//.test(f.type));
      if (!files.length) return;
      galleryFiles = [...galleryFiles, ...files].slice(0, 48);
      renderGalleryVisual();
      try { showToast(t('admin-files-added', { count: files.length })); } catch { showToast('+ изображения'); }
    });
  }

  // Draft autosave
  function writeDraft() {
    if (!form) return;
    const data = new FormData(form);
    const draft = Object.fromEntries(data.entries());
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }
  form?.addEventListener('input', () => setTimeout(writeDraft, 200));
  form?.addEventListener('change', () => setTimeout(writeDraft, 100));
  // Reset: очистить флаги и превью изображения, скрытые поля, file input
  form?.addEventListener('reset', () => {
    setTimeout(() => {
      try { clearErrors(); } catch {}
      try { renderSelectedFlags([]); } catch {}
      if (flagsHiddenInput) flagsHiddenInput.value = '[]';
      if (preview) preview.innerHTML = '';
  if (galleryPreview) galleryPreview.innerHTML = '';
  galleryFiles = []; gallerySaved = [];
      const fileInputEl = form.querySelector('input[name="image"]');
      if (fileInputEl) fileInputEl.value = '';
      const filesInp = form.querySelector('input[name="images"]');
      if (filesInp) filesInp.value = '';
      const urlHidden = form.querySelector('input[name="_image_url"]');
      if (urlHidden) urlHidden.value = '';
      const b64 = form.querySelector('input[name="_image_data"]');
      if (b64) b64.value = '';
      const imagesHidden = form.querySelector('input[name="_images_urls"]');
      if (imagesHidden) imagesHidden.value = '[]';
    }, 0);
  });

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
  // Numeric SKU generator: берём максимальный числовой SKU из каталога и +1
  function generateNumericSku(currentId) {
    const merged = getMergedProducts() || [];
    let max = 0;
    for (const p of merged) {
      const s = String(p?.sku ?? '');
      if (/^\d+$/.test(s)) {
        const n = parseInt(s, 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    let next = max + 1;
    // гарантируем уникальность: если занято, инкрементируем
    while (!isUnique('sku', String(next), currentId)) next++;
    return String(next);
  }
  function isUnique(field, value, currentId) {
    if (!value) return true;
    const merged = getMergedProducts();
    return !merged.some(p => String(p[field] || '').toLowerCase() === String(value).toLowerCase() && String(p.id) !== String(currentId));
  }

  form?.addEventListener('input', (e) => {
    if (e.target?.name === 'price') sanitizePriceInput();
    if (e.target?.name === 'title_ru') {
      const skuInp = form.querySelector('[name="sku"]');
      if (skuInp && !skuInp.value.trim() && !skuInp.dataset.autofilled) {
        const num = generateNumericSku(form.querySelector('[name="id"]').value);
        skuInp.value = num;
        skuInp.dataset.autofilled = 'true';
      }
    }
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
    // If SKU is empty, auto-generate numeric
    if (!(data.get('sku') || '').trim()) {
      const suggested = generateNumericSku(data.get('id'));
      form.querySelector('[name="sku"]').value = suggested;
      data.set('sku', suggested);
    }
    // If image is empty, prompt to pick or continue
    const imgUrl = (data.get('_image_url') || '').trim();
    const imgB64 = (data.get('_image_data') || '').trim();
    const fileInputEl = form.querySelector('input[name="image"]');
    if (!imgUrl && !imgB64 && (!fileInputEl || !fileInputEl.files || !fileInputEl.files[0])) {
      setError('image', t('admin-error-image-required'));
      const wantPick = confirm('Изображение не выбрано. Хотите выбрать файл сейчас?');
      if (wantPick && fileInputEl) { fileInputEl.click(); }
      return; // stop submit until user selects image and нажмёт сохранить ещё раз
    }
    let flags = [];
    try { flags = JSON.parse(data.get('_flags') || '[]'); } catch {}
      const product = {
      id: data.get('id') || `p_${Math.random().toString(36).slice(2,9)}`,
      name: { ru: data.get('title_ru') || '', uk: data.get('title_uk') || '' },
      description: { ru: data.get('description_ru') || '', uk: data.get('description_uk') || '' },
      // full description separate (schema fullDesc)
      fullDesc: { ru: data.get('full_ru') || '', uk: data.get('full_uk') || '', en: '' },
      price: Number(data.get('price') || 0),
      sku: data.get('sku') || '',
      category: data.get('category') || 'service',
      image: data.get('_image_url') || data.get('_image_data') || '',
      images: (data.get('_image_url') || data.get('_image_data')) ? [data.get('_image_url') || data.get('_image_data')] : [],
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
    // Optional auto-commit (per-item upsert) to GitHub products.json
    try {
      const autoCommit = (localStorage.getItem('admin:gitcms:autoCommit') === 'true');
      const repo = (localStorage.getItem('admin:gitcms:repo') || '').trim();
      const branch = (localStorage.getItem('admin:gitcms:branch') || 'main').trim();
      const path = (localStorage.getItem('admin:gitcms:path') || 'data/products.json').trim();
      const token = (localStorage.getItem('admin:gitcms:token') || '').trim();
      if (autoCommit && repo && branch && path && token && window.DataProviders && window.DataProviders.GitCMSProvider) {
        const git = new window.DataProviders.GitCMSProvider({ repo, branch, path, token });
        git.upsertOne(product, 'feat(admin): upsert product in products.json')
          .then(() => showToast('Сохранено в GitHub: products.json (1 запись)'))
          .catch((err) => { console.error('Git commit error', err); showToast('Ошибка записи в GitHub'); });
      }
    } catch (e) {
      console.error('Auto-commit error', e);
    }
  });

  // Export/Import bindings
  exportBtn?.addEventListener('click', () => {
    exportLocalProducts();
    showToast(t('admin-export-done'));
  });
  // Append current form product to data/products.json via File System Access API (fallbacks to GitHub upsert)
  exportToProductsBtn?.addEventListener('click', async () => {
    if (!form) return;
    clearErrors();
    sanitizePriceInput();
    const titleRu = form.querySelector('[name="title_ru"]').value.trim();
    const priceVal = Number(form.querySelector('[name="price"]').value || 0);
    const categoryVal = form.querySelector('[name="category"]').value.trim();
    let skuVal = form.querySelector('[name="sku"]').value.trim();
    const idVal = form.querySelector('[name="id"]').value.trim() || `p_${Math.random().toString(36).slice(2,9)}`;
    // Ensure SKU exists before validation
    if (!skuVal) {
      const generated = generateNumericSku(idVal);
      form.querySelector('[name="sku"]').value = generated;
      skuVal = generated;
    }
    let ok = true;
    if (!titleRu) { setError('title_ru', t('admin-error-title-ru')); ok = false; }
    if (!Number.isFinite(priceVal) || priceVal < 0) { setError('price', t('admin-error-price')); ok = false; }
    if (!skuVal) { setError('sku', t('admin-error-sku-required')); ok = false; }
    if (!categoryVal) { setError('category', t('admin-error-category')); ok = false; }
    if (!ok) return;
    const data = new FormData(form);
    let flags = [];
    try { flags = JSON.parse(data.get('_flags') || '[]'); } catch {}
    // gather gallery images from hidden field and main
    let gallery = [];
    try { gallery = JSON.parse(data.get('_images_urls') || '[]'); if (!Array.isArray(gallery)) gallery = []; } catch {}
  let mainImg = (data.get('_image_url') || data.get('_image_data') || '').trim();
  const hadImageUrl = Boolean((data.get('_image_url') || '').trim());
  const hadImageB64 = Boolean((data.get('_image_data') || '').trim());

    // If no main image provided yet, try to auto-derive it from current UI state:
    // 1) Use saved gallery paths (gallerySaved) if present
    // 2) Otherwise, if there are picked files (galleryFiles or single image input), save the first to picture/conditioners and use its relative path
    try {
      if (!mainImg) {
        // Prefer already saved gallery paths rendered in UI
        if (Array.isArray(gallery) && gallery.length === 0 && Array.isArray(gallerySaved) && gallerySaved.length) {
          gallery = [...gallerySaved];
        }
        if (!mainImg && Array.isArray(gallery) && gallery.length) {
          mainImg = gallery[0];
        }
        if (!mainImg) {
          // Try to persist first available picked file to picture/conditioners
          const singleInp = form.querySelector('input[name="image"]');
          const singleFile = singleInp?.files?.[0] || null;
          const firstGalleryFile = (Array.isArray(galleryFiles) && galleryFiles.length) ? galleryFiles[0] : null;
          const fileToSave = singleFile || firstGalleryFile;
          if (fileToSave) {
            // Ensure SKU exists for naming consistency downstream
            let ensureSku = (form.querySelector('[name="sku"]').value || '').trim();
            if (!ensureSku) { ensureSku = generateNumericSku(idVal); form.querySelector('[name="sku"]').value = ensureSku; }
            const relPath = await saveMainImageToPictureConditionersFS(fileToSave, ensureSku);
            if (relPath) {
              mainImg = relPath;
              // Reflect in hidden inputs for consistency
              let urlHidden = form.querySelector('input[name="_image_url"]');
              if (!urlHidden) { urlHidden = document.createElement('input'); urlHidden.type = 'hidden'; urlHidden.name = '_image_url'; form.appendChild(urlHidden); }
              urlHidden.value = relPath;
              // Update gallery hidden
              let imagesHidden = form.querySelector('input[name="_images_urls"]');
              if (!imagesHidden) { imagesHidden = document.createElement('input'); imagesHidden.type = 'hidden'; imagesHidden.name = '_images_urls'; imagesHidden.value = '[]'; form.appendChild(imagesHidden); }
              try {
                const prev = JSON.parse(imagesHidden.value || '[]');
                const next = [relPath, ...prev.filter(x => x !== relPath)];
                imagesHidden.value = JSON.stringify(next);
                gallery = next;
              } catch { imagesHidden.value = JSON.stringify([relPath]); gallery = [relPath]; }
              // Update preview
              const prevEl = document.getElementById('adminImagePreview');
              if (prevEl) prevEl.innerHTML = `<img src="${relPath}" alt="preview" style="max-width:200px;max-height:120px;"/>`;
              showToast('Главное изображение сохранено и привязано');
            }
          }
        }
      }
    } catch (e) {
      console.warn('Auto-select/save main image failed (export)', e);
    }

    // If only base64 is present (picked file preview) and no URL was set, prefer saving to picture/conditioners and use relative path
    try {
      if (!hadImageUrl && hadImageB64 && mainImg && mainImg.startsWith('data:')) {
        const singleInp = form.querySelector('input[name="image"]');
        const singleFile = singleInp?.files?.[0] || null;
        const firstGalleryFile = (Array.isArray(galleryFiles) && galleryFiles.length) ? galleryFiles[0] : null;
        const fileToSave = singleFile || firstGalleryFile;
        if (fileToSave) {
          let ensureSku = (form.querySelector('[name="sku"]').value || '').trim();
          if (!ensureSku) { ensureSku = generateNumericSku(idVal); form.querySelector('[name="sku"]').value = ensureSku; }
          const relPath = await saveMainImageToPictureConditionersFS(fileToSave, ensureSku);
          if (relPath) {
            mainImg = relPath;
            let urlHidden = form.querySelector('input[name="_image_url"]');
            if (!urlHidden) { urlHidden = document.createElement('input'); urlHidden.type = 'hidden'; urlHidden.name = '_image_url'; form.appendChild(urlHidden); }
            urlHidden.value = relPath;
            // Clear base64 to keep JSON slim
            const b64Hidden = form.querySelector('input[name="_image_data"]'); if (b64Hidden) b64Hidden.value = '';
            // Update gallery hidden
            let imagesHidden = form.querySelector('input[name="_images_urls"]');
            if (!imagesHidden) { imagesHidden = document.createElement('input'); imagesHidden.type = 'hidden'; imagesHidden.name = '_images_urls'; imagesHidden.value = '[]'; form.appendChild(imagesHidden); }
            try {
              const prev = JSON.parse(imagesHidden.value || '[]');
              const next = [relPath, ...prev.filter(x => x !== relPath)];
              imagesHidden.value = JSON.stringify(next);
              gallery = next;
            } catch { imagesHidden.value = JSON.stringify([relPath]); gallery = [relPath]; }
            const prevEl = document.getElementById('adminImagePreview');
            if (prevEl) prevEl.innerHTML = `<img src="${relPath}" alt="preview" style="max-width:200px;max-height:120px;"/>`;
            showToast('Изображение сохранено локально и привязано к товару');
          }
        }
      }
    } catch (e) {
      console.warn('Prefer-url-over-base64 save failed', e);
    }
    const product = {
      id: idVal,
      name: { ru: data.get('title_ru') || '', uk: data.get('title_uk') || '' },
      description: { ru: data.get('description_ru') || '', uk: data.get('description_uk') || '' },
      fullDesc: { ru: data.get('full_ru') || '', uk: data.get('full_uk') || '', en: '' },
      price: Number(data.get('price') || 0),
      sku: data.get('sku') || '',
      category: data.get('category') || 'service',
      image: mainImg || (gallery[0] || ''),
      images: (mainImg ? [mainImg, ...gallery.filter(x => x !== mainImg)] : gallery),
      inStock: data.get('inStock') === 'true',
      flags,
      updatedAt: new Date().toISOString()
    };
    try {
      // Экспорт без обязательного изображения: просто записываем объект как есть
      await appendProductToProductsJsonFS(product);
      showToast('Добавлено в products.json');
    } catch (err) {
      // Fallback: GitHub per-item upsert if configured
      try {
        const repo = (localStorage.getItem('admin:gitcms:repo') || '').trim();
        const branch = (localStorage.getItem('admin:gitcms:branch') || 'main').trim();
        const path = (localStorage.getItem('admin:gitcms:path') || 'data/products.json').trim();
        const token = (localStorage.getItem('admin:gitcms:token') || '').trim();
        if (repo && branch && path && token && window.DataProviders && window.DataProviders.GitCMSProvider) {
          // For GitHub fallback, we cannot write local image file. Keep URL if uploaded via proxy; else keep base64 or empty.
          const git = new window.DataProviders.GitCMSProvider({ repo, branch, path, token });
          await git.upsertOne(product, 'feat(admin): append product via admin button');
          showToast('Сохранено в GitHub: products.json (1 запись)');
          return;
        }
      } catch (e) {
        console.error('Git fallback error', e);
      }
      console.error('Append to products.json error', err);
      showToast('Не удалось записать в products.json');
    }
  });

  // Save image only (to picture/conditioners) and link it into hidden input for future save
  saveImageBtn?.addEventListener('click', async () => {
    if (!form) return;
    const fileInputEl = form.querySelector('input[name="image"]');
    const f = fileInputEl?.files?.[0];
    if (!f) {
      const wantPick = confirm('Выберите файл изображения для сохранения');
      if (wantPick && fileInputEl) fileInputEl.click();
      return;
    }
    try {
      // Prefer using SKU for filename; fallback to ID
      let sku = (form.querySelector('[name="sku"]').value || '').trim();
      if (!sku) { sku = generateNumericSku(form.querySelector('[name="id"]').value); form.querySelector('[name="sku"]').value = sku; }
      const relPath = await saveMainImageToPictureConditionersFS(f, sku);
      if (relPath) {
        // set hidden _image_url
        let urlHidden = form.querySelector('input[name="_image_url"]');
        if (!urlHidden) { urlHidden = document.createElement('input'); urlHidden.type = 'hidden'; urlHidden.name = '_image_url'; form.appendChild(urlHidden); }
        urlHidden.value = relPath;
  // also add to gallery hidden list
  let imagesHidden = form.querySelector('input[name="_images_urls"]');
  if (!imagesHidden) { imagesHidden = document.createElement('input'); imagesHidden.type = 'hidden'; imagesHidden.name = '_images_urls'; imagesHidden.value = '[]'; form.appendChild(imagesHidden); }
  try { const arr = JSON.parse(imagesHidden.value || '[]'); if (!arr.includes(relPath)) { arr.unshift(relPath); imagesHidden.value = JSON.stringify(arr); } } catch { imagesHidden.value = JSON.stringify([relPath]); }
        // clear base64 hidden if any
        const b64 = form.querySelector('input[name="_image_data"]'); if (b64) b64.value = '';
        // update preview
        const prev = document.getElementById('adminImagePreview');
        if (prev) prev.innerHTML = `<img src="${relPath}" alt="preview" style="max-width:200px;max-height:120px;"/>`;
        // notify
        showToast(t('admin-image-saved'));
      }
    } catch (e) {
      console.error('Save image error', e);
      showToast(t('admin-image-save-error'));
    }
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

  // Save images set (gallery)
  saveImagesBtn?.addEventListener('click', async () => {
    if (!form) return;
    const input = form.querySelector('input[name="images"]');
    let files = galleryFiles.length ? galleryFiles : (input?.files ? Array.from(input.files) : []);
    if (!files.length) { const wantPick = confirm('Выберите файлы изображений для сохранения'); if (wantPick && input) input.click(); return; }
    try {
      let sku = (form.querySelector('[name="sku"]').value || '').trim();
      if (!sku) { sku = generateNumericSku(form.querySelector('[name="id"]').value); form.querySelector('[name="sku"]').value = sku; }
      const relPaths = await saveImagesSetToPictureConditionersFS(files, sku);
      if (relPaths && relPaths.length) {
        let imagesHidden = form.querySelector('input[name="_images_urls"]');
        if (!imagesHidden) { imagesHidden = document.createElement('input'); imagesHidden.type = 'hidden'; imagesHidden.name = '_images_urls'; form.appendChild(imagesHidden); }
        try { const prev = JSON.parse(imagesHidden.value || '[]'); const merged = [...relPaths, ...prev.filter(x => !relPaths.includes(x))]; imagesHidden.value = JSON.stringify(merged); gallerySaved = merged; }
        catch { imagesHidden.value = JSON.stringify(relPaths); gallerySaved = relPaths; }
        // Reset file buffer and render saved items with controls
        galleryFiles = [];
        renderGalleryFromSaved();
        showToast(t('admin-images-saved'));
      }
    } catch (e) {
      console.error('Save images set error', e);
      showToast(t('admin-images-save-error'));
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

  // ===== Remote provider wiring (settings + actions) =====
  function setGitStatus(text, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.style.color = isError ? 'var(--color-danger, #c0392b)' : 'inherit';
  }
  function updateGitButtonsEnabled() {
    const v = (providerSelect && providerSelect.value) || (localStorage.getItem('admin:dataProvider') || 'localStorage');
    const isRemote = v === 'supabase';
    const useProxy = (localStorage.getItem('admin:push:useProxy') === 'true');
    const proxyUrl = (localStorage.getItem('admin:push:proxyUrl') || '').trim();
    const canPushViaProxy = useProxy && !!proxyUrl;
    const gitRepo = (localStorage.getItem('admin:gitcms:repo') || '').trim();
    const gitToken = (localStorage.getItem('admin:gitcms:token') || '').trim();
    const gitPath = (localStorage.getItem('admin:gitcms:path') || '').trim();
    const gitBranch = (localStorage.getItem('admin:gitcms:branch') || 'main').trim();
    // load/merge требуют удалённый провайдер (для чтения)
    [loadBtn, mergeBtn].forEach(btn => { if (btn) { btn.disabled = !isRemote; btn.title = isRemote ? '' : 'Доступно только при выборе удалённого провайдера'; } });
    // push можно разрешить через прокси даже без провайдера
    if (pushBtn) {
      pushBtn.disabled = !(isRemote || canPushViaProxy);
      if (!isRemote && canPushViaProxy) {
        pushBtn.title = 'Запись через прокси';
      } else {
        pushBtn.title = isRemote ? '' : 'Доступно только при выборе удалённого провайдера';
      }
    }
    // GitHub direct load availability
    if (loadFromGitBtn) {
      const ok = !!(gitRepo && gitToken && gitPath && gitBranch);
      loadFromGitBtn.disabled = !ok;
      loadFromGitBtn.title = ok ? 'Загрузить products.json из GitHub' : 'Укажите Repo/Branch/Path/Token';
    }
    if (statusEl) statusEl.textContent = '';
  }
  function withLoading(btn, fn, statusText) {
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    if (statusEl) {
      statusEl.innerHTML = `<span class="spinner spinner--inline" aria-hidden="true"></span> ${statusText || ''}`;
    }
    return Promise.resolve().then(fn).finally(() => { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } });
  }

  // Hydrate current values
  try {
    const currentPref = (localStorage.getItem('admin:dataProvider') || 'localStorage');
    if (providerSelect) providerSelect.value = currentPref;
  } catch {}

  // Prefill Supabase
  try {
    if (supabaseUrlInp) {
      const cur = localStorage.getItem('admin:supabase:url') || '';
      const norm = (function normalizeUrl(u){
        let s = String(u || '').trim();
        if (!s) return s;
        if (s.startsWith('ttps://')) s = 'h' + s;
        if (s.startsWith('tps://')) s = 'ht' + s;
        if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
        s = s.replace(/^(https?:)\/{2,}/i, '$1//').replace(/\/+$/, '');
        return s;
      })(cur);
      if (norm !== cur) { try { localStorage.setItem('admin:supabase:url', norm); } catch {} }
      supabaseUrlInp.value = norm;
    }
    if (supabaseKeyInp) supabaseKeyInp.value = localStorage.getItem('admin:supabase:key') || '';
    if (supabaseTableInp) supabaseTableInp.value = localStorage.getItem('admin:supabase:table') || 'products';
    if (supabaseSchemaInp) supabaseSchemaInp.value = localStorage.getItem('admin:supabase:schema') || 'public';
    if (proxyUseChk) proxyUseChk.checked = (localStorage.getItem('admin:push:useProxy') === 'true');
    if (proxyUrlInp) proxyUrlInp.value = localStorage.getItem('admin:push:proxyUrl') || '';
    if (proxyTokenInp) proxyTokenInp.value = localStorage.getItem('admin:push:proxyToken') || '';
    // Prefill GitHub (Git-CMS)
    if (gitRepoInp) gitRepoInp.value = localStorage.getItem('admin:gitcms:repo') || '';
    if (gitBranchInp) gitBranchInp.value = localStorage.getItem('admin:gitcms:branch') || 'main';
    if (gitPathInp) gitPathInp.value = localStorage.getItem('admin:gitcms:path') || 'data/products.json';
    if (gitTokenInp) gitTokenInp.value = localStorage.getItem('admin:gitcms:token') || '';
    if (gitAutoCommitChk) gitAutoCommitChk.checked = (localStorage.getItem('admin:gitcms:autoCommit') === 'true');
  } catch {}

  updateGitButtonsEnabled();

  providerSelect?.addEventListener('change', (ev) => {
    const v = ev.target.value;
    try { localStorage.setItem('admin:dataProvider', v); } catch {}
    updateGitButtonsEnabled();
    showToast(`Провайдер: ${v}`);
  });

  saveBtn?.addEventListener('click', () => {
    try {
      const prov = (providerSelect && providerSelect.value) || (localStorage.getItem('admin:dataProvider') || 'localStorage');
      if (prov === 'supabase') {
        if (supabaseUrlInp) {
          const norm = (function normalizeUrl(u){
            let s = String(u || '').trim();
            if (!s) return s;
            if (s.startsWith('ttps://')) s = 'h' + s;
            if (s.startsWith('tps://')) s = 'ht' + s;
            if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
            s = s.replace(/^(https?:)\/{2,}/i, '$1//').replace(/\/+$/, '');
            return s;
          })(supabaseUrlInp.value);
          localStorage.setItem('admin:supabase:url', norm);
        }
        if (supabaseKeyInp) localStorage.setItem('admin:supabase:key', (supabaseKeyInp.value || '').trim());
        if (supabaseTableInp) localStorage.setItem('admin:supabase:table', (supabaseTableInp.value || 'products').trim());
        if (supabaseSchemaInp) localStorage.setItem('admin:supabase:schema', (supabaseSchemaInp.value || 'public').trim() || 'public');
        if (proxyUseChk) localStorage.setItem('admin:push:useProxy', proxyUseChk.checked ? 'true' : 'false');
        if (proxyUrlInp) localStorage.setItem('admin:push:proxyUrl', (proxyUrlInp.value || '').trim());
        if (proxyTokenInp) localStorage.setItem('admin:push:proxyToken', (proxyTokenInp.value || '').trim());
        localStorage.setItem('admin:dataProvider', 'supabase');
        showToast('Настройки Supabase сохранены');
      } else {
        localStorage.setItem('admin:dataProvider', 'localStorage');
        showToast('Провайдер: LocalStorage');
      }
      // Save GitHub (Git-CMS) settings regardless of provider
      if (gitRepoInp) localStorage.setItem('admin:gitcms:repo', (gitRepoInp.value || '').trim());
      if (gitBranchInp) localStorage.setItem('admin:gitcms:branch', (gitBranchInp.value || 'main').trim() || 'main');
      if (gitPathInp) localStorage.setItem('admin:gitcms:path', (gitPathInp.value || 'data/products.json').trim() || 'data/products.json');
      if (gitTokenInp) localStorage.setItem('admin:gitcms:token', (gitTokenInp.value || '').trim());
      if (gitAutoCommitChk) localStorage.setItem('admin:gitcms:autoCommit', gitAutoCommitChk.checked ? 'true' : 'false');
    } catch (e) {
      console.error('Save remote settings error', e);
      showToast('Ошибка сохранения настроек удалённого провайдера');
    }
  });

  loadBtn?.addEventListener('click', async () => {
    await withLoading(loadBtn, async () => {
      try {
        const p = (typeof window !== 'undefined' && window.getDataProvider) ? window.getDataProvider() : null;
        if (!p || p.kind === 'localStorage' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          // Provide more actionable hint for Supabase
          const need = [];
          try {
            const url = (localStorage.getItem('admin:supabase:url') || '').trim();
            const key = (localStorage.getItem('admin:supabase:key') || '').trim();
            const table = (localStorage.getItem('admin:supabase:table') || '').trim();
            if (!url) need.push('URL');
            if (!key) need.push('Key');
            if (!table) need.push('Table');
          } catch {}
          const msg = need.length ? `Удалённый провайдер не настроен: заполните ${need.join(', ')}` : 'Удалённый провайдер не настроен';
          setGitStatus(msg, true);
          showToast(msg);
          return;
        }
        setGitStatus('Загрузка…');
        const list = await p.loadAll();
        if (!Array.isArray(list)) {
          setGitStatus('Не удалось загрузить товары', true);
          showToast('Не удалось загрузить товары');
          return;
        }
        saveLocalProducts(list);
        try {
          const merged = getMergedProducts(); setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
        } catch {}
        setGitStatus(`Загружено: ${list.length}`);
        showToast(`Загружено из удалённого провайдера: ${list.length}`);
        renderList();
      } catch (e) {
        console.error('Remote load error', e);
        setGitStatus(`Ошибка: ${e?.message || e}`, true);
        showToast('Ошибка загрузки из удалённого провайдера');
      }
    });
  });

  // Direct GitHub -> LocalStorage load (without switching provider)
  loadFromGitBtn?.addEventListener('click', async () => {
    await withLoading(loadFromGitBtn, async () => {
      try {
        if (!(window.DataProviders && window.DataProviders.GitCMSProvider)) {
          setGitStatus('GitCMS недоступен', true); return;
        }
        const repo = (localStorage.getItem('admin:gitcms:repo') || '').trim();
        const token = (localStorage.getItem('admin:gitcms:token') || '').trim();
        const branch = (localStorage.getItem('admin:gitcms:branch') || 'main').trim();
        const path = (localStorage.getItem('admin:gitcms:path') || 'data/products.json').trim();
        if (!(repo && token && branch && path)) {
          const msg = 'Укажите Repo/Branch/Path/Token'; setGitStatus(msg, true); showToast(msg); return;
        }
        setGitStatus('Загрузка из GitHub…');
        const git = new window.DataProviders.GitCMSProvider({ repo, branch, path, token });
        const list = await git.loadAll();
        if (!Array.isArray(list)) { setGitStatus('Не удалось загрузить products.json', true); return; }
        saveLocalProducts(list);
        try {
          const merged = getMergedProducts(); setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
        } catch {}
        setGitStatus(`Загружено из GitHub: ${list.length}`);
        showToast(`Загружено из GitHub: ${list.length}`);
        renderList();
      } catch (e) {
        console.error('GitHub load error', e);
        setGitStatus(`Ошибка GitHub: ${e?.message || e}`, true);
        showToast('Ошибка загрузки из GitHub');
      }
    });
  });

  pushBtn?.addEventListener('click', async () => {
    await withLoading(pushBtn, async () => {
      try {
        const useProxy = (localStorage.getItem('admin:push:useProxy') === 'true');
        const proxyUrl = (localStorage.getItem('admin:push:proxyUrl') || '').trim();
        const proxyToken = (localStorage.getItem('admin:push:proxyToken') || '').trim();
        const p = (typeof window !== 'undefined' && window.getDataProvider) ? window.getDataProvider() : null;
        if (!useProxy) {
          // Требуем удалённый провайдер, если прокси не включён
          if (!p || p.kind === 'localStorage' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
            setGitStatus('Удалённый провайдер не настроен', true);
            showToast('Удалённый провайдер не настроен');
            return;
          }
        } else {
          // Прокси включён — достаточно валидного URL
          if (!proxyUrl) {
            setGitStatus('Не задан Proxy URL', true);
            showToast('Не задан Proxy URL');
            return;
          }
        }
        const list = getLocalProducts();
        if (!list.length) {
          const ok = confirm(t('remote-push-empty-confirm') || 'Локальный список пуст. Очистить удалённые товары?');
          if (!ok) return;
        }
        setGitStatus('Запись…');
        if (useProxy && proxyUrl) {
          const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(proxyToken ? { 'X-Admin-Sync-Token': proxyToken } : {})
            },
            body: JSON.stringify(list)
          });
          if (!res.ok) {
            let msg = res.status + '';
            try { const j = await res.json(); msg += ' ' + (j.error || j.message || ''); } catch {}
            throw new Error(msg);
          }
        } else {
          await p.replaceAll(list, 'feat(admin): sync local products to remote');
        }
        setGitStatus('Записано');
        showToast('Товары записаны в удалённый провайдер');
      } catch (e) {
        console.error('Remote push error', e);
        setGitStatus(`Ошибка: ${e?.message || e}`, true);
        showToast('Ошибка записи в удалённый провайдер');
      }
    });
  });

  mergeBtn?.addEventListener('click', async () => {
    await withLoading(mergeBtn, async () => {
      try {
        const p = (typeof window !== 'undefined' && window.getDataProvider) ? window.getDataProvider() : null;
        if (!p || p.kind === 'localStorage' || typeof p.isConfigured !== 'function' || !p.isConfigured()) {
          const need = [];
          try {
            const url = (localStorage.getItem('admin:supabase:url') || '').trim();
            const key = (localStorage.getItem('admin:supabase:key') || '').trim();
            const table = (localStorage.getItem('admin:supabase:table') || '').trim();
            if (!url) need.push('URL');
            if (!key) need.push('Key');
            if (!table) need.push('Table');
          } catch {}
          const msg = need.length ? `Удалённый провайдер не настроен: заполните ${need.join(', ')}` : 'Удалённый провайдер не настроен';
          setGitStatus(msg, true);
          showToast(msg);
          return;
        }
        setGitStatus('Загрузка…');
        const remote = await p.loadAll();
        if (!Array.isArray(remote)) {
          setGitStatus('Не удалось загрузить товары', true);
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
            conflicts[idKey] = conflicts[idKey] ? 'both' : 'both';
            conflicted++;
            return;
          }
          if (idMatch) {
            const idx = result.findIndex(p => String(p.id) === idKey);
            if (idx >= 0) { result[idx] = { ...idMatch, ...item, updatedAt: new Date().toISOString() }; updated++; }
          } else if (skuMatch) {
            const idx = result.findIndex(p => String(p.id) === String(skuMatch.id));
            if (idx >= 0) { result[idx] = { ...skuMatch, ...item, updatedAt: new Date().toISOString() }; updated++; }
            conflicts[String(skuMatch.id)] = 'id';
            conflicted++;
          } else {
            result.push(item);
            added++;
          }
        };
        try {
          const byIdObj = Object.fromEntries(remote.filter(r => r && r.id).map(r => [String(r.id), r]));
          const bySkuObj = Object.fromEntries(remote.filter(r => r && r.sku).map(r => [String(r.sku).toLowerCase(), r]));
          localStorage.setItem('admin:merge:lastRemoteById', JSON.stringify(byIdObj));
          localStorage.setItem('admin:merge:lastRemoteBySku', JSON.stringify(bySkuObj));
        } catch {}

        remote.forEach(upsert);
        saveLocalProducts(result);
        try { localStorage.setItem('admin:merge:conflicts', JSON.stringify(conflicts)); } catch {}
        const merged = getMergedProducts(); setProducts(merged); window.products = merged; renderProducts(lang, translations, merged);
        setGitStatus(`Добавлено: ${added}, Обновлено: ${updated}, Конфликты: ${conflicted}`);
        showToast('Слияние завершено');
        renderList();
      } catch (e) {
        console.error('Remote merge error', e);
        setGitStatus(`Ошибка: ${e?.message || e}`, true);
        showToast('Ошибка слияния');
      }
    });
  });
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
