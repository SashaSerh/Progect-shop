# Progect-shop

Одностраничное приложение (SPA) без фреймворков: чистые HTML + CSS + JS, динамическая подгрузка компонентов, PWA с Service Worker. По умолчанию каталог товаров берётся из `data/products.json`.

## Быстрый старт

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production сборка → dist/
npm run preview    # Просмотр production сборки
```

## Структура

- `index.html` — корневой контейнер приложения
- `components/` — HTML-фрагменты секций (header, hero, products и т.д.), подгружаются динамически
- `css/main.css` — стили, переменные тем, адаптив и анимации
- `js/` — инициализация, навигация, каталог, корзина, i18n, тема, провайдеры данных
- `data/products.json` — основной (статический) источник товаров по умолчанию
- `picture/` — изображения товаров
- `service-worker.js` — кэширование для PWA

## Провайдеры данных

По умолчанию используется StaticJsonProvider (чтение `data/products.json`). Переключение провайдера — в консоли браузера:

```js
window.switchToStaticJson();           // Static JSON (read-only, default)
window.switchToLocalProvider();        // LocalStorage (для локального редактирования)
window.configureGitCMS({ repo, token }); // GitHub API
```

## PWA и Service Worker

- При изменении ресурсов обновите `CACHE_NAME` в `service-worker.js`
- Стратегии: network-first для навигаций, cache-first для статики

## Админ-режим

Для локального редактирования переключитесь на LocalStorage провайдер:

```js
window.switchToLocalProvider();
```
