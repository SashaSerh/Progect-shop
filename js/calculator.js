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

export { initCalculator };