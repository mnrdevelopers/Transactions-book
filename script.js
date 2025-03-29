// Transaction page specific code
if (document.getElementById("transaction-form")) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    
    // Set initial values
    document.getElementById("date").textContent = today.toLocaleDateString();
    document.getElementById("date-part").textContent = day; // Show day part
    
    // Add first item
    addItem();

    // Add item button
    document.getElementById("add-item").addEventListener("click", addItem);

    // Handle input changes for calculations
    document.getElementById("items-container").addEventListener("input", function(e) {
        if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
            calculateTotals();
        }
    });

       // Form submission
    document.getElementById("transaction-form").addEventListener("submit", function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) return;
        
        // Validate SI No
        const siNoPart = document.getElementById("si-no-part").value;
        if (!siNoPart || isNaN(siNoPart) || siNoPart < 1 || siNoPart > 99) {
            alert("Please enter a valid SI No (1-99)");
            return;
        }
        
        // Generate and display bill
        const billData = prepareBillData();
        displayBillPreview(billData);
        
        // Submit to server
        submitBill(billData);
    });

    // Fetch and display daily stats
    fetchDailyStats();

    function fetchDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    
    fetch(`https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?date=${today}`)
    .then(response => response.json())
    .then(data => {
        if (data && data.length > 0) {
            const salesCount = data.length;
            const totalProfit = data.reduce((sum, transaction) => sum + parseFloat(transaction.totalProfit || 0), 0);
            
            document.getElementById("today-sales-count").textContent = salesCount;
            document.getElementById("today-profit-total").textContent = `₹${totalProfit.toFixed(2)}`;
        }
    })
    .catch(error => {
        console.error("Error fetching daily stats:", error);
    });
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
        
        const dayPart = document.getElementById("date-part").textContent;
        const siNoPart = document.getElementById("si-no-part").value.padStart(2, '0');
        
        return {
            storeName: "RK Fashions",
            date: document.getElementById("date").textContent,
            siNo: `${dayPart}${siNoPart}`, // Combine day and manual part
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
            // Reset form but keep customer name
            const customerName = document.getElementById("customer-name").value;
            document.getElementById("transaction-form").reset();
            document.getElementById("customer-name").value = customerName;
            document.getElementById("items-container").innerHTML = "";
            addItem(); // Add new empty item

            // Refresh daily stats
            fetchDailyStats();
            
            alert("Bill saved successfully!");
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error saving bill. Please try again.");
        });
    }
}
