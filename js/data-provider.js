// Data providers: LocalStorage and Git-CMS (adapter scaffold)
// Expose to window. Default provider is LocalStorage unless Git is configured.
(function () {
  'use strict';

  const LS_KEY = 'shop:products:v1';

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  class LocalStorageProvider {
    constructor() {
      this.kind = 'localStorage';
      const raw = localStorage.getItem(LS_KEY);
      this._data = Array.isArray(safeParse(raw, null)) ? safeParse(raw, []) : [];
      if (!Array.isArray(this._data)) this._data = [];
    }
    _save() { localStorage.setItem(LS_KEY, JSON.stringify(this._data)); }
    loadAll() { return [...this._data]; }
    create(p) {
      const ids = new Set(this._data.map(x => String(x.id)));
      const skus = new Set(this._data.map(x => String(x.sku)));
      const { valid, errors, normalized } = window.validateProduct ? window.validateProduct(p, { existingIds: ids, existingSkus: skus }) : { valid: true, errors: {}, normalized: p };
      if (!valid) return { ok: false, errors };
      this._data.push(normalized);
      this._save();
      return { ok: true, item: normalized };
    }
    update(id, patch) {
      const idx = this._data.findIndex(x => String(x.id) === String(id));
      if (idx === -1) return { ok: false, errors: { id: 'Not found' } };
      const merged = Object.assign({}, this._data[idx], patch, { updatedAt: new Date().toISOString() });
      // Keep uniqueness constraints
      const ids = new Set(this._data.filter((_, i) => i !== idx).map(x => String(x.id)));
      const skus = new Set(this._data.filter((_, i) => i !== idx).map(x => String(x.sku)));
      const { valid, errors, normalized } = window.validateProduct ? window.validateProduct(merged, { existingIds: ids, existingSkus: skus }) : { valid: true, errors: {}, normalized: merged };
      if (!valid) return { ok: false, errors };
      this._data[idx] = normalized;
      this._save();
      return { ok: true, item: normalized };
    }
    remove(id) {
      const before = this._data.length;
      this._data = this._data.filter(x => String(x.id) !== String(id));
      if (this._data.length === before) return { ok: false, errors: { id: 'Not found' } };
      this._save();
      return { ok: true };
    }
    import(json) {
      const arr = safeParse(json, []);
      if (!Array.isArray(arr)) return { ok: false, errors: { file: 'Invalid JSON' } };
      const ids = new Set(); const skus = new Set();
      const out = []; const errors = [];
      arr.forEach((p, i) => {
        const { valid, errors: e, normalized } = window.validateProduct ? window.validateProduct(p, { existingIds: ids, existingSkus: skus }) : { valid: true, errors: {}, normalized: p };
        if (!valid) { errors.push({ index: i, errors: e }); return; }
        ids.add(String(normalized.id)); skus.add(String(normalized.sku));
        out.push(normalized);
      });
      if (errors.length) return { ok: false, errors };
      this._data = out;
      this._save();
      return { ok: true, count: out.length };
    }
    export() { return JSON.stringify(this._data, null, 2); }
  }

  // Git-CMS adapter scaffold for GitHub-like API
  // NOTE: network operations require a token and repo settings; methods are no-ops until configured.
  class GitCMSProvider {
    constructor(opts = {}) {
      this.kind = 'gitcms';
      this.repo = opts.repo || localStorage.getItem('admin:gitcms:repo') || '';
      this.branch = opts.branch || localStorage.getItem('admin:gitcms:branch') || 'main';
      this.token = opts.token || localStorage.getItem('admin:gitcms:token') || '';
      this.path = opts.path || localStorage.getItem('admin:gitcms:path') || 'data/products.json';
    }
    isConfigured() { return Boolean(this.repo && this.branch && this.token && this.path); }
    async _fetchJson(url, init) {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error('Network error ' + res.status);
      return res.json();
    }
    async _getFileMeta() {
      const url = `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${encodeURIComponent(this.branch)}`;
      const headers = { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json' };
      const res = await fetch(url, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Network error ' + res.status);
      return res.json();
    }
    _decodeContent(contentB64) {
      try { return decodeURIComponent(escape(atob(String(contentB64 || '').replace(/\n/g, '')))); } catch {
        try { return atob(String(contentB64 || '').replace(/\n/g, '')); } catch { return '[]'; }
      }
    }
    _encodeContent(str) {
      try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
    }
    // Reads products.json from repo (GitHub API format)
    async loadAll() {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      const json = await this._getFileMeta();
      if (!json || !json.content) return [];
      const decoded = this._decodeContent(json.content);
      const arr = safeParse(decoded, []);
      return Array.isArray(arr) ? arr : [];
    }
    // Commits full products.json (replace). In real flow we may implement per-item files.
    async replaceAll(products, commitMessage = 'chore: update products.json') {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      // Get current SHA (optional). If file doesn't exist, we'll create it (no sha required)
      let sha = undefined;
      try { const meta = await this._getFileMeta(); sha = meta?.sha; } catch (e) {}
      const putUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}`;
      const body = {
        message: commitMessage,
        content: this._encodeContent(JSON.stringify(products, null, 2)),
        branch: this.branch,
      };
      if (sha) body.sha = sha;
      const res = await this._fetchJson(putUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { ok: true, commit: res?.commit?.sha };
    }
    // Upsert a single product into products.json on GitHub without relying on the current local full array.
    // Matching by id first; if missing, by case-insensitive sku; otherwise append. Keeps other items intact.
    async upsertOne(product, commitMessage = 'feat(admin): upsert product in products.json') {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      // Load current file (or start with empty list if not exists)
      let sha = undefined; let current = [];
      try {
        const meta = await this._getFileMeta();
        if (meta && meta.content) {
          sha = meta.sha;
          const decoded = this._decodeContent(meta.content);
          current = safeParse(decoded, []);
          if (!Array.isArray(current)) current = [];
        }
      } catch (_) { /* treat as empty */ }
      // Merge/replace
      const id = product && product.id != null ? String(product.id) : '';
      const sku = product && product.sku ? String(product.sku).toLowerCase() : '';
      const byId = id ? current.findIndex(p => String(p?.id) === id) : -1;
      let idx = byId;
      if (idx < 0 && sku) idx = current.findIndex(p => String(p?.sku || '').toLowerCase() === sku);
      const next = [...current];
      const stamped = Object.assign({}, product, { updatedAt: new Date().toISOString() });
      if (idx >= 0) next[idx] = stamped; else next.push(stamped);
      // Commit back
      const putUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}`;
      const body = {
        message: commitMessage,
        content: this._encodeContent(JSON.stringify(next, null, 2)),
        branch: this.branch,
      };
      if (sha) body.sha = sha;
      const res = await this._fetchJson(putUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { ok: true, commit: res?.commit?.sha };
    }

    // Upsert multiple products in a single commit to reduce API calls.
    async upsertMany(products, commitMessage = 'feat(admin): upsert products in products.json') {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      const items = Array.isArray(products) ? products : [];
      // Load current file
      let sha = undefined; let current = [];
      try {
        const meta = await this._getFileMeta();
        if (meta && meta.content) {
          sha = meta.sha;
          const decoded = this._decodeContent(meta.content);
          current = safeParse(decoded, []);
          if (!Array.isArray(current)) current = [];
        }
      } catch (_) { /* treat as empty */ }
      const next = [...current];
      const indexById = new Map(next.map((p, i) => [String(p?.id), i]));
      const indexBySku = new Map(next.filter(p => p && p.sku).map((p, i) => [String(p.sku).toLowerCase(), i]));
      for (const prod of items) {
        if (!prod || typeof prod !== 'object') continue;
        const id = prod.id != null ? String(prod.id) : '';
        const sku = prod.sku ? String(prod.sku).toLowerCase() : '';
        let idx = id && indexById.has(id) ? indexById.get(id) : -1;
        if (idx < 0 && sku && indexBySku.has(sku)) idx = indexBySku.get(sku);
        const stamped = Object.assign({}, prod, { updatedAt: new Date().toISOString() });
        if (idx >= 0) {
          next[idx] = stamped;
        } else {
          next.push(stamped);
          const newIndex = next.length - 1;
          if (id) indexById.set(id, newIndex);
          if (sku) indexBySku.set(sku, newIndex);
        }
      }
      // Commit
      const putUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}`;
      const body = {
        message: commitMessage,
        content: this._encodeContent(JSON.stringify(next, null, 2)),
        branch: this.branch,
      };
      if (sha) body.sha = sha;
      const res = await this._fetchJson(putUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { ok: true, commit: res?.commit?.sha };
    }
    // Convenience CRUD using loadAll + replaceAll (simple, but O(n))
    async create(p) {
      const all = await this.loadAll();
      const ids = new Set(all.map(x => String(x.id)));
      const skus = new Set(all.map(x => String(x.sku)));
      const { valid, errors, normalized } = window.validateProduct ? window.validateProduct(p, { existingIds: ids, existingSkus: skus }) : { valid: true, errors: {}, normalized: p };
      if (!valid) return { ok: false, errors };
      all.push(normalized);
      await this.replaceAll(all, 'feat(admin): create product');
      return { ok: true, item: normalized };
    }
    async update(id, patch) {
      const all = await this.loadAll();
      const idx = all.findIndex(x => String(x.id) === String(id));
      if (idx === -1) return { ok: false, errors: { id: 'Not found' } };
      const merged = Object.assign({}, all[idx], patch, { updatedAt: new Date().toISOString() });
      const ids = new Set(all.filter((_, i) => i !== idx).map(x => String(x.id)));
      const skus = new Set(all.filter((_, i) => i !== idx).map(x => String(x.sku)));
      const { valid, errors, normalized } = window.validateProduct ? window.validateProduct(merged, { existingIds: ids, existingSkus: skus }) : { valid: true, errors: {}, normalized: merged };
      if (!valid) return { ok: false, errors };
      all[idx] = normalized;
      await this.replaceAll(all, 'feat(admin): update product');
      return { ok: true, item: normalized };
    }
    async remove(id) {
      const all = await this.loadAll();
      const next = all.filter(x => String(x.id) !== String(id));
      if (next.length === all.length) return { ok: false, errors: { id: 'Not found' } };
      await this.replaceAll(next, 'feat(admin): remove product');
      return { ok: true };
    }
  }

  // Supabase adapter via PostgREST
  class SupabaseProvider {
    constructor(opts = {}) {
      this.kind = 'supabase';
      // Normalize URL to prevent common typos like 'ttps://'
      const rawUrl = opts.url || localStorage.getItem('admin:supabase:url') || '';
      this.url = (function normalizeUrl(u) {
        let s = String(u || '').trim();
        if (!s) return s;
        if (s.startsWith('ttps://')) s = 'h' + s; // fix missing 'h'
        if (s.startsWith('tps://')) s = 'ht' + s; // extra safety
        if (!/^https?:\/\//i.test(s)) s = 'https://' + s; // default to https
        // collapse duplicate slashes after protocol and trim trailing slashes
        s = s.replace(/^(https?:)\/{2,}/i, '$1//').replace(/\/+$/, '');
        return s;
      })(rawUrl);
      this.key = opts.key || localStorage.getItem('admin:supabase:key') || '';
      this.table = opts.table || localStorage.getItem('admin:supabase:table') || 'products';
      this.schema = opts.schema || localStorage.getItem('admin:supabase:schema') || 'public';
    }
    isConfigured() { return Boolean(this.url && this.key && this.table); }
    // Remove fields that are not present in our ProductSchema to avoid DB column errors
    _sanitizeProduct(obj, { allowId = true } = {}) {
  const allowedKeys = (typeof window !== 'undefined' && window.ProductSchema)
        ? Object.keys(window.ProductSchema)
        : [
    'id','sku','categories','name','shortDesc','fullDesc','price','oldPrice','inStock','stockCount',
    // keep both 'image' (legacy single) and 'images' (array)
    'image','images',
    'flags','specs','attributes','seo','createdAt','updatedAt'
          ];
      const out = {};
      for (const k of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
      }
      if (!allowId) delete out.id; // never allow changing id in PATCH payloads
      return out;
    }
    _headers(extra = {}) {
      const base = {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (this.schema) {
        base['Accept-Profile'] = this.schema;
        base['Content-Profile'] = this.schema;
      }
      return Object.assign(base, extra);
    }
    async _fetchJson(url, init) {
      const res = await fetch(url, init);
      if (!res.ok) {
        let msg = `${res.status}`;
        try { const j = await res.json(); msg += ` ${j.message || j.error || ''}`; } catch {}
        throw new Error('Network error ' + msg);
      }
      return res.json();
    }
    async loadAll() {
      if (!this.isConfigured()) throw new Error('Supabase is not configured');
      const url = `${this.url.replace(/\/$/,'')}/rest/v1/${encodeURIComponent(this.table)}?select=*`;
      const json = await this._fetchJson(url, { headers: this._headers() });
      return Array.isArray(json) ? json : [];
    }
    async replaceAll(list, note = 'feat(admin): replace all products') {
      if (!this.isConfigured()) throw new Error('Supabase is not configured');
      const base = this.url.replace(/\/$/,'');
      // Delete all rows (requires appropriate RLS/policy or service key)
      await fetch(`${base}/rest/v1/${encodeURIComponent(this.table)}`, { method: 'DELETE', headers: this._headers({ Prefer: 'return=minimal' }) });
      // Upsert list
      if (Array.isArray(list) && list.length) {
        const sanitized = list.map(p => this._sanitizeProduct(p, { allowId: true }));
        await this._fetchJson(`${base}/rest/v1/${encodeURIComponent(this.table)}`, {
          method: 'POST',
          headers: this._headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify(sanitized)
        });
      }
      return { ok: true };
    }
    async create(p) {
      if (!this.isConfigured()) throw new Error('Supabase is not configured');
      const base = this.url.replace(/\/$/,'');
      const body = this._sanitizeProduct(p, { allowId: true });
      const out = await this._fetchJson(`${base}/rest/v1/${encodeURIComponent(this.table)}`, {
        method: 'POST', headers: this._headers({ Prefer: 'return=representation' }), body: JSON.stringify(body)
      });
      return { ok: true, item: Array.isArray(out) ? out[0] : out };
    }
    async update(id, patch) {
      if (!this.isConfigured()) throw new Error('Supabase is not configured');
      const base = this.url.replace(/\/$/,'');
      const body = this._sanitizeProduct(patch, { allowId: false });
      await this._fetchJson(`${base}/rest/v1/${encodeURIComponent(this.table)}?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'PATCH', headers: this._headers({ Prefer: 'return=minimal' }), body: JSON.stringify(body)
      });
      return { ok: true };
    }
    async remove(id) {
      if (!this.isConfigured()) throw new Error('Supabase is not configured');
      const base = this.url.replace(/\/$/,'');
      await this._fetchJson(`${base}/rest/v1/${encodeURIComponent(this.table)}?id=eq.${encodeURIComponent(String(id))}`, {
        method: 'DELETE', headers: this._headers({ Prefer: 'return=minimal' })
      });
      return { ok: true };
    }
  }

  function getConfiguredProvider() {
    const pref = (localStorage.getItem('admin:dataProvider') || 'localStorage').toLowerCase();
    if (pref === 'gitcms') return new GitCMSProvider();
    if (pref === 'supabase') return new SupabaseProvider();
    return new LocalStorageProvider();
  }

  // Public API
  window.DataProviders = { LocalStorageProvider, GitCMSProvider, SupabaseProvider };
  window.getDataProvider = getConfiguredProvider;

  // Utility helpers to simplify Git‑CMS setup from console or scripts
  // configureGitCMS({ repo: 'owner/name', branch: 'main', path: 'data/products.json', token: 'ghp_...' })
  window.configureGitCMS = function configureGitCMS(opts = {}) {
    try {
      if (opts.repo) localStorage.setItem('admin:gitcms:repo', String(opts.repo).trim());
      if (opts.branch) localStorage.setItem('admin:gitcms:branch', String(opts.branch).trim() || 'main');
      if (opts.path) localStorage.setItem('admin:gitcms:path', String(opts.path).trim() || 'data/products.json');
      if (opts.token) localStorage.setItem('admin:gitcms:token', String(opts.token).trim());
      localStorage.setItem('admin:dataProvider', 'gitcms');
      return true;
    } catch (_) { return false; }
  };

  // configureSupabase({ url, key, table })
  window.configureSupabase = function configureSupabase(opts = {}) {
    try {
      if (opts.url) {
        const norm = (function normalizeUrl(u) {
          let s = String(u || '').trim();
          if (!s) return s;
          if (s.startsWith('ttps://')) s = 'h' + s;
          if (s.startsWith('tps://')) s = 'ht' + s;
          if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
          s = s.replace(/^(https?:)\/{2,}/i, '$1//').replace(/\/+$/, '');
          return s;
        })(opts.url);
        localStorage.setItem('admin:supabase:url', norm);
      }
      if (opts.key) localStorage.setItem('admin:supabase:key', String(opts.key).trim());
      if (opts.table) localStorage.setItem('admin:supabase:table', String(opts.table).trim() || 'products');
      if (opts.schema) localStorage.setItem('admin:supabase:schema', String(opts.schema).trim() || 'public');
      localStorage.setItem('admin:dataProvider', 'supabase');
      return true;
    } catch (_) { return false; }
  };

  // Quickly switch current provider to Git‑CMS (requires saved settings)
  window.switchToGitCMS = function switchToGitCMS() {
    try { localStorage.setItem('admin:dataProvider', 'gitcms'); return true; } catch(_) { return false; }
  };

  // Switch back to LocalStorage provider
  window.switchToLocalProvider = function switchToLocalProvider() {
    try { localStorage.setItem('admin:dataProvider', 'localStorage'); return true; } catch(_) { return false; }
  };

  // Dump locally saved products (admin local storage) normalized to ProductSchema JSON
  // Useful to prepare products.json for Git manually if needed
  window.dumpLocalProductsNormalized = function dumpLocalProductsNormalized() {
    try {
      const raw = localStorage.getItem('products_local_v1') || '[]';
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return '[]';
      const normalize = (typeof window !== 'undefined' && typeof window.normalizeProduct === 'function') ? window.normalizeProduct : (x) => x;
      const out = arr.map(p => normalize(p));
      return JSON.stringify(out, null, 2);
    } catch (_) {
      return '[]';
    }
  };
})();
