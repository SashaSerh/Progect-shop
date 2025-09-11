// Управление мобильным меню
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');

    toggleButton.addEventListener('click', () => {
        nav.classList.toggle('header__nav--open');
    });
});