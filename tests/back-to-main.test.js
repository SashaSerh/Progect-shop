import { describe, it, expect, beforeEach } from 'vitest';
import '../js/main.js'; // registers delegated handlers on DOMContentLoaded

function dispatchDOMContentLoaded() {
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Back to main animation & navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // reset hash
    location.hash = '#test';
  });

  it('adds slide-out class and navigates after transition on landing sections', () => {
    document.body.innerHTML = `
      <div id="portfolio-container">
        <section class="portfolio">
          <a href="#" class="back-to-main">←</a>
        </section>
      </div>
      <div id="hero-container"><h1 class="hero__title">Hero</h1></div>
    `;
    dispatchDOMContentLoaded();

    const btn = document.querySelector('.back-to-main');
    const section = document.querySelector('.portfolio');

    btn.click();
    // class should be added to trigger animation
    expect(section.classList.contains('portfolio--slide-out-to-right')).toBe(true);

    // simulate end of transition
    section.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(location.hash).toBe('');
  });

  it('hides main container and navigates after transition for about page', () => {
    document.body.innerHTML = `
      <div id="main-container" class="is-visible">
        <section class="about-page">
          <a href="#" class="back-to-main">←</a>
        </section>
      </div>
      <div id="hero-container"><h1 class="hero__title">Hero</h1></div>
    `;
    dispatchDOMContentLoaded();

    const btn = document.querySelector('.back-to-main');
    const main = document.getElementById('main-container');

    btn.click();
    // should have added is-hidden to main container
    expect(main.classList.contains('is-hidden')).toBe(true);

    main.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(location.hash).toBe('');
  });

  it('respects prefers-reduced-motion and navigates immediately', () => {
    // stub matchMedia
    const orig = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    document.body.innerHTML = `
      <div id="portfolio-container">
        <section class="portfolio">
          <a href="#" class="back-to-main">←</a>
        </section>
      </div>
    `;
    dispatchDOMContentLoaded();
    const btn = document.querySelector('.back-to-main');
    btn.click();
    expect(location.hash).toBe('');
    window.matchMedia = orig;
  });
});
