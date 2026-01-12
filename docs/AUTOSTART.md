# Автозапуск dev-сервера (Vite)

Варианты для macOS / Linux: launchd (macOS), systemd (Linux) или pm2 (cross-platform). Выберите один.

## PM2 (рекомендуется, кросс-платформенно)
1. Установите pm2 глобально: `npm i -g pm2`
2. В корне проекта есть `scripts/pm2/ecosystem.config.js`. Запуск:
   - `pm2 start scripts/pm2/ecosystem.config.js`
   - `pm2 save`
   - `pm2 startup` (следовать подсказке и выполнить команду с sudo)
3. Просмотр: `pm2 status`, лог: `pm2 logs progect-shop-vite`

Преимущество: удобная персистентность и автозапуск после перезагрузки.

---

## launchd (macOS, user agent)
1. Отредактируйте `scripts/launchd/com.progectshop.vite.plist`, проверьте `WorkingDirectory`.
2. Копируйте в ~/Library/LaunchAgents:
   `cp scripts/launchd/com.progectshop.vite.plist ~/Library/LaunchAgents/`
3. Загрузите и включите:
   `launchctl unload ~/Library/LaunchAgents/com.progectshop.vite.plist 2>/dev/null || true`
   `launchctl load -w ~/Library/LaunchAgents/com.progectshop.vite.plist`
4. Логи: `/tmp/progect-shop-vite.out` и `/tmp/progect-shop-vite.err`.

Чтобы остановить: `launchctl unload -w ~/Library/LaunchAgents/com.progectshop.vite.plist`

---

## systemd (Linux)
1. Отредактируйте `scripts/systemd/progect-shop-vite.service` — замените `WorkingDirectory` и `User`.
2. Скопируйте в `/etc/systemd/system/`:
   `sudo cp scripts/systemd/progect-shop-vite.service /etc/systemd/system/progect-shop-vite.service`
3. Активируйте и запустите:
   `sudo systemctl daemon-reload`
   `sudo systemctl enable --now progect-shop-vite.service`
4. Логи: `journalctl -u progect-shop-vite.service -f`

---

## Простой nohup (альтернатива)
Используйте `scripts/start-vite.sh` (сделать исполняемым `chmod +x scripts/start-vite.sh`), он запустит Vite в фоне и сохранит PID и логи в `/tmp`.

---

Если хотите — могу настроить и протестировать один из вариантов локально (например, PM2 или launchd). Напишите, какой предпочтёте, и я помогу с включением и проверкой.  
