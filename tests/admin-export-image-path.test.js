import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Helper to sleep for async DOM handlers
const wait = (ms = 0) => new Promise(res => setTimeout(res, ms));

describe('admin export: image path normalization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // minimal admin form scaffold
    document.body.innerHTML = `
      <form id="adminProductForm">
        <input name="id" value="p_test" />
        <input name="title_ru" value="Тест товар" />
        <input name="title_uk" value="Тест товар" />
        <textarea name="description_ru">desc</textarea>
        <textarea name="description_uk">desc</textarea>
        <input name="price" value="1000" />
        <input name="sku" value="" />
        <input name="category" value="ac" />
        <select name="inStock"><option value="true" selected>Да</option></select>
        <input type="hidden" name="_flags" value="[]" />
        <input type="hidden" name="_image_data" value="data:image/jpeg;base64,FAKEBASE64" />
        <input type="file" name="image" />
      </form>
      <button id="adminExportToProductsBtn" type="button"></button>
      <div id="toast-container"></div>
    `;
  });

  it('replaces base64 image with picture/ path on export', async () => {
    // Mock admin-products module used by admin-page.js
    const adminProductsPath = path.resolve(process.cwd(), 'js/admin-products.js');
    let capturedProduct = null;
    vi.mock(adminProductsPath, () => ({
      appendProductToProductsJsonFS: vi.fn(async (product) => { capturedProduct = product; return { ok: true, count: 1 }; }),
      saveMainImageToPictureConditionersFS: vi.fn(async () => 'picture/conditioners/test.jpg'),
      saveImagesSetToPictureConditionersFS: vi.fn(async () => []),
      getLocalProducts: vi.fn(() => []),
      saveLocalProducts: vi.fn(() => {}),
      upsertLocalProduct: vi.fn(() => {}),
      exportLocalProducts: vi.fn(() => {}),
      importLocalProducts: vi.fn(() => 0),
    }));

    // Import admin-page after mocking dependencies
    const adminPagePath = path.resolve(process.cwd(), 'js/admin-page.js');
    const { initAdminPage } = await import(pathToFileURL(adminPagePath).href);

    // Patch file input to simulate selected file (JSDOM doesn't allow assigning FileList directly)
    const fileInput = document.querySelector('input[name="image"]');
    const fakeFile = new File([new Uint8Array([1,2,3])], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [fakeFile] });

    await initAdminPage({}, 'ru');
    // Click export
    document.getElementById('adminExportToProductsBtn').click();
    await wait(10);

    expect(capturedProduct).toBeTruthy();
    expect(typeof capturedProduct.image).toBe('string');
    expect(capturedProduct.image.startsWith('picture/')).toBe(true);
    expect(capturedProduct.image.startsWith('data:')).toBe(false);
  });
});
