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
    // Reads products.json from repo (GitHub API format)
    async loadAll() {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      const url = `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${encodeURIComponent(this.branch)}`;
      const json = await this._fetchJson(url, { headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json' } });
      if (!json || !json.content) return [];
      const decoded = atob(json.content.replace(/\n/g, ''));
      const arr = safeParse(decoded, []);
      return Array.isArray(arr) ? arr : [];
    }
    // Commits full products.json (replace). In real flow we may implement per-item files.
    async replaceAll(products, commitMessage = 'chore: update products.json') {
      if (!this.isConfigured()) throw new Error('GitCMS is not configured');
      // Get current SHA
      const metaUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${encodeURIComponent(this.branch)}`;
      const meta = await this._fetchJson(metaUrl, { headers: { 'Authorization': `Bearer ${this.token}`, 'Accept': 'application/vnd.github+json' } });
      const sha = meta?.sha;
      const putUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}`;
      const body = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(products, null, 2)))),
        branch: this.branch,
        sha,
      };
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

  function getConfiguredProvider() {
    const pref = (localStorage.getItem('admin:dataProvider') || 'localStorage').toLowerCase();
    if (pref === 'gitcms') return new GitCMSProvider();
    return new LocalStorageProvider();
  }

  // Public API
  window.DataProviders = { LocalStorageProvider, GitCMSProvider };
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
