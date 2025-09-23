export function initNavigation() {
    const headerToggle = document.querySelector('.header__toggle');
    const headerNav = document.querySelector('.header__nav');
    const navLinks = document.querySelectorAll('.header__nav-link');

    if (headerToggle && headerNav) {
        headerToggle.addEventListener('click', () => {
            const isExpanded = headerToggle.getAttribute('aria-expanded') === 'true';
            headerToggle.setAttribute('aria-expanded', !isExpanded);
            headerNav.classList.toggle('header__nav--open');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 60,
                    behavior: 'smooth'
                });
            }
            if (headerNav && headerToggle && window.innerWidth <= 768) {
                headerNav.classList.remove('header__nav--open');
                headerToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}