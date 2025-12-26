## Инструкции для AI-агентов (Progect-shop)

### Архитектура
- SPA без фреймворков (HTML/CSS/ESM). Точка входа: `js/main.js`.
- UI собирается из HTML-фрагментов в `components/` через `loadComponent(containerId, path)`; после вставки вызывается `reinitLazyLoading()` из `js/image-loader.js`.
- В `js/main.js` есть `LANDING_MODE`: при `true` отключает каталог/корзину/compare и связанные хеш-маршруты.

### Навигация и конфиги
- Маршруты через `location.hash`: `#products`, `#cart`, `#product-<id>`, `#category-<slug>`.
- Категории/контент/контакты — `js/content-config.js` (classic script) → `window.Categories`, `window.getComponentBySlug(slug)`, `window.contentConfig`.

### Данные и админка
- Провайдеры в `js/data-provider.js` (доступны в DevTools):
  - Статика (read-only): `window.switchToStaticJson()` / `window.configureStaticJson({ path: 'data/products.json' })`
  - Локальные правки: `window.switchToLocalProvider()` (LocalStorage key: `shop:products:v1`)
  - GitHub: `window.configureGitCMS({ repo, branch, path, token })`
  - Supabase (PostgREST): `window.configureSupabase({ url, key, table, schema })`
- Админ-UI: `components/admin-products.html` + `js/admin-page.js` / `js/admin-products.js`; валидация товара через `window.validateProduct()`.

### Модель товара и i18n
- Тексты часто двуязычные: `name: { ru, uk }` (пример в `js/products.js`); язык переключается через `js/i18n.js` (`switchLanguage()`), fallback к `ru`.

### Стили и UI-паттерны
- Тема/токены: CSS-переменные в `css/main.css` (`:root`). Не хардкодьте новые цвета/тени — добавляйте/используйте переменные.
- Переиспользуемые паттерны: `js/ui-patterns.js` и `js/form-validation.js`.

### Изображения и PWA
- LQIP/lazy: используйте `img[data-src]` (см. `js/image-loader.js`).
- Responsive картинки: `npm run images:gen` (watch: `npm run images:watch`), суффиксы `-320w/-480w/-768w/-1200w` (см. `README.md`).
- Service Worker: `service-worker.js`; при изменении критичных ассетов обновляйте `CACHE_NAME` и список `urlsToCache`.

### Команды
- Тесты: `npm test` (Vitest + JSDOM; шум про загрузку компонентов подавляется в `vitest.config.js`).
- Визуальные: `npm run visual:test` / `npm run visual:create-baseline` (см. `tests/visual/README.md`).
- Локальный сервер: `python3 -m http.server 5173`.
