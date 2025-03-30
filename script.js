// Transaction page specific code
if (document.getElementById("transaction-form")) {
    // Constants
    const DAILY_STATS_KEY = 'rkFashionsDailyStats';
    
    // Initialize date display
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById("date").textContent = today.toLocaleDateString();
    document.getElementById("month-part").textContent = month;
    
    // Initialize form
    addItem();
    document.getElementById("add-item").addEventListener("click", addItem);
    document.getElementById("items-container").addEventListener("input", function(e) {
        if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
            calculateTotals();
        }
    });
    document.getElementById("transaction-form").addEventListener("submit", handleFormSubmit);

    // ======================
    // DAILY STATS FUNCTIONS
    // ======================
    
    // Initialize stats
    initDailyStats();
    startAutoRefresh();
    
    function initDailyStats() {
        const today = getTodayDateString();
        const savedStats = localStorage.getItem(DAILY_STATS_KEY);
        
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            if (stats.date === today) {
                updateStatsUI(stats.salesCount, stats.totalProfit);
                return;
            }
        }
        resetDailyStats();
    }
    
    function resetDailyStats() {
        const newStats = {
            date: getTodayDateString(),
            salesCount: 0,
            totalProfit: 0,
            lastUpdated: new Date().getTime()
        };
        localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(newStats));
        updateStatsUI(0, 0);
    }
    
    function updateStatsUI(count, profit) {
        document.getElementById("today-sales-count").textContent = count;
        document.getElementById("today-profit-total").textContent = `₹${profit.toFixed(2)}`;
        document.getElementById("last-updated-time").textContent = new Date().toLocaleTimeString();
        
        // Visual feedback
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.classList.toggle('has-data', count > 0);
        });
    }
    
    function updateLocalStats(additionalSales, additionalProfit) {
        const today = getTodayDateString();
        const savedStats = localStorage.getItem(DAILY_STATS_KEY);
        
        let currentStats = savedStats ? JSON.parse(savedStats) : {
            date: today,
            salesCount: 0,
            totalProfit: 0
        };
        
        // Reset if day changed
        if (currentStats.date !== today) {
            currentStats = {
                date: today,
                salesCount: 0,
                totalProfit: 0
            };
        }
        
        const newStats = {
            date: today,
            salesCount: currentStats.salesCount + additionalSales,
            totalProfit: parseFloat((currentStats.totalProfit + additionalProfit).toFixed(2)),
            lastUpdated: new Date().getTime()
        };
        
        localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(newStats));
        updateStatsUI(newStats.salesCount, newStats.totalProfit);
    }
    
    function getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    function updateCurrentTime() {
        document.getElementById("current-time").textContent = 
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Check if day changed
        const today = getTodayDateString();
        const savedStats = localStorage.getItem(DAILY_STATS_KEY);
        if (savedStats && JSON.parse(savedStats).date !== today) {
            resetDailyStats();
        }
    }
    
    function startAutoRefresh() {
        updateCurrentTime();
        setInterval(updateCurrentTime, 60000); // Update every minute
    }

    function addItem() {
        const itemsContainer = document.getElementById("items-container");
        const newItem = document.createElement("div");
        newItem.className = "item-row";
        newItem.innerHTML = `
            <label>Item Name:</label>
            <input type="text" class="item-name" required>
            
            <label>Quantity:</label>
            <input type="number" class="quantity" min="1" value="1" required>
            
            <label>Purchase Price (₹):</label>
            <input type="number" class="purchase-price" min="0" step="0.01" required>
            
            <label>Sale Price (₹):</label>
            <input type="number" class="sale-price" min="0" step="0.01" required>
            
            <button type="button" class="remove-item">Remove</button>
        `;
        itemsContainer.appendChild(newItem);
        
        // Add remove event
        newItem.querySelector(".remove-item").addEventListener("click", function() {
            newItem.remove();
            calculateTotals();
        });
    }

    function calculateTotals() {
        let totalAmount = 0;
        let totalProfit = 0;
        
        document.querySelectorAll(".item-row").forEach(row => {
            const qty = parseFloat(row.querySelector(".quantity").value) || 0;
            const sale = parseFloat(row.querySelector(".sale-price").value) || 0;
            const purchase = parseFloat(row.querySelector(".purchase-price").value) || 0;
            
            totalAmount += qty * sale;
            totalProfit += qty * (sale - purchase);
        });
        
        document.getElementById("total-amount").value = totalAmount.toFixed(2);
        document.getElementById("total-profit").value = totalProfit.toFixed(2);
    }

    function validateForm() {
        // Check customer name
        if (!document.getElementById("customer-name").value.trim()) {
            alert("Please enter customer name");
            return false;
        }
        
        // Check at least one item exists
        if (document.querySelectorAll(".item-row").length === 0) {
            alert("Please add at least one item");
            return false;
        }
        
        // Validate all items
        let valid = true;
        document.querySelectorAll(".item-row").forEach(row => {
            const qty = row.querySelector(".quantity").value;
            const sale = row.querySelector(".sale-price").value;
            
            if (!qty || !sale || isNaN(qty) || isNaN(sale)) {
                row.style.border = "1px solid red";
                valid = false;
            } else {
                row.style.border = "";
            }
        });
        
        if (!valid) alert("Please check all item fields");
        return valid;
    }

    function prepareBillData() {
        const items = [];
        document.querySelectorAll(".item-row").forEach(row => {
            items.push({
                itemName: row.querySelector(".item-name").value,
                quantity: row.querySelector(".quantity").value,
                purchasePrice: row.querySelector(".purchase-price").value,
                salePrice: row.querySelector(".sale-price").value,
                total: (row.querySelector(".quantity").value * row.querySelector(".sale-price").value).toFixed(2)
            });
        });
        
        const monthPart = document.getElementById("month-part").textContent;
        const siNoPart = document.getElementById("si-no").value.padStart(2, '0');
        
        return {
            storeName: "RK Fashions",
            date: document.getElementById("date").textContent,
            siNo: `${monthPart}${siNo}`, // Combine month and manual part
            customerName: document.getElementById("customer-name").value,
            items: items,
            paymentMode: document.getElementById("payment-mode").value,
            totalAmount: document.getElementById("total-amount").value,
            totalProfit: document.getElementById("total-profit").value
        };
    }

    function displayBillPreview(data) {
        const preview = document.getElementById("bill-details");
        let html = `
            <div class="bill-header">
                <h3>${data.storeName}</h3>
                <p>Date: ${data.date} | Bill No: ${data.siNo}</p>
                <p>Customer: ${data.customerName}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.items.forEach(item => {
            html += `
                <tr>
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.salePrice}</td>
                    <td>₹${item.total}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3">Total Amount</td>
                        <td>₹${data.totalAmount}</td>
                    </tr>
                    <tr>
                        <td colspan="3">Payment Mode</td>
                        <td>${data.paymentMode}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        preview.innerHTML = html;
    }

  function handleFormSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;
        
        const siNoPart = document.getElementById("si-no").value; // Changed to si-no
if (!siNoPart || isNaN(siNoPart) {
    alert("Please enter a valid SI No (numbers only)");
    return;
}
        
        const billData = prepareBillData();
        displayBillPreview(billData);
        submitBill(billData);
    }
    
    function submitBill(data) {
        // Update local stats first
        const salesToAdd = data.items.length;
        const profitToAdd = parseFloat(data.totalProfit) || 0;
        updateLocalStats(salesToAdd, profitToAdd);
        
        // Submit to server
        fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            // Reset form but keep customer name
            const customerName = document.getElementById("customer-name").value;
            document.getElementById("transaction-form").reset();
            document.getElementById("customer-name").value = customerName;
            document.getElementById("items-container").innerHTML = "";
            addItem();
            
            alert("Bill saved successfully!");
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error saving bill. Please try again.");
        });
    }
}
