// merge-utils: policy and diff helpers
// export: mergeProduct(local, remote), computeDiff(local, remote)

function normFlags(arr) {
  const list = Array.isArray(arr) ? arr : [];
  return list.map(f => (typeof f === 'string' ? { key: f, color: '' } : { key: f?.key || '', color: f?.color || '' }))
             .filter(x => x.key);
}

export function mergeProduct(local = {}, remote = {}) {
  const l = local || {}; const r = remote || {};
  const mergedFlagsMap = new Map();
  normFlags(l.flags).forEach(f => mergedFlagsMap.set(f.key, f));
  normFlags(r.flags).forEach(f => mergedFlagsMap.set(f.key, { key: f.key, color: f.color || (mergedFlagsMap.get(f.key)?.color || '') }));
  const mergedFlags = Array.from(mergedFlagsMap.values());

  const images = Array.from(new Set([...(l.images || []), ...(r.images || [])]));

  return {
    ...l,
    // id сохраняем локальный
    id: l.id,
    name: { ru: r?.name?.ru || l?.name?.ru || '', uk: r?.name?.uk || l?.name?.uk || '' },
    description: { ru: r?.description?.ru || l?.description?.ru || '', uk: r?.description?.uk || l?.description?.uk || '' },
    price: (typeof r.price === 'number' ? r.price : l.price ?? 0),
    sku: r.sku || l.sku || '',
    category: r.category || l.category || 'service',
    image: r.image || l.image || '',
    images,
    inStock: (typeof r.inStock === 'boolean') ? r.inStock : !!l.inStock,
    flags: mergedFlags,
    updatedAt: new Date().toISOString()
  };
}

function flat(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flat(v, key));
    else out[key] = v;
  }
  return out;
}

function isEqualArray(a, b) {
  const A = Array.isArray(a) ? a : []; const B = Array.isArray(b) ? b : [];
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
  return true;
}

function flagsEqual(a, b) {
  const aa = normFlags(a).map(x => `${x.key}:${x.color}`).sort();
  const bb = normFlags(b).map(x => `${x.key}:${x.color}`).sort();
  return aa.length === bb.length && aa.every((x, i) => x === bb[i]);
}

export function computeDiff(local = {}, remote = {}) {
  const diffs = [];
  const fields = [
    'name.ru','name.uk','description.ru','description.uk','price','sku','category','image','inStock'
  ];
  const L = flat(local); const R = flat(remote);
  fields.forEach(f => {
    if (L[f] !== R[f]) diffs.push({ field: f, local: L[f], remote: R[f] });
  });
  if (!isEqualArray(local.images, remote.images)) {
    diffs.push({ field: 'images', local: local.images || [], remote: remote.images || [] });
  }
  if (!flagsEqual(local.flags, remote.flags)) {
    diffs.push({ field: 'flags', local: normFlags(local.flags), remote: normFlags(remote.flags) });
  }
  return diffs;
}

export default { mergeProduct, computeDiff };
