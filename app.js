document.addEventListener('DOMContentLoaded', function() {
    // Константы
    const VAT_RATE = 0.22; // Ставка НДС 22%
    
    // Элементы DOM
    const tableBody = document.getElementById('tableBody');
    const addRowBtn = document.getElementById('addRowBtn');
    const resetBtn = document.getElementById('resetBtn');
    const totalWithoutVAT = document.getElementById('totalWithoutVAT');
    const totalVAT = document.getElementById('totalVAT');
    const totalWithVAT = document.getElementById('totalWithVAT');
    
    // Начальные данные для примера
    const initialData = [
        { name: "Ноутбук Dell XPS 15", quantity: 5, price: 85000 },
        { name: "Монитор Samsung 27\"", quantity: 3, price: 21000 },
        { name: "Офисное кресло", quantity: 10, price: 7500 }
    ];
    
    // Инициализация таблицы
    function initTable() {
        tableBody.innerHTML = '';
        
        initialData.forEach((item, index) => {
            addRow(item.name, item.quantity, item.price);
        });
        
        // Добавляем одну пустую строку для ввода
        addRow('', '', '');
        
        updateTotals();
    }
    
    // Добавление новой строки
    function addRow(name = '', quantity = '', price = '') {
        const rowCount = tableBody.children.length + 1;
        const row = document.createElement('tr');
        row.setAttribute('data-index', rowCount - 1);
        
        row.innerHTML = `
            <td>${rowCount}</td>
            <td><input type="text" class="product-name" value="${name}" placeholder="Введите наименование"></td>
            <td><input type="number" class="quantity" min="0" step="1" value="${quantity}" placeholder="0"></td>
            <td><input type="number" class="price-without-vat" min="0" step="0.01" value="${price}" placeholder="0.00"></td>
            <td><div class="readonly price-with-vat">0.00</div></td>
            <td><div class="readonly total-without-vat">0.00</div></td>
            <td><div class="readonly vat-amount">0.00</div></td>
            <td><div class="readonly total-with-vat">0.00</div></td>
            <td><button class="delete-btn" title="Удалить строку"><i class="fas fa-trash"></i></button></td>
        `;
        
        tableBody.appendChild(row);
        
        // Добавляем обработчики событий для инпутов
        const quantityInput = row.querySelector('.quantity');
        const priceInput = row.querySelector('.price-without-vat');
        
        quantityInput.addEventListener('input', calculateRow);
        priceInput.addEventListener('input', calculateRow);
        
        // Добавляем обработчик для кнопки удаления
        const deleteBtn = row.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            // Не удаляем, если это последняя строка
            if (tableBody.children.length > 1) {
                row.remove();
                updateRowNumbers();
                updateTotals();
            } else {
                alert('Должна остаться хотя бы одна строка в таблице');
            }
        });
        
        // Вычисляем значения для строки, если есть данные
        if (quantity && price) {
            calculateRow.call(quantityInput);
        }
    }
    
    // Обновление номеров строк
    function updateRowNumbers() {
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.firstElementChild.textContent = index + 1;
            row.setAttribute('data-index', index);
        });
    }
    
    // Вычисление значений для строки
    function calculateRow() {
        const row = this.closest('tr');
        const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
        const priceWithoutVAT = parseFloat(row.querySelector('.price-without-vat').value) || 0;
        
        // Рассчитываем значения
        const priceWithVAT = priceWithoutVAT * (1 + VAT_RATE);
        const totalWithoutVATValue = quantity * priceWithoutVAT;
        const vatAmount = totalWithoutVATValue * VAT_RATE;
        const totalWithVATValue = totalWithoutVATValue + vatAmount;
        
        // Обновляем значения в строке
        row.querySelector('.price-with-vat').textContent = formatNumber(priceWithVAT);
        row.querySelector('.total-without-vat').textContent = formatNumber(totalWithoutVATValue);
        row.querySelector('.vat-amount').textContent = formatNumber(vatAmount);
        row.querySelector('.total-with-vat').textContent = formatNumber(totalWithVATValue);
        
        // Обновляем итоги
        updateTotals();
    }
    
    // Обновление итоговых значений
    function updateTotals() {
        let totalWithoutVATValue = 0;
        let totalVATValue = 0;
        let totalWithVATValue = 0;
        
        // Суммируем значения по всем строкам
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const totalWithoutVATCell = row.querySelector('.total-without-vat');
            const vatAmountCell = row.querySelector('.vat-amount');
            const totalWithVATCell = row.querySelector('.total-with-vat');
            
            if (totalWithoutVATCell && vatAmountCell && totalWithVATCell) {
                totalWithoutVATValue += parseFloat(totalWithoutVATCell.textContent.replace(/\s/g, '')) || 0;
                totalVATValue += parseFloat(vatAmountCell.textContent.replace(/\s/g, '')) || 0;
                totalWithVATValue += parseFloat(totalWithVATCell.textContent.replace(/\s/g, '')) || 0;
            }
        });
        
        // Обновляем итоговые ячейки
        totalWithoutVAT.textContent = formatNumber(totalWithoutVATValue);
        totalVAT.textContent = formatNumber(totalVATValue);
        totalWithVAT.textContent = formatNumber(totalWithVATValue);
    }
    
    // Форматирование чисел (разделители тысяч, два знака после запятой)
    function formatNumber(num) {
        return new Intl.NumberFormat('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    }
    
    // Обработчики событий
    addRowBtn.addEventListener('click', function() {
        addRow('', '', '');
        updateRowNumbers();
    });
    
    resetBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите очистить все данные таблицы?')) {
            initTable();
        }
    });
    
    // Инициализация при загрузке
    initTable();
});
