// Calculator logic for AC installation cost
// Prices in UAH

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

function createCalculatorHTML() {
    return `
        <div class="calculator">
            <h3 data-i18n="calculator-title">Калькулятор стоимости монтажа кондиционера</h3>
            <p data-i18n="calculator-description">Рассчитайте стоимость стандартного монтажа сплит-системы. Базовая стоимость включает монтаж до 3м магистрали и дренажа.</p>

            <form class="calculator__form">
                <div class="form-group">
                    <label for="power" data-i18n="power-label">Мощность кондиционера (БТУ):</label>
                    <select id="power" name="power" required>
                        <option value="7000-9000" data-i18n="power-7000-9000">До 7000-9000 БТУ</option>
                        <option value="12000" data-i18n="power-12000">12000 БТУ</option>
                        <option value="18000" data-i18n="power-18000">18000 БТУ</option>
                        <option value="18000-24000" data-i18n="power-18000-24000">18000-24000 БТУ</option>
                        <option value="24000+" data-i18n="power-24000+">Свыше 24000 БТУ</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="trunk" data-i18n="trunk-label">Длина магистрали (м, сверх 3м):</label>
                    <input type="number" id="trunk" name="trunk" min="0" value="0" step="0.1">
                </div>

                <div class="form-group">
                    <label for="drain" data-i18n="drain-label">Длина дренажной системы (м, сверх 3м):</label>
                    <input type="number" id="drain" name="drain" min="0" value="0" step="0.1">
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="cable" name="cable"> <span data-i18n="cable-label">Дополнительный кабель</span>
                    </label>
                    <input type="number" id="cable-length" name="cable-length" min="0" value="0" step="0.1" disabled> <span data-i18n="meters">м</span>
                    <label>
                        <input type="checkbox" id="plug" name="plug"> <span data-i18n="plug-label">Вилка</span>
                    </label>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="hole" name="hole"> <span data-i18n="hole-label">Дополнительное отверстие 40мм</span>
                    </label>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="box" name="box"> <span data-i18n="box-label">Дополнительный короб 60мм*60мм</span>
                    </label>
                </div>

                <button type="button" id="calculate-btn" class="btn btn--primary" data-i18n="calculate-btn">Рассчитать</button>
            </form>

            <div id="result" class="calculator__result" style="display: none;">
                <h4 data-i18n="result-title">Результат расчета</h4>
                <p id="total-cost" data-i18n="total-cost">Общая стоимость: </p>
                <p id="breakdown"></p>
            </div>
        </div>
    `;
}

function calculateCost() {
    const power = document.getElementById('power').value;
    const trunkLength = parseFloat(document.getElementById('trunk').value) || 0;
    const drainLength = parseFloat(document.getElementById('drain').value) || 0;
    const cableChecked = document.getElementById('cable').checked;
    const cableLength = parseFloat(document.getElementById('cable-length').value) || 0;
    const plugChecked = document.getElementById('plug').checked;
    const holeChecked = document.getElementById('hole').checked;
    const boxChecked = document.getElementById('box').checked;

    let total = prices.base[power];
    let breakdown = `Базовая стоимость (${power} БТУ): ${prices.base[power]} UAH\n`;

    if (trunkLength > 0) {
        const trunkCost = trunkLength * prices.trunk[power];
        total += trunkCost;
        breakdown += `Магистраль (${trunkLength}м): ${trunkCost} UAH\n`;
    }

    if (drainLength > 0) {
        const drainCost = drainLength * prices.drain;
        total += drainCost;
        breakdown += `Дренаж (${drainLength}м): ${drainCost} UAH\n`;
    }

    if (cableChecked && cableLength > 0) {
        const cableCost = cableLength * prices.cable;
        total += cableCost;
        breakdown += `Кабель (${cableLength}м): ${cableCost} UAH\n`;
    }

    if (plugChecked) {
        total += prices.plug;
        breakdown += `Вилка: ${prices.plug} UAH\n`;
    }

    if (holeChecked) {
        total += prices.hole;
        breakdown += `Отверстие 40мм: ${prices.hole} UAH\n`;
    }

    if (boxChecked) {
        total += prices.box;
        breakdown += `Короб 60мм*60мм: ${prices.box} UAH\n`;
    }

    document.getElementById('total-cost').textContent = `Общая стоимость: ${total} UAH`;
    document.getElementById('breakdown').textContent = breakdown;
    document.getElementById('result').style.display = 'block';
}

function initCalculator() {
    const calculateBtn = document.getElementById('calculate-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateCost);
    }

    const cableCheckbox = document.getElementById('cable');
    const cableLengthInput = document.getElementById('cable-length');
    if (cableCheckbox && cableLengthInput) {
        cableCheckbox.addEventListener('change', () => {
            cableLengthInput.disabled = !cableCheckbox.checked;
        });
    }

    // Apply i18n if available
    if (typeof window.switchLanguage === 'function') {
        const lang = localStorage.getItem('language') || 'uk';
        window.switchLanguage(lang);
    }
}

function openCalculatorModal() {
    if (!calculatorModal) {
        import('./ui-patterns.js').then(mod => {
            const Modal = mod.Modal;
            calculatorModal = new Modal(createCalculatorHTML(), {
                title: 'Калькулятор стоимости',
                size: 'lg',
                dismissible: true
            });
            calculatorModal.open().then(() => {
                initCalculator();
            });
        });
    } else {
        calculatorModal.open().then(() => {
            initCalculator();
        });
    }
}

export { initCalculator, openCalculatorModal };