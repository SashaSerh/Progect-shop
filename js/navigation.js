export function initNavigation() {
    document.querySelector('.header__toggle').addEventListener('click', () => {
        document.querySelector('.header__nav').classList.toggle('header__nav--open');
        document.querySelector('.header__toggle').classList.toggle('header__toggle--open');
    });
}