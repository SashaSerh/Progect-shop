import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWhatsAppLink, buildTelegramLink, attachCTAs } from '../js/marketing.js';

// JSDOM env

describe('marketing CTAs', () => {
  beforeEach(() => {
    // Тестовый конфиг контента — маркетинговые функции читают его из window.contentConfig
    window.contentConfig = {
      contacts: {
        whatsapp: '+380991112233',
        telegram: 'TestUser',
        phonePrimary: '+380991112233',
        email: 'test@example.com',
        address: 'Test street, Kyiv'
      },
      social: {
        instagram: 'https://instagram.com/test',
        facebook: 'https://facebook.com/test'
      },
      business: {
        name: 'TestBiz',
        description: 'desc',
        areaServed: ['Kyiv'],
        openingHours: ['Mo-Fr 09:00-18:00']
      },
      contactForm: {
        provider: 'formspree',
        endpoint: 'https://formspree.io/f/test',
        mailto: 'test@example.com'
      }
    };
    document.body.innerHTML = `
      <div class="contacts__cta">
        <a class="btn" data-cta="call">Позвонить</a>
        <a class="btn btn--wa">WhatsApp</a>
        <a class="btn btn--tg">Telegram</a>
      </div>`;
  });

  it('buildWhatsAppLink uses phone from config', () => {
    const cfg = window.contentConfig;
    const url = new URL(buildWhatsAppLink('hello'));
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toContain(cfg.contacts.whatsapp.replace(/\D/g,''));
    expect(url.searchParams.get('text')).toBe('hello');
  });

  it('buildTelegramLink uses username when provided', () => {
    const cfg = window.contentConfig;
    const url = buildTelegramLink('hi');
    expect(url.startsWith('https://t.me/')).toBe(true);
    expect(url.includes(cfg.contacts.telegram)).toBe(true);
  });

  it('attachCTAs sets base hrefs and delegates clicks', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    attachCTAs();
    const wa = document.querySelector('.btn--wa');
    const tg = document.querySelector('.btn--tg');

    // base href set
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
  const tgHref = tg.getAttribute('href');
  // Поддерживаем два возможных формата: t.me/<username> или tg://resolve?phone=<digits>
  expect(/^(https:\/\/t\.me\/|tg:\/\/resolve\?phone=)/.test(tgHref)).toBe(true);

    // click triggers open with expected prefix
    wa.click();
    tg.click();
    const calls = open.mock.calls.map(args => args[0]);
    expect(calls.some(u => /^https:\/\/wa\.me\//.test(u))).toBe(true);
    expect(calls.some(u => /^https:\/\/t\.me\//.test(u))).toBe(true);

    open.mockRestore();
  });
});
