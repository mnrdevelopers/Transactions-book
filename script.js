// Theme Toggle (for dashboard)
document.getElementById("theme-toggle")?.addEventListener("click", function () {
    document.body.classList.toggle("dark-theme");
});

// Transaction Form Logic (for add-transaction.html)
document.addEventListener("DOMContentLoaded", function () {
    // Only run this code on the add-transaction page
    if (document.getElementById("transaction-form")) {
        // Initialize transaction counter from localStorage or start at 1
        let transactionCounter = localStorage.getItem('transactionCounter') || 1;
        
        // Set current date automatically
        let today = new Date();
        let day = String(today.getDate()).padStart(2, '0');
        let month = String(today.getMonth() + 1).padStart(2, '0');
        let year = today.getFullYear();
        let formattedDate = `${day}/${month}/${year}`;
        
        // Update date display
        const dateElement = document.getElementById("date");
        if (dateElement) {
            dateElement.textContent = formattedDate;
        }

        // Initialize SI No
        const siNoElement = document.getElementById("si-no");
        if (siNoElement) {
            siNoElement.textContent = `${day}${transactionCounter}`;
        }

        // Add Item Button
        document.getElementById("add-item").addEventListener("click", addItem);

        // Calculate Totals
        document.getElementById("items-container").addEventListener("input", calculateTotals);

        // Handle form submission
        document.getElementById("transaction-form").addEventListener("submit", function (event) {
            event.preventDefault();
            generateBill(day, transactionCounter);
        });

        // Rest of your existing functions (addItem, removeItem, calculateTotals, etc.)
        // ... [keep all other functions exactly as they were] ...

        // Modified generateBill function
        function generateBill(day, counter) {
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
                customerName: document.getElementById("customer-name").value,
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
                addItem();
                
                // Update and persist transaction counter
                transactionCounter++;
                localStorage.setItem('transactionCounter', transactionCounter);
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
    }
});
