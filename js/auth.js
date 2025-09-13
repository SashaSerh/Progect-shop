export function updateProfileButton(translations = {}, lang = 'ru') {
    const profileButton = document.getElementById('profileButton');
    if (!profileButton) {
        console.error('Ошибка: Элемент #profileButton не найден!');
        return;
    }
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const key = isAuthenticated ? 'profile' : 'login';
    
    // Проверка translations и lang
    if (!translations || !translations[lang]) {
        console.warn(`Translations для языка "${lang}" не найдены, используем fallback`);
        profileButton.textContent = isAuthenticated ? 'Личный кабинет' : 'Войти';
    } else {
        profileButton.textContent = translations[lang][key] || (isAuthenticated ? 'Личный кабинет' : 'Войти');
    }
    profileButton.setAttribute('data-i18n', key);
    console.log(`updateProfileButton: lang=${lang}, isAuthenticated=${isAuthenticated}, text=${profileButton.textContent}`);
}

export function renderLoginModal(translations = {}, lang = 'ru') {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) {
        console.error('Ошибка: Элемент #modalContent не найден!');
        return;
    }
    modalContent.innerHTML = `
        <h2 data-i18n="login-title">${translations[lang]?.['login-title'] || 'Вход'}</h2>
        <form id="loginForm">
            <div class="modal__field">
                <label for="username" data-i18n="username">${translations[lang]?.['username'] || 'Имя пользователя'}</label>
                <input type="text" id="username" placeholder="Введите имя" required>
            </div>
            <div class="modal__field">
                <label for="password" data-i18n="password">${translations[lang]?.['password'] || 'Пароль'}</label>
                <input type="password" id="password" placeholder="Введите пароль" required>
            </div>
            <button type="submit" class="modal__button" data-i18n="login">${translations[lang]?.['login'] || 'Войти'}</button>
        </form>
    `;
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
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
        console.error('Ошибка: Элемент #modalContent не найден!');
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
        console.error('Ошибка: Элемент #profileModal не найден!');
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
        console.error('Ошибка: Элемент #profileModal не найден!');
        return;
    }
    profileModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}