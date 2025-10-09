import { contentConfig } from './content-config.js';

function safeOpen(url) {
  try {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (typeof location !== 'undefined') {
      location.href = url;
    }
  } catch (e) {
    console.warn('Cannot open url in this environment:', e);
  }
}

export function buildWhatsAppLink(text = '') {
  const phone = contentConfig.contacts.whatsapp.replace(/\D/g, '');
  const query = new URLSearchParams({ text }).toString();
  return `https://wa.me/${phone}?${query}`;
}

export function buildTelegramLink(text = '') {
  const user = contentConfig.contacts.telegram;
  const query = new URLSearchParams({ text }).toString();
  // tg://resolve?domain=... не работает в браузере стабильно — используем t.me
  return `https://t.me/${user}?${query}`;
}

export function buildPhoneLink(phone = contentConfig.contacts.phonePrimary) {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

export function attachCTAs() {
  // Кнопки кастомных CTA (не трогаем стандартные кнопки товара/услуг, чтобы не мешать корзине)
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.cta--order');
    if (!btn) return;
    const id = btn.dataset.id || 'general';
    const name = btn.dataset.name || btn.getAttribute('aria-label') || 'консультация';
    const lang = localStorage.getItem('language') || 'ru';
    const message = lang === 'uk'
      ? `Доброго дня! Хочу замовити: ${name} (ID: ${id}).`
      : `Здравствуйте! Хочу заказать: ${name} (ID: ${id}).`;
    const link = buildWhatsAppLink(message + ' #utm_source=site&utm_medium=cta&utm_campaign=whatsapp');
    safeOpen(link);
  });

  // Быстрые контакты
  const callBtns = document.querySelectorAll('[data-cta="call"]');
  callBtns.forEach(btn => btn.setAttribute('href', buildPhoneLink()));

  // Кнопки WhatsApp/Telegram в контактах
  const waBtns = document.querySelectorAll('.btn--wa');
  waBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = localStorage.getItem('language') || 'ru';
      const msg = lang === 'uk' ? 'Доброго дня! Потрібна консультація.' : 'Здравствуйте! Нужна консультация.';
      safeOpen(buildWhatsAppLink(msg + ' #utm_source=site&utm_medium=cta&utm_campaign=whatsapp'));
    });
  });
  const tgBtns = document.querySelectorAll('.btn--tg');
  tgBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = localStorage.getItem('language') || 'ru';
      const msg = lang === 'uk' ? 'Доброго дня! Потрібна консультація.' : 'Здравствуйте! Нужна консультация.';
      safeOpen(buildTelegramLink(msg + ' #utm_source=site&utm_medium=cta&utm_campaign=telegram'));
    });
  });
}

export function injectLocalBusinessJSONLD() {
  const { business, contacts } = contentConfig;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': business.name,
    'description': business.description,
    'telephone': contacts.phonePrimary,
    'email': contacts.email,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': contacts.address,
      'addressLocality': 'Киев',
      'addressCountry': 'UA'
    },
    'areaServed': business.areaServed,
    'openingHours': business.openingHours
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

export function initMarketing() {
  injectLocalBusinessJSONLD();
  attachCTAs();
}
