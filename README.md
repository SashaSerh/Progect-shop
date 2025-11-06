# Progect-shop

Одностраничное приложение (SPA) без фреймворков: чистые HTML + CSS + JS, динамическая подгрузка компонентов, PWA с Service Worker. По умолчанию каталог товаров берётся из `data/products.json`.

## Быстрый старт

Запустить локальный сервер (рекомендуется, т.к. компоненты подгружаются через fetch):

```bash
# Вариант на Python 3
python3 -m http.server 5173
# откройте http://localhost:5173/
```

Тесты:

```bash
npm test
```

## Структура

- `index.html` — корневой контейнер приложения
- `components/` — HTML-фрагменты секций (header, hero, products и т.д.), подгружаются динамически
- `css/main.css` — стили, переменные тем, адаптив и анимации
- `js/` — инициализация, навигация, каталог, корзина, i18n, тема, провайдеры данных
- `data/products.json` — основной (статический) источник товаров по умолчанию
- `picture/` — изображения товаров
- `service-worker.js` — кэширование для PWA

## Провайдеры данных (по умолчанию: Static JSON)

Приложение может работать с несколькими провайдерами данных. Если явно не выбран провайдер, используется StaticJsonProvider (чтение `data/products.json`). Переключение можно сделать в консоли браузера.

- Static JSON (read‑only, default):

```js
// явное переключение
window.switchToStaticJson();
// или задать путь и переключить
window.configureStaticJson({ path: 'data/products.json' });
```

- LocalStorage (для локального редактирования через админ‑UI):

```js
window.switchToLocalProvider();
```

- GitCMS (GitHub API):

```js
window.configureGitCMS({
  repo: 'owner/repo',     // например: 'SashaSerh/Progect-shop'
  branch: 'main',
  path: 'data/products.json',
  token: 'ghp_...'
});
```

- Supabase (PostgREST):

```js
window.configureSupabase({
  url: 'https://<project>.supabase.co',
  key: '<service_or_anon_key>',
  table: 'products',
  schema: 'public'
});
```

Примечания:
- StaticJsonProvider — только чтение. Для записи используйте LocalStorage, GitCMS или Supabase.
- При смене провайдера обновите страницу.

## Политика изображений товара

- Только исходный формат файла (jpg/png/webp) + responsive‑варианты с суффиксами ширины:
  - `-320w`, `-480w`, `-768w`, `-1200w` (например: `picture/conditioners/1-480w.jpg`).
- AVIF/WEBP‑источники в `<picture>` для локальных путей не используются, чтобы избежать 404.
- Генерация вариантов:

```bash
npm run images:gen
# или наблюдение за директориями
npm run images:watch
```

Скрипт создаёт соседние файлы в исходном формате для всех оригиналов в `picture/`.

## PWA и Service Worker

- При изменении критичных ресурсов (HTML/CSS/JS) инкрементируйте константу `CACHE_NAME` в `service-worker.js`, чтобы форсировать обновление кэша у клиентов.
- Стратегии: `network-first` для навигаций; для статических ассетов — cache‑first с догрузкой в кэш.

## Админ‑режим (локально)

- Админ‑UI работает с активным провайдером. Для локальных правок используйте LocalStorage:

```js
window.switchToLocalProvider();
```

- Экспорт изображений — кладите оригинал в `picture/...`; далее запустите генератор responsive‑вариантов. Имена сохраняйте, варианты — только с суфиксами ширины.

## Тесты и качества

- Тесты: `npm test` (Vitest, JSDOM). В логах возможны предупреждения `Failed to parse URL` при попытке подгрузить компоненты — это ожидаемо в среде JSDOM и не влияет на PASS.

## Частые задачи

- Обновить товары из `data/products.json` (статический источник по умолчанию) — просто измените файл и перезагрузите страницу.
- Переключиться на другой провайдер — используйте хелперы из раздела «Провайдеры данных» в консоли DevTools.
- Сгенерировать responsive‑изображения — `npm run images:gen`.
