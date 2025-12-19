// Константы системы
const MIN_LEVEL = 30; // Минимальный уровень в емкости (%)
const MAX_LEVEL = 90; // Максимальный уровень в емкости (%)
const ORDER_PERCENTAGE = 45; // Прибавка к текущему уровню при заказе (%)

// Ключи для localStorage
const STORAGE_KEYS = {
    CONSUMPTION: 'nitrogen_consumption_data',
    CURRENT_LEVEL: 'nitrogen_current_level',
    DELIVERY_DAYS: 'nitrogen_delivery_days'
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeConsumptionGrid();
    loadSavedData();
    setupEventListeners();
});

// Инициализация сетки для ввода данных о потреблении
function initializeConsumptionGrid() {
    const grid = document.getElementById('consumption-grid');
    grid.innerHTML = '';
    
    // Создаем поля для ввода данных за последние 7 дней
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayLabel = date.toLocaleDateString('ru-RU', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
        });
        
        const dayInput = document.createElement('div');
        dayInput.className = 'consumption-day';
        dayInput.innerHTML = `
            <span class="day-label">${dayLabel}</span>
            <input type="number" id="day-${i}" min="0" max="100" step="0.1" placeholder="0.0%">
        `;
        
        grid.appendChild(dayInput);
    }
}

// Загрузка сохраненных данных
function loadSavedData() {
    // Загрузка данных о потреблении
    const consumptionData = loadConsumptionData();
    if (consumptionData) {
        for (let i = 0; i < 7; i++) {
            const input = document.getElementById(`day-${i}`);
            if (input && consumptionData[i] !== undefined) {
                input.value = consumptionData[i];
            }
        }
    }
    
    // Загрузка текущего уровня
    const savedLevel = localStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL);
    if (savedLevel) {
        document.getElementById('current-level').value = savedLevel;
    }
    
    // Загрузка дней доставки
    const savedDeliveryDays = localStorage.getItem(STORAGE_KEYS.DELIVERY_DAYS);
    if (savedDeliveryDays) {
        document.getElementById('delivery-days').value = savedDeliveryDays;
    }
}

// Загрузка данных о потреблении из localStorage
function loadConsumptionData() {
    const data = localStorage.getItem(STORAGE_KEYS.CONSUMPTION);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

// Сохранение данных о потреблении
function saveConsumptionData() {
    const consumptionData = [];
    for (let i = 0; i < 7; i++) {
        const input = document.getElementById(`day-${i}`);
        consumptionData.push(input.value ? parseFloat(input.value) : 0);
    }
    localStorage.setItem(STORAGE_KEYS.CONSUMPTION, JSON.stringify(consumptionData));
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка расчета
    document.getElementById('calculate-btn').addEventListener('click', calculateDelivery);
    
    // Кнопка очистки данных
    document.getElementById('clear-data-btn').addEventListener('click', clearSavedData);
    
    // Автосохранение при изменении полей ввода
    document.getElementById('current-level').addEventListener('input', function() {
        localStorage.setItem(STORAGE_KEYS.CURRENT_LEVEL, this.value);
    });
    
    document.getElementById('delivery-days').addEventListener('input', function() {
        localStorage.setItem(STORAGE_KEYS.DELIVERY_DAYS, this.value);
    });
    
    // Автосохранение данных о потреблении
    for (let i = 0; i < 7; i++) {
        const input = document.getElementById(`day-${i}`);
        if (input) {
            input.addEventListener('input', saveConsumptionData);
        }
    }
}

// Очистка сохраненных данных
function clearSavedData() {
    if (confirm('Вы уверены, что хотите очистить все сохраненные данные?')) {
        localStorage.removeItem(STORAGE_KEYS.CONSUMPTION);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_LEVEL);
        localStorage.removeItem(STORAGE_KEYS.DELIVERY_DAYS);
        
        // Очистка полей ввода
        document.getElementById('current-level').value = '';
        document.getElementById('delivery-days').value = '';
        
        for (let i = 0; i < 7; i++) {
            const input = document.getElementById(`day-${i}`);
            if (input) input.value = '';
        }
        
        // Обновление результатов
        document.getElementById('results-container').innerHTML = 
            '<p style="color: #95a5a6; text-align: center;">Данные очищены. Введите новые данные и нажмите "Рассчитать поставку"</p>';
        
        alert('Все данные очищены');
    }
}

// Основная функция расчета
function calculateDelivery() {
    // Получение введенных данных
    const currentLevel = parseFloat(document.getElementById('current-level').value);
    const deliveryDays = parseFloat(document.getElementById('delivery-days').value);
    
    // Валидация введенных данных
    if (isNaN(currentLevel) || isNaN(deliveryDays)) {
        showError('Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    if (currentLevel < 0 || currentLevel > 100) {
        showError('Текущий уровень должен быть в диапазоне от 0 до 100%');
        return;
    }
    
    // Получение данных о потреблении (в процентах)
    const consumptionData = [];
    let totalConsumption = 0;
    let validDays = 0;
    
    for (let i = 0; i < 7; i++) {
        const input = document.getElementById(`day-${i}`);
        const value = input.value ? parseFloat(input.value) : 0;
        consumptionData.push(value);
        
        if (value > 0) {
            totalConsumption += value;
            validDays++;
        }
    }
    
    // Расчет средней скорости потребления за день (в процентах)
    const avgDailyConsumption = validDays > 0 ? totalConsumption / 7 : 0;
    
    // Расчет дней до заказа по формуле: 
    // (Текущий уровень - Минимальный остаток) / Скорость потребления за 7 последних дней - Дни доставки
    let daysUntilOrder = 0;
    let status = 'normal';
    let statusMessage = '';
    
    if (avgDailyConsumption > 0) {
        daysUntilOrder = (currentLevel - MIN_LEVEL) / avgDailyConsumption - deliveryDays;
        daysUntilOrder = Math.round(daysUntilOrder * 10) / 10; // Округление до одного знака после запятой
    } else if (currentLevel > MIN_LEVEL) {
        // Если потребления нет, но уровень выше минимального
        daysUntilOrder = Infinity;
    }
    
    // Определение статуса и рекомендаций
    let recommendation = '';
    
    if (currentLevel <= MIN_LEVEL) {
        status = 'critical';
        statusMessage = 'КРИТИЧЕСКИЙ УРОВЕНЬ!';
        recommendation = 'Необходимо срочно заказать поставку. Текущий уровень на минимальной отметке или ниже.';
    } else if (daysUntilOrder <= 0) {
        status = 'warning';
        statusMessage = 'ТРЕБУЕТСЯ ЗАКАЗ';
        recommendation = 'Рекомендуется заказать поставку немедленно.';
    } else if (daysUntilOrder <= deliveryDays) {
        status = 'warning';
        statusMessage = 'ПРИБЛИЖАЕТСЯ ВРЕМЯ ЗАКАЗА';
        recommendation = `Рекомендуется заказать поставку в течение ${Math.ceil(daysUntilOrder)} дней.`;
    } else if (daysUntilOrder === Infinity) {
        status = 'ok';
        statusMessage = 'НОРМА (нет потребления)';
        recommendation = 'Потребление азота не зафиксировано за последние 7 дней.';
    } else {
        status = 'ok';
        statusMessage = 'НОРМА';
        recommendation = `Можно отложить заказ на ${Math.floor(daysUntilOrder)} дней.`;
    }
    
    // Расчет нового уровня после поставки
    const newLevelAfterOrder = Math.min(MAX_LEVEL, currentLevel + ORDER_PERCENTAGE);
    
    // Отображение результатов
    displayResults({
        currentLevel,
        deliveryDays,
        avgDailyConsumption,
        daysUntilOrder,
        status,
        statusMessage,
        recommendation,
        newLevelAfterOrder,
        totalConsumption
    });
}

// Отображение ошибок
function showError(message) {
    document.getElementById('results-container').innerHTML = `
        <div class="results">
            <div class="result-item">
                <div class="result-label">Ошибка:</div>
                <div class="result-value warning">${message}</div>
            </div>
        </div>
    `;
}

// Отображение результатов расчета
function displayResults(data) {
    const statusClass = data.status === 'critical' ? 'warning' : 
                       data.status === 'warning' ? 'info' : 'ok';
    
    let daysDisplay = '';
    if (data.daysUntilOrder === Infinity) {
        daysDisplay = '∞ дней (нет потребления)';
    } else if (data.daysUntilOrder > 1000) {
        daysDisplay = '∞ дней';
    } else {
        daysDisplay = `${data.daysUntilOrder > 0 ? data.daysUntilOrder.toFixed(1) : '0'} дней`;
    }
    
    let resultsHTML = `
        <div class="results">
            <div class="result-item">
                <div class="result-label">Статус:</div>
                <div class="result-value ${statusClass}">${data.statusMessage}</div>
            </div>
            
            <div class="result-item">
                <div class="result-label">Текущий уровень азота:</div>
                <div class="result-value">${data.currentLevel}%</div>
            </div>
            
            <div class="result-item">
                <div class="result-label">Среднее потребление за день (за 7 дней):</div>
                <div class="result-value">${data.avgDailyConsumption.toFixed(2)}%</div>
                <div style="font-size: 14px; color: #7f8c8d;">Всего за 7 дней: ${data.totalConsumption.toFixed(2)}%</div>
            </div>
            
            <div class="result-item">
                <div class="result-label">Дней до необходимого заказа:</div>
                <div class="result-value">${daysDisplay}</div>
            </div>
            
            <div class="result-item">
                <div class="result-label">Рекомендация:</div>
                <div class="result-value" style="font-size: 18px;">${data.recommendation}</div>
            </div>
            
            <div class="result-item">
                <div class="result-label">Уровень после поставки:</div>
                <div class="result-value">${data.newLevelAfterOrder}%</div>
                <div style="font-size: 14px; color: #7f8c8d;">Прибавка: ${ORDER_PERCENTAGE}%</div>
            </div>
        </div>
    `;
    
    document.getElementById('results-container').innerHTML = resultsHTML;
}
