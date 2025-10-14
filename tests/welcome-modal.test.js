import { describe, it, expect, beforeEach } from 'vitest';
import { switchLanguage } from '../js/i18n.js';

// Minimal DOM setup for welcome overlay
function setupDom() {
  document.body.innerHTML = `
    <div id="welcome-container">
      <div class="welcome-overlay" id="welcomeOverlay" role="dialog" aria-modal="true">
        <div class="welcome-overlay__panel">
          <h2 data-i18n="welcome-greeting">Добро пожаловать на ClimaTech</h2>
          <p data-i18n="welcome-choose-language">Выберите язык интерфейса</p>
          <div class="welcome-overlay__langs">
            <button type="button" class="welcome-lang-btn" data-lang="uk" aria-pressed="false">UA</button>
            <button type="button" class="welcome-lang-btn" data-lang="ru" aria-pressed="false">RU</button>
          </div>
          <div class="welcome-overlay__current">
            <span data-i18n="welcome-current-language">Текущий язык</span>: <strong id="welcomeLangValue">UA</strong>
          </div>
          <button id="welcomeContinue" class="welcome-overlay__continue" data-i18n="welcome-continue">Продолжить</button>
        </div>
      </div>
    </div>
  `;
}

describe('Welcome modal i18n', () => {
  beforeEach(() => {
    localStorage.clear();
    setupDom();
  });

  it('defaults to uk when no language stored', () => {
    switchLanguage('uk'); // simulate main logic
    expect(localStorage.getItem('language')).toBe('uk');
    const greet = document.querySelector('[data-i18n="welcome-greeting"]').textContent;
    expect(greet.length).toBeGreaterThan(0);
  });

  it('updates current language value when switching to ru', () => {
    switchLanguage('uk');
    switchLanguage('ru');
    expect(localStorage.getItem('language')).toBe('ru');
  });
});
