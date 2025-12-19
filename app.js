// Константы приложения
const STORAGE_KEY = 'nitrogen_calculator_data';
const HISTORY_KEY = 'nitrogen_calculator_history';
const SETTINGS_KEY = 'nitrogen_calculator_settings';

// Фиксированные параметры (по вашим требованиям)
const FIXED_MIN_LEVEL = 30;    // Минимальный остаток
const FIXED_ORDER_VOLUME = 45; // Объем заказа
const MAX_SAFE_LEVEL = 90;     // Максимальный уровень после заправки
const REQUIRED_DAYS = 7;       // Дней для расчета скорости

// Глобальные переменные
let measurementHistory = [];
let consumptionChart = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Устанавливаем сегодняшнюю дату по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('measurementDate').value = today;
    document.getElementById('measurementDate').max = today;
    
    // Загружаем историю и данные
    loadHistory();
    loadSettings();
    updateTankVisual();
    updateHistoryDisplay();
    updateCalculatedRate();
    
    // Обработчик формы
    document.getElementById('nitrogenForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMeasurement();
    });
    
    // Обновляем визуализацию при изменении уровня
    document.getElementById('currentLevel').addEventListener('input', updateTankVisual);
    
    // Автоматический расчет при загрузке, если есть достаточно данных
    if (hasEnoughData()) {
        calculateFromHistory();
    }
});

// Функция сохранения замера
function saveMeasurement() {
    const current = parseFloat(document.getElementById('currentLevel').value);
    const date = document.getElementById('measurementDate').value;
    
    if (isNaN(current) || current < 0 || current > 100) {
        showError("Введите корректный уровень (0-100%)!");
        return;
    }
    
    if (!date) {
        showError("Выберите дату замера!");
        return;
    }
    
    // Проверяем, не превышает ли уровень максимальный безопасный
    if (current > MAX_SAFE_LEVEL) {
        if (!confirm(`Внимание! Уровень ${current}% превышает максимальный безопасный уровень ${MAX_SAFE_LEVEL}%. 
После заправки рекомендуется устанавливать 90%. Продолжить?`)) {
            return;
        }
    }
    
    // Создаем запись замера
    const measurement = {
        id: Date.now(),
        date: date,
        timestamp: new Date(date).getTime(),
        level: current,
        levelDisplay: current.toFixed(1) + '%'
    };
    
    // Добавляем в историю
    addToHistory(measurement);
    
    // Обновляем отображение
    updateHistoryDisplay();
    updateCalculatedRate();
    
    // Сбрасываем форму (кроме даты)
    document.getElementById('currentLevel').value = '';
    updateTankVisual();
    
    // Если набралось достаточно данных - делаем расчет
    if (hasEnoughData()) {
        calculateFromHistory();
    }
    
    showSuccess("Замер сохранен!");
}

// Функция добавления в историю
function addToHistory(measurement) {
    // Добавляем новую запись
    measurementHistory.unshift(measurement);
    
    // Сортируем по дате (от новых к старым)
    measurementHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    // Оставляем только записи за последние 14 дней (чтобы было 7 дней для расчета)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const cutoffTimestamp = cutoffDate.getTime();
    
    measurementHistory = measurementHistory.filter(m => m.timestamp >= cutoffTimestamp);
    
    // Сохраняем в localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(measurementHistory));
}

// Функция расчета из истории
function calculateFromHistory() {
    if (!hasEnoughData()) {
        showError(`Для расчета необходимо минимум ${REQUIRED_DAYS} дней данных. 
Сейчас доступно ${getValidHistoryDays()} дней.`);
        return;
    }
    
    // Получаем данные за последние 7 дней
    const recentMeasurements = getLastNDaysMeasurements(REQUIRED_DAYS);
    
    if (recentMeasurements.length < 2) {
        showError("Недостаточно данных для расчета скорости потребления");
        return;
    }
    
    // Рассчитываем скорость потребления
    const consumptionRate = calculateConsumptionRate(recentMeasurements);
    
    if (consumptionRate <= 0) {
        showError("Не удалось рассчитать скорость потребления. Проверьте данные.");
        return;
    }
    
    // Получаем текущий уровень (последний замер)
    const currentLevel = recentMeasurements[0].level;
    const deliveryDays = parseInt(document.getElementById('deliveryDays').value) || 2;
    
    // Проверяем, не ниже ли текущий уровень уже минимального
    if (currentLevel <= FIXED_MIN_LEVEL) {
        showUrgentWarning(currentLevel, consumptionRate, deliveryDays);
        return;
    }
    
    // Расчет дней до достижения минимального уровня
    const daysToMin = (currentLevel - FIXED_MIN_LEVEL) / consumptionRate;
    const daysToOrder = daysToMin - deliveryDays;
    
    // Расчет дат
    const today = new Date();
    const orderDate = new Date(today);
    orderDate.setDate(orderDate.getDate() + Math.floor(daysToOrder));
    
    const arrivalDate = new Date(orderDate);
    arrivalDate.setDate(arrivalDate.getDate() + deliveryDays);
    
    const depletionDate = new Date(today);
    depletionDate.setDate(depletionDate.getDate() + Math.ceil(daysToMin));
    
    // Расчет уровня после поставки
    const levelAfterDelivery = Math.min(currentLevel + FIXED_ORDER_VOLUME, MAX_SAFE_LEVEL);
    
    // Определение статуса
    let status, statusClass, statusIcon, recommendation;
    if (daysToOrder <= 0) {
        status = "СРОЧНО ЗАКАЗАТЬ!";
        statusClass = "urgent";
        statusIcon = "bi-exclamation-triangle-fill text-danger";
        recommendation = "Немедленно свяжитесь с поставщиком";
    } else if (daysToOrder <= 2) {
        status = "Рекомендуется заказать в ближайшие дни";
        statusClass = "warning";
        statusIcon = "bi-exclamation-circle-fill text-warning";
        recommendation = "Запланируйте заказ на этой неделе";
    } else {
        status = "Запас достаточный";
        statusClass = "normal";
        statusIcon = "bi-check-circle-fill text-success";
        recommendation = "Следите за регулярными замерами";
    }
    
    // Форматирование результатов
    const resultHTML = `
        <div class="alert ${statusClass}">
            <div class="d-flex justify-content-between align-items-start">
                <h4><i class="bi ${statusIcon}"></i> ${status}</h4>
                <span class="badge bg-dark">Скорость: ${consumptionRate.toFixed(2)}%/день</span>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <strong><i class="bi bi-calendar-x"></i> Критические даты:</strong>
                        <ul class="mt-2">
                            <li>Заказ до: <span class="badge bg-primary">${orderDate.toLocaleDateString('ru-RU')}</span></li>
                            <li>Поставка: <span class="badge bg-info">${arrivalDate.toLocaleDateString('ru-RU')}</span></li>
                            <li>Исчерпание: <span class="badge bg-secondary">${depletionDate.toLocaleDateString('ru-RU')}</span></li>
                        </ul>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <strong><i class="bi bi-graph-up"></i> Параметры:</strong>
                        <ul class="mt-2">
                            <li>До минимума: <span class="badge ${daysToOrder <= 2 ? 'bg-danger' : 'bg-warning'}">${daysToMin.toFixed(1)} дней</span></li>
                            <li>Текущий уровень: <span class="badge ${currentLevel <= 40 ? 'bg-danger' : 'bg-success'}">${currentLevel.toFixed(1)}%</span></li>
                            <li>После поставки: <span class="badge bg-success">~${levelAfterDelivery.toFixed(0)}%</span></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="mt-3">
                <strong><i class="bi bi-lightbulb"></i> Рекомендация:</strong> ${recommendation}
            </div>
            <div class="mt-2 small text-muted">
                Расчет основан на данных за ${recentMeasurements.length} дней
            </div>
        </div>
    `;
    
    // Обновление графика
    updateConsumptionChart(recentMeasurements, consumptionRate, daysToMin);
    
    // Отображение результатов
    document.getElementById('result').innerHTML = resultHTML;
    
    // Показываем уведомление, если пора заказывать
    if (daysToOrder <= 2) {
        showNotification(status, orderDate.toLocaleDateString('ru-RU'));
    }
}

// Функция расчета скорости потребления
function calculateConsumptionRate(measurements) {
    if (measurements.length < 2) return 0;
    
    // Сортируем от старых к новым для расчета
    const sorted = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
    
    let totalDays = 0;
    let totalConsumption = 0;
    
    // Рассчитываем потребление между всеми замерами
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        
        const daysDiff = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60 * 24);
        const levelDiff = prev.level - curr.level;
        
        if (daysDiff > 0 && levelDiff > 0) {
            const dailyRate = levelDiff / daysDiff;
            totalConsumption += dailyRate;
            totalDays++;
        }
    }
    
    return totalDays > 0 ? totalConsumption / totalDays : 0;
}

// Функция обновления графика
function updateConsumptionChart(measurements, rate, daysToMin) {
    const ctx = document.getElementById('consumptionChart').getContext('2d');
    
    // Сортируем данные для графика
    const sorted = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
    const labels = sorted.map(m => new Date(m.timestamp).toLocaleDateString('ru-RU'));
    const data = sorted.map(m => m.level);
    
    // Расчет прогноза
    const forecastDays = Math.min(14, Math.ceil(daysToMin) + 3);
    const forecastLabels = [];
    const forecastData = [];
    const today = new Date();
    
    // Добавляем исторические данные
    for (let i = 0; i < sorted.length; i++) {
        forecastLabels.push(labels[i]);
        forecastData.push(data[i]);
    }
    
    // Добавляем прогноз
    let lastDate = new Date(sorted[sorted.length - 1].timestamp);
    let lastLevel = data[data.length - 1];
    
    for (let i = 1; i <= forecastDays; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        
        const forecastLevel = Math.max(FIXED_MIN_LEVEL, lastLevel - (rate * i));
        
        forecastLabels.push(forecastDate.toLocaleDateString('ru-RU'));
        forecastData.push(forecastLevel);
    }
    
    // Создаем или обновляем график
    if (consumptionChart) {
        consumptionChart.destroy();
    }
    
    consumptionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecastLabels,
            datasets: [{
                label: 'Уровень азота (%)',
                data: forecastData,
                borderColor: '#339af0',
                backgroundColor: 'rgba(51, 154, 240, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }, {
                label: 'Минимальный уровень',
                data: forecastLabels.map(() => FIXED_MIN_LEVEL),
                borderColor: '#dc3545',
                borderWidth: 1,
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Прогноз расхода жидкого азота'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Уровень: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Уровень (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Дата'
                    }
                }
            }
        }
    });
}

// Вспомогательные функции
function updateHistoryDisplay() {
    const tbody = document.getElementById('historyTable');
    const historyCount = document.getElementById('historyCount');
    const historyWarning = document.getElementById('historyWarning');
    
    historyCount.textContent = `${measurementHistory.length} записей`;
    
    if (measurementHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> Нет сохраненных замеров
                </td>
            </tr>
        `;
        historyWarning.classList.remove('d-none');
        return;
    }
    
    // Показываем только последние 10 записей
    const displayHistory = measurementHistory.slice(0, 10);
    
    tbody.innerHTML = displayHistory.map((measurement, index) => {
        const date = new Date(measurement.timestamp);
        const daysAgo = Math.floor((Date.now() - measurement.timestamp) / (1000 * 60 * 60 * 24));
        
        // Рассчитываем изменение по сравнению с предыдущим замером
        let change = '';
        if (index < measurementHistory.length - 1) {
            const prev = measurementHistory[index + 1];
            const diff = prev.level - measurement.level;
            const daysDiff = (measurement.timestamp - prev.timestamp) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > 0) {
                const dailyRate = (diff / daysDiff).toFixed(2);
                change = `${dailyRate}%/день`;
            }
        }
        
        return `
            <tr>
                <td>${date.toLocaleDateString('ru-RU')}</td>
                <td>
                    <span class="badge ${measurement.level <= 40 ? 'bg-danger' : measurement.level <= 60 ? 'bg-warning' : 'bg-success'}">
                        ${measurement.levelDisplay}
                    </span>
                </td>
                <td><small class="text-muted">${change}</small></td>
                <td>${daysAgo === 0 ? 'Сегодня' : daysAgo === 1 ? 'Вчера' : `${daysAgo} дн.`}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMeasurement(${measurement.id})" title="Удалить">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Обновляем предупреждение
    if (getValidHistoryDays() >= REQUIRED_DAYS) {
        historyWarning.classList.add('d-none');
    } else {
        historyWarning.classList.remove('d-none');
        historyWarning.innerHTML = `
            <i class="bi bi-info-circle"></i> 
            Для точного расчета необходимо ${REQUIRED_DAYS} дней данных. 
            Сейчас доступно ${getValidHistoryDays()} дней.
        `;
    }
}

function updateCalculatedRate() {
    if (hasEnoughData()) {
        const recentMeasurements = getLastNDaysMeasurements(REQUIRED_DAYS);
        const rate = calculateConsumptionRate(recentMeasurements);
        
        document.getElementById('calculatedRate').textContent = `${rate.toFixed(2)} %/день`;
        document.getElementById('calculatedRate').className = 'badge bg-success';
        document.getElementById('daysCount').textContent = `${getValidHistoryDays()} из ${REQUIRED_DAYS}`;
        document.getElementById('daysCount').className = 'badge bg-success';
    } else {
        document.getElementById('calculatedRate').textContent = '0.00 %/день';
        document.getElementById('calculatedRate').className = 'badge bg-secondary';
        document.getElementById('daysCount').textContent = `${getValidHistoryDays()} из ${REQUIRED_DAYS}`;
        document.getElementById('daysCount').className = 'badge bg-warning';
    }
}

function updateTankVisual() {
    const currentLevel = document.getElementById('currentLevel').value;
    const levelPercent = currentLevel ? Math.min(parseFloat(currentLevel), 100) : 50;
    
    const tankLevel = document.getElementById('tankLevel');
    const tankLabel = document.getElementById('tankLabel');
    
    // Рассчитываем высоту (от 10% до 90% для визуализации)
    const visualHeight = 10 + (levelPercent * 0.8);
    tankLevel.style.height = `${visualHeight}%`;
    tankLabel.textContent = currentLevel ? `${levelPercent.toFixed(0)}%` : '50%';
    
    // Меняем цвет в зависимости от уровня
    if (levelPercent <= FIXED_MIN_LEVEL) {
        tankLevel.style.background = 'linear-gradient(to top, #dc3545, #c82333)';
    } else if (levelPercent <= FIXED_MIN_LEVEL + 20) {
        tankLevel.style.background = 'linear-gradient(to top, #ffc107, #e0a800)';
    } else {
        tankLevel.style.background = 'linear-gradient(to top, #339af0, #1c7ed6)';
    }
}

function setQuickLevel(level) {
    document.getElementById('currentLevel').value = level;
    updateTankVisual();
}

function setLevelTo90() {
    document.getElementById('currentLevel').value = MAX_SAFE_LEVEL;
    updateTankVisual();
}

function deleteMeasurement(id) {
    if (confirm("Удалить этот замер?")) {
        measurementHistory = measurementHistory.filter(m => m.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(measurementHistory));
        updateHistoryDisplay();
        updateCalculatedRate();
        
        if (hasEnoughData()) {
            calculateFromHistory();
        } else {
            document.getElementById('result').innerHTML = `
                <p class="text-muted">Добавьте данные за 7 дней для расчета</p>
            `;
        }
    }
}

function clearHistory() {
    if (confirm("Очистить всю историю замеров?")) {
        measurementHistory = [];
        localStorage.removeItem(HISTORY_KEY);
        updateHistoryDisplay();
        updateCalculatedRate();
        document.getElementById('result').innerHTML = `
            <p class="text-muted">Добавьте данные за 7 дней для расчета</p>
        `;
        
        if (consumptionChart) {
            consumptionChart.destroy();
            consumptionChart = null;
        }
    }
}

function hasEnoughData() {
    return getValidHistoryDays() >= REQUIRED_DAYS;
}

function getValidHistoryDays() {
    if (measurementHistory.length < 2) return 0;
    
    // Получаем диапазон дат в истории
    const sorted = [...measurementHistory].sort((a, b) => a.timestamp - b.timestamp);
    const firstDate = new Date(sorted[0].timestamp);
    const lastDate = new Date(sorted[sorted.length - 1].timestamp);
    
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    return Math.min(REQUIRED_DAYS, Math.floor(daysDiff) + 1);
}

function getLastNDaysMeasurements(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTimestamp = cutoffDate.getTime();
    
    return measurementHistory
        .filter(m => m.timestamp >= cutoffTimestamp)
        .sort((a, b) => b.timestamp - a.timestamp); // От новых к старым
}

function showError(message) {
    document.getElementById('result').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-octagon-fill"></i> ${message}
        </div>
    `;
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <i class="bi bi-check-circle-fill"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Вставляем в начало карточки с результатами
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    resultDiv.appendChild(alertDiv);
}

function showUrgentWarning(currentLevel, rate, deliveryDays) {
    const resultHTML = `
        <div class="alert alert-danger">
            <h4><i class="bi bi-exclamation-triangle-fill"></i> КРИТИЧЕСКИЙ УРОВЕНЬ!</h4>
            <hr>
            <p>Текущий уровень (${currentLevel.toFixed(1)}%) уже на или ниже минимального остатка (${FIXED_MIN_LEVEL}%).</p>
            <p><strong>Необходимо:</strong></p>
            <ol>
                <li>Немедленно связаться с поставщиком</li>
                <li>Заказать доставку в срочном порядке</li>
                <li>Уведомить ответственных лиц</li>
            </ol>
            <div class="mt-3">
                <strong>Расчетные данные:</strong>
                <ul>
                    <li>Скорость потребления: ${rate.toFixed(2)}%/день</li>
                    <li>Дней на доставку: ${deliveryDays}</li>
                    <li>Объем заказа: ${FIXED_ORDER_VOL
