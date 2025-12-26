## Инструкции для AI-агентов (Progect-shop)

### Архитектура
- SPA без фреймворков (HTML/CSS/ESM). Точка входа: `js/main.js`.
- UI собирается из HTML-фрагментов в `components/` через `loadComponent(containerId, path)`; после вставки вызывается `reinitLazyLoading()` из `js/image-loader.js`.
- В `js/main.js` есть `LANDING_MODE`: при `true` отключает каталог/корзину/compare и связанные хеш-маршруты (скрывает элементы с `display: none` и `aria-hidden`).

### Навигация и конфиги
- Маршруты через `location.hash`: `#products` (показ секции продуктов), `#cart` (загрузка `components/cart-page.html` в `#main-container`), `#product-<id>` (рендер деталки в `#product-detail-container`), `#category-<slug>` (загрузка категории в `#main-container` и фильтр продуктов).
- Категории/контент/контакты — `js/content-config.js` (classic script) → `window.Categories`, `window.getComponentBySlug(slug)`, `window.contentConfig`.
- Язык хранится в localStorage как 'language' (по умолчанию 'uk').

### Данные и админка
- Провайдеры в `js/data-provider.js` (доступны в DevTools):
  - Статика (read-only): `window.switchToStaticJson()` / `window.configureStaticJson({ path: 'data/products.json' })`
  - Локальные правки: `window.switchToLocalProvider()` (LocalStorage key: `shop:products:v1`)
  - GitHub: `window.configureGitCMS({ repo, branch, path, token })`
  - Supabase (PostgREST): `window.configureSupabase({ url, key, table, schema })`
- Админ-UI: `components/admin-products.html` + `js/admin-page.js` / `js/admin-products.js`; валидация товара через `window.validateProduct()`.
- Черновики админки: localStorage 'admin:product:draft:v1'.

### Модель товара и i18n
- Товары: id, name/description/specs { ru, uk }, price, category, image(s), sku, brand, inStock, warrantyMonths, rating {value, count}, specs [{key, value {ru, uk}}], flags ['sale','top','popular'].
- Тексты двуязычные: `name: { ru: 'Кондиционер', uk: 'Кондиціонер' }` (пример в `js/products.js`); язык переключается через `js/i18n.js` (`switchLanguage()`), fallback к `ru`.

### Стили и UI-паттерны
- Тема/токены: CSS-переменные в `css/main.css` (`:root`, e.g., `--color-primary`). Не хардкодьте новые цвета/тени — добавляйте/используйте переменные.
- Переиспользуемые паттерны: `js/ui-patterns.js` (Toast, Modal) и `js/form-validation.js`.

### Изображения и PWA
- LQIP/lazy: используйте `img[data-src]` (см. `js/image-loader.js`).
- Responsive картинки: `npm run images:gen` (watch: `npm run images:watch`), суффиксы `-320w/-480w/-768w/-1200w` (e.g., `image-480w.jpg`).
- Service Worker: `service-worker.js`; при изменении критичных ассетов обновляйте `CACHE_NAME` и список `urlsToCache`.

### Команды
- Тесты: `npm test` (Vitest + JSDOM; шум про загрузку компонентов подавляется в `vitest.config.js`).
- Визуальные: `npm run visual:test` / `npm run visual:create-baseline` (Playwright, см. `tests/visual/README.md`).
- Локальный сервер: `python3 -m http.server 5173`.
