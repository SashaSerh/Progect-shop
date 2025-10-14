import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Load HTML skeleton similar to integration.test
const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

// Helper to simulate cookie parsing
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

describe('Welcome language overlay cookie & focus', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.innerHTML = indexHtml;
    // Clear localStorage and cookies
    localStorage.clear();
    // Simple cookie clear by reassign (jsdom limitation)
    document.cookie = 'language_selected=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  });

  it('shows overlay every visit regardless of existing language', async () => {
    localStorage.setItem('language', 'ru');
    await import('../js/main.js');
    const overlay = document.getElementById('welcomeOverlay');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('is-visible')).toBe(true);
  });

  it('hides overlay after continue (no cookie set now)', async () => {
    await import('../js/main.js');
    const overlay = document.getElementById('welcomeOverlay');
    const continueBtn = overlay.querySelector('#welcomeContinue');
    continueBtn.click();
    expect(overlay.classList.contains('is-visible')).toBe(false);
  });


  it('focus trap retains focus within overlay when open', async () => {
    await import('../js/main.js');
    const overlay = document.getElementById('welcomeOverlay');
    const firstBtn = overlay.querySelector('.welcome-lang-btn');
    firstBtn.focus();
    const lastBtn = overlay.querySelector('#welcomeContinue');
    // Simulate Tab cycles
    const pressTab = (shift=false) => {
      const evt = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, shiftKey: shift });
      overlay.dispatchEvent(evt);
    };
    // Move focus to last by cycling
    for (let i=0;i<5;i++) pressTab();
    expect(document.activeElement === lastBtn || document.activeElement === firstBtn).toBe(true);
  });
});
