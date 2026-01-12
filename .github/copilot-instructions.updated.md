# Инструкции для AI-агентов (Progect-shop)

Краткий ориентир — что важно знать, чтобы быстро вносить безопасные изменения.

1) Быстрый старт (dev / build / test)
- Разработка: `npm run dev` (Vite, ESM project).
- Сборка/превью: `npm run build` / `npm run preview` (или `python3 -m http.server 5173` для статического артефакта).
- Unit/Integration: `npm test` (Vitest + JSDOM).
- Visual tests: `npm run visual:test` / `npm run visual:create-baseline` (Playwright + pixelmatch). Установите браузеры: `npx playwright install chromium`.
- Картинки: `npm run images:gen`, `npm run images:watch`, `npm run images:cleanup`.

2) Архитектура и основные паттерны
- Точка входа: `js/main.js` (ESM). Компоненты подгружаются через `loadComponent(containerId, 'components/*.html')`.
  - `loadComponent()` автоматически вызывает `reinitLazyLoading()` из `js/image-loader.js` — пользуйтесь `img[data-src]` и LQIP в товарах.
- Маршрутизация: hash-based (`location.hash`) — примеры: `#products`, `#cart`, `#product-<id>`, `#category-<slug>`.
- Главное: `LANDING_MODE` (в `js/main.js`) включает/отключает e‑commerce фичи (catalog, cart, compare).

3) Данные, провайдеры и админка
- По умолчанию: `StaticJson` читает `data/products.json`.
- Альтернативные провайдеры: `LocalStorage`, `GitCMS`, `Supabase` — API в `js/data-provider.js`.
- Dev-helpers доступны в `window`: `switchToLocalProvider()`, `configureStaticJson(...)`, `switchToGitCMS()`, `configureSupabase(...)`.
- Админ-UI: `components/admin-products.html` + `js/admin-products.js` / `js/admin-page.js`.
  - Всегда применять валидацию: `window.validateProduct(product, { existingIds, existingSkus })` (реализовано в `js/product-schema.js`).

4) Модель товара, i18n и тема
- Товар: текстовые поля — объекты `{ ru, uk }` (см. `data/products.json` и `js/product-schema.js`).
- Язык: `localStorage['language']` (по умолчанию `'uk'`, fallback `'ru'`).
- Тема: `localStorage['theme']` (`'light'` / `'dark'`) и `toggleTheme()` в `js/theme.js`.

5) Стили, анимации, изображения
- Используйте CSS-переменные в `css/main.css` (`:root`) — добавляйте токены, не хардкодьте цвета/тени.
- Мобильные swipe-анимации: `js/mobile-animations.js` / `mobileAnimations.show(...)` (см. `docs/MOBILE-ANIMATIONS.md`).
- Responsive images: файлы имеют суффиксы `-320w/-480w/-768w/-1200w`. LQIP/base64 хранится в продукте.

6) Тесты и поведение при изменениях
- Тесты выполняются в JSDOM; многие тесты полагаются на `window`-хелперы (например, `switchToLocalProvider`, `validateProduct`).
- Визуальные тесты: пересоздавайте baseline (`npm run visual:create-baseline`) после преднамеренных UI изменений и коммитьте результаты.

7) Практические советы при правках
- Если меняете конфиг-контент, учтите, что `js/content-config.js` — не-ESM и экспортирует объекты в `window` — сохраняйте API (`window.contentConfig`, `window.Categories`).
- Для добавления/изменения продукта: обновляйте `data/products.json` и используйте `window.validateProduct` (тесты ожидают этот контракт).
- Не меняйте названия основных контейнеров (`#main-container`, `#products-container`, `#product-detail-container`, `#comparison-container`) — роутинг и тесты завязаны на них.

8) Полезные ссылки в репозитории
- Product schema / validation: `js/product-schema.js`
- Data provider: `js/data-provider.js`
- Image scripts: `scripts/generate-responsive-images.js`, `scripts/cleanup-base64-in-products.js`
- Docs: `docs/GitCMS-setup.md`, `docs/LQIP-EXAMPLES.md`, `docs/MOBILE-ANIMATIONS.md`

Если хотите, могу заменить оригинальный файл (`.github/copilot-instructions.md`) этим сокращённым вариантом или внести правки в исходный — скажите, какой вариант предпочитаете.