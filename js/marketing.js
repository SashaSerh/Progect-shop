// contentConfig доступен глобально через script js/content-config.js; читаем его лениво
function getContentConfig() {
  if (typeof window !== 'undefined' && window.contentConfig) return window.contentConfig;
  // Fallback для сред тестирования (Vitest/JSDOM), если конфиг не задан
  return {
    contacts: { whatsapp: '', telegram: '', phonePrimary: '', email: '', address: '' },
    social: {},
    business: { name: '', description: '', areaServed: [], openingHours: [] },
    contactForm: { provider: '', endpoint: '', mailto: '' }
  };
}

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
  const phone = getContentConfig().contacts.whatsapp.replace(/\D/g, '');
  const query = new URLSearchParams({ text }).toString();
  return `https://wa.me/${phone}?${query}`;
}

export function buildTelegramLink(text = '') {
  // Поддерживаем как username, так и номер телефона: если начинается с '+', направим в t.me/+380..., иначе в t.me/<username>
  const user = (getContentConfig().contacts.telegram || '').trim();
  const query = new URLSearchParams({ text }).toString();
  const path = user.startsWith('+') ? encodeURIComponent(user) : user;
  return `https://t.me/${path}?${query}`;
}

export function buildPhoneLink(phone = getContentConfig().contacts.phonePrimary) {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

export function attachCTAs() {
  // Обновляем tel-ссылки при любом вызове
  document.querySelectorAll('[data-cta="call"]').forEach(btn => btn.setAttribute('href', buildPhoneLink()));

  // Проставим базовые href для кнопок WA/TG, чтобы сработало даже без JS-предзаполнения текста
  document.querySelectorAll('.btn--wa').forEach(a => {
    a.setAttribute('href', buildWhatsAppLink(''));
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener');
  });
  document.querySelectorAll('.btn--tg').forEach(a => {
    const raw = (getContentConfig().contacts.telegram || '').trim();
    const digits = raw.replace(/\D/g, '');
    const href = (raw.startsWith('+') || /^\d+$/.test(raw))
      ? `tg://resolve?phone=${digits}`
      : `https://t.me/${raw}`;
    a.setAttribute('href', href);
  });

  // Делегирование кликов для CTA-кнопок, чтобы не зависеть от порядка вставки DOM
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // Кнопки заказа через WhatsApp из карточек/баннеров
    const orderBtn = target.closest('.cta--order');
    if (orderBtn) {
      e.preventDefault();
      const id = orderBtn.dataset.id || 'general';
      const name = orderBtn.dataset.name || orderBtn.getAttribute('aria-label') || 'консультация';
      const lang = localStorage.getItem('language') || 'ru';
      const message = lang === 'uk'
        ? `Доброго дня! Хочу замовити: ${name} (ID: ${id}).`
        : `Здравствуйте! Хочу заказать: ${name} (ID: ${id}).`;
      safeOpen(buildWhatsAppLink(message + ' #utm_source=site&utm_medium=cta&utm_campaign=whatsapp'));
      return;
    }

    // Кнопка WhatsApp в контактах
    const waBtn = target.closest('.btn--wa');
    if (waBtn) {
      e.preventDefault();
      const lang = localStorage.getItem('language') || 'ru';
      const msg = lang === 'uk' ? 'Доброго дня! Потрібна консультація.' : 'Здравствуйте! Нужна консультация.';
      safeOpen(buildWhatsAppLink(msg + ' #utm_source=site&utm_medium=cta&utm_campaign=whatsapp'));
      return;
    }

    // Кнопка Telegram в контактах
    const tgBtn = target.closest('.btn--tg');
    if (tgBtn) {
      e.preventDefault();
      const lang = localStorage.getItem('language') || 'ru';
      const msg = lang === 'uk' ? 'Доброго дня! Потрібна консультація.' : 'Здравствуйте! Нужна консультация.';
      safeOpen(buildTelegramLink(msg + ' #utm_source=site&utm_medium=cta&utm_campaign=telegram'));
      return;
    }

    // Социальные: Instagram и Facebook
    const igBtn = target.closest('.btn--ig');
    if (igBtn) {
      e.preventDefault();
      const url = getContentConfig().social?.instagram;
      if (url) safeOpen(url);
      return;
    }
    const fbBtn = target.closest('.btn--fb');
    if (fbBtn) {
      e.preventDefault();
      const url = getContentConfig().social?.facebook;
      if (url) safeOpen(url);
      return;
    }
  });
}

export function injectLocalBusinessJSONLD() {
  const { business, contacts } = getContentConfig();
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
  // Утилита: найти .form-field по контролу
  const fieldOf = (input) => input?.closest?.('.form-field');
  // Утилита: поставить ошибку на поле
  function setFieldError(input, msgKey) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.add('is-error');
    let helper = field.querySelector('.helper');
    if (!helper) {
      helper = document.createElement('span');
      helper.className = 'helper';
      field.appendChild(helper);
    }
    helper.textContent = t(msgKey);
  }
  // Утилита: очистить ошибку поля
  function clearFieldError(input) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.remove('is-error');
    // helper оставляем, но очищаем, чтобы не мигал
    const helper = field.querySelector('.helper');
    if (helper && helper.textContent) helper.textContent = '';
  }
  // Подписка на ввод: live-очистка ошибок
  form.addEventListener('input', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('form-input')) {
      clearFieldError(target);
    }
  }, { passive: true });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name')?.toString().trim();
    const email = fd.get('email')?.toString().trim();
    const message = fd.get('message')?.toString().trim();
    // Honeypot: если скрытое поле заполнено — прекращаем
    const gotcha = fd.get('_gotcha');
    if (gotcha) {
      // Молча прерываем (или можно выводить общую ошибку)
      return;
    }
    // Валидация
    let hasError = false;
    // name
    if (!name) {
      setFieldError(form.querySelector('#contact-name'), 'form-error-name');
      hasError = true;
    }
    // email
    if (!email) {
      setFieldError(form.querySelector('#contact-email'), 'form-error-email');
      hasError = true;
    } else {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRe.test(email)) {
        setFieldError(form.querySelector('#contact-email'), 'form-error-email-format');
        hasError = true;
      }
    }
    // message
    if (!message) {
      setFieldError(form.querySelector('#contact-message'), 'form-error-message');
      hasError = true;
    }
    if (hasError) {
      statusEl.textContent = '';
      return;
    }
  statusEl.textContent = t('form-sending') || 'Отправка...';
  statusEl.classList.remove('is-success','is-error');
  statusEl.classList.add('is-sending');
    try {
      const { contactForm } = getContentConfig();
      if (contactForm?.provider === 'formspree' && contactForm?.endpoint && contactForm.endpoint.includes('formspree.io')) {
  // Honeypot (дополнительно, хотя уже есть в разметке)
  fd.append('_gotcha', '');

  // Reply-To и дополнительные заголовки
  if (email) fd.set('_replyto', email);

  // Динамический Subject — помогает фильтрам и человеку быстро понимать контекст
  const host = (location && location.host) ? location.host : 'climat-control.com';
  const subj = `Заявка с сайта (${host}) — ${name || 'Без имени'}`;
  fd.set('_subject', subj);

  // Обогащение контента: полезные метаданные помогают разбору и триажу
  fd.set('site', host);
  fd.set('page_url', location?.href || '');
  fd.set('user_agent', navigator?.userAgent || '');
  if (name) fd.set('from_name', name);
        const res = await fetch(contactForm.endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: fd
        });
        // Пытаемся прочитать JSON с деталями (Formspree возвращает ok/ errors)
        let data = null;
        try { data = await res.json(); } catch (_) { /* ignore parse errors */ }
        if (res.ok && (!data || data.ok || !data.errors)) {
          form.reset();
          // Очистим возможные отметки ошибок
          ['#contact-name','#contact-email','#contact-message'].forEach(sel => clearFieldError(form.querySelector(sel)));
          statusEl.textContent = t('form-success') || 'Сообщение отправлено!';
          statusEl.classList.remove('is-sending','is-error');
          statusEl.classList.add('is-success');
        } else {
          const detail = data?.errors?.map?.(e => e.message).join('; ') || (await res.text?.()) || 'Unknown error';
          throw new Error('Formspree error: ' + detail);
        }
      } else {
        // Fallback: mailto
  const to = contactForm?.mailto || getContentConfig().contacts.email;
        const subject = encodeURIComponent('Заявка с сайта');
        const body = encodeURIComponent(`Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`);
        const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
        location.href = mailto;
  statusEl.textContent = t('form-success') || 'Сообщение отправлено!';
        statusEl.classList.remove('is-sending','is-error');
        statusEl.classList.add('is-success');
      }
    } catch (err) {
      console.warn('Contact form error', err);
      // Попробуем сделать mailto, если Formspree дал сбой
      try {
        const cfg = getContentConfig();
        const to = cfg?.contactForm?.mailto || cfg.contacts.email;
        if (to) {
          const subject = encodeURIComponent('Заявка с сайта (fallback)');
          const body = encodeURIComponent(`Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`);
          const mailto = `mailto:${to}?subject=${subject}&body=${body}`;
          location.href = mailto;
        }
      } catch (_) { /* ignore */ }
  statusEl.textContent = t('form-error') || 'Не удалось отправить. Попробуйте позже или свяжитесь по телефону/мессенджеру.';
      statusEl.classList.remove('is-sending','is-success');
      statusEl.classList.add('is-error');
    }
  });
}
