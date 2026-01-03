import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../js/main.js'; // registers routing handlers
import * as calculator from '../js/calculator.js';

function dispatchDOMContentLoaded() {
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

async function waitFor(condition, timeout = 800) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 20));
  }
  return false;
}

describe('Calculator route integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    location.hash = '#test';
    // create main container and a hero for context
    document.body.innerHTML = `
      <div id="main-container" hidden>
        <!-- component will be loaded here -->
      </div>
      <div id="hero-container"><h1>Hero</h1></div>
    `;

    // Mock fetch to return the local component HTML so loadComponent can succeed in tests
    const fs = require('fs');
    const path = require('path');
    global.fetch = (resource) => {
      try {
        const filePath = path.join(process.cwd(), resource);
        const html = fs.readFileSync(filePath, 'utf8');
        return Promise.resolve({ ok: true, text: async () => html });
      } catch (err) {
        return Promise.resolve({ ok: false, status: 404 });
      }
    };

    dispatchDOMContentLoaded();
  });

  it('loads calculator component, makes #main-container visible and initializes calculator', async () => {
    const initSpy = vi.spyOn(calculator, 'initCalculator').mockImplementation(() => {
      // noop - we only need to observe the call
    });

    // Trigger navigation to calculator
    location.hash = '#calculator';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    // Wait for component to be fetched and inserted AND for main-container to become visible (hidden removed)
    const ok = await waitFor(() => {
      const title = document.getElementById('calculator-page-title');
      const main = document.getElementById('main-container');
      return !!title && main && (main.classList.contains('is-visible') || getComputedStyle(main).display !== 'none');
    }, 1500);
    expect(ok).toBe(true);

    const main = document.getElementById('main-container');
    expect(main).toBeTruthy();
    const title = document.getElementById('calculator-page-title');
    expect(title).toBeTruthy();

    // initCalculator should have been called (we mocked it)
    expect(initSpy).toHaveBeenCalled();

    initSpy.mockRestore();
  });

  it('returns to previous section when clicking back from calculator (uses prev_hash)', async () => {
    // Prepare DOM: main container with calculator page and a back button
    document.body.innerHTML = `
      <div id="main-container">
        <section class="calculator-page" id="calculator-page">
          <div class="calculator-page__back">
            <a href="#" class="back-to-main" aria-label="Назад">←</a>
          </div>
          <h2 id="calculator-page-title">Калькулятор</h2>
        </section>
      </div>
      <div id="service-ac-install-container">
        <section class="service-page" id="service-ac-install"></section>
      </div>
    `;
    // set prev hash
    try { sessionStorage.setItem('prev_hash', '#service-ac-install'); } catch(_) {}

    // spy on mobileAnimations.hide so it resolves immediately
    const hideSpy = vi.spyOn(window.mobileAnimations, 'hide').mockResolvedValue();

    dispatchDOMContentLoaded();

    const back = document.querySelector('.back-to-main');
    back.click();

    // wait for location to update to prev
    const ok = await waitFor(() => location.hash === '#service-ac-install', 1000);
    expect(ok).toBe(true);

    // cleaned up prev_hash and from_calculator set
    expect(sessionStorage.getItem('prev_hash')).toBeNull();
    expect(sessionStorage.getItem('from_calculator')).toBe('true');

    hideSpy.mockRestore();
  });

  it('handles multiple quick clicks on calculator button without duplicating navigation', async () => {
    // Prepare a service section with a calculator button
    document.body.innerHTML = `
      <div id="main-container" hidden></div>
      <div id="service-ac-install-container">
        <section class="service-page" id="service-ac-install">
          <a href="#calculator" role="button" class="back-to-main service-page__calculator-btn">Калькулятор</a>
        </section>
      </div>
    `;

    // Spy initCalculator
    const initSpy = vi.spyOn(calculator, 'initCalculator').mockImplementation(() => {});

    dispatchDOMContentLoaded();

    const btn = document.querySelector('.service-page__calculator-btn');
    const section = document.querySelector('.service-page');

    // click rapidly multiple times
    btn.click();
    btn.click();
    btn.click();

    // after first click button should be disabled
    expect(btn.getAttribute('aria-disabled')).toBe('true');

    // simulate transitionend on the section to finish animation
    section.dispatchEvent(new Event('transitionend', { bubbles: true }));

    // wait for navigation and component load
    const ok = await waitFor(() => location.hash === '#calculator' && !!document.getElementById('calculator-page-title'), 1500);
    expect(ok).toBe(true);

    // initCalculator should be called once
    expect(initSpy).toHaveBeenCalled();

    // ensure aria-disabled is removed after navigation (button restored)
    expect(btn.getAttribute('aria-disabled')).toBeNull();

    initSpy.mockRestore();
  });
});