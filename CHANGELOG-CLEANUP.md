# Code Cleanup — 19 января 2026

## 🗑️ Удалённые файлы

### Неиспользуемые модули (мёртвый код):
- `js/router.js` (210 строк) — никем не импортировался
- `js/component-loader.js` (60+ строк) — импортировался только router.js

### Debug/trace скрипты (временные):
- `scripts/trace-about-desktop.mjs`
- `scripts/trace-about-interaction.mjs`
- `scripts/trace-about-load.mjs`
- `scripts/trace-hash-set.mjs`
- `scripts/trace-i18n-check.mjs`
- `scripts/debug-maincontainer.mjs`
- `scripts/check-about-loaded.mjs`
- `scripts/check-main-container-classes.mjs`

### Временные файлы:
- `output.txt` (88KB) — устаревший дамп кода
- `settings.json` — настройки Live Server (не нужны для Vite)

## 📦 Перемещённые файлы

Файлы-примеры перемещены в `docs/examples/` (не включаются в production build):
- `js/QUICK-REFERENCE.js` → `docs/examples/QUICK-REFERENCE.js` (372 строки)
- `js/mobile-animations-examples.js` → `docs/examples/mobile-animations-examples.js` (310 строк)
- `js/ui-patterns-examples.js` → `docs/examples/ui-patterns-examples.js` (438 строк)

Создан `docs/examples/README.md` с документацией.

## 🔧 Исправления

### Тесты:
- `tests/calculator-route.test.js` — убран `it.skip`, тест теперь запускается (с комментарием о JSDOM ограничениях)

## 📊 Результат

### Удалено из `/js`:
- ~1,180 строк кода (примеры + мёртвый код)
- Размер production build остался прежним (225KB CSS gzip, 278KB main JS)

### Удалено из `/scripts`:
- 8 debug-скриптов
- Упрощена структура проекта

### Преимущества:
- ✅ Чище структура проекта
- ✅ Нет путаницы с неиспользуемыми модулями
- ✅ Примеры в отдельном каталоге docs/examples/
- ✅ Все тесты проходят
- ✅ Сборка работает корректно
