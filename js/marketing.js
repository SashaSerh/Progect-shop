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
  attachContactForm();
}

export function attachContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const statusEl = form.querySelector('.form-status');
  const lang = localStorage.getItem('language') || 'ru';
  const t = (k) => (window.translations?.[lang]?.[k]) || k;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name')?.toString().trim();
    const email = fd.get('email')?.toString().trim();
    const message = fd.get('message')?.toString().trim();
    if (!name || !email || !message) {
      statusEl.textContent = t('form-error');
      return;
    }
  statusEl.textContent = t('form-sending');
  statusEl.classList.remove('is-success','is-error');
  statusEl.classList.add('is-sending');
    try {
      const { contactForm } = contentConfig;
      if (contactForm?.provider === 'formspree' && contactForm?.endpoint && contactForm.endpoint.includes('formspree.io')) {
        const res = await fetch(contactForm.endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: fd
        });
        if (res.ok) {
          form.reset();
          statusEl.textContent = t('form-success');
          statusEl.classList.remove('is-sending','is-error');
          statusEl.classList.add('is-success');
        } else {
          throw new Error('Formspree error');
        }
      } else {
        // Fallback: mailto
        const to = contactForm?.mailto || contentConfig.contacts.email;
        const subject = encodeURIComponent('Заявка с сайта');
        const body = encodeURIComponent(`Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`);
        const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
        location.href = mailto;
        statusEl.textContent = t('form-success');
        statusEl.classList.remove('is-sending','is-error');
        statusEl.classList.add('is-success');
      }
    } catch (err) {
      console.warn('Contact form error', err);
      statusEl.textContent = t('form-error');
      statusEl.classList.remove('is-sending','is-success');
      statusEl.classList.add('is-error');
    }
  });
}
