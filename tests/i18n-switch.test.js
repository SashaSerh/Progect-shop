import { describe, it, expect, beforeEach } from 'vitest';
import { switchLanguage, initLanguageSwitchers, translations } from '../js/i18n.js';

// JSDOM environment: emulate minimal DOM structure for nav and inputs
function setupDom() {
  document.body.innerHTML = `
    <nav>
      <a class="header__nav-link" data-i18n="nav-home">Главная</a>
      <a class="header__nav-link" data-i18n="nav-services">Услуги</a>
      <a class="header__nav-link" data-i18n="nav-products">Товары</a>
      <a class="header__nav-link" data-i18n="nav-contacts">Контакты</a>
    </nav>
    <input id="search" data-i18n-placeholder="search-placeholder" placeholder="Поиск по сайту" />
    <button class="language-switcher" data-lang="ru">RU</button>
    <button class="language-switcher" data-lang="uk">UK</button>
  `;
}

describe('i18n language switching', () => {
  beforeEach(() => {
    setupDom();
    // ensure stored language reset
    localStorage.removeItem('language');
  });

  it('switches from ru to uk and updates nav links', () => {
    // initial Russian
    expect(document.querySelector('[data-i18n="nav-home"]').textContent).toBe('Главная');
    switchLanguage('uk');
    expect(localStorage.getItem('language')).toBe('uk');
    expect(document.querySelector('[data-i18n="nav-home"]').textContent).toBe(translations.uk['nav-home']);
    expect(document.querySelector('[data-i18n="nav-services"]').textContent).toBe(translations.uk['nav-services']);
  });

  it('updates placeholder on language change', () => {
    switchLanguage('uk');
    const input = document.getElementById('search');
    expect(input.placeholder).toBe(translations.uk['search-placeholder']);
  });

  it('falls back to ru when unknown lang passed', () => {
    switchLanguage('de'); // not supported
    expect(localStorage.getItem('language')).toBe('ru');
    expect(document.querySelector('[data-i18n="nav-home"]').textContent).toBe(translations.ru['nav-home']);
  });

  it('initLanguageSwitchers sets active states', () => {
    initLanguageSwitchers();
    const ruBtn = document.querySelector('.language-switcher[data-lang="ru"]');
    const ukBtn = document.querySelector('.language-switcher[data-lang="uk"]');
    expect(ruBtn.getAttribute('aria-pressed')).toBe('true');
    switchLanguage('uk');
    initLanguageSwitchers();
    expect(ukBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
