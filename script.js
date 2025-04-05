 // Transaction page specific code
        // Constants
        const DAILY_STATS_KEY = 'rkFashionsDailyStats';
        
       // Initialize date display
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById("transaction-date").value = formattedDate;

       // Get next bill number from backend
        async function getNextBillNumber(selectedDate) {
            try {
                const response = await fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=getNextBillNumber", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ date: selectedDate })
                });
                
                const data = await response.json();
                return data.billNo;
            } catch (error) {
                console.error("Error getting next bill number:", error);
                // Fallback to local storage if backend fails
                return generateFallbackBillNumber(selectedDate);
            }
        }

        // Fallback method if backend is unavailable
        function generateFallbackBillNumber(selectedDate) {
            const dateObj = new Date(selectedDate);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const datePart = `${day}${month}${year}`;
            
            // Get or initialize sequence data in localStorage
            let sequenceData = localStorage.getItem('fallbackBillNumbers') || '{}';
            sequenceData = JSON.parse(sequenceData);
            
            if (!sequenceData[selectedDate]) {
                sequenceData[selectedDate] = 1;
            } else {
                sequenceData[selectedDate]++;
            }
            
            localStorage.setItem('fallbackBillNumbers', JSON.stringify(sequenceData));
            
            return `RK-${datePart}-${String(sequenceData[selectedDate]).padStart(3, '0')}`;
        }

        // Update bill number when date changes
        document.getElementById("transaction-date").addEventListener("change", async function() {
            const selectedDate = this.value;
            const nextBillNo = await getNextBillNumber(selectedDate);
            document.getElementById("bill-no").value = nextBillNo;
        });

        // Initialize form and bill number
        async function initializeForm() {
            const selectedDate = document.getElementById("transaction-date").value;
            const nextBillNo = await getNextBillNumber(selectedDate);
            document.getElementById("bill-no").value = nextBillNo;
            
            addItem();
            document.getElementById("add-item").addEventListener("click", addItem);
            document.getElementById("items-container").addEventListener("input", function(e) {
                if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
                    calculateTotals();
                }
            });
            document.getElementById("transaction-form").addEventListener("submit", handleFormSubmit);
            setupPrintButton();
        }

        initializeForm();

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
            
            return {
                storeName: "RK Fashions",
                date: document.getElementById("transaction-date").value,
                siNo: document.getElementById("bill-no").value,
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
            document.getElementById("bill-details").style.display = "block";
            
            // Show the dynamic bill container
            const preview = document.getElementById("bill-details");
            preview.style.display = "block";

            // Force-show UPI row if needed
            const upiRow = document.getElementById("upi-qr-row");
            upiRow.style.display = data.paymentMode === "UPI" ? "table-row" : "none";
            
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
                        ${data.paymentMode === "Cash" ? `
                        <tr>
                            <td colspan="3"><strong>Amount Received</strong></td>
                            <td><strong>₹${document.getElementById('amount-received').value || data.totalAmount}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="3"><strong>Change Given</strong></td>
                            <td><strong>₹${document.getElementById('change-amount').value || '0.00'}</strong></td>
                        </tr>
                        ` : ''}
                        ${data.paymentMode === "UPI" ? `
                        <tr id="upi-qr-row">
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

        function showCashPaymentModal(totalAmount) {
            const modal = document.getElementById('cash-payment-modal');
            document.getElementById('modal-total-amount').value = totalAmount;
            document.getElementById('amount-received').value = '';
            document.getElementById('change-amount').value = '0.00';
            modal.style.display = 'flex';
            
            // Focus on amount received field
            document.getElementById('amount-received').focus();
        }

        function calculateChange() {
            const amountReceived = parseFloat(document.getElementById('amount-received').value) || 0;
            const totalAmount = parseFloat(document.getElementById('modal-total-amount').value) || 0;
            const change = amountReceived - totalAmount;
            
            document.getElementById('change-amount').value = change.toFixed(2);
            
            // Highlight if change is negative (customer didn't pay enough)
            const changeField = document.getElementById('change-amount');
            if (change < 0) {
                changeField.style.color = 'red';
                changeField.style.fontWeight = 'bold';
            } else {
                changeField.style.color = 'green';
                changeField.style.fontWeight = 'normal';
            }
        }

        function setupCashPaymentModal() {
            const modal = document.getElementById('cash-payment-modal');
            const closeBtn = document.querySelector('#cash-payment-modal .close');
            const cancelBtn = document.getElementById('cancel-cash-payment');
            const confirmBtn = document.getElementById('confirm-cash-payment');
            const amountReceived = document.getElementById('amount-received');
            
            // Close modal events
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            }
            
            cancelBtn.onclick = function() {
                modal.style.display = 'none';
            }
            
            // Calculate change when amount received changes
            amountReceived.addEventListener('input', calculateChange);
            
            // Confirm payment
            confirmBtn.onclick = function() {
                const amountReceivedVal = parseFloat(amountReceived.value) || 0;
                const totalAmount = parseFloat(document.getElementById('modal-total-amount').value) || 0;
                
                if (amountReceivedVal < totalAmount) {
                    if (!confirm('Customer has paid less than the total amount. Are you sure you want to proceed?')) {
                        return;
                    }
                }
                
                modal.style.display = 'none';
                // Continue with form submission
                submitTransactionAfterCashPayment();
            }
        }

        function setupSuccessModal() {
            const modal = document.getElementById('success-modal');
            const closeBtn = document.getElementById('close-success-modal');
            
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            }
        }

        function showSuccessMessage() {
            const modal = document.getElementById('success-modal');
            modal.style.display = 'flex';
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
        }

        let pendingTransactionData = null;

        function handleFormSubmit(e) {
            e.preventDefault();
            if (!validateForm()) return;
            
            const paymentMode = document.getElementById("payment-mode").value;
            const totalAmount = parseFloat(document.getElementById("total-amount").value) || 0;
            
            // Store the bill data for later submission
            pendingTransactionData = prepareBillData();
            
            // Show cash payment modal if payment mode is cash
            if (paymentMode === "Cash") {
                showCashPaymentModal(totalAmount);
            } else {
                // For other payment modes, submit directly
                submitTransaction();
            }
        }

        function submitTransactionAfterCashPayment() {
            if (!pendingTransactionData) return;
            
            // Show loading overlay
            document.getElementById("loading-overlay").style.display = "flex";
            
            submitBill(pendingTransactionData)
                .then(() => {
                    // Display the bill preview before showing success message
                    displayBillPreview(pendingTransactionData);
                    showSuccessMessage();
                    
                    // Generate new bill number for next transaction
                    initializeBillNumber();
                })
                .catch(error => {
                    console.error("Submission failed:", error);
                    alert("Transaction submission failed. Please try again.");
                })
                .finally(() => {
                    // Hide loading overlay regardless of success/failure
                    document.getElementById("loading-overlay").style.display = "none";
                    pendingTransactionData = null;
                });
            
            // Show print button
            document.getElementById("print-bill").style.display = "block";
        }

        function submitTransaction() {
            if (!pendingTransactionData) return;
            
            // Show loading overlay
            document.getElementById("loading-overlay").style.display = "flex";
            
            submitBill(pendingTransactionData)
                .then(() => {
                    // Display the bill preview before showing success message
                    displayBillPreview(pendingTransactionData);
                    showSuccessMessage();
                    
                    // Generate new bill number for next transaction
                    initializeBillNumber();
                })
                .catch(error => {
                    console.error("Submission failed:", error);
                    alert("Transaction submission failed. Please try again.");
                })
                .finally(() => {
                    // Hide loading overlay regardless of success/failure
                    document.getElementById("loading-overlay").style.display = "none";
                    pendingTransactionData = null;
                });
            
            // Show print button
            document.getElementById("print-bill").style.display = "block";
        }

        // Initialize modals
        setupCashPaymentModal();
        setupSuccessModal();

        function submitBill(data) {
            const submitBtn = document.querySelector("#transaction-form [type='submit']");
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = 'Processing...';
            submitBtn.disabled = true;
            
            // Update local stats
            const salesToAdd = data.items.length;
            const profitToAdd = parseFloat(data.totalProfit) || 0;
            updateLocalStats(salesToAdd, profitToAdd);
            
            return new Promise((resolve, reject) => {
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
                    resolve();
                })
                .catch(error => {
                    console.error("Error:", error);
                    reject(error);
                })
                .finally(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
            });
        }
