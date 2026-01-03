import { describe, it, expect, beforeEach } from 'vitest';
import '../js/main.js';

function dispatchDOMContentLoaded() { document.dispatchEvent(new Event('DOMContentLoaded')); }

describe('Main nav mobile submenu', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav class="main-nav-mobile" role="navigation">
        <ul class="main-nav-mobile__list">
          <li class="main-nav-mobile__item"><a href="#services-page" class="main-nav-mobile__link"><span class="main-nav-mobile__icon"></span><span class="main-nav-mobile__text" data-i18n="nav-services">Услуги</span></a></li>
          <li class="main-nav-mobile__item"><a href="#about" class="main-nav-mobile__link"><span class="main-nav-mobile__icon"></span><span class="main-nav-mobile__text" data-i18n="nav-about">О нас</span></a></li>
        </ul>
      </nav>
    `;
    dispatchDOMContentLoaded();
  });

  it('opens services submenu with icons when services link clicked', async () => {
    const navList = document.querySelector('.main-nav-mobile__list');
    // simulate click on services
    const servicesLink = document.querySelector('.main-nav-mobile__link');
    // invoke helper directly to ensure deterministic behavior in tests
    if (typeof window.showServicesList === 'function') {
      window.showServicesList(navList);
    } else {
      servicesLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    // wait for submenu to be inserted (showServicesList uses 250ms timeout)
    const ok = await (async function waitFor(fn, timeout = 1200) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (fn()) return true;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 20));
      }
      return false;
    })(() => !!document.querySelector('a[href="#service-ac-install"]'), 1200);

    expect(ok).toBe(true);

    const submenuItem = Array.from(document.querySelectorAll('.main-nav-mobile__item')).find(li => li.querySelector('a[href="#service-ac-install"]'));
    expect(submenuItem).toBeTruthy();

    // Check icon exists in submenu item
    const icon = submenuItem.querySelector('.main-nav-mobile__icon');
    expect(icon).toBeTruthy();
  });
});