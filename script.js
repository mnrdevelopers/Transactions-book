document.addEventListener("DOMContentLoaded", function() {
    // Theme toggle for dashboard
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", function() {
            document.body.classList.toggle("dark-theme");
        });
    }

    // Only run transaction code on add-transaction page
    if (document.getElementById("transaction-form")) {
        // Initialize transaction counter from localStorage or start at 1
        let transactionCounter = parseInt(localStorage.getItem('transactionCounter')) || 1;
        
        // Set current date automatically
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = today.toLocaleDateString();
        
        // Set date display
        document.getElementById("date").textContent = formattedDate;
        
        // Set initial SI No
        document.getElementById("si-no").textContent = `${day}${String(transactionCounter).padStart(2, '0')}`;

        // Add first item row
        addItem();

        // Add Item Button
        document.getElementById("add-item").addEventListener("click", addItem);

        // Calculate totals when inputs change (using event delegation)
        document.getElementById("items-container").addEventListener("input", function(e) {
            if (e.target.classList.contains("quantity") || 
                e.target.classList.contains("sale-price") ||
                e.target.classList.contains("purchase-price")) {
                calculateTotals();
            }
        });

        // Handle form submission
        document.getElementById("transaction-form").addEventListener("submit", function(e) {
            e.preventDefault();
            generateBill();
        });

        // Add new item row
        function addItem() {
            const itemsContainer = document.getElementById("items-container");
            const itemRow = document.createElement("div");
            itemRow.className = "item-row";
            itemRow.innerHTML = `
                <label>Item Name:</label>
                <input type="text" class="item-name" required>
                
                <label>Quantity:</label>
                <input type="number" class="quantity" min="1" required>
                
                <label>Purchase Price (₹):</label>
                <input type="number" class="purchase-price" min="0" step="0.01" required>
                
                <label>Sale Price (₹):</label>
                <input type="number" class="sale-price" min="0" step="0.01" required>
                
                <button type="button" class="remove-item">Remove</button>
            `;
            itemsContainer.appendChild(itemRow);
            
            // Add event listener to new remove button
            itemRow.querySelector(".remove-item").addEventListener("click", function() {
                itemRow.remove();
                calculateTotals();
            });
        }

        // Calculate total amount and profit
        function calculateTotals() {
            let totalAmount = 0;
            let totalProfit = 0;
            let allItemsValid = true;

            document.querySelectorAll(".item-row").forEach(row => {
                const quantity = parseFloat(row.querySelector(".quantity").value) || 0;
                const salePrice = parseFloat(row.querySelector(".sale-price").value) || 0;
                const purchasePrice = parseFloat(row.querySelector(".purchase-price").value) || 0;

                // Validate inputs
                if (isNaN(quantity) {
                    row.querySelector(".quantity").classList.add("error");
                    allItemsValid = false;
                } else {
                    row.querySelector(".quantity").classList.remove("error");
                }

                totalAmount += quantity * salePrice;
                totalProfit += (quantity * salePrice) - (quantity * purchasePrice);
            });

            document.getElementById("total-amount").value = totalAmount.toFixed(2);
            document.getElementById("total-profit").value = totalProfit.toFixed(2);
            
            return allItemsValid;
        }

        // Generate bill and display preview
        function generateBill() {
            // Validate all items first
            if (!calculateTotals()) {
                alert("Please check all item fields for valid values");
                return;
            }

            const customerName = document.getElementById("customer-name").value.trim();
            if (!customerName) {
                alert("Please enter customer name");
                return;
            }

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

            const transactionData = {
                storeName: "RK Fashions",
                date: document.getElementById("date").textContent,
                siNo: document.getElementById("si-no").textContent,
                customerName: customerName,
                items: items,
                paymentMode: document.getElementById("payment-mode").value,
                totalAmount: document.getElementById("total-amount").value,
                totalProfit: document.getElementById("total-profit").value
            };

            // Display bill preview
            displayBillPreview(transactionData);

            // Submit to Google Apps Script
            submitTransaction(transactionData);
        }

        // Display bill preview
        function displayBillPreview(data) {
            const billDetails = document.getElementById("bill-details");
            let itemsHTML = `
                <div class="bill-header">
                    <h3>${data.storeName}</h3>
                    <p>123 Fashion Street, City, State - 123456</p>
                    <p>Mobile: +91 9876543210</p>
                    <div class="bill-meta">
                        <p><strong>Date:</strong> ${data.date}</p>
                        <p><strong>Bill No:</strong> ${data.siNo}</p>
                        <p><strong>Customer:</strong> ${data.customerName}</p>
                    </div>
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
                itemsHTML += `
                    <tr>
                        <td>${item.itemName}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.salePrice}</td>
                        <td>₹${item.total}</td>
                    </tr>
                `;
            });

            itemsHTML += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>Total Amount:</strong></td>
                            <td><strong>₹${data.totalAmount}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="3"><strong>Payment Mode:</strong></td>
                            <td>${data.paymentMode}</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            billDetails.innerHTML = itemsHTML;
        }

        // Submit transaction data
        function submitTransaction(data) {
            fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
            .then(() => {
                alert("Transaction saved successfully!");
                
                // Increment and save transaction counter
                transactionCounter++;
                localStorage.setItem('transactionCounter', transactionCounter);
                
                // Update SI No for next transaction
                document.getElementById("si-no").textContent = `${day}${String(transactionCounter).padStart(2, '0')}`;
                
                // Reset form but keep customer name
                const customerName = document.getElementById("customer-name").value;
                document.getElementById("transaction-form").reset();
                document.getElementById("customer-name").value = customerName;
                document.getElementById("items-container").innerHTML = "";
                addItem();
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Failed to save transaction. Please try again.");
            });
        }
    }
});
