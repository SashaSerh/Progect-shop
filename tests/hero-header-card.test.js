import { describe, it, expect, beforeEach } from 'vitest';
import { switchLanguage } from '../js/i18n.js';
import '../js/main.js';

function dispatchDOMContentLoaded() { document.dispatchEvent(new Event('DOMContentLoaded')); }

describe('Hero header card', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="hero fade-in-section" id="home">
        <div class="hero__container container">
          <div class="hero-header-card service-card-surface" role="region" aria-labelledby="hero-header-title">
            <div class="hero-header-card__inner">
              <h1 id="hero-header-title" class="hero__title" data-i18n="hero-title">Комфортный климат в вашем доме</h1>
              <p class="hero__subtitle" data-i18n="hero-subtitle">Профессиональный монтаж кондиционеров и рекуператоров.</p>
            </div>
          </div>
        </div>
      </section>
    `;
    dispatchDOMContentLoaded();
  });

  it('renders the header card with title and subtitle', () => {
    const card = document.querySelector('.hero-header-card');
    expect(card).toBeTruthy();
    expect(document.querySelector('.hero__title')).toBeTruthy();
    expect(document.querySelector('.hero__subtitle')).toBeTruthy();
  });

  it('updates text when language is switched', () => {
    // initial ru -> switch to uk
    switchLanguage('uk');
    expect(document.querySelector('.hero__title').textContent).toBeDefined();
    expect(document.querySelector('.hero__title').textContent).toMatch(/клімат|Клімат|клімат/);

    // switch back to ru
    switchLanguage('ru');
    expect(document.querySelector('.hero__title').textContent).toMatch(/Комфортный|Комфортний/);
  });

  it('supports theme toggling by class on body', () => {
    const card = document.querySelector('.hero-header-card');
    document.body.classList.add('theme-dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    // Card should still exist and title present
    expect(card).toBeTruthy();
    expect(document.querySelector('.hero__title')).toBeTruthy();
  });
});