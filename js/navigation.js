export function initNavigation() {
    const toggle = document.querySelector('.header__toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.querySelector('.header__nav').classList.toggle('header__nav--open');
            toggle.classList.toggle('header__toggle--open');
        });
    }
}