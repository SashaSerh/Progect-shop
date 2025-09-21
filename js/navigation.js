export function initNavigation() {
    const toggle = document.querySelector('.header__toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const nav = document.querySelector('.header__nav');
            nav.classList.toggle('header__nav--open');
            toggle.classList.toggle('header__toggle--open');
            const expanded = nav.classList.contains('header__nav--open');
            toggle.setAttribute('aria-expanded', expanded);
        });
    }
}