export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('light-theme', savedTheme === 'light');
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? '🌞' : '🌙';
    }
}

export function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const themeIcon = document.querySelector('.theme-icon');
    const isLightTheme = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    if (themeIcon) {
        themeIcon.textContent = isLightTheme ? '🌞' : '🌙';
    }
}