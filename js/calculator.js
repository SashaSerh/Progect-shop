/**
 * Calculator logic for AC installation cost
 * Modern implementation with real-time updates
 * Prices in UAH (₴)
 */

const prices = {
    base: {
        '7000-9000': 5000,
        '12000': 5500,
        '18000': 6500,
        '18000-24000': 9000,
        '24000+': 11000
    },
    trunk: {
        '7000-9000': 650,
        '12000': 700,
        '18000': 800,
        '18000-24000': 800,
        '24000+': 950
    },
    drain: 100,
    cable: 80,
    plug: 150,
    hole: 350,
    box: 400
};

let calculatorModal = null;
let isCalculatorInitialized = false;

/**
 * Форматувати число з розділювачами тисяч
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Отримати поточне значення мощності
 */
function getSelectedPower() {
    const selected = document.querySelector('input[name="power"]:checked');
    return selected ? selected.value : '7000-9000';
}

/**
 * Розрахувати та оновити всі значення
 */
function calculateAndUpdate() {
    const power = getSelectedPower();
    const trunkLength = parseFloat(document.getElementById('trunk')?.value) || 0;
    const drainLength = parseFloat(document.getElementById('drain')?.value) || 0;
    const cableLength = parseFloat(document.getElementById('cable-length')?.value) || 0;
    const plugChecked = document.getElementById('plug')?.checked || false;
    const holeCount = parseFloat(document.getElementById('hole-count')?.value) || 0;
    const boxLength = parseFloat(document.getElementById('box-length')?.value) || 0;

    // Базова вартість
    let total = prices.base[power] || 5000;
    
    // Оновлюємо базову вартість в UI
    const baseEl = document.getElementById('breakdown-base');
    if (baseEl) {
        baseEl.textContent = `${formatNumber(prices.base[power])} ₴`;
    }

    // Магістраль
    const trunkCost = trunkLength > 0 ? Math.round(trunkLength * prices.trunk[power]) : 0;
    const trunkRow = document.getElementById('breakdown-trunk-row');
    const trunkEl = document.getElementById('breakdown-trunk');
    if (trunkRow && trunkEl) {
        if (trunkCost > 0) {
            trunkRow.style.display = '';
            trunkEl.textContent = `+${formatNumber(trunkCost)} ₴`;
            total += trunkCost;
        } else {
            trunkRow.style.display = 'none';
        }
    }

    // Дренаж
    const drainCost = drainLength > 0 ? Math.round(drainLength * prices.drain) : 0;
    const drainRow = document.getElementById('breakdown-drain-row');
    const drainEl = document.getElementById('breakdown-drain');
    if (drainRow && drainEl) {
        if (drainCost > 0) {
            drainRow.style.display = '';
            drainEl.textContent = `+${formatNumber(drainCost)} ₴`;
            total += drainCost;
        } else {
            drainRow.style.display = 'none';
        }
    }

    // Кабель
    const cableCost = cableLength > 0 ? Math.round(cableLength * prices.cable) : 0;
    const cableRow = document.getElementById('breakdown-cable-row');
    const cableEl = document.getElementById('breakdown-cable');
    if (cableRow && cableEl) {
        if (cableCost > 0) {
            cableRow.style.display = '';
            cableEl.textContent = `+${formatNumber(cableCost)} ₴`;
            total += cableCost;
        } else {
            cableRow.style.display = 'none';
        }
    }

    // Вилка
    const plugRow = document.getElementById('breakdown-plug-row');
    const plugEl = document.getElementById('breakdown-plug');
    if (plugRow && plugEl) {
        if (plugChecked) {
            plugRow.style.display = '';
            plugEl.textContent = `+${formatNumber(prices.plug)} ₴`;
            total += prices.plug;
        } else {
            plugRow.style.display = 'none';
        }
    }

    // Отверстие (штуки)
    const holeCost = holeCount > 0 ? Math.round(holeCount * prices.hole) : 0;
    const holeRow = document.getElementById('breakdown-hole-row');
    const holeEl = document.getElementById('breakdown-hole');
    if (holeRow && holeEl) {
        if (holeCost > 0) {
            holeRow.style.display = '';
            holeEl.textContent = `+${formatNumber(holeCost)} ₴`;
            total += holeCost;
        } else {
            holeRow.style.display = 'none';
        }
    }

    // Короб (метры)
    const boxCost = boxLength > 0 ? Math.round(boxLength * prices.box) : 0;
    const boxRow = document.getElementById('breakdown-box-row');
    const boxEl = document.getElementById('breakdown-box');
    if (boxRow && boxEl) {
        if (boxCost > 0) {
            boxRow.style.display = '';
            boxEl.textContent = `+${formatNumber(boxCost)} ₴`;
            total += boxCost;
        } else {
            boxRow.style.display = 'none';
        }
    }

    // Оновлюємо загальну суму з анімацією
    const totalEl = document.getElementById('total-amount');
    if (totalEl) {
        const currentValue = parseInt(totalEl.textContent.replace(/\s/g, '')) || 0;
        if (currentValue !== total) {
            animateValue(totalEl, currentValue, total, 300);
        }
    }

    return total;
}

/**
 * Анімація зміни значення
 */
function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const difference = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + difference * easeOut);
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Обробник кнопок +/-
 */
function handleLengthButton(target, delta) {
    const input = document.getElementById(target);
    if (!input) return;
    
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 50;
    const step = parseFloat(input.step) || 0.5;
    let value = parseFloat(input.value) || 0;
    
    value = Math.max(min, Math.min(max, value + delta * step));
    input.value = value.toFixed(1);
    
    // Trigger input event for recalculation
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
}

/**
 * Ініціалізація калькулятора
 */
function initCalculator() {
    if (isCalculatorInitialized) return;
    
    const form = document.getElementById('calculator-form');
    if (!form) return;

    // Power cards selection
    const powerCards = document.querySelectorAll('.power-card');
    powerCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all
            powerCards.forEach(c => c.classList.remove('power-card--active'));
            // Add active to clicked
            card.classList.add('power-card--active');
            // Check the radio
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                calculateAndUpdate();
            }
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(15);
        });
    });
    
    // Set initial active state
    const initialPower = document.querySelector('input[name="power"]:checked');
    if (initialPower) {
        const parentCard = initialPower.closest('.power-card');
        if (parentCard) parentCard.classList.add('power-card--active');
    }

    // Length +/- buttons (includes trunk, drain, cable, hole, box)
    document.querySelectorAll('.length-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.dataset.target;
            const delta = btn.classList.contains('length-btn--plus') ? 1 : -1;
            handleLengthButton(target, delta);
        });
    });

    // Number inputs real-time update (includes trunk, drain, cable, hole, box)
    document.querySelectorAll('.length-input').forEach(input => {
        input.addEventListener('input', calculateAndUpdate);
        input.addEventListener('change', calculateAndUpdate);
    });

    // Plug checkbox
    const plugCheckbox = document.getElementById('plug');
    if (plugCheckbox) {
        plugCheckbox.addEventListener('change', calculateAndUpdate);
    }

    // Extra item checkbox animations (for plug only now)
    document.querySelectorAll('.extra-item__checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const item = checkbox.closest('.extra-item');
            if (item) {
                item.classList.toggle('extra-item--active', checkbox.checked);
            }
        });
    });

    // Extra item content click handler to toggle plug checkbox
    document.querySelectorAll('.extra-item__content').forEach(content => {
        content.addEventListener('click', (e) => {
            // Don't toggle if clicking on a button, input, or link
            if (e.target.closest('button, input, a')) return;
            
            const checkbox = content.querySelector('.extra-item__checkbox');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    // Order button
    const orderBtn = document.querySelector('.calculator-order-btn');
    if (orderBtn) {
        orderBtn.addEventListener('click', () => {
            const total = calculateAndUpdate();
            const power = getSelectedPower();
            const message = `Заявка на монтаж кондиціонера:\nПотужність: ${power} БТУ\nОрієнтовна вартість: ${formatNumber(total)} ₴`;
            
            // Try to use marketing module
            if (typeof window.openWhatsAppWithMessage === 'function') {
                window.openWhatsAppWithMessage(message);
            } else if (typeof window.buildWhatsAppLink === 'function') {
                window.open(window.buildWhatsAppLink(message), '_blank');
            } else {
                // Fallback - show toast
                if (window.Toast) {
                    window.Toast.show('Зв\'яжіться з нами для оформлення замовлення!', 'info');
                }
            }
        });
    }

    // WhatsApp button
    const waBtn = document.querySelector('.calculator-wa-btn');
    if (waBtn) {
        waBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const total = calculateAndUpdate();
            const power = getSelectedPower();
            const message = `Хочу розрахувати монтаж:\nПотужність: ${power} БТУ\nОрієнтовна вартість: ${formatNumber(total)} ₴`;
            
            if (typeof window.buildWhatsAppLink === 'function') {
                window.open(window.buildWhatsAppLink(message), '_blank');
            }
        });
    }

    // Telegram button
    const tgBtn = document.querySelector('.calculator-tg-btn');
    if (tgBtn) {
        tgBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const total = calculateAndUpdate();
            const power = getSelectedPower();
            const message = `Хочу розрахувати монтаж:\nПотужність: ${power} БТУ\nОрієнтовна вартість: ${formatNumber(total)} ₴`;
            
            if (typeof window.buildTelegramLink === 'function') {
                window.open(window.buildTelegramLink(message), '_blank');
            }
        });
    }

    // Initial calculation
    calculateAndUpdate();

    // Apply i18n if available
    if (typeof window.switchLanguage === 'function') {
        const lang = localStorage.getItem('language') || 'uk';
        window.switchLanguage(lang);
    }

    isCalculatorInitialized = true;
    console.log('Calculator initialized successfully');
}

/**
 * Reset calculator state
 */
function resetCalculator() {
    isCalculatorInitialized = false;
}

/**
 * Legacy function for compatibility
 */
function calculateCost() {
    return calculateAndUpdate();
}

function createCalculatorHTML() {
    // Legacy function - returns empty as we now use component loading
    return '';
}

function openCalculatorModal() {
    // Navigate to calculator page instead
    if (typeof window !== 'undefined') {
        window.location.hash = '#calculator';
    }
}

export { 
    initCalculator, 
    openCalculatorModal, 
    calculateCost, 
    calculateAndUpdate, 
    resetCalculator,
    prices,
    formatNumber
};