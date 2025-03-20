document.getElementById("theme-toggle").addEventListener("click", function () {
    document.body.classList.toggle("dark-theme");
});

document.addEventListener("DOMContentLoaded", function () {
    // Set current date automatically
    let today = new Date();
    let day = String(today.getDate()).padStart(2, '0'); // Get day (e.g., 20)
    let formattedDate = today.toLocaleDateString();
    document.getElementById("date").textContent = formattedDate;

    // Initialize SI No
    let transactionCounter = 1; // Counter for transactions
    let siNo = `${day}${transactionCounter}`; // e.g., 201, 202, etc.
    document.getElementById("si-no").textContent = siNo;

    // Add Item Button
    document.getElementById("add-item").addEventListener("click", addItem);

    // Calculate Totals
    document.getElementById("items-container").addEventListener("input", calculateTotals);

    // Handle form submission
    document.getElementById("transaction-form").addEventListener("submit", function (event) {
        event.preventDefault();
        generateBill();
    });

    // Add a new item row
    function addItem() {
        const itemsContainer = document.getElementById("items-container");
        const itemRow = document.createElement("div");
        itemRow.classList.add("item-row");

        itemRow.innerHTML = `
            <label>Item Name:</label>
            <input type="text" class="item-name" required>

            <label>Quantity:</label>
            <input type="number" class="quantity" required>

            <label>Purchase Price:</label>
            <input type="number" class="purchase-price" required>

            <label>Sale Price:</label>
            <input type="number" class="sale-price" required>

            <button type="button" class="remove-item" onclick="removeItem(this)">Remove</button>
        `;

        itemsContainer.appendChild(itemRow);
    }

    // Remove an item row
    window.removeItem = function (button) {
        button.parentElement.remove();
        calculateTotals();
    };

    // Calculate total amount and profit
    function calculateTotals() {
        let totalAmount = 0;
        let totalProfit = 0;

        document.querySelectorAll(".item-row").forEach(row => {
            const quantity = parseFloat(row.querySelector(".quantity").value) || 0;
            const salePrice = parseFloat(row.querySelector(".sale-price").value) || 0;
            const purchasePrice = parseFloat(row.querySelector(".purchase-price").value) || 0;

            totalAmount += quantity * salePrice;
            totalProfit += (quantity * salePrice) - (quantity * purchasePrice);
        });

        document.getElementById("total-amount").value = totalAmount.toFixed(2);
        document.getElementById("total-profit").value = totalProfit.toFixed(2);
    }

    // Generate Bill and Display Preview
    function generateBill() {
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
            customerName: document.getElementById("customer-name").value, // Get customer name from input
            items: items,
            paymentMode: document.getElementById("payment-mode").value,
            totalAmount: document.getElementById("total-amount").value,
            totalProfit: document.getElementById("total-profit").value
        };

        // Display Bill Preview
        displayBillPreview(transactionData);

        // Submit data to Google Apps Script
        fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transactionData)
        }).then(() => {
            alert("Bill Generated Successfully!");
            // Reset the form
            document.getElementById("transaction-form").reset();
            document.getElementById("items-container").innerHTML = "";
            addItem(); // Add a default item row
            // Update SI No for the next transaction
            transactionCounter++;
            document.getElementById("si-no").textContent = `${day}${transactionCounter}`;
        }).catch(error => {
            console.error("Error:", error);
            alert("There was an error generating the bill. Please try again.");
        });
    }

    // Display Bill Preview
    function displayBillPreview(data) {
        const billDetails = document.getElementById("bill-details");
        let itemsHTML = `
            <p><strong>Store Name:</strong> ${data.storeName}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>SI No:</strong> ${data.siNo}</p>
            <p><strong>Customer Name:</strong> ${data.customerName}</p>
            <p><strong>Payment Mode:</strong> ${data.paymentMode}</p>
            <table>
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Purchase Price</th>
                        <th>Sale Price</th>
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
                    <td>${item.purchasePrice}</td>
                    <td>${item.salePrice}</td>
                    <td>${item.total}</td>
                </tr>
            `;
        });

        itemsHTML += `
                </tbody>
            </table>
            <p><strong>Total Amount:</strong> ${data.totalAmount}</p>
            <p><strong>Total Profit:</strong> ${data.totalProfit}</p>
        `;

        billDetails.innerHTML = itemsHTML;
    }

    // Add a default item row on page load
    addItem();
});
