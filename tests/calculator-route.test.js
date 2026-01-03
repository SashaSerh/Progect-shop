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
});