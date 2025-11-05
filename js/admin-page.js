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
  const gitExportCommitChk = document.getElementById('gitExportCommit');

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
    // Optional: also commit to GitHub products.json
    try {
      const exportCommit = (localStorage.getItem('admin:gitcms:exportCommit') === 'true');
      const repo = (localStorage.getItem('admin:gitcms:repo') || '').trim();
      const branch = (localStorage.getItem('admin:gitcms:branch') || 'main').trim();
      const path = (localStorage.getItem('admin:gitcms:path') || 'data/products.json').trim();
      const token = (localStorage.getItem('admin:gitcms:token') || '').trim();
      if (exportCommit && repo && branch && path && token && window.DataProviders && window.DataProviders.GitCMSProvider) {
        const git = new window.DataProviders.GitCMSProvider({ repo, branch, path, token });
        const list = getLocalProducts();
        git.upsertMany(list, 'feat(admin): export local products -> products.json')
          .then(() => showToast('Экспортирован и записан в GitHub: products.json'))
          .catch((err) => { console.error('Git export commit error', err); showToast('Ошибка записи экспорта в GitHub'); });
      }
    } catch (e) { console.error('Export auto-commit error', e); }
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
    if (gitExportCommitChk) gitExportCommitChk.checked = (localStorage.getItem('admin:gitcms:exportCommit') === 'true');
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
      if (gitExportCommitChk) localStorage.setItem('admin:gitcms:exportCommit', gitExportCommitChk.checked ? 'true' : 'false');
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
