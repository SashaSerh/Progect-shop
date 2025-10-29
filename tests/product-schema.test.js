import { describe, it, expect } from 'vitest'

// These globals are attached by plain scripts in runtime; in tests we emulate by requiring files.
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'

function loadScript(relPath) {
  const file = path.resolve(process.cwd(), relPath)
  const code = fs.readFileSync(file, 'utf8')
  const sandbox = { window: {}, atob: (b)=>Buffer.from(b,'base64').toString('utf8'), btoa: (s)=>Buffer.from(s,'utf8').toString('base64'), console }
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox, { filename: relPath })
  return sandbox.window
}

describe('Product schema basics', () => {
  const w = loadScript('js/product-schema.js')
  it('normalizes and validates minimal product', () => {
    const p = {
      sku: 'SKU-1',
      name: { uk: 'Тестовий товар' },
      categories: ['conditioners'],
      price: 1234,
      images: [{ src: '/img.png', alt: { uk: 'alt' } }]
    }
    const r = w.validateProduct(p)
    expect(r.valid).toBe(true)
    expect(r.normalized.seo.slug).toBeTruthy()
  })
  it('fails on no categories and negative price', () => {
    const p = { sku: 'SKU-2', name: { uk: 'A' }, price: -1, images: [{ src: '/i.png', alt: { uk: 'a' } }] }
    const r = w.validateProduct(p)
    expect(r.valid).toBe(false)
    expect(r.errors.categories).toBeTruthy()
    expect(r.errors.price).toBeTruthy()
  })
})
