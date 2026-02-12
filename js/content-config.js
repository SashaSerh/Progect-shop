// Project categories configuration and helpers
// Architecture: attach to window to keep global SPA style (no bundler)
(function () {
  'use strict';

  // Slug => component path mapping (aligned with components/ files)
  const categoryComponents = {
    'conditioners': 'components/category-conditioners.html',
    'commercial-ac': 'components/category-commercial-ac.html',
    'multi-split': 'components/category-multi-split.html',
    'indoor-units': 'components/category-indoor-units.html',
    'outdoor-units': 'components/category-outdoor-units.html',
    'mobile-ac': 'components/category-mobile-ac.html',
    'fan-coils': 'components/category-fan-coils.html',
    'humidifiers': 'components/category-humidifiers.html',
    'air-purifiers': 'components/category-air-purifiers.html',
    'dehumidifiers': 'components/category-dehumidifiers.html',
    'controllers': 'components/category-controllers.html',
    'heat-pumps': 'components/category-heat-pumps.html',
    'electric-heaters': 'components/category-electric-heaters.html',
    'accessories': 'components/category-accessories.html',
  };

  // Slug => product group (used for grouping/filters if needed)
  const categoryGroups = {
    'conditioners': 'ac',
    'commercial-ac': 'ac',
    'multi-split': 'ac',
    'indoor-units': 'ac',
    'outdoor-units': 'ac',
    'mobile-ac': 'ac',
    'fan-coils': 'ac',
    'humidifiers': 'ac',
    'air-purifiers': 'ac',
    'dehumidifiers': 'ac',
    'controllers': 'ac',
    'heat-pumps': 'ac',
    'electric-heaters': 'ac',
    'accessories': 'accessory',
  };

  // Full category registry with localized names
  const Categories = {
    'conditioners': {
      slug: 'conditioners',
      component: categoryComponents['conditioners'],
      group: categoryGroups['conditioners'],
      name: { uk: 'Кондиціонери', ru: 'Кондиционеры', en: 'Conditioners' },
    },
    'commercial-ac': {
      slug: 'commercial-ac',
      component: categoryComponents['commercial-ac'],
      group: categoryGroups['commercial-ac'],
      name: { uk: 'Комерційні кондиціонери', ru: 'Коммерческие кондиционеры', en: 'Commercial AC' },
    },
    'multi-split': {
      slug: 'multi-split',
      component: categoryComponents['multi-split'],
      group: categoryGroups['multi-split'],
      name: { uk: 'Мульти-спліт системи', ru: 'Мульти-сплит системы', en: 'Multi-split systems' },
    },
    'indoor-units': {
      slug: 'indoor-units',
      component: categoryComponents['indoor-units'],
      group: categoryGroups['indoor-units'],
      name: { uk: 'Внутрішні блоки кондиціонера', ru: 'Внутренние блоки кондиционера', en: 'Indoor units' },
    },
    'outdoor-units': {
      slug: 'outdoor-units',
      component: categoryComponents['outdoor-units'],
      group: categoryGroups['outdoor-units'],
      name: { uk: 'Зовнішні блоки кондиціонера', ru: 'Наружные блоки кондиционера', en: 'Outdoor units' },
    },
    'mobile-ac': {
      slug: 'mobile-ac',
      component: categoryComponents['mobile-ac'],
      group: categoryGroups['mobile-ac'],
      name: { uk: 'Мобільні кондиціонери та моноблоки', ru: 'Мобильные кондиционеры и моноблоки', en: 'Mobile AC and monoblocks' },
    },
    'fan-coils': {
      slug: 'fan-coils',
      component: categoryComponents['fan-coils'],
      group: categoryGroups['fan-coils'],
      name: { uk: 'Фанкойли', ru: 'Фанкойлы', en: 'Fan coils' },
    },
    'humidifiers': {
      slug: 'humidifiers',
      component: categoryComponents['humidifiers'],
      group: categoryGroups['humidifiers'],
      name: { uk: 'Зволожувачі повітря', ru: 'Увлажнители воздуха', en: 'Humidifiers' },
    },
    'air-purifiers': {
      slug: 'air-purifiers',
      component: categoryComponents['air-purifiers'],
      group: categoryGroups['air-purifiers'],
      name: { uk: 'Очищувачі повітря', ru: 'Очистители воздуха', en: 'Air purifiers' },
    },
    'dehumidifiers': {
      slug: 'dehumidifiers',
      component: categoryComponents['dehumidifiers'],
      group: categoryGroups['dehumidifiers'],
      name: { uk: 'Осушувачі повітря', ru: 'Осушители воздуха', en: 'Dehumidifiers' },
    },
    'controllers': {
      slug: 'controllers',
      component: categoryComponents['controllers'],
      group: categoryGroups['controllers'],
      name: { uk: 'Регулятори та модулi', ru: 'Регуляторы и модули', en: 'Controllers & modules' },
    },
    'heat-pumps': {
      slug: 'heat-pumps',
      component: categoryComponents['heat-pumps'],
      group: categoryGroups['heat-pumps'],
      name: { uk: 'Теплові насоси', ru: 'Тепловые насосы', en: 'Heat pumps' },
    },
    'electric-heaters': {
      slug: 'electric-heaters',
      component: categoryComponents['electric-heaters'],
      group: categoryGroups['electric-heaters'],
      name: { uk: 'Електричні обігрівачі', ru: 'Электрические обогреватели', en: 'Electric heaters' },
    },
    'accessories': {
      slug: 'accessories',
      component: categoryComponents['accessories'],
      group: categoryGroups['accessories'],
      name: { uk: 'Комплектуючі', ru: 'Комплектующие', en: 'Accessories' },
    },
  };

  // UA visible names => slug helper (for admin input imports)
  const UaNameToSlug = {
    'Кондиціонери': 'conditioners',
    'Комерційні кондиціонери': 'commercial-ac',
    'Мульти-спліт системи': 'multi-split',
    'Внутрішні блоки кондиціонера': 'indoor-units',
    'Зовнішні блоки кондиціонера': 'outdoor-units',
    'Мобільні кондиціонери та моноблоки': 'mobile-ac',
    'Фанкойли': 'fan-coils',
    'Зволожувачі повітря': 'humidifiers',
    'Очищувачі повітря': 'air-purifiers',
    'Осушувачі повітря': 'dehumidifiers',
    'Регулятори та модулi': 'controllers',
    'Теплові насоси': 'heat-pumps',
    'Електричні обігрівачі': 'electric-heaters',
    'Комплектуючі': 'accessories',
  };

  // Public helpers
  function getCategoryBySlug(slug) { return Categories[slug] || null; }
  function getComponentBySlug(slug) { return categoryComponents[slug] || null; }
  function listCategories() { return Object.values(Categories); }

  // Expose to window
  window.Categories = Categories;
  window.CategoryUaToSlug = UaNameToSlug;
  window.getCategoryBySlug = getCategoryBySlug;
  window.getComponentBySlug = getComponentBySlug;
  window.listCategories = listCategories;
})();
// Контент и контакты для быстрой правки без участия верстки
window.contentConfig = {
  business: {
    name: 'ClimaTech',
    legalName: 'ИП ClimaTech',
    description: 'Монтаж и обслуживание систем вентиляции и кондиционирования',
    areaServed: ['Киев', 'Киевская область'],
    openingHours: ['Mo-Fr 09:00-18:00', 'Sa 10:00-16:00'],
  },
  contacts: {
    phonePrimary: '+380633353410',
    phoneSecondary: '+380995543499',
  whatsapp: '+380633353410',
  telegram: 'Alexandrsergien',
  email: 'climatechprovent@gmail.com',
    address: 'ул. Климатическая, 123, Киев'
  },
  social: {
    instagram: 'https://www.instagram.com/konditsionery_.obukhov/?__pwa=1',
    facebook: 'https://www.facebook.com/profile.php?id=61550678776624'
  },
  contactForm: {
    provider: 'formspree',
    // Замените your_form_id на ваш ID из Formspree, например: https://formspree.io/f/abcdwxyz
    endpoint: 'https://formspree.io/f/mblzzrgr',
    // fallback для почты если endpoint пуст
  mailto: 'climatechprovent@gmail.com'
  },
  portfolio: [
    // Замените позже своими фото и текстами
    {
      src: 'https://placehold.co/480x320?text=Work+1',
      alt: 'Монтаж кондиционера — кейс 1',
      titleKey: 'portfolio-item-1-title',
      descriptionKey: 'portfolio-item-1-description',
      url: '#case-1'
    },
    {
      src: 'https://placehold.co/480x320?text=Work+2',
      alt: 'Монтаж вентиляции — кейс 2',
      titleKey: 'portfolio-item-2-title',
      descriptionKey: 'portfolio-item-2-description',
      url: '#case-2'
    },
    {
      src: 'https://placehold.co/480x320?text=Work+3',
      alt: 'Обслуживание систем — кейс 3',
      titleKey: 'portfolio-item-3-title',
      descriptionKey: 'portfolio-item-3-description',
      url: '#case-3'
    }
  ],
  // Опциональный источник отзывов (JSON): массив объектов {name, rating, text:{ru,uk}}
  reviewsUrl: "",
  reviews: [
    { name: 'Андрей', rating: 5, text: { ru: 'Быстро смонтировали, всё аккуратно. Рекомендую!', uk: 'Швидко змонтували, все акуратно. Рекомендую!' } },
    { name: 'Ольга', rating: 4, text: { ru: 'Помогли подобрать оборудование под мою квартиру.', uk: 'Допомогли підібрати обладнання для моєї квартири.' } }
  ],
  faq: [
    { 
      q: { ru: 'Сколько длится монтаж кондиционера?', uk: 'Скільки триває монтаж кондиціонера?' }, 
      a: { ru: 'Стандартный монтаж сплит-системы занимает 3–6 часов. Мульти-сплит системы или сложные трассы могут потребовать больше времени — до 1–2 дней.', uk: 'Стандартний монтаж спліт-системи займає 3–6 годин. Мульти-спліт системи або складні траси можуть потребувати більше часу — до 1–2 днів.' } 
    },
    { 
      q: { ru: 'Какая гарантия на установку и оборудование?', uk: 'Яка гарантія на встановлення та обладнання?' }, 
      a: { ru: 'Мы предоставляем гарантию до 5 лет на монтажные работы и официальную гарантию производителя на оборудование (обычно 3–5 лет в зависимости от бренда).', uk: 'Ми надаємо гарантію до 5 років на монтажні роботи та офіційну гарантію виробника на обладнання (зазвичай 3–5 років залежно від бренду).' } 
    },
    { 
      q: { ru: 'Как часто нужно обслуживать кондиционер?', uk: 'Як часто потрібно обслуговувати кондиціонер?' }, 
      a: { ru: 'Рекомендуем проводить сервисное обслуживание минимум 1 раз в год — весной перед сезоном. Фильтры желательно чистить каждые 2–4 недели при активном использовании.', uk: 'Рекомендуємо проводити сервісне обслуговування мінімум 1 раз на рік — навесні перед сезоном. Фільтри бажано чистити кожні 2–4 тижні при активному використанні.' } 
    },
    { 
      q: { ru: 'Можно ли установить кондиционер зимой?', uk: 'Чи можна встановити кондиціонер взимку?' }, 
      a: { ru: 'Да, монтаж возможен круглый год. Однако при температуре ниже -5°C запуск системы откладывается до потепления или требуется установка зимнего комплекта для пуска при низких температурах.', uk: 'Так, монтаж можливий цілий рік. Однак при температурі нижче -5°C запуск системи відкладається до потепління або потрібне встановлення зимового комплекту для запуску при низьких температурах.' } 
    },
    { 
      q: { ru: 'Как подобрать мощность кондиционера?', uk: 'Як підібрати потужність кондиціонера?' }, 
      a: { ru: 'Базовый расчёт: 1 кВт охлаждения на 10 м² площади. Но учитываются также: этаж, солнечная сторона, количество техники и людей. Наши специалисты бесплатно помогут с расчётом.', uk: 'Базовий розрахунок: 1 кВт охолодження на 10 м² площі. Але враховуються також: поверх, сонячна сторона, кількість техніки та людей. Наші спеціалісти безкоштовно допоможуть з розрахунком.' } 
    },
    { 
      q: { ru: 'Что входит в стандартный монтаж?', uk: 'Що входить у стандартний монтаж?' }, 
      a: { ru: 'Установка внутреннего и наружного блоков, прокладка трассы до 3 метров, вакуумирование системы, пуско-наладка, проверка работоспособности и инструктаж по эксплуатации.', uk: 'Встановлення внутрішнього та зовнішнього блоків, прокладання траси до 3 метрів, вакуумування системи, пуско-налагодження, перевірка працездатності та інструктаж з експлуатації.' } 
    },
    { 
      q: { ru: 'Можно ли использовать кондиционер для обогрева?', uk: 'Чи можна використовувати кондиціонер для обігріву?' }, 
      a: { ru: 'Да, большинство современных сплит-систем работают в режиме теплового насоса. Эффективны до -15°C (инверторные модели — до -25°C). Это экономичнее электрообогревателей в 3–4 раза.', uk: 'Так, більшість сучасних спліт-систем працюють у режимі теплового насоса. Ефективні до -15°C (інверторні моделі — до -25°C). Це економніше електрообігрівачів у 3–4 рази.' } 
    },
    { 
      q: { ru: 'Шумит ли кондиционер?', uk: 'Чи шумить кондиціонер?' }, 
      a: { ru: 'Современные инверторные модели очень тихие: 19–24 дБ в ночном режиме — это тише шёпота. Наружный блок громче (45–55 дБ), поэтому важно правильно выбрать место установки.', uk: 'Сучасні інверторні моделі дуже тихі: 19–24 дБ у нічному режимі — це тихіше за шепіт. Зовнішній блок гучніший (45–55 дБ), тому важливо правильно обрати місце встановлення.' } 
    },
    { 
      q: { ru: 'Как оплатить услуги?', uk: 'Як оплатити послуги?' }, 
      a: { ru: 'Принимаем наличные, карты (Visa/Mastercard), безналичный расчёт для юридических лиц, оплату частями через ПриватБанк и Monobank.', uk: 'Приймаємо готівку, картки (Visa/Mastercard), безготівковий розрахунок для юридичних осіб, оплату частинами через ПриватБанк та Monobank.' } 
    },
    { 
      q: { ru: 'Работаете ли вы в выходные?', uk: 'Чи працюєте ви у вихідні?' }, 
      a: { ru: 'Да, работаем без выходных с 8:00 до 20:00. В сезон (май–август) возможны вызовы до 22:00 по предварительной договорённости.', uk: 'Так, працюємо без вихідних з 8:00 до 20:00. У сезон (травень–серпень) можливі виклики до 22:00 за попередньою домовленістю.' } 
    }
  ]
};
