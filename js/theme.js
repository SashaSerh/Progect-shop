export function toggleTheme() {
    console.log('Toggling theme');
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    body.classList.toggle('light-theme');
    themeToggle.classList.toggle('light-theme');
    const isLightTheme = body.classList.contains('light-theme');
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
}

export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    console.log(`Initializing theme: ${savedTheme}`);
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.theme-toggle').classList.add('light-theme');
    }
}