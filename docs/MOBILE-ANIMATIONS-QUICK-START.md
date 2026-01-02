# Quick Start: Мобільні анімації

## 🚀 Швидкий початок (5 хвилин)

### 1. Імпортуйте модуль

```javascript
import { mobileAnimations } from './mobile-animations.js';
```

### 2. Базове використання

```javascript
// Показати секцію з swipe справа
await mobileAnimations.show('main-container', 'right');

// Сховати секцію з swipe вправо
await mobileAnimations.hide('main-container', 'right');
```

### 3. Готово! 🎉

Система автоматично:
- ✅ Визначає мобільний/десктоп режим
- ✅ Використовує hardware acceleration
- ✅ Запобігає конфліктам анімацій
- ✅ Респектує `prefers-reduced-motion`

## 📋 Швидка шпаргалка

### Напрямки анімацій

```javascript
'right' // Swipe справа → ліворуч (стандартно для "вперед")
'left'  // Swipe зліва → праворуч (стандартно для "назад")
```

### Типові сценарії

#### Відкрити сторінку

```javascript
if (window.innerWidth <= 768) {
    await mobileAnimations.show('main-container', 'right');
}
```

#### Повернутися назад

```javascript
if (window.innerWidth <= 768) {
    await mobileAnimations.hide('main-container', 'right');
}
```

#### Перехід між сторінками

```javascript
if (window.innerWidth <= 768) {
    await mobileAnimations.transitionBetween(
        'old-section',
        'new-section', 
        'right'
    );
}
```

## 🎨 Підтримувані секції

Працює "з коробки" для:
- `main-container` (about, calculator)
- `service-page` (послуги)
- `.portfolio`
- `.reviews`
- `.faq`
- `.contacts`
- `.welcome`

## ⚙️ Налаштування (опціонально)

```javascript
import { SectionSwipeManager, mobileAnimationConfig } from './mobile-animations.js';

const custom = new SectionSwipeManager('my-section', {
    duration: mobileAnimationConfig.duration.slow, // 500ms
    easing: mobileAnimationConfig.easing.emphasized
});

await custom.slideInFromRight();
```

## 🐛 Налагодження

```javascript
// Перевірити стан
const section = mobileAnimations.getSection('main-container');
console.log('Анімується:', section?.isAnimating);

// Скинути все
mobileAnimations.resetAll();
```

## 📚 Детальна документація

Дивіться: [`docs/MOBILE-ANIMATIONS.md`](../docs/MOBILE-ANIMATIONS.md)

Приклади: [`js/mobile-animations-examples.js`](./mobile-animations-examples.js)

## 💡 Поради

1. **Завжди перевіряйте `window.innerWidth <= 768`** перед анімацією
2. **Використовуйте `await`** для послідовних анімацій
3. **На десктопі** система автоматично відключається
4. **Не забудьте** додати секцію в CSS якщо створюєте нову

## ❓ Часті питання

**Q: Чому моя секція не анімується?**

A: Перевірте:
- Чи існує елемент з вказаним ID?
- Чи є всередині елемент з одним з підтримуваних класів?
- Чи width <= 768px?

**Q: Як додати підтримку нової секції?**

A: Додайте CSS класи:
```css
.my-section--slide-in-from-right { transform: translate3d(100%, 0, 0); opacity: 0; }
.my-section--slide-in { transform: translate3d(0, 0, 0); opacity: 1; }
.my-section--slide-out-to-right { transform: translate3d(100%, 0, 0); opacity: 0; }
```

Та в `_getSectionClass()` метод:
```javascript
if (this.element.querySelector('.my-section')) return 'my-section';
```

**Q: Анімація гальмує на старих телефонах?**

A: Система вже оптимізована з `translate3d` та `will-change`. Якщо проблеми залишаються:
- Зменшіть `duration` до `fast` (150ms)
- Перевірте розміри зображень на сторінці
- Використайте `prefers-reduced-motion`
