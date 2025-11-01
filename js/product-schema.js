// Product schema and validation utilities
// Attach to window to fit current SPA architecture
(function () {
  'use strict';

  const FLAGS = ['isNew', 'isHit', 'isPromo', 'isBestseller'];

  const ProductSchema = {
    id: 'string|number',
    sku: 'string',
    categories: 'string[]', // category slugs
    name: '{ uk, ru?, en? }',
    shortDesc: '{ uk?, ru?, en? }',
    fullDesc: '{ uk?, ru?, en? }',
    price: 'number',
    oldPrice: 'number?',
    inStock: 'boolean',
    stockCount: 'number?',
    flags: '{ isNew?, isHit?, isPromo?, isBestseller? }',
    images: 'Array<{ src, alt: { uk, ru?, en? }, featured? }>',
    specs: 'Array<{ key, label: { uk, ru?, en? }, value }>',
    attributes: 'Record<string, string|number|boolean>?',
    seo: '{ slug, title?: { uk, ru?, en? }, metaDesc?: { uk, ru?, en? } }? ',
    createdAt: 'ISO string?',
    updatedAt: 'ISO string?',
  };

  function transliterateUaToLatin(input) {
    if (!input) return '';
    const map = {
      'А':'A','Б':'B','В':'V','Г':'H','Ґ':'G','Д':'D','Е':'E','Є':'Ye','Ж':'Zh','З':'Z','И':'Y','І':'I','Ї':'Yi','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh','Щ':'Shch','Ю':'Yu','Я':'Ya',
      'а':'a','б':'b','в':'v','г':'h','ґ':'g','д':'d','е':'e','є':'ie','ж':'zh','з':'z','и':'y','і':'i','ї':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ю':'iu','я':'ia'
    };
    return String(input).split('').map(ch => map[ch] ?? ch).join('');
  }

  function slugify(str) {
    const t = transliterateUaToLatin(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return t || 'item';
  }

  function ensureArray(a) { return Array.isArray(a) ? a : (a == null ? [] : [a]); }

  function normalizeProduct(p) {
    const now = new Date().toISOString();
    const name = p.name || {};
    const seo = p.seo || {};
    const normalized = {
      id: p.id ?? String(Date.now()),
      sku: String(p.sku || '').trim(),
      categories: (p.categories || []).map(String),
      name: { uk: name.uk || '', ru: name.ru || '', en: name.en || '' },
      shortDesc: { uk: p.shortDesc?.uk || '', ru: p.shortDesc?.ru || '', en: p.shortDesc?.en || '' },
      fullDesc: { uk: p.fullDesc?.uk || '', ru: p.fullDesc?.ru || '', en: p.fullDesc?.en || '' },
      price: Number(p.price || 0),
      oldPrice: p.oldPrice != null ? Number(p.oldPrice) : undefined,
      inStock: Boolean(p.inStock ?? true),
      stockCount: p.stockCount != null ? Number(p.stockCount) : undefined,
      flags: Object.fromEntries(FLAGS.map(f => [f, Boolean(p.flags?.[f])])),
      images: ensureArray(p.images).map(img => ({
        src: String(img.src || ''),
        alt: { uk: img.alt?.uk || '', ru: img.alt?.ru || '', en: img.alt?.en || '' },
        featured: Boolean(img.featured),
      })),
      specs: ensureArray(p.specs).map(s => ({
        key: String(s.key || ''),
        label: { uk: s.label?.uk || '', ru: s.label?.ru || '', en: s.label?.en || '' },
        value: s.value,
      })),
      attributes: p.attributes || {},
      seo: {
        slug: seo.slug ? String(seo.slug) : slugify(name.uk || name.ru || name.en || p.sku || p.id),
        title: { uk: seo.title?.uk || '', ru: seo.title?.ru || '', en: seo.title?.en || '' },
        metaDesc: { uk: seo.metaDesc?.uk || '', ru: seo.metaDesc?.ru || '', en: seo.metaDesc?.en || '' },
      },
      createdAt: p.createdAt || now,
      updatedAt: now,
    };
    return normalized;
  }

  function validateProduct(p, { existingIds = new Set(), existingSkus = new Set() } = {}) {
    const errors = {};
    const n = normalizeProduct(p);
    if (!n.sku) errors.sku = 'SKU is required';
    if (existingSkus.has(n.sku)) errors.sku = 'SKU must be unique';
    if (!n.name.uk) errors['name.uk'] = 'Name (uk) is required';
    if (!Array.isArray(n.categories) || n.categories.length === 0) errors.categories = 'At least one category is required';
    if (n.price < 0) errors.price = 'Price must be >= 0';
    if (!Array.isArray(n.images) || n.images.length === 0 || !n.images[0].src) errors.images = 'At least one image is required';
    // id uniqueness if explicitly set (string/number)
    if (p.id != null && existingIds.has(String(p.id))) errors.id = 'ID must be unique';

    return { valid: Object.keys(errors).length === 0, errors, normalized: n };
  }

  // Public API
  window.ProductSchema = ProductSchema;
  window.normalizeProduct = normalizeProduct;
  window.validateProduct = validateProduct;
  window.slugifyProduct = slugify;
})();
