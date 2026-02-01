# Инструкции для AI-агентов (Progect-shop)

Vanilla ES-модульный SPA для климатического оборудования. Vite build, hash-роутинг, i18n (uk/ru), PWA.

## Быстрый старт
```bash
npm run dev          # Vite dev server (порт 5173)
npm test             # Vitest + JSDOM
npm run build        # production build → dist/
npm run visual:test  # визуальные тесты (Playwright)
npm run images:gen   # responsive images (-320w/-480w/-768w/-1200w)
```

## Архитектура
- **Точка входа**: [js/main.js](js/main.js) — ESM, динамическая загрузка HTML из `components/` через `loadComponent(containerId, path)`.
- **LANDING_MODE** (строка 20): `true` = лендинг услуг (каталог/корзина скрыты), `false` = e-commerce. Проверяйте UI при смене!
- **Роутинг**: hash-based (`#products`, `#cart`, `#product-<id>`, `#category-<slug>`).
- **Конфигурация**: [js/content-config.js](js/content-config.js) (classic script) → `window.Categories`, `window.contentConfig.contacts`.

## i18n и тема
- Язык: `localStorage['language']` (default `uk`). Словари в [js/i18n.js](js/i18n.js).
- Тема: `localStorage['theme']` (`light`/`dark`). Переключение: `toggleTheme()` из [js/theme.js](js/theme.js).
- Все текстовые поля товаров: `{ uk, ru }` — пример: `"name": { "uk": "Кондиціонер", "ru": "Кондиционер" }`.

## Данные и провайдеры
- По умолчанию StaticJson (read-only): `data/products.json`.
- Провайдеры в [js/data-provider.js](js/data-provider.js): `LocalStorage`, `GitCMS`, `Supabase`.
- DevTools: `switchToLocalProvider()`, `configureGitCMS({repo, token})`, `configureSupabase({url, key})`.
- Валидация: `window.validateProduct(product, { existingIds, existingSkus })` — обязательна при CRUD.

## CSS Design System
- Токены в `:root` [css/main.css](css/main.css): `--color-*`, `--spacing-*`, `--radius-*`, `--motion-*`.
- **Кнопки**: `.btn` + `.btn--primary|secondary|danger` + `.btn--sm|md|lg`.
- **Анимации**: `.anim-fade-in`, `.anim-scale-in`, `.anim-slide-in-right` и модификаторы `--delay-*`, `--duration-*`.

## Ключевые модули
| Модуль | Назначение |
|--------|------------|
| [js/products.js](js/products.js) | каталог, фильтры, `filterProductsDebounced` |
| [js/cart.js](js/cart.js) | корзина, localStorage persistence |
| [js/product-schema.js](js/product-schema.js) | схема товара, `validateProduct()` |
| [js/mobile-animations.js](js/mobile-animations.js) | swipe-переходы между секциями |
| [js/image-loader.js](js/image-loader.js) | lazy-loading, `reinitLazyLoading()` |

## PWA и кэширование
- [service-worker.js](service-worker.js): обновляйте `CACHE_NAME` при изменениях ассетов.
- Responsive images: `-320w/-480w/-768w/-1200w` суффиксы. Генерация: `npm run images:gen`.

## PR-checklist
1. `npm test` — unit тесты
2. `npm run visual:create-baseline` — при UI-изменениях (проверьте `tests/visual/baseline/`)
3. `npm run images:gen` — при изменениях в `picture/`
4. Проверить `validateProduct()` при изменениях модели товара
5. `npm run build && npm run preview` — проверить сборку

