// Theme toggle
document.getElementById("theme-toggle")?.addEventListener("click", function() {
    document.body.classList.toggle("dark-theme");
});

if (document.getElementById("transaction-form")) {
    let transactionCounter = parseInt(localStorage.getItem('transactionCounter')) || 1;
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    
    document.getElementById("date").textContent = today.toLocaleDateString();
    document.getElementById("si-no").textContent = `${day}${String(transactionCounter).padStart(2, '0')}`;

    // Initialize form
    addItem();
    document.getElementById("add-item").addEventListener("click", addItem);
    document.getElementById("add-maintenance").addEventListener("click", addMaintenanceItem);

    // Event listeners
    document.getElementById("items-container").addEventListener("input", function(e) {
        if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
            calculateTotals();
        }
    });

    document.getElementById("transaction-form").addEventListener("submit", function(e) {
        e.preventDefault();
        if (!validateForm()) return;
        const billData = prepareBillData();
        displayBillPreview(billData);
        submitBill(billData);
    });

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
        
        newItem.querySelector(".remove-item").addEventListener("click", function() {
            newItem.remove();
            calculateTotals();
        });
    }

    function addMaintenanceItem() {
        const container = document.getElementById("maintenance-container");
        const item = document.createElement("div");
        item.className = "maintenance-item";
        item.innerHTML = `
            <div class="maintenance-row">
                <select class="maintenance-category" required>
                    <option value="">Select Category</option>
                    <option value="Rent">Rent</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Repairs">Repairs</option>
                    <option value="Staff">Staff</option>
                    <option value="Other">Other</option>
                </select>
                <input type="number" class="maintenance-amount" min="0" step="0.01" placeholder="Amount" required>
                <button type="button" class="remove-maintenance">×</button>
            </div>
            <input type="text" class="maintenance-notes" placeholder="Notes (optional)">
        `;
        container.appendChild(item);
        
        item.querySelector(".remove-maintenance").addEventListener("click", function() {
            item.remove();
            calculateTotals();
        });
        
        item.querySelector(".maintenance-amount").addEventListener("input", calculateTotals);
    }

    function calculateTotals() {
        let totalAmount = 0;
        let totalProfit = 0;
        
        // Calculate items totals
        document.querySelectorAll(".item-row").forEach(row => {
            const qty = parseFloat(row.querySelector(".quantity").value) || 0;
            const sale = parseFloat(row.querySelector(".sale-price").value) || 0;
            const purchase = parseFloat(row.querySelector(".purchase-price").value) || 0;
            
            totalAmount += qty * sale;
            totalProfit += qty * (sale - purchase);
        });
        
        // Calculate maintenance total
        let maintenanceTotal = 0;
        document.querySelectorAll(".maintenance-item").forEach(item => {
            const amount = parseFloat(item.querySelector(".maintenance-amount").value) || 0;
            maintenanceTotal += amount;
        });
        
        const netProfit = totalProfit - maintenanceTotal;
        
        document.getElementById("total-amount").value = totalAmount.toFixed(2);
        document.getElementById("total-profit").value = totalProfit.toFixed(2);
        document.getElementById("total-maintenance").value = maintenanceTotal.toFixed(2);
        document.getElementById("net-profit").value = netProfit.toFixed(2);
    }

    function validateForm() {
        if (!document.getElementById("customer-name").value.trim()) {
            alert("Please enter customer name");
            return false;
        }
        
        if (document.querySelectorAll(".item-row").length === 0) {
            alert("Please add at least one item");
            return false;
        }
        
        // Validate maintenance items
        let validMaintenance = true;
        document.querySelectorAll(".maintenance-item").forEach(item => {
            const category = item.querySelector(".maintenance-category").value;
            const amount = item.querySelector(".maintenance-amount").value;
            
            if ((category && !amount) || (!category && amount)) {
                item.style.border = "1px solid red";
                validMaintenance = false;
            } else {
                item.style.border = "";
            }
        });
        
        if (!validMaintenance) {
            alert("Please complete all maintenance items (both category and amount)");
            return false;
        }
        
        return true;
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
        
        const maintenanceItems = [];
        document.querySelectorAll(".maintenance-item").forEach(item => {
            const category = item.querySelector(".maintenance-category").value;
            const amount = parseFloat(item.querySelector(".maintenance-amount").value) || 0;
            const notes = item.querySelector(".maintenance-notes").value;
            
            if (category && amount > 0) {
                maintenanceItems.push({
                    category: category,
                    amount: amount,
                    notes: notes
                });
            }
        });
        
        const totalProfit = parseFloat(document.getElementById("total-profit").value) || 0;
        const maintenanceTotal = maintenanceItems.reduce((sum, item) => sum + item.amount, 0);
        const netProfit = totalProfit - maintenanceTotal;
        
        return {
            storeName: "RK Fashions",
            date: document.getElementById("date").textContent,
            siNo: document.getElementById("si-no").textContent,
            customerName: document.getElementById("customer-name").value,
            items: items,
            maintenanceItems: maintenanceItems,
            paymentMode: document.getElementById("payment-mode").value,
            totalAmount: document.getElementById("total-amount").value,
            totalProfit: totalProfit.toFixed(2),
            maintenanceTotal: maintenanceTotal.toFixed(2),
            netProfit: netProfit.toFixed(2)
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
            <table class="items-table">
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
        `;
        
        if (data.maintenanceItems.length > 0) {
            html += `
                    <tr>
                        <td colspan="4"><strong>Maintenance Details</strong></td>
                    </tr>
            `;
            
            data.maintenanceItems.forEach(item => {
                html += `
                    <tr>
                        <td colspan="2">${item.category}</td>
                        <td>${item.notes || '-'}</td>
                        <td>₹${item.amount.toFixed(2)}</td>
                    </tr>
                `;
            });
            
            html += `
                    <tr>
                        <td colspan="3">Total Maintenance</td>
                        <td>₹${data.maintenanceTotal}</td>
                    </tr>
            `;
        }
        
        html += `
                    <tr>
                        <td colspan="3">Payment Mode</td>
                        <td>${data.paymentMode}</td>
                    </tr>
                    <tr>
                        <td colspan="3">Gross Profit</td>
                        <td>₹${data.totalProfit}</td>
                    </tr>
                    <tr>
                        <td colspan="3">Net Profit</td>
                        <td>₹${data.netProfit}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        preview.innerHTML = html;
    }

    function submitBill(data) {
        fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })
        .then(() => {
            transactionCounter++;
            localStorage.setItem('transactionCounter', transactionCounter);
            document.getElementById("si-no").textContent = `${day}${String(transactionCounter).padStart(2, '0')}`;
            
            // Reset form
            const customerName = document.getElementById("customer-name").value;
            document.getElementById("transaction-form").reset();
            document.getElementById("customer-name").value = customerName;
            document.getElementById("items-container").innerHTML = "";
            document.getElementById("maintenance-container").innerHTML = "";
            document.getElementById("total-amount").value = "0.00";
            document.getElementById("total-profit").value = "0.00";
            document.getElementById("total-maintenance").value = "0.00";
            document.getElementById("net-profit").value = "0.00";
            addItem();
            
            alert("Bill saved successfully!");
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error saving bill. Please try again.");
        });
    }
}
