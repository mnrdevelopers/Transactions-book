// Transaction page specific code
if (document.getElementById("transaction-form")) {
    // Constants
    const DAILY_STATS_KEY = 'rkFashionsDailyStats';
    
    // Initialize date display
    const today = new Date();
const day = String(today.getDate()).padStart(2, '0');
const month = String(today.getMonth() + 1).padStart(2, '0');
document.getElementById("date").textContent = today.toLocaleDateString();
document.getElementById("date-part").textContent = `${day}${month}`; // This will show like "1508"
    
    // Initialize form
    addItem();
    document.getElementById("add-item").addEventListener("click", addItem);
    document.getElementById("items-container").addEventListener("input", function(e) {
        if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
            calculateTotals();
        }
    });
    document.getElementById("transaction-form").addEventListener("submit", handleFormSubmit);
    setupPrintButton(); // Initialize print button once

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
    
    const datePart = document.getElementById("date-part").textContent; // DDMM
    const seqPart = document.getElementById("sequence-no").value.padStart(3, '0'); // 001
    const billNumber = `${datePart}-${seqPart}`;
    
    return {
        storeName: "RK Fashions",
        date: document.getElementById("date").textContent,
        siNo: billNumber,  // Changed from `${yearMonthPart}-${sequenceNo}`
        customerName: document.getElementById("customer-name").value,
        items: items,
        paymentMode: document.getElementById("payment-mode").value,
        totalAmount: document.getElementById("total-amount").value,
        totalProfit: document.getElementById("total-profit").value
    };
}

    function displayBillPreview(data) {
    // Hide the template
    document.getElementById("bill-template").style.display = "none";
    
    // Show the preview container
    document.getElementById("bill-preview").style.display = "block";
    document.getElementById("bill-details").innerHTML = "<h3>TEST BILL</h3>";
    document.getElementById("bill-details").style.display = "block";
    
    // Show the dynamic bill container
    const preview = document.getElementById("bill-details");
    preview.style.display = "block";

        // Force-show UPI row if needed
if (data.paymentMode === "UPI") {
    document.getElementById("upi-qr-row").style.display = "table-row";
}
    
    // Build the bill with smaller font sizes for thermal printer
    preview.innerHTML = `
        <div class="bill-header">
            <h3>${data.storeName}</h3>
            <p class="store-info-bill">Gram Panchayath Complex, Dichpally Busstand - 503174</p>
            <p class="store-contact-bill">Mobile: +91 7893433457, +91 7842694544</p>
            
            <div class="bill-meta">
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Bill No:</strong> ${data.siNo}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
            </div>
        </div>
        
        <table class="bill-items">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.itemName}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.salePrice}</td>
                        <td>₹${item.total}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3"><strong>Total Amount</strong></td>
                    <td><strong>₹${data.totalAmount}</strong></td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Payment Mode</strong></td>
                    <td><strong>${data.paymentMode}</strong></td>
                </tr>
${data.paymentMode === "UPI" ? `
    <tr>
        <td colspan="4" style="text-align:center; padding:8px 0;">
            <div style="margin: 0 auto; width: fit-content;">
                <h4 style="font-size:12px; margin:5px 0;">Scan to Pay via UPI</h4>
                <img src="upi-qr.png" alt="UPI QR Code" style="width:120px; height:120px;">
                <p style="font-size:10px; margin-top:3px;">UPI ID: maniteja1098@oksbi</p>
            </div>
        </td>
    </tr>
    ` : ''}
            </tfoot>
        </table>
        
        <div class="bill-footer">
            <p>Thank you for your purchase!</p>
        </div>
    `;

    // Scroll to the bill preview
    document.getElementById("bill-preview").scrollIntoView({ behavior: 'smooth' });
}

    function setupPrintButton() {
        const printBtn = document.getElementById("print-bill");
        if (printBtn) {
            printBtn.addEventListener("click", function() {
                window.print();
            });
        }
    }

function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    
    const seqNo = document.getElementById("sequence-no").value;
    if (!seqNo || isNaN(seqNo)) {  // Remove extra parenthesis here if present
        alert("Please enter a valid sequence number");
        return;
    }

    const billData = prepareBillData();
    displayBillPreview(billData);
    
    // Show print button
    document.getElementById("print-bill").style.display = "block";
    
    // Submit the bill and increment sequence after success
    submitBill(billData).then(() => {
        // Auto-increment the sequence number after successful submission
        const seqInput = document.getElementById("sequence-no");
        seqInput.value = String(parseInt(seqInput.value) + 1);  // Fixed missing parenthesis
    });
}

// Modify submitBill to return a Promise
function submitBill(data) {
    return new Promise((resolve, reject) => {
        const submitBtn = document.querySelector("#transaction-form [type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        // Update local stats
        const salesToAdd = data.items.length;
        const profitToAdd = parseFloat(data.totalProfit) || 0;
        updateLocalStats(salesToAdd, profitToAdd);
        
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
            resolve(); // Resolve the promise on success
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error saving bill. Please try again.");
            reject(error); // Reject the promise on error
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }
}
