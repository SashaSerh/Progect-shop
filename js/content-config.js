// Контент и контакты для быстрой правки без участия верстки
export const contentConfig = {
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
    telegram: 'climate_service',
    email: 'info@climat-control.com',
    address: 'ул. Климатическая, 123, Киев'
  },
  contactForm: {
    provider: 'formspree',
    // Замените your_form_id на ваш ID из Formspree, например: https://formspree.io/f/abcdwxyz
    endpoint: 'https://formspree.io/f/mblzzrgr',
    // fallback для почты если endpoint пуст
    mailto: 'info@climat-control.com'
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
  ]
};
