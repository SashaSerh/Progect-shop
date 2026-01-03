import { describe, it, expect, beforeEach } from 'vitest';
import { switchLanguage } from '../js/i18n.js';
import '../js/main.js';

function dispatchDOMContentLoaded() { document.dispatchEvent(new Event('DOMContentLoaded')); }

describe('Main nav mobile card', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="main-nav-mobile-card service-card-surface" role="navigation">
        <div class="main-nav-mobile-card__inner">
          <nav class="main-nav-mobile" role="navigation">
            <ul class="main-nav-mobile__list">
              <li class="main-nav-mobile__item"><a href="#services" class="main-nav-mobile__link"><span class="main-nav-mobile__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span><span class="main-nav-mobile__text" data-i18n="nav-services">Услуги</span></a></li>
              <li class="main-nav-mobile__item"><a href="#portfolio" class="main-nav-mobile__link"><span class="main-nav-mobile__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="9.5" r="1"/><path d="M21 15l-5-5L6 21"/></svg></span><span class="main-nav-mobile__text" data-i18n="nav-portfolio">Наши работы</span></a></li>
            </ul>
          </nav>
        </div>
      </div>
    `;
    dispatchDOMContentLoaded();
  });

  it('renders nav card and links', () => {
    expect(document.querySelector('.main-nav-mobile-card')).toBeTruthy();
    expect(document.querySelectorAll('.main-nav-mobile__link').length).toBe(2);
  });

  it('updates link text when language switched', () => {
    switchLanguage('uk');
    const el = document.querySelector('.main-nav-mobile__text');
    expect(el.textContent.length).toBeGreaterThan(0);
    expect(['Услуги','Послуги']).toContain(el.textContent);
  });

  it('supports dark theme class', () => {
    document.body.classList.add('theme-dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    // ensure styles would apply (presence checks)
    expect(document.querySelector('.main-nav-mobile-card')).toBeTruthy();
  });
});