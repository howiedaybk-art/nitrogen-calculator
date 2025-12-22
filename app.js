document.addEventListener('DOMContentLoaded', function() {
    // Инициализация приложения
    initApp();
    
    function initApp() {
        // Создаем первую строку при загрузке
        addNewRow();
        
        // Назначаем обработчики событий
        document.getElementById('addRow').addEventListener('click', addNewRow);
        document.getElementById('calculateTotals').addEventListener('click', calculateTotals);
        document.getElementById('clearAll').addEventListener('click', clearAll);
        
        // Назначаем делегирование событий для динамически созданных элементов
        document.getElementById('tableBody').addEventListener('input', handleInputChange);
        document.getElementById('tableBody').addEventListener('click', handleDeleteClick);
    }
    
    // Добавление новой строки в таблицу
    function addNewRow() {
        const tableBody = document.getElementById('tableBody');
        
        // Удаляем сообщение о пустой таблице, если оно есть
        const emptyRow = tableBody.querySelector('.empty-row');
        if (emptyRow) {
            emptyRow.remove();
        }
        
        // Создаем новую строку
        const newRow = document.createElement('tr');
        const rowNumber = tableBody.querySelectorAll('tr:not(.empty-row)').length + 1;
        
        newRow.innerHTML = `
            <td>
                <span class="row-number">${rowNumber}</span>
            </td>
            <td>
                <input type="text" class="product-name" placeholder="Введите наименование">
            </td>
            <td>
                <input type="number" class="quantity" placeholder="0" min="0" step="1">
            </td>
            <td>
                <input type="number" class="price-without-vat" placeholder="0.00" min="0" step="0.01">
            </td>
            <td class="result-cell unit-price-with-vat">0.00</td>
            <td class="result-cell total-without-vat">0.00</td>
            <td class="result-cell vat-amount">0.00</td>
            <td class="result-cell total-with-vat">0.00</td>
            <td>
                <button class="delete-row" title="Удалить строку">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(newRow);
        
        // Прокручиваем к новой строке
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Обработка изменения ввода в таблице
    function handleInputChange(event) {
        const target = event.target;
        
        // Проверяем, является ли элемент полем ввода количества или цены
        if (target.classList.contains('quantity') || target.classList.contains('price-without-vat')) {
            // Получаем родительскую строку
            const row = target.closest('tr');
            calculateRow(row);
        }
    }
    
    // Расчет значений для строки
    function calculateRow(row) {
        // Получаем значения из полей ввода
        const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
        const priceWithoutVAT = parseFloat(row.querySelector('.price-without-vat').value) || 0;
        
        // Выполняем расчеты
        const unitPriceWithVAT = priceWithoutVAT * 1.22; // Цена с НДС
        const totalWithoutVAT = quantity * priceWithoutVAT; // Стоимость без НДС
        const vatAmount = totalWithoutVAT * 0.22; // Сумма НДС
        const totalWithVAT = totalWithoutVAT + vatAmount; // Стоимость с НДС
        
        // Обновляем ячейки с результатами
        row.querySelector('.unit-price-with-vat').textContent = formatCurrency(unitPriceWithVAT);
        row.querySelector('.total-without-vat').textContent = formatCurrency(totalWithoutVAT);
        row.querySelector('.vat-amount').textContent = formatCurrency(vatAmount);
        row.querySelector('.total-with-vat').textContent = formatCurrency(totalWithVAT);
    }
    
    // Обработка удаления строки
    function handleDeleteClick(event) {
        const target = event.target;
        
        // Проверяем, была ли нажата кнопка удаления или ее дочерний элемент
        if (target.classList.contains('delete-row') || target.closest('.delete-row')) {
            const row = target.closest('tr');
            const tableBody = document.getElementById('tableBody');
            const rows = tableBody.querySelectorAll('tr:not(.empty-row)');
            
            // Не позволяем удалить последнюю строку
            if (rows.length > 1) {
                row.remove();
                updateRowNumbers(); // Обновляем номера строк
                
                // Если после удаления не осталось строк, показываем сообщение
                if (tableBody.querySelectorAll('tr:not(.empty-row)').length === 0) {
                    showEmptyTableMessage();
                }
            } else {
                alert('Должна остаться хотя бы одна строка для расчета');
            }
        }
    }
    
    // Обновление номеров строк
    function updateRowNumbers() {
        const rows = document.querySelectorAll('#tableBody tr:not(.empty-row)');
        rows.forEach((row, index) => {
            const rowNumberCell = row.querySelector('.row-number');
            if (rowNumberCell) {
                rowNumberCell.textContent = index + 1;
            }
        });
    }
    
    // Расчет итоговых сумм
    function calculateTotals() {
        const rows = document.querySelectorAll('#tableBody tr:not(.empty-row)');
        
        let totalWithoutVAT = 0;
        let totalVAT = 0;
        let totalWithVAT = 0;
        
        // Суммируем значения из всех строк
        rows.forEach(row => {
            // Выполняем расчет для строки, если она еще не рассчитана
            calculateRow(row);
            
            // Получаем рассчитанные значения
            const rowTotalWithoutVAT = parseFloat(row.querySelector('.total-without-vat').textContent.replace(/\s/g, '')) || 0;
            const rowVAT = parseFloat(row.querySelector('.vat-amount').textContent.replace(/\s/g, '')) || 0;
            const rowTotalWithVAT = parseFloat(row.querySelector('.total-with-vat').textContent.replace(/\s/g, '')) || 0;
            
            // Суммируем
            totalWithoutVAT += rowTotalWithoutVAT;
            totalVAT += rowVAT;
            totalWithVAT += rowTotalWithVAT;
        });
        
        // Обновляем отображение итогов
        document.getElementById('totalWithoutVAT').innerHTML = `${formatCurrency(totalWithoutVAT)} <span class="currency">₽</span>`;
        document.getElementById('totalVAT').innerHTML = `${formatCurrency(totalVAT)} <span class="currency">₽</span>`;
        document.getElementById('totalWithVAT').innerHTML = `${formatCurrency(totalWithVAT)} <span class="currency">₽</span>`;
        
        // Показываем уведомление о завершении расчета
        showNotification(`Итоги рассчитаны: ${formatCurrency(totalWithVAT)} ₽`);
    }
    
    // Очистка всех данных
    function clearAll() {
        if (confirm('Вы уверены, что хотите удалить все данные? Все строки будут очищены.')) {
            const tableBody = document.getElementById('tableBody');
            
            // Удаляем все строки
            tableBody.innerHTML = '';
            
            // Показываем сообщение о пустой таблице
            showEmptyTableMessage();
            
            // Сбрасываем итоговые значения
            document.getElementById('totalWithoutVAT').innerHTML = `0 <span class="currency">₽</span>`;
            document.getElementById('totalVAT').innerHTML = `0 <span class="currency">₽</span>`;
            document.getElementById('totalWithVAT').innerHTML = `0 <span class="currency">₽</span>`;
            
            // Добавляем первую строку
            addNewRow();
            
            showNotification('Все данные очищены');
        }
    }
    
    // Показать сообщение о пустой таблице
    function showEmptyTableMessage() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9" class="empty-row-msg">
                    <i class="fas fa-plus-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    Нажмите "Добавить строку" для начала расчета
                </td>
            </tr>
        `;
    }
    
    // Форматирование денежных значений
    function formatCurrency(value) {
        // Округляем до 2 знаков после запятой
        const roundedValue = Math.round(value * 100) / 100;
        
        // Форматируем с разделителями тысяч и 2 знаками после запятой
        return roundedValue.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    // Показать уведомление
    function showNotification(message) {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #27ae60;
            color: white;
            padding: 15px 25px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 600;
            animation: fadeInOut 3s ease-in-out;
        `;
        
        // Добавляем стили анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        
        // Добавляем уведомление на страницу
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }
});
