# Добавление товара локально и привязка изображения

Этот гайд описывает два проверенных потока для локальной разработки:
- Вариант A (рекомендуется): сразу добавляем файл в `picture/` и указываем его путь в товаре.
- Вариант B: временно храним картинку как base64 (data URL) в JSON → затем экспортируем её в `picture/` скриптом и переписываем ссылки.

## Минимальные требования схемы (ProductSchema)
Обязательные поля:
- `sku`: строка, уникальная
- `categories`: массив со слагами (минимум один)
- `name.uk`: название (uk)
- `price`: число ≥ 0
- `images[0].src`: путь к изображению (минимум одно)

Желательно добавить `images[0].alt.uk` для доступности (ARIA/Screen Readers).

Пример минимального товара:

```json
{
  "id": "auto-or-your-id",
  "sku": "AC-001",
  "categories": ["category-conditioners"],
  "name": { "uk": "Настінний кондиціонер X", "ru": "Настенный кондиционер X", "en": "" },
  "shortDesc": { "uk": "Короткий опис", "ru": "Краткое описание", "en": "" },
  "fullDesc": { "uk": "", "ru": "", "en": "" },
  "price": 12999,
  "inStock": true,
  "flags": { "isNew": true },
  "images": [
    {
      "src": "picture/conditioners/x1.jpg",
      "alt": { "uk": "Кондиціонер X1", "ru": "Кондиционер X1", "en": "" },
      "featured": true
    }
  ],
  "specs": [],
  "attributes": {},
  "seo": { "slug": "nastinnyy-kondycioner-x1" }
}
```

## Вариант A (рекомендуется): локальный файл в picture/
1) Поместите исходное изображение в `picture/` (можно с подпапками):
   - Форматы: `jpg/jpeg`, `png`, `webp`, `avif`
   - Имя файла: латиница, без пробелов (например, `conditioners/x1.jpg`)

2) В нужный JSON (обычно `data/products.json`) добавьте товар и укажите `images[0].src = "picture/..."`.

3) Сгенерируйте responsive‑варианты и LQIP:

```sh
npm run images:gen
```

Это создаст размеры `-320w/-480w/-768w/-1200w` в исходном формате, а также WebP/AVIF и `-lqip.webp`. Рендеринг карточек уже использует `<picture>` и LQIP автоматически.

4) Проверьте карточку товара в интерфейсе (локальный сервер): изображение должно подгружаться плавно.

5) Если вы удаляли/заменяли изображения, проверьте «осиротевшие» файлы:

```sh
npm run images:cleanup:dry   # просмотр кандидатов без удаления
npm run images:cleanup       # фактическая очистка
```

## Вариант B: base64 → экспорт в файлы
1) Временно добавьте картинку как data URL (base64) в `images[].src` в JSON (например, `data/products.json`).

2) Экспортируйте base64 в файлы и перепишите ссылки на `picture/...`:

```sh
npm run export:pictures
```

Скрипт сохранит файлы в `picture/` и создаст обновлённый JSON (обычно `data/products.local.json`).

3) Сгенерируйте responsive‑варианты и LQIP:

```sh
npm run images:gen
```

4) Откройте интерфейс и проверьте изображение.

## Советы и проверка
- Минимальные поля: `sku`, `categories[]`, `name.uk`, `price >= 0`, `images[0].src`.
- Для доступности заполните `images[].alt.uk`.
- Главное изображение помечайте `featured: true`.
- Слаги категорий берите из уже используемых (например, `category-conditioners`, `category-controllers`, …).
- После массовых правок запускайте: `images:cleanup:dry` → `images:cleanup`.

## Быстрый чек‑лист
- [ ] Картинка добавлена в `picture/` (или временно base64 → затем экспорт)
- [ ] Товар сохранён в `data/products.json` (или в локальный JSON из вашего потока)
- [ ] `npm run images:gen` выполнен, LQIP/варианты сгенерированы
- [ ] При необходимости `npm run images:cleanup:dry` → `npm run images:cleanup`
