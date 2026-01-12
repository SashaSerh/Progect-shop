# Инструкции для AI-агентов (Progect-shop)

Краткий ориентир — что важно знать, чтобы быстро вносить безопасные изменения.

1) Быстрый старт (dev / build / test)
- Разработка: `npm run dev` (Vite, ESM project).
- Сборка/превью: `npm run build` / `npm run preview` (или `python3 -m http.server 5173` для статического артефакта).
- Unit/Integration: `npm test` (Vitest + JSDOM).
- Visual tests: `npm run visual:test` / `npm run visual:create-baseline` (Playwright + pixelmatch). Установите браузеры: `npx playwright install chromium`.
- Картинки: `npm run images:gen`, `npm run images:watch`, `npm run images:cleanup`.

2) Архитектура и основные паттерны
- Точка входа: `js/main.js` (ESM). Компоненты HTML из `components/` подгружаются через `loadComponent(containerId, path)`.
  - После вставки HTML автоматически вызывается `reinitLazyLoading()` из `js/image-loader.js` для инициализации ленивой загрузки картинок.
- **Навигация**: hash-based роутинг (`location.hash`) — `#products`, `#cart`, `#product-<id>`, `#category-<slug>`.
  - Основные контейнеры: `#main-container`, `#products-container`, `#product-detail-container`, `#comparison-container`, `#compare-modal-container`.
- **Флаг LANDING_MODE** в `js/main.js` (строка 14): `true` = лендинг услуг (отключает каталог/корзину/compare), `false` = полный e-commerce. При изменении проверяйте все UI-потоки и навигационные ссылки.

## Навигация и конфиги
- **Категории/контент/контакты**: `js/content-config.js` (classic script, не ESM) экспортирует в `window.Categories`, `window.getComponentBySlug(slug)`, `window.contentConfig`.
  - Контактная информация (WhatsApp, Telegram, телефоны, email) — `window.contentConfig.contacts`.
- **i18n**: `localStorage['language']` (по умолчанию `uk`, fallback к `ru`). Логика в `js/i18n.js`, словари встроены. Все модули должны считывать язык через `localStorage.getItem('language') || 'uk'`.
- **Тема**: `localStorage['theme']` (`'light'` / `'dark'`). Переключение через `toggleTheme()` из `js/theme.js`.

## Данные и админка
- **Провайдеры** в `js/data-provider.js`: `LocalStorage`, `StaticJson` (по умолчанию), `GitCMS`, `Supabase`. Приложение читает из `data/products.json` по умолчанию (StaticJson — read-only).
- **Быстрые команды DevTools** (все доступны в `window`):
  - `switchToLocalProvider()` — локальная база (`shop:products:v1` в localStorage), пригодна для CRUD через админ-UI.
  - `configureStaticJson({ path: 'data/products.json' })` — читать статический JSON.
  - `configureGitCMS({ repo, branch, path, token })` + `switchToGitCMS()` — GitHub API workflow (нужен токен).
  - `configureSupabase({ url, key, table })` + `switchToSupabase()` — PostgREST.
- **Админ-UI**: `components/admin-products.html` + `js/admin-page.js` / `js/admin-products.js`.
  - Валидация/нормализация: `window.validateProduct(product, { existingIds, existingSkus })` — всегда применяйте при создании/обновлении.
  - Черновики: `localStorage['admin:product:draft:v1']`.

## Модель товара и i18n
- Пример минимальной структуры (i18n в полях `name`, `description`, `specs`):
```json
{
  "id": 123,
  "sku": "AC-123",
  "name": { "ru": "Кондиционер", "uk": "Кондиціонер" },
  "price": 999.99,
  "images": ["picture/conditioners/ac-123-480w.jpg"],
  "category": "conditioners",
  "inStock": true
}
```
- Схема и правила — `js/product-schema.js` / `js/products.js`. Все текстовые поля должны иметь `{ ru, uk }`.

## Стили та UI-паттерни
- Використовуйте CSS-переменні в `css/main.css` (`:root`). Не хардкодьте новые цвета/тени — добавляйте токены.
- Переиспользуемые UI-паттерны: `js/ui-patterns.js` (toasts, modals), валидация форм — `js/form-validation.js`.
- Модули для бизнес-логики: `js/marketing.js` (WhatsApp/Telegram/email ссылки из `contentConfig`), `js/calculator.js` (калькулятор стоимости монтажа), `js/auth.js` (mock-логин, использует `localStorage['isLoggedIn']`/`'username']`).
- **Мобільні анімації**: `js/mobile-animations.js` — стандартизована система swipe-переходов для всіх секцій (використовує motion-токени, hardware acceleration). Приклад: `mobileAnimations.show('main-container', 'right')`. Детально: `docs/MOBILE-ANIMATIONS.md`.

## Картинки и PWA
- Responsive images: генерируются со суффиксами `-320w/-480w/-768w/-1200w` — используйте `npm run images:gen`; watch: `npm run images:watch` (зависит от `sharp`).
- LQIP/base64 хранится в продуктах — есть скрипты очистки: `npm run cleanup:base64` / `cleanup:base64:dry`.
- Lazy-loading: `img[data-src]` + `reinitLazyLoading()`.
- Service Worker: `service-worker.js` — обновляйте `CACHE_NAME` и `urlsToCache` при изменениях критичных ассетов.

## Тесты и команды
- Unit/Integration: `npm test` — Vitest + JSDOM (см. `vitest.config.js` для подавления шума при загрузке компонентов).
- Визуальные тесты: `npm run visual:test` / `npm run visual:create-baseline` — Playwright + pixelmatch (см. `tests/visual/README.md`).
  - Требуют установки Playwright: `npx playwright install chromium`.
  - Регенерация baseline после UI-изменений: `npm run visual:create-baseline`, проверьте скриншоты в `tests/visual/baseline/` и закоммитьте.
- Генерация картинок: `npm run images:gen` / `npm run images:watch`.
- Локальный сервер: `python3 -m http.server 5173`.

## PR-checklist ✅
- Запустить unit tests: `npm test`
- Перегенерировать визуальные baseline при UI-изменениях: `npm run visual:create-baseline` (проверьте `tests/visual/baseline/`)
- Перегенерировать изображения при изменениях в `picture/`: `npm run images:gen`
- Проверить `window.validateProduct` при изменениях модели товара
- Проверить локальную сборку/preview: `npm run build && npm run preview` (или `python3 -m http.server 5173`)

