import { describe, it, expect, beforeEach } from 'vitest';
import { switchLanguage, translations } from '../js/i18n.js';

function setupDom() {
  document.body.innerHTML = `
    <section class="about-page">
      <h2 class="about-page__title" data-i18n="about-title">О нас</h2>
      <p class="about-page__lead" data-i18n="about-lead">Мы — команда ...</p>
      <p data-i18n="about-p1">Первый абзац</p>
      <p data-i18n="about-p2">Второй абзац</p>

      <ul class="about-values">
        <li>
          <img src="icons/wrench-icon.svg" data-i18n-alt="about-values-1-alt" alt="инструменты">
          <h3 data-i18n="about-values-1-title">Профессиональный монтаж</h3>
        </li>
        <li>
          <img src="icons/free-icon-clock-3884295.svg" data-i18n-alt="about-values-2-alt" alt="сроки">
          <h3 data-i18n="about-values-2-title">Соблюдаем сроки</h3>
        </li>
        <li>
          <img src="icons/free-icon-house-3884324.svg" data-i18n-alt="about-values-3-alt" alt="гарантия">
          <h3 data-i18n="about-values-3-title">Официальная гарантия</h3>
        </li>
      </ul>

      <a class="btn" href="#contacts" data-i18n="about-cta">Связаться с нами</a>
    </section>
  `;
}

describe('About page i18n', () => {
  beforeEach(() => {
    setupDom();
    localStorage.removeItem('language');
  });

  it('updates texts, alt attributes and CTA to Ukrainian', () => {
    // Sanity: ensure initial is ru-ish
    expect(document.querySelector('[data-i18n="about-cta"]').textContent).toBe('Связаться с нами');

    switchLanguage('uk');

    expect(localStorage.getItem('language')).toBe('uk');
    expect(document.querySelector('[data-i18n="about-lead"]').textContent).toBe(translations.uk['about-lead']);
    expect(document.querySelector('[data-i18n="about-p1"]').textContent).toBe(translations.uk['about-p1']);
    expect(document.querySelector('[data-i18n="about-p2"]').textContent).toBe(translations.uk['about-p2']);
    expect(document.querySelector('[data-i18n="about-values-1-title"]').textContent).toBe(translations.uk['about-values-1-title']);
    const img1 = document.querySelector('img[data-i18n-alt="about-values-1-alt"]');
    expect(img1.alt).toBe(translations.uk['about-values-1-alt']);
    expect(document.querySelector('[data-i18n="about-cta"]').textContent).toBe(translations.uk['about-cta']);
  });
});
