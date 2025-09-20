export function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    body.classList.toggle('light-theme');
    if (themeToggle) {
        themeToggle.classList.toggle('light-theme');
    }
    if (themeIcon) {
        themeIcon.textContent = body.classList.contains('light-theme') ? '☀️' : '🌙';
    }
    const isLightTheme = body.classList.contains('light-theme');
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    body.style.transition = 'background-color 0.3s ease-in-out';
}

export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        if (themeToggle) {
            themeToggle.classList.add('light-theme');
        }
    }
    if (themeIcon) {
        themeIcon.textContent = body.classList.contains('light-theme') ? '☀️' : '🌙';
    }
}