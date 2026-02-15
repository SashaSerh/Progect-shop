# Инструкции для AI-агентов (Progect-shop)

Vanilla ES-модульный SPA для климатического оборудования. Vite build, hash-роутинг, i18n (uk/ru), PWA.

## Быстрый старт
```bash
npm run dev          # Vite dev server (порт 5173)
npm test             # Vitest + JSDOM
npm run build        # production build → dist/
npm run images:gen   # responsive images (-320w/-480w/-768w/-1200w)
```

## Архитектура
- **Точка входа**: `js/main.js` (~5 700 строк) — монолитный оркестратор SPA. Динамическая загрузка HTML из `components/` через `loadComponent(containerId, path)`.
- **LANDING_MODE** (`js/main.js`, строка ~28): `true` = лендинг услуг (каталог/корзина скрыты), `false` = e-commerce. Когда `true`, функция `hideProductsEntryPoints()` прячет все ссылки на каталог/корзину.
- **Два параллельных роутера** в `js/main.js` — оба слушают `hashchange`:
  - **Landing-роутер** (`handleLandingRoute`): `#service-*`, `#case-*`, `#faq`, `#about`, `#contacts` — управляет видимостью через HTML-атрибут `hidden`.
  - **E-commerce-роутер** (`handleRouteChange`): `#products`, `#cart`, `#product-<id>`, `#category-<slug>`, `#calculator`, `#admin` — управляет через `style.display`.
  - ⚠️ При добавлении маршрута определи, в какой роутер он попадает. Не смешивай `hidden` и `style.display`.
- **Порядок загрузки скриптов** в `index.html` критичен:
  ```html
  <script src="js/content-config.js"></script>      <!-- classic, → window.Categories -->
  <script src="js/product-schema.js"></script>       <!-- classic, → window.validateProduct -->
  <script src="js/data-provider.js"></script>        <!-- classic, → window.dataProvider -->
  <script type="module" src="js/main.js"></script>   <!-- ESM, точка входа -->
  ```

## ⚠️ Кнопки: data-variant, НЕ BEM-модификаторы
Тест `tests/no-legacy-btn-classes.test.js` **запрещает** `btn--*` классы во всех `components/`, `js/`, `css/`, `index.html`. Сборка сломается!
```html
<!-- ✅ ПРАВИЛЬНО -->
<button class="btn" data-variant="primary">Купить</button>
<a class="btn" data-variant="wa">WhatsApp</a>

<!-- ❌ ЗАПРЕЩЕНО — тест упадёт -->
<button class="btn btn--primary">Купить</button>
```
Варианты `data-variant`: `primary`, `secondary`, `ghost`, `danger`, `wa`, `tg`, `ig`.

## i18n и тема
- Язык: `localStorage['language']` (default `uk`). Словари в `js/i18n.js` (объект `translations`).
- HTML-разметка: `data-i18n="ключ"` для текста, `data-i18n-placeholder` для placeholder. Функция `switchLanguage(lang)` обновляет DOM.
- Тема: `localStorage['theme']` (`light`/`dark`). Переключение: `toggleTheme()` из `js/theme.js`.
- Все текстовые поля товаров — i18n-объект: `{ uk: "...", ru: "..." }`. Это касается `name`, `description`, `summary`, `shortDesc`, `fullDesc`, alt-текстов изображений.

## Данные и провайдеры
- По умолчанию StaticJson (read-only): `data/products.json`.
- Провайдеры в `js/data-provider.js` (classic script, глобалы на `window`): `LocalStorageProvider`, `GitCMSProvider`, `SupabaseProvider`.
- DevTools: `switchToLocalProvider()`, `configureGitCMS({repo, token})`, `configureSupabase({url, key})`.
- Валидация: `window.validateProduct(product, { existingIds, existingSkus })` — обязательна при CRUD.
- Схема товара: `js/product-schema.js` — нормализация через `normalizeProduct()`, валидация через `validateProduct()`.

## CSS Design System
- Один файл `css/main.css` (~14 500 строк). Токены в `:root`:
  - Spacing: `--spacing-xs` (4px) … `--spacing-5xl` (80px)
  - Colors: `--color-primary`, `--color-secondary`, `--color-danger`, `--color-success`
  - Radius: `--radius-sm` … `--radius-full` (9999px)
  - Motion: `--motion-duration-fast` (150ms) … `--motion-duration-slow` (500ms)
- **Именование**: BEM-подобная нотация (`block__element--modifier`), например: `.product-card__title`, `.hero__cta--pulse`.
- **Анимации**: `.anim-fade-in`, `.anim-scale-in`, `.anim-slide-in-right` с модификаторами `--delay-*`, `--duration-*`.

## Компонент-загрузчик
- `loadComponent(containerId, path)` после вставки HTML автоматически вызывает `reinitLazyLoading()` и `switchLanguage()` — **не нужно делать это вручную**.
- Модуль `js/component-loader.js` — улучшенная версия с кэшированием. Inline-версия в `main.js` — для обратной совместимости.
- Изображения используют LQIP: `data-src` вместо `src`, blur-up через `image-loader.js`.

## Тестирование
- **Стек**: Vitest + JSDOM. Конфиг: `vitest.config.js`, setup: `tests/setup.js`.
- **~44 тестовых файла** в `tests/*.test.js`. Именование: `модуль.test.js`.
- **Classic scripts** (`content-config.js`, `product-schema.js`, `data-provider.js`) тестируются через `fs.readFileSync` + `eval` в sandbox, т.к. не ESM.
- **Lint-тесты**: `tests/no-legacy-btn-classes.test.js` сканирует файлы и запрещает `btn--*` классы. Подобные enforcement-тесты проверяют конвенции на уровне CI.
- Describe/it строки — на русском/украинском.

## Ключевые модули
| Модуль | Тип | Назначение |
|--------|-----|------------|
| `js/main.js` | ESM | Оркестратор: роутинг, загрузка компонентов, глобальные хендлеры |
| `js/products.js` | ESM | Каталог, фильтры, `filterProductsDebounced` |
| `js/cart.js` | ESM | Корзина, localStorage persistence |
| `js/product-schema.js` | classic | Схема товара, `window.validateProduct()` |
| `js/content-config.js` | classic | `window.Categories`, `window.contentConfig` |
| `js/data-provider.js` | classic | `window.dataProvider`, CRUD-провайдеры |
| `js/i18n.js` | ESM | Словари `translations`, `switchLanguage()` |
| `js/toast.js` | ESM | Уведомления: `toast.success()`, `toast.error()` |
| `js/image-loader.js` | ESM | Lazy-loading LQIP, `reinitLazyLoading()` |
| `js/mobile-animations.js` | ESM | Swipe-переходы между секциями |

## PWA и кэширование
- `service-worker.js`: **обновляйте `CACHE_NAME`** (сейчас `'climat-control-v111'`) при изменениях ассетов — иначе клиенты получат старый кэш.
- Стратегия: network-first для навигаций, cache-first для статики.
- При активации нового SW — автоперезагрузка страницы через `SW_ACTIVATED` message.
- Responsive images: `-320w/-480w/-768w/-1200w` суффиксы. Генерация: `npm run images:gen` (sharp).

## PR-checklist
1. `npm test` — unit тесты (включая lint-тесты типа no-legacy-btn-classes)
2. `npm run images:gen` — при добавлении/изменении изображений в `picture/`
4. Проверить `validateProduct()` при изменениях модели товара
5. Обновить `CACHE_NAME` в `service-worker.js` при изменениях ассетов
6. `npm run build && npm run preview` — проверить production-сборку

