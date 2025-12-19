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
for (let i = 1; i <= 7; i++) {
    dailyInputs.push(document.getElementById(`day${i}`));
}

// Загрузка данных из localStorage при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    calculateBtn.addEventListener('click', calculateDelivery);
    saveDataBtn.addEventListener('click', saveData);
    resetDataBtn.addEventListener('click', resetData);
    
    // Автоматически сохраняем данные при изменении
    dailyInputs.forEach(input => {
        input.addEventListener('change', saveData);
    });
    
    currentLevelInput.addEventListener('change', saveData);
    deliveryDaysInput.addEventListener('change', saveData);
    orderVolumeInput.addEventListener('change', saveData);
});

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
        }
    } else {
        console.log('Сохраненные данные не найдены');
    }
}

// Функция сохранения данных
function saveData() {
    const dailyLevels = dailyInputs.map(input => parseFloat(input.value) || 0);
    
    const dataToSave = {
        dailyLevels: dailyLevels,
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
        // Очищаем поля ввода
        dailyInputs.forEach(input => input.value = '');
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

// Функция расчета средней скорости потребления
function calculateConsumptionRate() {
    let validDays = 0;
    let totalConsumption = 0;
    
    // Рассчитываем потребление для каждого дня
    for (let i = 0; i < dailyInputs.length - 1; i++) {
        const todayValue = parseFloat(dailyInputs[i].value);
        const yesterdayValue = parseFloat(dailyInputs[i + 1].value);
        
        // Проверяем, что оба значения валидны
        if (!isNaN(todayValue) && !isNaN(yesterdayValue) && 
            todayValue >= 0 && todayValue <= 100 && 
            yesterdayValue >= 0 && yesterdayValue <= 100) {
            
            // Потребление = разница между вчерашним и сегодняшним уровнем
            const dailyConsumption = yesterdayValue - todayValue;
            if (dailyConsumption > 0) {
                totalConsumption += dailyConsumption;
                validDays++;
            }
        }
    }
    
    // Возвращаем среднее потребление или 0, если нет данных
    return validDays > 0 ? totalConsumption / validDays : 0;
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
    
    // Рассчитываем среднюю скорость потребления
    const avgConsumption = calculateConsumptionRate();
    
    // Рассчитываем объем заказа
    const orderVolume = (currentLevel * orderVolumePercent) / 100;
    
    // Рассчитываем, через сколько дней достигнем минимального уровня
    // Формула: (Текущий уровень - Минимальный остаток) / Средняя скорость потребления
    let daysToMinLevel = 0;
    if (avgConsumption > 0) {
        daysToMinLevel = (currentLevel - MIN_LEVEL) / avgConsumption;
    }
    
    // Рассчитываем рекомендуемую дату заказа (с учетом дней доставки)
    // Заказ нужно сделать за дней доставки до достижения минимального уровня
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
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    // Обновляем результаты на странице
    consumptionRateElement.textContent = avgConsumption > 0 ? 
        `${avgConsumption.toFixed(2)}% в день` : 'Недостаточно данных';
    
    orderResultElement.textContent = `${orderVolume.toFixed(1)}%`;
    
    if (avgConsumption > 0) {
        daysToDeliveryElement.textContent = `${Math.floor(daysToMinLevel)} дней`;
        orderDateElement.textContent = formatDate(orderDate);
        deliveryDateElement.textContent = formatDate(deliveryDate);
        
        // Добавляем предупреждение, если сроки близки
        if (daysToOrder <= 2) {
            orderDateElement.innerHTML = `${formatDate(orderDate)} <span style="color:#e74c3c; font-size:1rem;">(СРОЧНО!)</span>`;
        }
    } else {
        daysToDeliveryElement.textContent = 'Недостаточно данных';
        orderDateElement.textContent = 'Недостаточно данных';
        deliveryDateElement.textContent = 'Недостаточно данных';
    }
    
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
