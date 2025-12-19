// Константы системы
const MIN_LEVEL = 30; // Минимальный уровень в емкости (%)
const MAX_LEVEL = 90; // Максимальный уровень в емкости (%)

// Элементы DOM
const currentLevelInput = document.getElementById('currentLevel');
const deliveryDaysInput = document.getElementById('deliveryDays');
const orderVolumeInput = document.getElementById('orderVolume');
const calculateBtn = document.getElementById('calculateBtn');
const saveDataBtn = document.getElementById('saveDataBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

// Элементы для отображения результатов
const consumptionRateElement = document.getElementById('consumptionRate');
const orderResultElement = document.getElementById('orderResult');
const daysToDeliveryElement = document.getElementById('daysToDelivery');
const orderDateElement = document.getElementById('orderDate');
const deliveryDateElement = document.getElementById('deliveryDate');
const orderPercentElement = document.getElementById('orderPercent');

// Массив для хранения элементов полей ввода за 7 дней
const dailyInputs = [];
const dailyDateInputs = [];
for (let i = 1; i <= 7; i++) {
    dailyInputs.push(document.getElementById(`day${i}`));
    // Создаем поля для дат
    const dateInputId = `date${i}`;
    dailyDateInputs.push(dateInputId);
}

// Загрузка данных из localStorage при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeDateInputs(); // Инициализация дат
    loadSavedData();
    calculateBtn.addEventListener('click', calculateDelivery);
    saveDataBtn.addEventListener('click', saveData);
    resetDataBtn.addEventListener('click', resetData);
    
    // Автоматически сохраняем данные при изменении
    dailyInputs.forEach(input => {
        input.addEventListener('change', saveData);
    });
    
    // Добавляем обработчики для полей дат
    dailyDateInputs.forEach(dateId => {
        const input = document.getElementById(dateId);
        if (input) {
            input.addEventListener('change', saveData);
        }
    });
    
    currentLevelInput.addEventListener('change', saveData);
    deliveryDaysInput.addEventListener('change', saveData);
    orderVolumeInput.addEventListener('change', saveData);
});

// Инициализация полей с датами
function initializeDateInputs() {
    const dailyInputsContainer = document.querySelector('.daily-inputs');
    if (!dailyInputsContainer) return;
    
    // Очищаем контейнер
    dailyInputsContainer.innerHTML = '';
    
    // Создаем поля для последних 7 дней
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i)); // От 6 дней назад до сегодня
        
        const dayInput = document.createElement('div');
        dayInput.className = 'daily-input';
        
        const dateStr = formatDateForInput(date);
        const displayDateStr = formatDateForDisplay(date);
        
        dayInput.innerHTML = `
            <label for="date${i+1}">${displayDateStr}</label>
            <input type="date" id="date${i+1}" value="${dateStr}">
            <input type="number" id="day${i+1}" min="0" max="100" step="0.1" placeholder="0-100%" style="margin-top: 5px;">
        `;
        
        dailyInputsContainer.appendChild(dayInput);
    }
}

// Форматирование даты для input[type="date"]
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Форматирование даты для отображения
function formatDateForDisplay(date) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('ru-RU', options);
}

// Функция загрузки сохраненных данных
function loadSavedData() {
    if (localStorage.getItem('nitrogenData')) {
        try {
            const savedData = JSON.parse(localStorage.getItem('nitrogenData'));
            
            // Загружаем данные за 7 дней
            dailyInputs.forEach((input, index) => {
                if (savedData.dailyLevels && savedData.dailyLevels[index] !== undefined) {
                    input.value = savedData.dailyLevels[index];
                }
            });
            
            // Загружаем даты
            dailyDateInputs.forEach((dateId, index) => {
                const input = document.getElementById(dateId);
                if (input && savedData.dailyDates && savedData.dailyDates[index]) {
                    input.value = savedData.dailyDates[index];
                }
            });
            
            // Загружаем другие данные
            if (savedData.currentLevel !== undefined) currentLevelInput.value = savedData.currentLevel;
            if (savedData.deliveryDays !== undefined) deliveryDaysInput.value = savedData.deliveryDays;
            if (savedData.orderVolume !== undefined) {
                orderVolumeInput.value = savedData.orderVolume;
                orderPercentElement.textContent = savedData.orderVolume;
            }
            
            console.log('Данные успешно загружены из localStorage');
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            // Если есть ошибка, инициализируем даты заново
            initializeDateInputs();
        }
    } else {
        console.log('Сохраненные данные не найдены');
    }
}

// Функция сохранения данных
function saveData() {
    const dailyLevels = [];
    const dailyDates = [];
    
    // Собираем данные за 7 дней
    for (let i = 1; i <= 7; i++) {
        const levelInput = document.getElementById(`day${i}`);
        const dateInput = document.getElementById(`date${i}`);
        
        if (levelInput) {
            dailyLevels.push(parseFloat(levelInput.value) || 0);
        }
        
        if (dateInput) {
            dailyDates.push(dateInput.value || formatDateForInput(new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000)));
        }
    }
    
    const dataToSave = {
        dailyLevels: dailyLevels,
        dailyDates: dailyDates,
        currentLevel: parseFloat(currentLevelInput.value) || 0,
        deliveryDays: parseInt(deliveryDaysInput.value) || 0,
        orderVolume: parseFloat(orderVolumeInput.value) || 45,
        lastUpdated: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('nitrogenData', JSON.stringify(dataToSave));
        console.log('Данные успешно сохранены');
        
        // Показываем уведомление о сохранении
        showNotification('Данные сохранены!', 'success');
    } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
        showNotification('Ошибка при сохранении данных', 'error');
    }
}

// Функция сброса данных
function resetData() {
    if (confirm('Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.')) {
        // Очищаем поля ввода уровней
        dailyInputs.forEach(input => input.value = '');
        
        // Сбрасываем даты на последние 7 дней
        initializeDateInputs();
        
        // Очищаем другие поля
        currentLevelInput.value = '';
        deliveryDaysInput.value = '';
        orderVolumeInput.value = '45';
        orderPercentElement.textContent = '45';
        
        // Очищаем результаты
        consumptionRateElement.textContent = '-';
        orderResultElement.textContent = '-';
        daysToDeliveryElement.textContent = '-';
        orderDateElement.textContent = '-';
        deliveryDateElement.textContent = '-';
        
        // Удаляем данные из localStorage
        localStorage.removeItem('nitrogenData');
        
        showNotification('Все данные сброшены', 'info');
    }
}

// Функция расчета средней скорости потребления (ИСПРАВЛЕННАЯ)
function calculateConsumptionRate() {
    const levelData = [];
    
    // Собираем данные об уровнях и датах
    for (let i = 1; i <= 7; i++) {
        const levelInput = document.getElementById(`day${i}`);
        const dateInput = document.getElementById(`date${i}`);
        
        if (levelInput && dateInput && levelInput.value && dateInput.value) {
            const level = parseFloat(levelInput.value);
            const date = new Date(dateInput.value);
            
            if (!isNaN(level) && level >= 0 && level <= 100 && date instanceof Date && !isNaN(date.getTime())) {
                levelData.push({
                    date: date,
                    level: level
                });
            }
        }
    }
    
    // Сортируем по дате (от старых к новым)
    levelData.sort((a, b) => a.date - b.date);
    
    // Если данных меньше 2, нельзя рассчитать потребление
    if (levelData.length < 2) {
        console.log('Недостаточно данных для расчета скорости потребления');
        return 0;
    }
    
    // Рассчитываем общее потребление за весь период
    const firstData = levelData[0];
    const lastData = levelData[levelData.length - 1];
    
    // Разница в уровне между первым и последним измерением
    const totalLevelDifference = firstData.level - lastData.level;
    
    // Разница во времени в днях
    const timeDifferenceInMs = lastData.date - firstData.date;
    const timeDifferenceInDays = timeDifferenceInMs / (1000 * 60 * 60 * 24);
    
    // Если разница во времени слишком мала или отрицательная
    if (timeDifferenceInDays <= 0) {
        console.log('Некорректный временной интервал');
        return 0;
    }
    
    // Средняя скорость потребления в %/день
    const avgConsumption = totalLevelDifference / timeDifferenceInDays;
    
    console.log(`Расчет потребления: разница уровней = ${totalLevelDifference}%, период = ${timeDifferenceInDays.toFixed(1)} дней, скорость = ${avgConsumption.toFixed(2)}%/день`);
    
    return avgConsumption > 0 ? avgConsumption : 0;
}

// Функция расчета поставки
function calculateDelivery() {
    // Получаем значения из полей ввода
    const currentLevel = parseFloat(currentLevelInput.value);
    const deliveryDays = parseInt(deliveryDaysInput.value);
    const orderVolumePercent = parseFloat(orderVolumeInput.value);
    
    // Проверяем введенные данные
    if (isNaN(currentLevel) || currentLevel < 0 || currentLevel > 100) {
        showNotification('Пожалуйста, введите корректный текущий уровень (0-100%)', 'error');
        return;
    }
    
    if (isNaN(deliveryDays) || deliveryDays < 0) {
        showNotification('Пожалуйста, введите корректное количество дней доставки', 'error');
        return;
    }
    
    // Обновляем отображаемый процент заказа
    orderPercentElement.textContent = orderVolumePercent;
    
    // Рассчитываем среднюю скорость потребления (ИСПРАВЛЕННЫЙ РАСЧЕТ)
    const avgConsumption = calculateConsumptionRate();
    
    // Рассчитываем объем заказа
    const orderVolume = (currentLevel * orderVolumePercent) / 100;
    
    // Рассчитываем, через сколько дней достигнем минимального уровня
    let daysToMinLevel = 0;
    if (avgConsumption > 0) {
        daysToMinLevel = (currentLevel - MIN_LEVEL) / avgConsumption;
        console.log(`Дней до мин. уровня: (${currentLevel} - ${MIN_LEVEL}) / ${avgConsumption.toFixed(2)} = ${daysToMinLevel.toFixed(1)}`);
    }
    
    // Рассчитываем рекомендуемую дату заказа (с учетом дней доставки)
    let daysToOrder = Math.floor(daysToMinLevel - deliveryDays);
    
    // Если дней до заказа уже мало или отрицательное значение, рекомендуем заказ сегодня
    if (daysToOrder < 0) {
        daysToOrder = 0;
    }
    
    // Рассчитываем даты
    const today = new Date();
    const orderDate = new Date(today);
    orderDate.setDate(orderDate.getDate() + daysToOrder);
    
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
    
    // Форматируем даты для отображения
    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    // Обновляем результаты на странице
    if (avgConsumption > 0) {
        consumptionRateElement.textContent = `${avgConsumption.toFixed(2)}% в день`;
        daysToDeliveryElement.textContent = `${Math.floor(daysToMinLevel)} дней`;
        orderDateElement.textContent = formatDate(orderDate);
        deliveryDateElement.textContent = formatDate(deliveryDate);
        
        // Добавляем предупреждение, если сроки близки
        if (daysToOrder <= 2) {
            orderDateElement.innerHTML = `${formatDate(orderDate)} <span style="color:#e74c3c; font-size:1rem;">(СРОЧНО!)</span>`;
        }
    } else {
        consumptionRateElement.textContent = 'Недостаточно данных';
        daysToDeliveryElement.textContent = 'Недостаточно данных';
        orderDateElement.textContent = 'Недостаточно данных';
        deliveryDateElement.textContent = 'Недостаточно данных';
    }
    
    orderResultElement.textContent = `${orderVolume.toFixed(1)}%`;
    
    // Автоматически сохраняем данные после расчета
    saveData();
}

// Функция для отображения уведомлений
function showNotification(message, type) {
    // Удаляем предыдущее уведомление, если оно есть
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Стилизуем уведомление
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '5px';
    notification.style.color = 'white';
    notification.style.fontWeight = '600';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.transition = 'opacity 0.3s';
    
    // Цвета в зависимости от типа уведомления
    if (type === 'success') {
        notification.style.backgroundColor = '#2ecc71';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e74c3c';
    } else {
        notification.style.backgroundColor = '#3498db';
    }
    
    // Добавляем уведомление на страницу
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
