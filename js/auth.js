export function updateProfileButton(translations, lang) {
    const profileButton = document.getElementById('profileButton');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (profileButton) {
        profileButton.textContent = translations[lang][isLoggedIn ? 'profile' : 'login'];
        profileButton.setAttribute('aria-label', translations[lang][isLoggedIn ? 'profile' : 'login']);
    }
}

export function openModal(translations, lang) {
    const modalContent = document.getElementById('modalContent');
    const profileModal = document.getElementById('profileModal');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (!modalContent || !profileModal) return;

    // Scroll-lock и подложка (аналогично корзине)
    let scrollY = 0;
    const lock = () => {
        try {
            scrollY = window.scrollY || document.documentElement.scrollTop || 0;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } catch (_) {}
    };
    const unlock = () => {
        try {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY || 0);
        } catch (_) {}
    };

    let backdrop = document.querySelector('.profile-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'profile-backdrop';
        document.body.appendChild(backdrop);
    }
    backdrop.classList.add('is-visible');
    backdrop.addEventListener('click', () => closeModal(), { once: true });

    if (isLoggedIn) {
        modalContent.innerHTML = `
            <h2 data-i18n="profile-title">${translations[lang]['profile-title']}</h2>
            <p data-i18n="welcome">${translations[lang]['welcome']}, ${localStorage.getItem('username') || 'User'}!</p>
            <h3 data-i18n="orders-title">${translations[lang]['orders-title']}</h3>
            <p>${translations[lang]['cart-empty']}</p>
            <button class="modal__button modal__button--logout" data-i18n="logout">${translations[lang]['logout']}</button>
        `;
        const logoutButton = modalContent.querySelector('.modal__button--logout');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                updateProfileButton(translations, lang);
                closeModal();
            });
        }
    } else {
        modalContent.innerHTML = `
            <h2 data-i18n="login-title">${translations[lang]['login-title']}</h2>
            <div class="modal__field">
                <label for="username" data-i18n="username">${translations[lang]['username']}</label>
                <input type="text" id="username" required>
            </div>
            <div class="modal__field">
                <label for="password" data-i18n="password">${translations[lang]['password']}</label>
                <input type="password" id="password" required>
            </div>
            <button class="modal__button" data-i18n="login">${translations[lang]['login']}</button>
        `;
        const loginButton = modalContent.querySelector('.modal__button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                if (username && password) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateProfileButton(translations, lang);
                    closeModal();
                }
            });
        }
    }

    profileModal.style.display = 'flex';
    lock();

    const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', escHandler, { once: true });
}

export function closeModal() {
    const profileModal = document.getElementById('profileModal');
    const backdrop = document.querySelector('.profile-backdrop');
    if (profileModal) {
        profileModal.style.display = 'none';
    }
    if (backdrop) {
        backdrop.classList.remove('is-visible');
        backdrop.parentElement && backdrop.parentElement.removeChild(backdrop);
    }
    // снять scroll-lock
    try {
        document.body.style.position = '';
        const top = document.body.style.top;
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        const y = parseInt((top || '0').replace('-', ''), 10) || 0;
        if (y) window.scrollTo(0, y);
    } catch (_) {}
}