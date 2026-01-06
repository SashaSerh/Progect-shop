import { describe, it, expect, beforeEach } from 'vitest';
import '../js/main.js'; // registers routing handlers

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

describe('Pricelist route integration', () => {
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

  it('loads pricelist component on direct hash navigation', async () => {
    // Trigger navigation to pricelist
    location.hash = '#pricelist';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    const ok = await waitFor(() => {
      const title = document.getElementById('pricelist-title');
      const main = document.getElementById('main-container');
      return !!title && main && (main.classList.contains('is-visible') || getComputedStyle(main).display !== 'none');
    }, 1500);

    expect(ok).toBe(true);
    expect(document.getElementById('pricelist-title')).toBeTruthy();
  });

  it('navigates to pricelist when clicking a pricelist-link anchor', async () => {
    // Prepare a service section with a pricelist button
    document.body.innerHTML = `
      <div id="main-container" hidden></div>
      <div id="service-ac-install-container">
        <section class="service-page" id="service-ac-install">
          <a href="#pricelist" role="button" class="pricelist-link">Прайс-лист</a>
        </section>
      </div>
    `;

    dispatchDOMContentLoaded();

    const btn = document.querySelector('.pricelist-link');
    btn.click();

    const ok = await waitFor(() => location.hash === '#pricelist' && !!document.getElementById('pricelist-title'), 1500);
    expect(ok).toBe(true);
  });
});