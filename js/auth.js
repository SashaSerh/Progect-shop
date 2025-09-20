export function updateProfileButton(translations = {}, lang = 'ru') {
    const profileButton = document.getElementById('profileButton');
    if (!profileButton) {
        console.error('Элемент #profileButton не найден!');
        return;
    }
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const key = isAuthenticated ? 'profile' : 'login';
    
    if (!translations || !translations[lang]) {
        profileButton.textContent = isAuthenticated ? 'Личный кабинет' : 'Войти';
    } else {
        profileButton.textContent = translations[lang][key] || (isAuthenticated ? 'Личный кабинет' : 'Войти');
    }
    profileButton.setAttribute('data-i18n', key);
}

export function renderLoginModal(translations = {}, lang = 'ru') {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) {
        console.error('Элемент #modalContent не найден!');
        return;
    }
    modalContent.innerHTML = `
        <h2 data-i18n="login-title">${translations[lang]?.['login-title'] || 'Вход'}</h2>
        <form id="loginForm">
            <div class="modal__field">
                <label for="username" data-i18n="username">${translations[lang]?.['username'] || 'Имя пользователя'}</label>
                <input type="text" id="username" placeholder="Введите имя" required minlength="3">
            </div>
            <div class="modal__field">
                <label for="password" data-i18n="password">${translations[lang]?.['password'] || 'Пароль'}</label>
                <input type="password" id="password" placeholder="Введите пароль" required minlength="6">
            </div>
            <button type="submit" class="modal__button" data-i18n="login">${translations[lang]?.['login'] || 'Войти'}</button>
        </form>
    `;
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            if (username && password) {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('username', username);
                closeModal();
                updateProfileButton(translations, lang);
                renderProfileModal(translations, lang);
            } else {
                alert('Введите логин и пароль!');
            }
        });
    }
}

export function renderProfileModal(translations = {}, lang = 'ru') {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) {
        console.error('Элемент #modalContent не найден!');
        return;
    }
    const username = localStorage.getItem('username') || 'Пользователь';
    modalContent.innerHTML = `
        <h2 data-i18n="profile-title">${translations[lang]?.['profile-title'] || 'Личный кабинет'}</h2>
        <p data-i18n="welcome">${(translations[lang]?.['welcome'] || 'Добро пожаловать')}, ${username}!</p>
        <button class="modal__button modal__button--logout" data-i18n="logout">${translations[lang]?.['logout'] || 'Выйти'}</button>
    `;
    const logoutBtn = document.querySelector('.modal__button--logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('username');
            closeModal();
            updateProfileButton(translations, lang);
        });
    }
}

export function openModal(translations = {}, lang = 'ru') {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) {
        console.error('Элемент #profileModal не найден!');
        return;
    }
    profileModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
        renderProfileModal(translations, lang);
    } else {
        renderLoginModal(translations, lang);
    }
}

export function closeModal() {
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) {
        console.error('Элемент #profileModal не найден!');
        return;
    }
    profileModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}