import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildWhatsAppLink, buildTelegramLink, attachCTAs } from '../js/marketing.js';
import { contentConfig } from '../js/content-config.js';

// JSDOM env

describe('marketing CTAs', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="contacts__cta">
        <a class="btn" data-cta="call">Позвонить</a>
        <a class="btn btn--wa">WhatsApp</a>
        <a class="btn btn--tg">Telegram</a>
      </div>`;
  });

  it('buildWhatsAppLink uses phone from config', () => {
    const url = new URL(buildWhatsAppLink('hello'));
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toContain(contentConfig.contacts.whatsapp.replace(/\D/g,''));
    expect(url.searchParams.get('text')).toBe('hello');
  });

  it('buildTelegramLink uses username when provided', () => {
    const url = buildTelegramLink('hi');
    expect(url.startsWith('https://t.me/')).toBe(true);
    expect(url.includes(contentConfig.contacts.telegram)).toBe(true);
  });

  it('attachCTAs sets base hrefs and delegates clicks', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => {});
    attachCTAs();
    const wa = document.querySelector('.btn--wa');
    const tg = document.querySelector('.btn--tg');

    // base href set
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//);
    expect(['https://t.me/', 'tg://']).toContain(tg.getAttribute('href').slice(0,8));

    // click triggers open with expected prefix
    wa.click();
    tg.click();
    const calls = open.mock.calls.map(args => args[0]);
    expect(calls.some(u => /^https:\/\/wa\.me\//.test(u))).toBe(true);
    expect(calls.some(u => /^https:\/\/t\.me\//.test(u))).toBe(true);

    open.mockRestore();
  });
});
