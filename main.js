

// ===== Start of script.js =====
// Add this at the top of your existing script sections
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!Auth.isAuthenticated() && 
        !window.location.pathname.endsWith('login.html') && 
        !window.location.pathname.endsWith('register.html')) {
        window.location.href = 'login.html';
    }
    
    // Add logout functionality to your navigation
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            Auth.logout();
        });
    }
    
    // Show current user in header
    const userDisplay = document.getElementById('current-user');
    if (userDisplay) {
        userDisplay.textContent = Auth.currentUser;
    }
});

// Enhanced Auth module for retailers
const Auth = {
  currentUser: null,
  token: null,
  storeDetails: null,

  init: function() {
    // Check for saved session
    const savedSession = localStorage.getItem('mnrBillBookSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        this.currentUser = session.user;
        this.token = session.token;
        this.storeDetails = session.storeDetails;
      } catch (e) {
        this.clearSession();
      }
    }
  },

  isAuthenticated: function() {
    return !!this.token;
  },

  saveSession: function(user, token, storeDetails) {
    this.currentUser = user;
    this.token = token;
    this.storeDetails = storeDetails;
    localStorage.setItem('mnrBillBookSession', JSON.stringify({ 
      user, 
      token,
      storeDetails
    }));
  },

  clearSession: function() {
    this.currentUser = null;
    this.token = null;
    this.storeDetails = null;
    localStorage.removeItem('mnrBillBookSession');
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
  },

  login: async function(username, password) {
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "login",
          username: username,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (data.status === "success") {
        const storeResponse = await fetch(`https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=getStoreDetails&retailerId=${data.retailerId}&token=${data.token}`);
        const storeData = await storeResponse.json();
        
        const storeDetails = storeData.status === "success" ? storeData.data : null;
        
        this.saveSession(data.retailerId, data.token, storeDetails);
        return { success: true, storeName: data.storeName };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Network error. Please try again." };
    }
  },

 register: async function(data) {
  try {
    // Use a different CORS proxy
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec';
    
    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: "register",
        username: data.username,
        password: data.password,
        storeName: data.storeName,
        storeAddress: data.storeAddress,
        storeContact: data.storeContact,
        storeEmail: data.storeEmail,
        upiId: data.upiId,
        logoUrl: data.logoUrl
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      status: "error", 
      message: "Registration failed. Please try again later." 
    };
  }
}

  updateStoreDetails: async function(details) {
    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "updateStoreDetails",
          retailerId: this.currentUser,
          token: this.token,
          ...details
        })
      });
      
      const result = await response.json();
      
      if (result.status === "success") {
        this.storeDetails = {
          ...this.storeDetails,
          ...details
        };
        this.saveSession(this.currentUser, this.token, this.storeDetails);
      }
      
      return result;
    } catch (error) {
      console.error("Update store details error:", error);
      return { status: "error", message: "Network error. Please try again." };
    }
  },

  logout: function() {
    this.clearSession();
  }
};

// Initialize auth when script loads
Auth.init();

// Make Auth available globally
window.Auth = Auth;

// Transaction page specific code
if (document.getElementById("transaction-form")) {
    // Constants
    const DAILY_STATS_KEY = 'rkFashionsDailyStats';
    
    // Initialize date and time display
const today = new Date();
document.getElementById("transaction-date").valueAsDate = today;
document.getElementById("transaction-time").value = today.toTimeString().substring(0, 5);
document.getElementById("customer-name").value = generateCustomerName();
    
    // Sequence number management
    function generateBillNumber() {
    // Get current timestamp and random number for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
    return `RK-${timestamp}-${randomNum}`;
}
      
    addItem();
    document.getElementById("add-item").addEventListener("click", addItem);
    document.getElementById("items-container").addEventListener("input", function(e) {
        if (e.target.matches(".quantity, .sale-price, .purchase-price")) {
            calculateTotals();
        }
    });
    
    document.getElementById("transaction-form").addEventListener("submit", handleFormSubmit);
    setupPrintButton();

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

    function generateCustomerName() {
    const prefixes = ["Customer"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
    return `${randomPrefix}-${randomNum}`;
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
        time: document.getElementById("transaction-time").value,
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
                <p><strong>Date:</strong> ${data.date} <strong>Time:</strong> ${data.time}</p>
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
                            <img src="upi-qr.jpeg" alt="UPI QR Code" style="width:120px; height:120px;">
                            <p style="font-size:10px; margin-top:3px;">UPI ID: 7893433457@okbizaxis</p>
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

 // Add these at the top of the script.js file
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

// Modify the handleFormSubmit function
function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;
    
    // Generate bill number if not already set
    if (!document.getElementById("bill-no").value) {
        document.getElementById("bill-no").value = generateBillNumber();
    }

    const paymentMode = document.getElementById("payment-mode").value;
    const totalAmount = parseFloat(document.getElementById("total-amount").value) || 0;
    
    // Store the bill data for later submission
    pendingTransactionData = prepareBillData();
    
    if (paymentMode === "Cash") {
        showCashPaymentModal(totalAmount);
    } else {
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

// In the existing initialization code, add these:
setupCashPaymentModal();
setupSuccessModal();

// In the submitBill function, remove the spinner code since we're handling it globally:
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
    // Reset form but keep customer name and date
    const customerName = document.getElementById("customer-name").value;
    document.getElementById("transaction-form").reset();
    document.getElementById("customer-name").value = generateCustomerName();
    document.getElementById("transaction-date").valueAsDate = new Date();
    document.getElementById("transaction-time").value = new Date().toTimeString().substring(0, 5);
    document.getElementById("bill-no").value = "";
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
}

// ===== End of script.js =====


// ===== Start of transactions.js =====
// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allTransactions = [];
let filteredTransactions = [];

// DOM Elements
const elements = {
    todaySales: document.getElementById("today-sales"),
    todayProfit: document.getElementById("today-profit"),
    todayTransactions: document.getElementById("today-transactions"),
    dailyAverage: document.getElementById("daily-average"),
    searchInput: document.getElementById("search-input"),
    searchBtn: document.getElementById("search-btn"),
    dateFilter: document.getElementById("date-filter"),
    paymentFilter: document.getElementById("payment-filter"),
    transactionsBody: document.getElementById("transactions-body"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    pageInfo: document.getElementById("page-info"),
    viewModal: document.getElementById("view-modal"),
    transactionDetails: document.getElementById("transaction-details"),
    summaryDateRange: document.getElementById("summary-date-range"),
    customDateGroup: document.getElementById("custom-date-group"),
    customDate: document.getElementById("custom-date"),
    summaryPaymentMode: document.getElementById("summary-payment-mode"),
    applySummaryFilter: document.getElementById("apply-summary-filter")
};

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    // Theme toggle
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    
    // Load saved theme
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-theme');
    }
    
    // Load transactions
    loadTransactions();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    elements.searchBtn.addEventListener("click", filterTransactions);
    elements.searchInput.addEventListener("keyup", function(e) {
        if (e.key === "Enter") filterTransactions();
    });
    elements.dateFilter.addEventListener("change", filterTransactions);
    elements.paymentFilter.addEventListener("change", filterTransactions);
    elements.prevBtn.addEventListener("click", goToPrevPage);
    elements.nextBtn.addEventListener("click", goToNextPage);
    document.querySelector(".close").addEventListener("click", closeModal);

elements.summaryDateRange.addEventListener("change", toggleCustomDate);
    elements.applySummaryFilter.addEventListener("click", applySummaryFilters);
    elements.customDate.addEventListener("change", function() {
        if (elements.summaryDateRange.value === "custom") {
            applySummaryFilters();
        }
    });
}

function toggleCustomDate() {
    elements.customDateGroup.style.display = 
        elements.summaryDateRange.value === "custom" ? "block" : "none";
    if (elements.summaryDateRange.value === "custom") {
        applySummaryFilters();
    }
}

function applySummaryFilters() {
    const dateRange = elements.summaryDateRange.value;
    const paymentMode = elements.summaryPaymentMode.value;
    
    // Get filtered data based on selections
    const { filteredData, daysInPeriod } = filterDataByDateRange(dateRange);
    
    // Further filter by payment mode if needed
    const paymentFilteredData = paymentMode !== "all" 
        ? filteredData.filter(t => t.paymentMode === paymentMode) 
        : filteredData;
    
    // Calculate metrics
    const totalSales = paymentFilteredData.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const totalProfit = paymentFilteredData.reduce((sum, t) => sum + parseFloat(t.totalProfit || 0), 0);
    const transactionCount = paymentFilteredData.length;
    const averageSales = daysInPeriod > 0 ? totalSales / daysInPeriod : totalSales;
    
    // Update UI
    updateSummaryCardsUI(totalSales, totalProfit, transactionCount, averageSales);
    updateCardTitles(dateRange, paymentMode);
}

function filterDataByDateRange(dateRange) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate, endDate, daysInPeriod = 1;
    
    switch(dateRange) {
        case "today":
            startDate = new Date(today);
            endDate = new Date(today);
            break;
            
        case "yesterday":
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            break;
            
        case "this_week":
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - today.getDay()); // Sunday
            endDate = new Date(today);
            daysInPeriod = 7;
            break;
            
        case "last_week":
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - today.getDay() - 7);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            daysInPeriod = 7;
            break;
            
        case "this_month":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today);
            daysInPeriod = today.getDate();
            break;
            
        case "last_month":
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            daysInPeriod = endDate.getDate();
            break;
            
        case "custom":
            if (elements.customDate.value) {
                startDate = new Date(elements.customDate.value);
                endDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate = new Date(0); // Beginning of time
                endDate = new Date(); // Now
            }
            break;
            
        default:
            startDate = new Date(0); // Beginning of time
            endDate = new Date(); // Now
    }
    
    const filteredData = allTransactions.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
    });
    
    return { filteredData, daysInPeriod };
}

function updateSummaryCardsUI(totalSales, totalProfit, transactionCount, averageSales) {
    elements.todaySales.textContent = `₹${totalSales.toFixed(2)}`;
    elements.todayProfit.textContent = `₹${totalProfit.toFixed(2)}`;
    elements.todayTransactions.textContent = transactionCount;
    elements.dailyAverage.textContent = `₹${averageSales.toFixed(2)}`;
}

// Remove the duplicate updateCardTitles function and fix the nesting issue
function updateSummaryCards() {
    const dateRange = elements.summaryDateRange.value;
    const paymentMode = elements.summaryPaymentMode.value;
    
    let filteredData = allTransactions;
    
    // Filter by payment mode if not "all"
    if (paymentMode !== "all") {
        filteredData = filteredData.filter(t => t.paymentMode === paymentMode);
    }
    
    // Filter by date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(dateRange) {
        case "today":
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate.getTime() === today.getTime();
            });
            break;
            
        case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate.getTime() === yesterday.getTime();
            });
            break;
            
        case "this_week":
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay()); // Start of week (Sunday)
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate >= thisWeekStart && transDate <= today;
            });
            break;
            
        case "last_week":
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(lastWeekStart.getDate() - today.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate >= lastWeekStart && transDate <= lastWeekEnd;
            });
            break;
            
        case "this_month":
            const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate >= thisMonthStart && transDate <= today;
            });
            break;
            
        case "last_month":
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            filteredData = filteredData.filter(t => {
                const transDate = new Date(t.date);
                transDate.setHours(0, 0, 0, 0);
                return transDate >= lastMonthStart && transDate <= lastMonthEnd;
            });
            break;
            
        case "custom":
            if (elements.customDate.value) {
                const customDate = new Date(elements.customDate.value);
                customDate.setHours(0, 0, 0, 0);
                filteredData = filteredData.filter(t => {
                    const transDate = new Date(t.date);
                    transDate.setHours(0, 0, 0, 0);
                    return transDate.getTime() === customDate.getTime();
                });
            }
            break;
    }
    
    // Calculate totals
    const totalSales = filteredData.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const totalProfit = filteredData.reduce((sum, t) => sum + parseFloat(t.totalProfit || 0), 0);
    const transactionCount = filteredData.length;
    
    // Calculate average for the period (only for date ranges)
    let averageSales = 0;
    if (dateRange === "this_week" || dateRange === "last_week") {
        averageSales = totalSales / 7;
    } else if (dateRange === "this_month" || dateRange === "last_month") {
        const daysInMonth = dateRange === "this_month" ? today.getDate() : 
                          new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        averageSales = totalSales / daysInMonth;
    } else {
        averageSales = totalSales; // For single day ranges
    }
    
    // Update the cards
    elements.todaySales.textContent = `₹${totalSales.toFixed(2)}`;
    elements.todayProfit.textContent = `₹${totalProfit.toFixed(2)}`;
    elements.todayTransactions.textContent = transactionCount;
    elements.dailyAverage.textContent = `₹${averageSales.toFixed(2)}`;
    
    // Update card titles based on filters
    updateCardTitles(dateRange, paymentMode);
}

// Keep only one version of updateCardTitles (the more complete one)
function updateCardTitles(dateRange, paymentMode) {
    const dateTitles = {
        "today": "Today's",
        "yesterday": "Yesterday's",
        "this_week": "This Week's",
        "last_week": "Last Week's",
        "this_month": "This Month's",
        "last_month": "Last Month's",
        "custom": elements.customDate.value 
            ? new Date(elements.customDate.value).toLocaleDateString('en-IN') + "'s"
            : "Selected Date's"
    };
    
    const paymentTitles = {
        "all": "",
        "Cash": " (Cash)",
        "Card": " (Card)",
        "UPI": " (UPI)"
    };
    
    const dateTitle = dateTitles[dateRange] || "";
    const paymentTitle = paymentTitles[paymentMode] || "";
    
    document.querySelectorAll(".summary-card h3").forEach((h3, index) => {
        const icons = ["fa-rupee-sign", "fa-chart-line", "fa-receipt", "fa-calendar-day"];
        const baseTitles = ["Sales", "Profit", "Transactions", "Average"];
        
        h3.innerHTML = `<i class="fas ${icons[index]}"></i> ${dateTitle} ${baseTitles[index]}${paymentTitle}`;
    });
    
    // Update the change text
    document.querySelectorAll(".summary-card .change").forEach((el, index) => {
        const texts = [
            `Total sales${paymentMode !== "all" ? ` via ${paymentMode}` : ""}`,
            `Total profit${paymentMode !== "all" ? ` via ${paymentMode}` : ""}`,
            `Transactions${paymentMode !== "all" ? ` via ${paymentMode}` : ""}`,
            dateRange === "today" || dateRange === "yesterday" || dateRange === "custom" 
                ? "Total amount" 
                : `Daily average${paymentMode !== "all" ? ` via ${paymentMode}` : ""}`
        ];
        el.textContent = texts[index];
    });
}

async function loadTransactions() {
    try {
        showLoading();
        
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allTransactions = processSheetData(data);

        updateSummaryCards();
        
        // Update date filter options
        updateDateFilter();
        
        // Initial filter and render
        filterTransactions();
    } catch (error) {
        console.error("Error loading transactions:", error);
        showError("Failed to load transactions. Please try again.");
    }
}

function processSheetData(sheetData) {
    const transactionsMap = new Map();
    
    // Skip header row if it exists
    const startRow = sheetData[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        const siNo = String(row[2] || "").trim(); // Ensure SI No is a string
        const date = parseDate(row[1]); // Parse date properly
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                storeName: String(row[0] || ""),
                date: date,
                dateString: formatDateForDisplay(date),
                siNo: siNo,
                customerName: String(row[3] || ""),
                items: [],
                paymentMode: String(row[8] || ""),
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
        
        // Add item to transaction
        transactionsMap.get(siNo).items.push({
            itemName: String(row[4] || ""),
            quantity: parseFloat(row[5]) || 0,
            purchasePrice: parseFloat(row[6]) || 0,
            salePrice: parseFloat(row[7]) || 0,
            itemTotal: (parseFloat(row[5]) || 0) * (parseFloat(row[7]) || 0)
        });
    }
    
    // Convert to array and sort by date (newest first)
    const transactions = Array.from(transactionsMap.values());
    transactions.sort((a, b) => b.date - a.date);
    
    return transactions;
}

// Update the parseDate function to:
function parseDate(dateValue) {
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'string') {
        // Try ISO format (YYYY-MM-DD)
        let date = new Date(dateValue);
        if (!isNaN(date.getTime())) return date;
        
        // Try DD/MM/YYYY format
        const dd_mm_yyyy = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dd_mm_yyyy) {
            return new Date(`${dd_mm_yyyy[3]}-${dd_mm_yyyy[2]}-${dd_mm_yyyy[1]}`);
        }
        
        // Try YYYY-MM-DD format (alternative)
        const yyyy_mm_dd = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (yyyy_mm_dd) {
            return new Date(`${yyyy_mm_dd[1]}-${yyyy_mm_dd[2]}-${yyyy_mm_dd[3]}`);
        }
    }
    
    console.warn("Could not parse date:", dateValue);
    return new Date();
}

function updateDateFilter() {
    const uniqueDates = [...new Set(allTransactions.map(t => t.dateString))].sort((a, b) => {
        return new Date(b) - new Date(a);
    });
    
    elements.dateFilter.innerHTML = '<option value="">All Dates</option>';
    uniqueDates.forEach(date => {
        const option = document.createElement("option");
        option.value = date;
        option.textContent = date;
        elements.dateFilter.appendChild(option);
    });
}

function filterTransactions() {
    const searchTerm = (elements.searchInput.value || "").toString().toLowerCase();
    const dateFilter = elements.dateFilter.value;
    const paymentFilter = elements.paymentFilter.value;
    
    filteredTransactions = allTransactions.filter(transaction => {
        // Search filter
        const matchesSearch = 
            String(transaction.siNo || "").toLowerCase().includes(searchTerm) ||
            String(transaction.customerName || "").toLowerCase().includes(searchTerm) ||
            transaction.items.some(item => 
                String(item.itemName || "").toLowerCase().includes(searchTerm)
            );
        
        // Date filter - compare formatted dates
        const matchesDate = dateFilter === "" || 
                          formatDateForDisplay(transaction.date) === dateFilter;
        
        // Payment filter
        const matchesPayment = paymentFilter === "" || 
                             transaction.paymentMode === paymentFilter;
        
        return matchesSearch && matchesDate && matchesPayment;
    });
    
    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => b.date - a.date);
    
    totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
    currentPage = 1;
    renderTransactions();
    updateSummaryCards();
}

function renderTransactions() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageTransactions = filteredTransactions.slice(startIdx, endIdx);
    
    elements.transactionsBody.innerHTML = "";
    
    if (pageTransactions.length === 0) {
        elements.transactionsBody.innerHTML = `
            <tr>
                <td colspan="8" class="no-results">
                    No transactions found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    // Render transactions (already sorted by date)
    let currentDateHeader = null;
    pageTransactions.forEach(transaction => {
        // Add date header if this is a new date
        if (transaction.dateString !== currentDateHeader) {
            currentDateHeader = transaction.dateString;
            const dateHeader = document.createElement("tr");
            dateHeader.className = "date-header";
            dateHeader.innerHTML = `
                <td colspan="8">
                    <strong>${getDateHeaderText(transaction.date)}</strong>
                </td>
            `;
            elements.transactionsBody.appendChild(dateHeader);
        }
        
        // Add transaction row
        const itemCount = transaction.items.length;
        const itemsSummary = itemCount === 1 
            ? transaction.items[0].itemName 
            : `${itemCount} items`;
        
        const row = document.createElement("tr");
        row.className = "transaction-row";
        row.innerHTML = `
            <td>${transaction.siNo}</td>
            <td>${transaction.dateString}</td>
            <td>${transaction.customerName}</td>
            <td>${itemsSummary}</td>
            <td>₹${transaction.totalAmount.toFixed(2)}</td>
            <td>₹${transaction.totalProfit.toFixed(2)}</td>
            <td>${transaction.paymentMode}</td>
            <td class="actions">
              <button class="view-btn" data-si-no="${transaction.siNo}">View</button>
             <button class="delete-btn" data-si-no="${transaction.siNo}">Delete</button>
            </td>
        `;
        elements.transactionsBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
    
    // Add event listeners to view buttons
    setupRowEventListeners();
}

function groupByDate(transactions) {
    // First sort by date (newest first)
    const sorted = [...transactions].sort((a, b) => {
        return b.date - a.date;
    });
    
    return sorted;
}

function getDateHeaderText(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const transactionDate = new Date(date);
    transactionDate.setHours(0, 0, 0, 0);
    
    if (transactionDate.getTime() === today.getTime()) {
        return "Today";
    } else if (transactionDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
    } else {
        // Use Indian date format with weekday
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        return transactionDate.toLocaleDateString('en-IN', options);
    }
}

function formatDateHeader(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

function formatDateForDisplay(date) {
    try {
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch {
        return "Invalid Date";
    }
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function setupRowEventListeners() {
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", viewTransactionDetails);
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", deleteTransaction);
    });
}

function viewTransactionDetails(e) {
    const siNo = e.target.getAttribute("data-si-no");
    const transaction = allTransactions.find(t => t.siNo === siNo);
    
    if (!transaction) return;
    
    // Format items as a table
    const itemsHtml = `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Purchase</th>
                    <th>Sale</th>
                    <th>Total</th>
                    <th>Profit</th>
                </tr>
            </thead>
            <tbody>
                ${transaction.items.map(item => `
                    <tr>
                        <td>${item.itemName}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.purchasePrice.toFixed(2)}</td>
                        <td>₹${item.salePrice.toFixed(2)}</td>
                        <td>₹${item.itemTotal.toFixed(2)}</td>
                        <td>₹${(item.quantity * (item.salePrice - item.purchasePrice)).toFixed(2)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
    
    // Create transaction details HTML
    elements.transactionDetails.innerHTML = `
        <div class="transaction-header">
            <p><strong>Store:</strong> ${transaction.storeName}</p>
            <p><strong>Date:</strong> ${transaction.dateString}</p>
            <p><strong>Bill No:</strong> ${transaction.siNo}</p>
            <p><strong>Customer:</strong> ${transaction.customerName}</p>
            <p><strong>Payment Mode:</strong> ${transaction.paymentMode}</p>
        </div>
        
        <div class="transaction-items">
            ${itemsHtml}
        </div>
        
        <div class="transaction-totals">
            <p><strong>Total Amount:</strong> ₹${transaction.totalAmount.toFixed(2)}</p>
            <p><strong>Total Profit:</strong> ₹${transaction.totalProfit.toFixed(2)}</p>
        </div>
    `;
    
    // Show modal
    elements.viewModal.style.display = "block";
}

async function deleteTransaction(e) {
    const siNo = e.target.getAttribute("data-si-no");
    const row = e.target.closest('tr');
    
    if (!confirm(`Are you sure you want to delete transaction ${siNo}?`)) {
        return;
    }
    
    // Add deleting class for animation
    row.classList.add('deleting');
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
        // Call backend to delete
        const response = await fetch(
            `https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=delete&siNo=${siNo}`,
            { mode: 'no-cors' }
        );
        
        // Remove from local data
        allTransactions = allTransactions.filter(t => t.siNo !== siNo);
        filteredTransactions = filteredTransactions.filter(t => t.siNo !== siNo);
        
        // Re-render
        renderTransactions();
        updateSummaryCards();
        
        // Show success message
        showToast('Transaction deleted successfully');
    } catch (error) {
        console.error("Delete failed:", error);
        showToast('Failed to delete transaction', 'error');
        row.classList.remove('deleting');
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTransactions();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderTransactions();
    }
}

function closeModal() {
    elements.viewModal.style.display = "none";
}

function showLoading() {
    elements.transactionsBody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-spinner">
                <div class="spinner"></div>
                Loading transactions...
            </td>
        </tr>
    `;
}

function showError(message) {
    elements.transactionsBody.innerHTML = `
        <tr>
            <td colspan="8" class="error-message">
                ${message}
                <button onclick="loadTransactions()">Retry</button>
            </td>
        </tr>
    `;
  }

// ===== End of transactions.js =====


// ===== Start of purchases.js =====
// Purchase Management System
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allPurchases = [];
let filteredPurchases = [];
let purchaseChart = null;
let currentPeriod = 'monthly';
let currentPurchaseId = null;

// DOM Elements
const elements = {
    // Summary cards
    totalPurchases: document.getElementById('total-purchases'),
    pendingPayments: document.getElementById('pending-payments'),
    stockValue: document.getElementById('stock-value'),
    supplierCount: document.getElementById('supplier-count'),
    purchaseChange: document.getElementById('purchase-change'),
    pendingChange: document.getElementById('pending-change'),
    stockChange: document.getElementById('stock-change'),
    lastSupplier: document.getElementById('last-supplier'),
    supplierAnalyticsFilter: document.getElementById('supplier-analytics-filter'),
    viewSupplierDetails: document.getElementById('view-supplier-details'),
    supplierTotal: document.getElementById('supplier-total'),
    supplierPending: document.getElementById('supplier-pending'),
    supplierItems: document.getElementById('supplier-items'),
    supplierFrequency: document.getElementById('supplier-frequency'),
    supplierLastDate: document.getElementById('supplier-last-date'),
    supplierPendingBills: document.getElementById('supplier-pending-bills'),
    supplierUniqueItems: document.getElementById('supplier-unique-items'),
    supplierAvgDays: document.getElementById('supplier-avg-days'),
    

    
    // Chart
    purchaseChart: document.getElementById('purchaseChart'),
    
    // Controls
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateBtn: document.getElementById('generate-report'),
    supplierFilter: document.getElementById('supplier-filter'),
    paymentFilter: document.getElementById('payment-filter'),
    itemFilter: document.getElementById('item-filter'),
    searchInput: document.getElementById('search-purchases'),
    searchBtn: document.getElementById('search-btn'),
    
    // Table
    purchasesBody: document.getElementById('purchases-body'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    
    // Modals
    addPurchaseBtn: document.getElementById('add-purchase-btn'),
    purchaseModal: document.getElementById('purchase-modal'),
    viewModal: document.getElementById('view-modal'),
    modalTitle: document.getElementById('modal-title'),
    purchaseForm: document.getElementById('purchase-form'),
    purchaseDetails: document.getElementById('purchase-details'),
    
    // Form elements
    purchaseDate: document.getElementById('purchase-date'),
    billNo: document.getElementById('bill-no'),
    supplierName: document.getElementById('supplier-name'),
    supplierList: document.getElementById('supplier-list'),
    paymentType: document.getElementById('payment-type'),
    amountPaid: document.getElementById('amount-paid'),
    dueDate: document.getElementById('due-date'),
    billImage: document.getElementById('bill-image'),
    imagePreview: document.getElementById('image-preview'),
    purchaseItemsContainer: document.getElementById('purchase-items-container'),
    addItemBtn: document.getElementById('add-item-btn'),
    totalAmount: document.getElementById('total-amount'),
    notes: document.getElementById('notes'),
    cancelPurchase: document.getElementById('cancel-purchase'),
    savePurchase: document.getElementById('save-purchase')
};

// UI Helpers for loading and success messages
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSuccessMessage(message = 'Operation completed successfully!') {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        document.getElementById('success-modal').style.display = 'none';
    }, 3000);
}

// Setup success modal close button
document.getElementById('close-success-modal')?.addEventListener('click', function() {
    document.getElementById('success-modal').style.display = 'none';
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    elements.purchaseDate.value = today;
    
    // Load initial data
    loadPurchases();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Period buttons
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadPurchases();
        });
    });

    // Generate report button
    elements.generateBtn?.addEventListener('click', loadPurchases);

   elements.supplierAnalyticsFilter.addEventListener('change', function() {
    updateSupplierAnalytics(this.value || null);
});

    // Filters
    elements.supplierFilter?.addEventListener('change', filterPurchases);
    elements.paymentFilter?.addEventListener('change', filterPurchases);
    elements.itemFilter?.addEventListener('change', filterPurchases);

    elements.searchInput?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterPurchases();
    });
    elements.searchBtn?.addEventListener('click', filterPurchases);

    // Pagination
    elements.prevBtn?.addEventListener('click', goToPrevPage);
    elements.nextBtn?.addEventListener('click', goToNextPage);

    // Add purchase button
    elements.addPurchaseBtn?.addEventListener('click', showAddPurchaseModal);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Cancel purchase button
    elements.cancelPurchase?.addEventListener('click', closeModal);

    // Payment type change
    elements.paymentType?.addEventListener('change', () => {
        const type = elements.paymentType.value;
        if (type === 'spot') {
            elements.amountPaid.value = '';
            elements.amountPaid.readOnly = true;
            elements.dueDate.disabled = true;
        } else {
            elements.amountPaid.value = type === 'credit' ? '0' : '';
            elements.amountPaid.readOnly = false;
            elements.dueDate.disabled = false;
        }
    });

    // Bill image upload
    elements.billImage?.addEventListener('change', () => {
        const file = elements.billImage.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                elements.imagePreview.innerHTML = `
                    <img src="${e.target.result}" 
                         style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    });

    // Add item button
    elements.addItemBtn?.addEventListener('click', addPurchaseItem);

    // Form submission
    elements.purchaseForm?.addEventListener('submit', handlePurchaseSubmit);

    // Initialize with one item
    addPurchaseItem();
}


async function loadPurchases() {
    try {
        showLoading();
        
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        allPurchases = processPurchaseData(data);
        
        updateFilters();
        updateSupplierFilter(); // Make sure this is called
        updateSummaryCards();
        renderChart();
        filterPurchases();
    } catch (error) {
        console.error("Error loading purchases:", error);
        showError("Failed to load purchases. Please try again.");
    } finally {
        hideLoading();
    }
}

function processPurchaseData(sheetData) {
    const purchases = [];
    
    for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        
        purchases.push({
            id: row.id || `purchase-${i}`,
            date: row.date || new Date().toISOString().split('T')[0],
            billNo: row.billno || '',
            supplier: row.supplier || '',
            items: row.items || [],
            totalAmount: parseFloat(row.totalamount) || 0,
            paymentType: row.paymenttype || 'credit',
            amountPaid: parseFloat(row.amountpaid) || 0,
            dueDate: row.duedate || '',
            billImage: row.billimage || '',
            notes: row.notes || '',
            status: calculateStatus(row.paymenttype, parseFloat(row.totalamount), parseFloat(row.amountpaid)),
            balance: (parseFloat(row.totalamount) || 0) - (parseFloat(row.amountpaid) || 0),
            createdAt: row.createdat || new Date().toISOString()
        });
    }
    // Sort purchases by date in descending order (newest first)
    purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return purchases;
}

function calculateStatus(paymentType, totalAmount, amountPaid) {
    if (paymentType === 'spot') return 'paid';
    if (amountPaid >= totalAmount) return 'paid';
    if (amountPaid > 0) return 'partial';
    return 'pending';
}

function updateFilters() {
    // Update supplier filter
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
    elements.supplierList.innerHTML = '';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier;
        option.textContent = supplier;
        elements.supplierFilter.appendChild(option.cloneNode(true));
        elements.supplierList.appendChild(option);
    });
    
    // Update item filter
    const allItems = [];
    allPurchases.forEach(p => {
        p.items.forEach(item => {
            if (item.name && !allItems.includes(item.name)) {
                allItems.push(item.name);
            }
        });
    });
    
    elements.itemFilter.innerHTML = '<option value="">All Items</option>';
    allItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        elements.itemFilter.appendChild(option);
    });
}

function updateSupplierFilter() {
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierAnalyticsFilter.innerHTML = '<option value="">Select Supplier</option>';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier;
        option.textContent = supplier;
        elements.supplierAnalyticsFilter.appendChild(option);
    });
}

function updateSummaryCards() {
    if (allPurchases.length === 0) return;
   
    // Total purchases
    const total = allPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    elements.totalPurchases.textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    // Pending payments
    const pending = allPurchases.filter(p => p.status === 'pending' || p.status === 'partial')
                               .reduce((sum, p) => sum + p.balance, 0);
    elements.pendingPayments.textContent = `₹${pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    // Supplier count
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierCount.textContent = suppliers.length;
    
    // Last supplier
    const lastPurchase = [...allPurchases].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    elements.lastSupplier.textContent = lastPurchase?.supplier || 'None';
    
    // Stock value and count
    const stockItems = {};
    allPurchases.forEach(p => {
        p.items.forEach(item => {
            if (!stockItems[item.name]) {
                stockItems[item.name] = {
                    quantity: 0,
                    purchasePrice: item.price || 0
                };
            }
            stockItems[item.name].quantity += parseFloat(item.quantity) || 0;
        });
    });
    
    const stockValue = Object.values(stockItems).reduce((sum, item) => {
        return sum + (item.quantity * item.purchasePrice);
    }, 0);
    
    const stockCount = Object.keys(stockItems).length;
    elements.stockValue.textContent = `₹${stockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    elements.stockChange.textContent = stockCount;
    
    // Calculate changes (simplified - would compare with previous period)
    elements.purchaseChange.textContent = '0%';
    elements.pendingChange.textContent = allPurchases.filter(p => p.status === 'pending').length;
}

function updateSupplierAnalytics(selectedSupplier = null) {
    if (!selectedSupplier) {
        resetSupplierAnalytics();
        return;
    }

    const supplierPurchases = allPurchases.filter(p => p.supplier === selectedSupplier);
    if (supplierPurchases.length === 0) {
        resetSupplierAnalytics();
        return;
    }

    // Total business
    const total = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    elements.supplierTotal.textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    // Pending payments
    const pending = supplierPurchases
        .filter(p => p.status === 'pending' || p.status === 'partial')
        .reduce((sum, p) => sum + p.balance, 0);
    elements.supplierPending.textContent = `₹${pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    elements.supplierPendingBills.textContent = supplierPurchases
        .filter(p => p.status === 'pending' || p.status === 'partial').length;

    // Items purchased
    const allItems = [];
    const uniqueItems = new Set();
    supplierPurchases.forEach(p => {
        p.items.forEach(item => {
            allItems.push({
                name: item.name,
                quantity: parseFloat(item.quantity) || 0
            });
            uniqueItems.add(item.name);
        });
    });
    const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
    elements.supplierItems.textContent = totalItems;
    elements.supplierUniqueItems.textContent = uniqueItems.size;

    // Purchase frequency
    const sortedDates = supplierPurchases
        .map(p => new Date(p.date))
        .sort((a, b) => a - b);
    
    elements.supplierFrequency.textContent = supplierPurchases.length;
    
    if (sortedDates.length > 1) {
        const dateDiffs = [];
        for (let i = 1; i < sortedDates.length; i++) {
            dateDiffs.push((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24));
        }
        const avgDays = Math.round(dateDiffs.reduce((a, b) => a + b, 0) / dateDiffs.length);
        elements.supplierAvgDays.textContent = avgDays;
    } else {
        elements.supplierAvgDays.textContent = 'N/A';
    }

    // Last purchase date
    const lastPurchase = sortedDates[sortedDates.length - 1];
    elements.supplierLastDate.textContent = lastPurchase.toLocaleDateString();
}

function resetSupplierAnalytics() {
    elements.supplierTotal.textContent = '₹0.00';
    elements.supplierPending.textContent = '₹0.00';
    elements.supplierItems.textContent = '0';
    elements.supplierFrequency.textContent = '0';
    elements.supplierLastDate.textContent = 'None';
    elements.supplierPendingBills.textContent = '0';
    elements.supplierUniqueItems.textContent = '0';
    elements.supplierAvgDays.textContent = '0';
}

function showSupplierDetails() {
    const selectedSupplier = elements.supplierAnalyticsFilter.value;
    if (!selectedSupplier) {
        alert('Please select a supplier first');
        return;
    }

    const supplierPurchases = allPurchases.filter(p => p.supplier === selectedSupplier);
    if (supplierPurchases.length === 0) {
        alert('No purchases found for this supplier');
        return;
    }

    // Create detailed HTML
    const html = `
        <div class="supplier-details-header">
            <h2>${selectedSupplier}</h2>
            <p>${supplierPurchases.length} purchases since ${new Date(supplierPurchases[supplierPurchases.length-1].date).toLocaleDateString()}</p>
        </div>
        
        <div class="supplier-stats-grid">
            <div class="stat-card">
                <h3>Total Business</h3>
                <p class="stat-value">₹${supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
            <div class="stat-card">
                <h3>Avg. Purchase Value</h3>
                <p class="stat-value">₹${(supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0) / supplierPurchases.length).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
            <div class="stat-card">
                <h3>Pending Payments</h3>
                <p class="stat-value">₹${supplierPurchases.filter(p => p.status === 'pending' || p.status === 'partial').reduce((sum, p) => sum + p.balance, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
           <div class="stat-card">
    <h3>Payment Compliance</h3>
    <p class="stat-value">${Math.round((supplierPurchases.filter(p => p.status === 'paid').length / supplierPurchases.length) * 100)})%</p>
    </div>
</div>

        
        <h3>Purchase History</h3>
        <div class="purchase-history">
            ${supplierPurchases.slice(0, 10).map(purchase => `
                <div class="purchase-item">
                    <div class="purchase-date">${formatDate(purchase.date)}</div>
                    <div class="purchase-amount">₹${purchase.totalAmount.toFixed(2)}</div>
                    <div class="purchase-status ${purchase.status}">${purchase.status}</div>
                    <div class="purchase-actions">
                        <button class="view-btn" data-id="${purchase.id}">View</button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <h3>Top Purchased Items</h3>
        <div class="top-items">
            ${getTopItems(supplierPurchases, 5).map(item => `
                <div class="item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">${item.quantity} units</div>
                    <div class="item-value">₹${item.totalValue.toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
    `;

    elements.purchaseDetails.innerHTML = html;
    elements.viewModal.style.display = 'flex';
    
    // Add event listeners to view buttons
    document.querySelectorAll('.purchase-actions .view-btn').forEach(btn => {
        btn.addEventListener('click', viewPurchaseDetails);
    });
}

function getTopItems(purchases, limit = 5) {
    const itemsMap = {};
    
    purchases.forEach(purchase => {
        purchase.items.forEach(item => {
            if (!itemsMap[item.name]) {
                itemsMap[item.name] = {
                    name: item.name,
                    quantity: 0,
                    totalValue: 0
                };
            }
            itemsMap[item.name].quantity += parseFloat(item.quantity) || 0;
            itemsMap[item.name].totalValue += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
        });
    });
    
    return Object.values(itemsMap)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, limit);
}

function renderChart() {
    // Group purchases by period
    const grouped = groupPurchasesByPeriod();
    
    // Prepare chart data
    const labels = [];
    const purchaseData = [];
    const paymentData = [];
    
    grouped.forEach(group => {
        labels.push(group.periodLabel);
        purchaseData.push(group.totalPurchases);
        paymentData.push(group.totalPayments);
    });
    
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Purchases',
                data: purchaseData,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                label: 'Payments',
                data: paymentData,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }
        ]
    };
    
    if (purchaseChart) {
        purchaseChart.destroy();
    }
    
    const ctx = elements.purchaseChart.getContext('2d');
    purchaseChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Period'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (₹)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            }
        }
    });
}

function groupPurchasesByPeriod() {
    const groups = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (currentPeriod === 'monthly') {
        // Last 12 months including current month
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, now.getMonth() - i, 1);
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            const periodLabel = `${month} ${year}`;
            
            const startDate = new Date(year, date.getMonth(), 1);
            const endDate = new Date(year, date.getMonth() + 1, 0);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.unshift({  // Add to beginning to maintain chronological order
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    } else if (currentPeriod === 'quarterly') {
        // Last 4 quarters
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        
        for (let i = 3; i >= 0; i--) {
            const quarter = (currentQuarter - i - 1 + 4) % 4 + 1;
            let year = now.getFullYear();
            if (quarter > currentQuarter) year--;
            
            const periodLabel = `Q${quarter} ${year}`;
            
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            
            const startDate = new Date(year, startMonth, 1);
            const endDate = new Date(year, endMonth + 1, 0);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.push({
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    } else { // yearly
        // Last 5 years
        for (let i = 4; i >= 0; i--) {
            const year = now.getFullYear() - i;
            const periodLabel = year.toString();
            
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.push({
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    }
    
    return groups;
}

function filterPurchases() {
    const supplierFilter = elements.supplierFilter.value.toLowerCase();
    const paymentFilter = elements.paymentFilter.value.toLowerCase();
    const itemFilter = elements.itemFilter.value.toLowerCase();
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredPurchases = allPurchases.filter(purchase => {
        // Supplier filter
        const matchesSupplier = !supplierFilter || 
            purchase.supplier.toLowerCase().includes(supplierFilter);
        
        // Payment filter
        const matchesPayment = !paymentFilter || 
            purchase.status.toLowerCase() === paymentFilter;
        
        // Item filter
        const matchesItem = !itemFilter || 
            purchase.items.some(item => item.name.toLowerCase().includes(itemFilter));
        
        // Search term
        const matchesSearch = !searchTerm || 
            purchase.billNo.toLowerCase().includes(searchTerm) ||
            purchase.supplier.toLowerCase().includes(searchTerm) ||
            purchase.items.some(item => item.name.toLowerCase().includes(searchTerm));
        
        return matchesSupplier && matchesPayment && matchesItem && matchesSearch;
    });

    // Maintain sorting by date (newest first)
    filteredPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
    currentPage = 1;
    renderPurchases();
}

function renderPurchases() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pagePurchases = filteredPurchases.slice(startIdx, endIdx);
    
    elements.purchasesBody.innerHTML = "";
    
    if (pagePurchases.length === 0) {
        elements.purchasesBody.innerHTML = `
            <tr>
                <td colspan="10" class="no-results"> <!-- Update colspan to 10 -->
                    No purchases found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    pagePurchases.forEach(purchase => {
        const itemsSummary = purchase.items.length === 1 
            ? purchase.items[0].name 
            : `${purchase.items.length} items`;
        
        // Create image link or placeholder
        const billImageLink = purchase.billImage 
            ? `<a href="${purchase.billImage}" target="_blank" class="view-image-btn">View Bill</a>`
            : '<span class="no-image">No Image</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(purchase.date)}</td>
            <td>${purchase.billNo}</td>
            <td>${purchase.supplier}</td>
            <td>${itemsSummary}</td>
            <td>₹${purchase.totalAmount.toFixed(2)}</td>
            <td>₹${purchase.amountPaid.toFixed(2)}</td>
            <td>₹${purchase.balance.toFixed(2)}</td>
            <td><span class="status-badge ${purchase.status}">${purchase.status}</span></td>
            <td>${billImageLink}</td>
            <td class="actions">
                <button class="view-btn" data-id="${purchase.id}">View</button>
                <button class="edit-btn" data-id="${purchase.id}">Edit</button>
            </td>
        `;
        elements.purchasesBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
    
    // Add event listeners to buttons
    setupRowEventListeners();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function setupRowEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', viewPurchaseDetails);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editPurchase);
    });
}

function viewPurchaseDetails(e) {
    const purchaseId = e.target.getAttribute('data-id');
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    // Format items as a table
    const itemsHtml = `
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
                ${purchase.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>₹${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Create purchase details HTML
    elements.purchaseDetails.innerHTML = `
        <div class="purchase-header">
            <p><strong>Date:</strong> ${formatDate(purchase.date)}</p>
            <p><strong>Bill No:</strong> ${purchase.billNo}</p>
            <p><strong>Supplier:</strong> ${purchase.supplier}</p>
            <p><strong>Payment Type:</strong> ${purchase.paymentType}</p>
            ${purchase.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(purchase.dueDate)}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-badge ${purchase.status}">${purchase.status}</span></p>
        </div>
        
        <div class="purchase-items">
            <h3>Items</h3>
            ${itemsHtml}
        </div>
        
        <div class="purchase-totals">
            <p><strong>Total Amount:</strong> ₹${purchase.totalAmount.toFixed(2)}</p>
            <p><strong>Amount Paid:</strong> ₹${purchase.amountPaid.toFixed(2)}</p>
            <p><strong>Balance Due:</strong> ₹${purchase.balance.toFixed(2)}</p>
        </div>
        
        ${purchase.billImage ? `
        <div class="bill-image">
            <h3>Bill Image</h3>
            <img src="${purchase.billImage}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        ` : ''}
        
        ${purchase.notes ? `
        <div class="purchase-notes">
            <h3>Notes</h3>
            <p>${purchase.notes}</p>
        </div>
        ` : ''}
    `;
    
    // Show modal
    elements.viewModal.style.display = 'flex';
}

function editPurchase(e) {
    const purchaseId = e.target.getAttribute('data-id');
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    currentPurchaseId = purchaseId;
    elements.modalTitle.textContent = 'Edit Purchase';
    
    // Fill form with purchase data
    elements.purchaseDate.value = purchase.date;
    elements.billNo.value = purchase.billNo;
    elements.supplierName.value = purchase.supplier;
    elements.paymentType.value = purchase.paymentType;
    elements.amountPaid.value = purchase.amountPaid;
    elements.dueDate.value = purchase.dueDate || '';
    elements.totalAmount.value = purchase.totalAmount;
    elements.notes.value = purchase.notes || '';
    
    // Set payment type specific fields
    if (purchase.paymentType === 'spot') {
        elements.amountPaid.readOnly = true;
        elements.dueDate.disabled = true;
    } else {
        elements.amountPaid.readOnly = false;
        elements.dueDate.disabled = false;
    }
    
    // Clear and add items
    elements.purchaseItemsContainer.innerHTML = '';
    purchase.items.forEach(item => {
        addPurchaseItem(item);
    });
    
    // Show bill image if exists
    if (purchase.billImage) {
        elements.imagePreview.innerHTML = `
            <img src="${purchase.billImage}" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;">
        `;
    } else {
        elements.imagePreview.innerHTML = '';
    }
    
    // Show modal
    elements.purchaseModal.style.display = 'flex';
}

function showAddPurchaseModal() {
    currentPurchaseId = null;
    elements.modalTitle.textContent = 'Add New Purchase';
    
    // Reset form
    elements.purchaseForm.reset();
    elements.purchaseDate.value = new Date().toISOString().split('T')[0];
    elements.paymentType.value = 'credit';
    elements.amountPaid.value = '0';
    elements.amountPaid.readOnly = false;
    elements.dueDate.disabled = false;
    elements.totalAmount.value = '0';
    elements.imagePreview.innerHTML = '';
    
    // Clear and add one empty item
    elements.purchaseItemsContainer.innerHTML = '';
    addPurchaseItem();
    
    // Show modal
    elements.purchaseModal.style.display = 'flex';
}

function addPurchaseItem(itemData = {}) {
    const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = itemId;
    itemRow.innerHTML = `
        <div class="form-group">
            <label for="${itemId}-name">Item Name</label>
            <input type="text" id="${itemId}-name" class="item-name" value="${itemData.name || ''}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-quantity">Quantity</label>
            <input type="number" id="${itemId}-quantity" class="item-quantity" min="1" value="${itemData.quantity || 1}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-price">Price (₹)</label>
            <input type="number" id="${itemId}-price" class="item-price" min="0" step="0.01" value="${itemData.price || ''}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-total">Total (₹)</label>
            <input type="number" id="${itemId}-total" class="item-total" min="0" step="0.01" value="${(itemData.quantity || 0) * (itemData.price || 0)}" readonly>
        </div>
        <button type="button" class="remove-item" data-item="${itemId}">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    elements.purchaseItemsContainer.appendChild(itemRow);
    
    // Add event listeners for calculations
    const quantityInput = itemRow.querySelector('.item-quantity');
    const priceInput = itemRow.querySelector('.item-price');
    const totalInput = itemRow.querySelector('.item-total');
    
    quantityInput.addEventListener('input', calculateItemTotal);
    priceInput.addEventListener('input', calculateItemTotal);
    
    // Add remove event
    itemRow.querySelector('.remove-item').addEventListener('click', function() {
        itemRow.remove();
        calculatePurchaseTotal();
    });
    
    // Calculate initial total if data was provided
    if (itemData.quantity && itemData.price) {
        calculateItemTotal({ target: quantityInput });
    }
}

function calculateItemTotal(e) {
    const itemRow = e.target.closest('.item-row');
    const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const total = quantity * price;
    
    itemRow.querySelector('.item-total').value = total.toFixed(2);
    calculatePurchaseTotal();
}

function calculatePurchaseTotal() {
    let total = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const itemTotal = parseFloat(row.querySelector('.item-total').value) || 0;
        total += itemTotal;
    });
    
    elements.totalAmount.value = total.toFixed(2);
    
    // If payment type is spot, set amount paid equal to total
    if (elements.paymentType.value === 'spot') {
        elements.amountPaid.value = total.toFixed(2);
    }
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validatePurchaseForm()) return;
    
    // Disable form during submission
    const formElements = elements.purchaseForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = true;
    }
    elements.savePurchase.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Prepare items data
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        items.push({
            name: row.querySelector('.item-name').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value),
            price: parseFloat(row.querySelector('.item-price').value)
        });
    });
    
    // Prepare purchase data
    const purchaseData = {
        id: currentPurchaseId || `purchase-${Date.now()}`,
        date: elements.purchaseDate.value,
        billNo: elements.billNo.value,
        supplier: elements.supplierName.value,
        items: items,
        totalAmount: parseFloat(elements.totalAmount.value),
        paymentType: elements.paymentType.value,
        amountPaid: parseFloat(elements.amountPaid.value) || 0,
        dueDate: elements.dueDate.value || '',
        notes: elements.notes.value || '',
        status: calculateStatus(elements.paymentType.value, parseFloat(elements.totalAmount.value), parseFloat(elements.amountPaid.value) || 0),
        balance: parseFloat(elements.totalAmount.value) - (parseFloat(elements.amountPaid.value) || 0)
    };
    
    // Upload bill image if selected
    if (elements.billImage.files && elements.billImage.files[0]) {
        try {
            const imageUrl = await uploadImageToImgBB(elements.billImage.files[0]);
            purchaseData.billImage = imageUrl;
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload bill image. The purchase will be saved without the image.");
        }
    } else if (currentPurchaseId) {
        // Keep existing image if editing
        const existingPurchase = allPurchases.find(p => p.id === currentPurchaseId);
        if (existingPurchase && existingPurchase.billImage) {
            purchaseData.billImage = existingPurchase.billImage;
        }
    }
    
    // Save purchase
    savePurchase(purchaseData);
    
    // Re-enable form elements (they'll be cleared when modal closes)
    setTimeout(() => {
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].disabled = false;
        }
        elements.savePurchase.innerHTML = '<i class="fas fa-save"></i> Save Purchase';
    }, 3000);
}

function validatePurchaseForm() {
    // Validate required fields
    if (!elements.billNo.value.trim()) {
        alert("Please enter bill number");
        return false;
    }
    
    if (!elements.supplierName.value.trim()) {
        alert("Please enter supplier name");
        return false;
    }
    
    // Validate at least one item exists
    if (document.querySelectorAll('.item-row').length === 0) {
        alert("Please add at least one item");
        return false;
    }
    
    // Validate all items
    let valid = true;
    document.querySelectorAll('.item-row').forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const quantity = row.querySelector('.item-quantity').value;
        const price = row.querySelector('.item-price').value;
        
        if (!name || !quantity || !price || isNaN(quantity) || isNaN(price)) {
            row.style.border = "1px solid red";
            valid = false;
        } else {
            row.style.border = "";
        }
    });
    
    if (!valid) {
        alert("Please check all item fields");
        return false;
    }
    
    // Validate payment details
    if (elements.paymentType.value !== 'spot') {
        const amountPaid = parseFloat(elements.amountPaid.value) || 0;
        const totalAmount = parseFloat(elements.totalAmount.value) || 0;
        
        if (amountPaid > totalAmount) {
            alert("Amount paid cannot be greater than total amount");
            return false;
        }
        
        if (elements.paymentType.value === 'credit' && !elements.dueDate.value) {
            alert("Please select due date for credit purchases");
            return false;
        }
    }
    
    return true;
}

async function uploadImageToImgBB(imageFile) {
    try {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Use your actual imgBB API key
        const apiKey = '0040c80066f01e3ed221aa25f355f762';
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let the browser set it with the boundary
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            const errorMsg = data.error?.message || 
                            data.error?.context || 
                            'Image upload failed without specific error message';
            throw new Error(`ImgBB Error: ${errorMsg} (Status: ${response.status})`);
        }
        
        return data.data.url;
    } catch (error) {
        console.error("Full upload error:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}

function savePurchase(purchaseData) {
    const isNew = !currentPurchaseId;
    const submitBtn = elements.savePurchase;
    const originalText = submitBtn.innerHTML;
    
    showLoading();
    
    // This would be replaced with your actual API call
    const scriptUrl = "https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec";
    
    fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(purchaseData)
    })
    .then(() => {
        // Update local data
        if (isNew) {
            allPurchases.push(purchaseData);
        } else {
            const index = allPurchases.findIndex(p => p.id === currentPurchaseId);
            if (index !== -1) {
                allPurchases[index] = purchaseData;
            }
        }
        
        // Update UI
        updateFilters();
        updateSummaryCards();
        renderChart();
        filterPurchases();
        
        // Show success message
        showSuccessMessage(`Purchase ${isNew ? 'added' : 'updated'} successfully!`);
        
        // Close modal
        closeModal();
    })
    .catch(error => {
        console.error("Error:", error);
        alert('Failed to save purchase. Please try again.');
    })
    .finally(() => {
        hideLoading();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPurchases();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPurchases();
    }
}

function closeModal() {
    elements.purchaseModal.style.display = 'none';
    elements.viewModal.style.display = 'none';
}

function showLoading() {
    elements.purchasesBody.innerHTML = `
        <tr>
            <td colspan="9" class="loading-spinner">
                <div class="spinner"></div>
                Loading purchases...
            </td>
        </tr>
    `;
}

function showError(message) {
    elements.purchasesBody.innerHTML = `
        <tr>
            <td colspan="9" class="error-message">
                ${message}
                <button onclick="loadPurchases()">Retry</button>
            </td>
        </tr>
    `;
}

// ===== End of purchases.js =====


// ===== Start of maintenance.js =====
// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let currentPeriod = 'weekly';
let maintenanceChart = null;
let allTransactions = [];
let filteredTransactions = [];
const API_URL = 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec'; // Replace with your deployed web app URL

// DOM Elements
const elements = {
    dateInput: document.getElementById('date'),
    maintenanceForm: document.getElementById('maintenance-form'),
    categorySelect: document.getElementById('category'),
    vendorSelect: document.getElementById('vendor'),
    descriptionInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    paymentMethodSelect: document.getElementById('payment-method'),
    notesTextarea: document.getElementById('notes'),
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateReportBtn: document.getElementById('generate-report'),
    totalSpent: document.getElementById('total-spent'),
    totalTransactions: document.getElementById('total-transactions'),
    topCategory: document.getElementById('top-category'),
    topCategoryAmount: document.getElementById('top-category-amount'),
    spentChange: document.getElementById('spent-change'),
    transactionsChange: document.getElementById('transactions-change'),
    maintenanceChart: document.getElementById('maintenance-chart'),
    filterCategory: document.getElementById('filter-category'),
    filterVendor: document.getElementById('filter-vendor'),
    filterStatus: document.getElementById('filter-status'),
    searchInput: document.getElementById('search-transactions'),
    searchBtn: document.getElementById('search-btn'),
    transactionsBody: document.getElementById('transactions-body'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    cancelEditBtn: document.getElementById('cancel-edit')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    elements.dateInput.value = today;
    
    // Load initial data
    loadCategories();
    loadVendors();
    loadTransactions();
    loadReport();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Form submission
    elements.maintenanceForm.addEventListener('submit', addMaintenanceRecord);
    
    // Report controls
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            loadReport();
        });
    });
    elements.generateReportBtn.addEventListener('click', loadReport);
    
    // Table controls
    elements.filterCategory.addEventListener('change', filterTransactions);
    elements.filterVendor.addEventListener('change', filterTransactions);
    elements.filterStatus.addEventListener('change', filterTransactions);
    elements.searchInput.addEventListener('input', filterTransactions);
    elements.searchBtn.addEventListener('click', filterTransactions);
    elements.prevBtn.addEventListener('click', goToPrevPage);
    elements.nextBtn.addEventListener('click', goToNextPage);
    
    // Modal controls
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.editForm.addEventListener('submit', updateMaintenanceRecord);
    document.querySelector('.close').addEventListener('click', closeEditModal);
    window.addEventListener('click', function(event) {
        if (event.target === elements.editModal) {
            closeEditModal();
        }
    });
}

// UI Helpers for loading and success messages
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSuccessMessage(message = 'Operation completed successfully!') {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        document.getElementById('success-modal').style.display = 'none';
    }, 3000);
}

// Setup success modal close button
document.getElementById('close-success-modal')?.addEventListener('click', function() {
    document.getElementById('success-modal').style.display = 'none';
});

// Load categories from backend
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}?action=getMaintenanceCategories`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Clear existing options
            elements.categorySelect.innerHTML = '<option value="">Select Category</option>';
            elements.filterCategory.innerHTML = '<option value="">All Categories</option>';
            
            // Add new options
            data.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.CategoryName;
                option.textContent = category.CategoryName;
                elements.categorySelect.appendChild(option.cloneNode(true));
                elements.filterCategory.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories. Please try again.');
    }
}

// Load vendors from backend
async function loadVendors() {
    try {
        const response = await fetch(`${API_URL}?action=getMaintenanceVendors`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Clear existing options
            elements.vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
            elements.filterVendor.innerHTML = '<option value="">All Vendors</option>';
            
            // Add new options
            data.data.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.VendorName;
                option.textContent = vendor.VendorName;
                elements.vendorSelect.appendChild(option.cloneNode(true));
                elements.filterVendor.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading vendors:', error);
        alert('Failed to load vendors. Please try again.');
    }
}

// Load transactions from backend
async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}?action=getMaintenance`);
        const data = await response.json();
        
        if (data.status === 'success') {
            allTransactions = data.data.map(t => ({
                ...t,
                Date: new Date(t.Date)
            }))
            // Sort transactions by date (newest first)
            .sort((a, b) => b.Date - a.Date);
            
            filteredTransactions = [...allTransactions];
            totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
            renderTransactions();
            updatePagination();
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transactions. Please try again.');
    }
}

// Filter transactions based on filters
function filterTransactions() {
    const categoryFilter = elements.filterCategory.value;
    const vendorFilter = elements.filterVendor.value;
    const statusFilter = elements.filterStatus.value;
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredTransactions = allTransactions.filter(transaction => {
        const matchesCategory = !categoryFilter || transaction.Category === categoryFilter;
        const matchesVendor = !vendorFilter || transaction.Vendor === vendorFilter;
        const matchesStatus = !statusFilter || transaction.Status === statusFilter;
        const matchesSearch = !searchTerm || 
            transaction.Description.toLowerCase().includes(searchTerm) ||
            transaction.TransactionID.toLowerCase().includes(searchTerm) ||
            (transaction.Notes && transaction.Notes.toLowerCase().includes(searchTerm));
        
        return matchesCategory && matchesVendor && matchesStatus && matchesSearch;
    })
    // Maintain sorting after filtering
    .sort((a, b) => b.Date - a.Date);
    
    currentPage = 1;
    totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
    renderTransactions();
    updatePagination();
}

// Render transactions table
function renderTransactions() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageTransactions = filteredTransactions.slice(startIdx, endIdx);
    
    let html = '';
    
    if (pageTransactions.length === 0) {
        html = '<tr><td colspan="8" class="no-results">No transactions found matching your criteria</td></tr>';
    } else {
        pageTransactions.forEach(transaction => {
            const date = transaction.Date.toLocaleDateString('en-IN');
            
            html += `
                <tr>
                    <td>${date}</td>
                    <td>${transaction.TransactionID}</td>
                    <td>${transaction.Category}</td>
                    <td>${transaction.Description}</td>
                    <td>${transaction.Vendor}</td>
                    <td>₹${transaction.Amount.toFixed(2)}</td>
                    <td><span class="status-badge ${transaction.Status.toLowerCase()}">${transaction.Status}</span></td>
                    <td class="actions">
                        <button class="edit-btn" data-id="${transaction.TransactionID}"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${transaction.TransactionID}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
    
    elements.transactionsBody.innerHTML = html;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
    });
}

// Add new maintenance record
async function addMaintenanceRecord(e) {
    e.preventDefault();
    showLoading();
    
    const record = {
    action: 'addMaintenance',
    date: elements.dateInput.value, // Add this line
    category: elements.categorySelect.value,
    description: elements.descriptionInput.value,
    vendor: elements.vendorSelect.value,
    amount: elements.amountInput.value,
    paymentMethod: elements.paymentMethodSelect.value,
    notes: elements.notesTextarea.value
};
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(record)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('Maintenance record added successfully!');
            elements.maintenanceForm.reset();
            loadTransactions();
            loadReport();
        } else {
            throw new Error(data.message || 'Failed to add record');
        }
    } catch (error) {
        console.error('Error adding maintenance record:', error);
        alert('Failed to add maintenance record. Please try again.');
    } finally {
        hideLoading();
    }
}

// Open edit modal with transaction data
async function openEditModal(transactionId) {
    const transaction = allTransactions.find(t => t.TransactionID === transactionId);
    if (!transaction) return;
    
    // Create form dynamically
    elements.editForm.innerHTML = `
        <input type="hidden" id="edit-id" value="${transaction.TransactionID}">
        <div class="form-row">
        <div class="form-group">
    <label for="edit-date">Date</label>
    <input type="date" id="edit-date" value="${transaction.Date.toISOString().split('T')[0]}" required>
</div>
            <div class="form-group">
                <label for="edit-category">Category</label>
                <select id="edit-category" required>
                    <option value="">Select Category</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-vendor">Vendor</label>
                <select id="edit-vendor" required>
                    <option value="">Select Vendor</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label for="edit-description">Description</label>
            <input type="text" id="edit-description" value="${transaction.Description}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="edit-amount">Amount (₹)</label>
                <input type="number" id="edit-amount" value="${transaction.Amount}" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label for="edit-payment-method">Payment Method</label>
                <select id="edit-payment-method" required>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label for="edit-status">Status</label>
            <select id="edit-status" required>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
            </select>
        </div>
        <div class="form-group">
            <label for="edit-notes">Notes</label>
            <textarea id="edit-notes" rows="3">${transaction.Notes || ''}</textarea>
        </div>
        <div class="form-actions">
            <button type="submit" class="save-btn"><i class="fas fa-save"></i> Save Changes</button>
            <button type="button" id="cancel-edit" class="cancel-btn"><i class="fas fa-times"></i> Cancel</button>
        </div>
    `;
    
    // Load categories and vendors for edit form
    await loadOptionsForEditForm();
    
    // Set selected values
    document.getElementById('edit-category').value = transaction.Category;
    document.getElementById('edit-vendor').value = transaction.Vendor;
    document.getElementById('edit-payment-method').value = transaction.PaymentMethod;
    document.getElementById('edit-status').value = transaction.Status;
    
    // Re-attach event listeners
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    // Show modal
    elements.editModal.style.display = 'block';
}

// Load options for edit form
async function loadOptionsForEditForm() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_URL}?action=getMaintenanceCategories`);
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesData.status === 'success') {
            const categorySelect = document.getElementById('edit-category');
            categoriesData.data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.CategoryName;
                option.textContent = category.CategoryName;
                categorySelect.appendChild(option);
            });
        }
        
        // Load vendors
        const vendorsResponse = await fetch(`${API_URL}?action=getMaintenanceVendors`);
        const vendorsData = await vendorsResponse.json();
        
        if (vendorsData.status === 'success') {
            const vendorSelect = document.getElementById('edit-vendor');
            vendorsData.data.forEach(vendor => {
                const option = document.createElement('option');
                option.value = vendor.VendorName;
                option.textContent = vendor.VendorName;
                vendorSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading options for edit form:', error);
    }
}

// Close edit modal
function closeEditModal() {
    elements.editModal.style.display = 'none';
}

// Update maintenance record
async function updateMaintenanceRecord(e) {
    e.preventDefault();
    showLoading();
    
    const transactionId = document.getElementById('edit-id').value;
    const updatedData = {
    action: 'updateMaintenance',
    id: transactionId,
    date: document.getElementById('edit-date').value, // Add this line
    category: document.getElementById('edit-category').value,
    vendor: document.getElementById('edit-vendor').value,
    description: document.getElementById('edit-description').value,
    amount: document.getElementById('edit-amount').value,
    paymentMethod: document.getElementById('edit-payment-method').value,
    status: document.getElementById('edit-status').value,
    notes: document.getElementById('edit-notes').value
};
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(updatedData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('Maintenance record updated successfully!');
            closeEditModal();
            loadTransactions();
            loadReport();
        } else {
            throw new Error(data.message || 'Failed to update record');
        }
    } catch (error) {
        console.error('Error updating maintenance record:', error);
        alert('Failed to update maintenance record. Please try again.');
    } finally {
        hideLoading();
    }
}

// Delete maintenance record
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}?action=deleteMaintenance&id=${transactionId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            showSuccessMessage('Maintenance record deleted successfully!');
            loadTransactions();
            loadReport();
        } else {
            throw new Error(data.message || 'Failed to delete record');
        }
    } catch (error) {
        console.error('Error deleting maintenance record:', error);
        alert('Failed to delete maintenance record. Please try again.');
    } finally {
        hideLoading();
    }
}

// Load report data
async function loadReport() {
    try {
        const selectedDate = elements.reportDate.value;
        const response = await fetch(`${API_URL}?action=getMaintenanceReports&period=${currentPeriod}&date=${selectedDate}`);
        const data = await response.json();
        
        console.log('Report API Response:', data); // Debug log
        
        if (data.status === 'success') {
            console.log('Summary Data:', data.data.summary); // Debug log
            console.log('Chart Data:', data.data.chartData); // Debug log
            
            if (data.data.summary) {
                updateSummaryCards(data.data.summary);
            } else {
                console.error('No summary data in response');
            }
            
            if (data.data.chartData) {
                renderChart(data.data.chartData);
            } else {
                console.error('No chart data in response');
            }
        } else {
            console.error('API Error:', data.message);
        }
    } catch (error) {
        console.error('Error loading report:', error);
        alert('Failed to load report data. Please try again.');
    }
}

// Update summary cards
function updateSummaryCards(summary) {
    // Ensure we have a valid summary object
    if (!summary) {
        console.error('No summary data provided');
        return;
    }

    // Safely handle numeric values
    const totalSpent = parseFloat(summary.totalSpent) || 0;
    const transactionCount = parseInt(summary.transactionCount) || 0;
    const topCategoryAmount = parseFloat(summary.topCategoryAmount) || 0;

    // Update the DOM elements
    elements.totalSpent.textContent = `₹${totalSpent.toFixed(2)}`;
    elements.totalTransactions.textContent = transactionCount;
    elements.topCategory.textContent = summary.topCategory || '-';
    elements.topCategoryAmount.textContent = topCategoryAmount ? `₹${topCategoryAmount.toFixed(2)}` : '-';
    
    // Handle percentage changes if provided
    if (summary.spentChange !== undefined) {
        elements.spentChange.textContent = `${summary.spentChange}%`;
    }
    if (summary.transactionsChange !== undefined) {
        elements.transactionsChange.textContent = `${summary.transactionsChange}%`;
    }
}

// Render chart
function renderChart(chartData) {
    if (maintenanceChart) {
        maintenanceChart.destroy();
    }
    
    const ctx = elements.maintenanceChart.getContext('2d');
    maintenanceChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            }
        }
    });
}

// Pagination functions
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTransactions();
        updatePagination();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderTransactions();
        updatePagination();
    }
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// ===== End of maintenance.js =====


// ===== Start of profit-loss.js =====
// Configuration
const SALES_API_URL = 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec';
const PURCHASES_API_URL = 'https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec';
const MAINTENANCE_API_URL = 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec';

let currentPeriod = 'monthly';
let profitLossChart = null;
let expenseChart = null;
let allSalesData = [];
let allPurchaseData = [];
let allMaintenanceData = [];

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.btn-period'),
    startDate: document.getElementById('start-date'),
    endDate: document.getElementById('end-date'),
    totalSales: document.getElementById('total-sales'),
    grossProfit: document.getElementById('gross-profit'),
    totalExpenses: document.getElementById('total-expenses'),
    netProfit: document.getElementById('net-profit'),
    breakdownBody: document.getElementById('breakdownBody'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    elements.startDate.value = firstDay.toISOString().split('T')[0];
    elements.endDate.value = today.toISOString().split('T')[0];
    
    // Load initial data
    loadAllData();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Period buttons
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            updateDateRangeByPeriod();
            loadAllData();
        });
    });
    
    // Date range changes
    elements.startDate.addEventListener('change', loadAllData);
    elements.endDate.addEventListener('change', loadAllData);
}

function updateDateRangeByPeriod() {
    const today = new Date();
    let startDate, endDate = today;
    
    switch(currentPeriod) {
        case 'monthly':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'quarterly':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            break;
        case 'yearly':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
    }
    
    elements.startDate.value = startDate.toISOString().split('T')[0];
    elements.endDate.value = endDate.toISOString().split('T')[0];
}

async function loadAllData() {
    showLoading();
    
    try {
        // Load data from all three sources in parallel
        const [salesData, purchaseData, maintenanceData] = await Promise.all([
            fetchSalesData(),
            fetchPurchaseData(),
            fetchMaintenanceData()
        ]);
        
        allSalesData = salesData;
        allPurchaseData = purchaseData;
        allMaintenanceData = maintenanceData;
        
        // Process and display the data
        processAndDisplayData();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please try again.');
    } finally {
        hideLoading();
    }
}

async function fetchSalesData() {
    const response = await fetch(SALES_API_URL);
    const data = await response.json();
    
    // Process sales data similar to transactions.js
    const transactionsMap = new Map();
    const startRow = data[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        const siNo = String(row[2] || "").trim();
        const date = parseDate(row[1]);
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                date: date,
                dateString: formatDateForDisplay(date),
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
    }
    
    return Array.from(transactionsMap.values());
}

async function fetchPurchaseData() {
    const response = await fetch(PURCHASES_API_URL);
    const data = await response.json();
    
    // Process purchase data similar to purchases.js
    return data.map(row => ({
        date: parseDate(row.date),
        totalAmount: parseFloat(row.totalamount) || 0,
        amountPaid: parseFloat(row.amountpaid) || 0,
        status: calculatePurchaseStatus(row.paymenttype, parseFloat(row.totalamount), parseFloat(row.amountpaid))
    }));
}

async function fetchMaintenanceData() {
    const response = await fetch(`${MAINTENANCE_API_URL}?action=getMaintenance`);
    const data = await response.json();
    
    if (data.status === 'success') {
        return data.data.map(item => ({
            date: new Date(item.Date),
            amount: parseFloat(item.Amount) || 0,
            category: item.Category,
            status: item.Status
        }));
    }
    return [];
}

function calculatePurchaseStatus(paymentType, totalAmount, amountPaid) {
    if (paymentType === 'spot') return 'paid';
    if (amountPaid >= totalAmount) return 'paid';
    if (amountPaid > 0) return 'partial';
    return 'pending';
}

function parseDate(dateValue) {
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'string') {
        // Try ISO format (YYYY-MM-DD)
        let date = new Date(dateValue);
        if (!isNaN(date.getTime())) return date;
        
        // Try DD/MM/YYYY format
        const dd_mm_yyyy = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dd_mm_yyyy) {
            return new Date(`${dd_mm_yyyy[3]}-${dd_mm_yyyy[2]}-${dd_mm_yyyy[1]}`);
        }
        
        // Try YYYY-MM-DD format (alternative)
        const yyyy_mm_dd = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (yyyy_mm_dd) {
            return new Date(`${yyyy_mm_dd[1]}-${yyyy_mm_dd[2]}-${yyyy_mm_dd[3]}`);
        }
    }
    
    console.warn("Could not parse date:", dateValue);
    return new Date();
}

function formatDateForDisplay(date) {
    try {
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch {
        return "Invalid Date";
    }
}

function processAndDisplayData() {
    const startDate = new Date(elements.startDate.value);
    const endDate = new Date(elements.endDate.value);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter data by date range
    const filteredSales = allSalesData.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
    });
    
    const filteredPurchases = allPurchaseData.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate >= startDate && purchaseDate <= endDate;
    });
    
    const filteredMaintenance = allMaintenanceData.filter(m => {
        const maintDate = new Date(m.date);
        return maintDate >= startDate && maintDate <= endDate;
    });
    
    // Calculate totals
    const totalSales = filteredSales.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalProfit = filteredSales.reduce((sum, t) => sum + t.totalProfit, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalMaintenance = filteredMaintenance.reduce((sum, m) => sum + m.amount, 0);
    
    // Calculate net profit (Profit - Expenses)
    const totalExpenses = totalPurchases + totalMaintenance;
    const netProfit = totalProfit - totalExpenses;
    
    // Update summary cards
    elements.totalSales.textContent = `₹${totalSales.toFixed(2)}`;
    elements.grossProfit.textContent = `₹${totalProfit.toFixed(2)}`;
    elements.totalExpenses.textContent = `₹${totalExpenses.toFixed(2)}`;
    elements.netProfit.textContent = `₹${netProfit.toFixed(2)}`;
    
    // Prepare data for charts
    prepareChartData(filteredSales, filteredPurchases, filteredMaintenance);
    
    // Prepare detailed breakdown
    prepareDetailedBreakdown(filteredSales, filteredPurchases, filteredMaintenance);
}

function prepareChartData(salesData, purchaseData, maintenanceData) {
    // Group data by time period based on currentPeriod
    const groupedData = groupDataByPeriod(salesData, purchaseData, maintenanceData);
    
    // Prepare Profit & Loss Chart
    renderProfitLossChart(groupedData);
    
    // Prepare Expense Breakdown Chart
    renderExpenseChart(purchaseData, maintenanceData);
}

function groupDataByPeriod(salesData, purchaseData, maintenanceData) {
    const startDate = new Date(elements.startDate.value);
    const endDate = new Date(elements.endDate.value);
    const groups = [];
    
    if (currentPeriod === 'monthly') {
        // Group by day
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const daySales = salesData.filter(s => 
                s.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, s) => sum + s.totalProfit, 0);
            
            const dayPurchases = purchaseData.filter(p => 
                p.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, p) => sum + p.totalAmount, 0);
            
            const dayMaintenance = maintenanceData.filter(m => 
                m.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, m) => sum + m.amount, 0);
            
            groups.push({
                label: currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                sales: daySales,
                profit: daySales,
                purchases: dayPurchases,
                maintenance: dayMaintenance,
                expenses: dayPurchases + dayMaintenance,
                net: daySales - (dayPurchases + dayMaintenance)
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else if (currentPeriod === 'quarterly') {
        // Group by week
        const currentDate = new Date(startDate);
        let weekStart = new Date(currentDate);
        
        while (currentDate <= endDate) {
            // Check if we've reached Sunday or end date
            if (currentDate.getDay() === 0 || currentDate >= endDate) {
                const weekEnd = new Date(currentDate);
                const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
                
                const weekSales = salesData.filter(s => 
                    s.date >= weekStart && s.date <= weekEnd
                ).reduce((sum, s) => sum + s.totalProfit, 0);
                
                const weekPurchases = purchaseData.filter(p => 
                    p.date >= weekStart && p.date <= weekEnd
                ).reduce((sum, p) => sum + p.totalAmount, 0);
                
                const weekMaintenance = maintenanceData.filter(m => 
                    m.date >= weekStart && m.date <= weekEnd
                ).reduce((sum, m) => sum + m.amount, 0);
                
                groups.push({
                    label: weekLabel,
                    sales: weekSales,
                    profit: weekSales,
                    purchases: weekPurchases,
                    maintenance: weekMaintenance,
                    expenses: weekPurchases + weekMaintenance,
                    net: weekSales - (weekPurchases + weekMaintenance)
                });
                
                weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() + 1);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else {
        // Group by month
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        
        while (currentDate <= endDate) {
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const monthLabel = currentDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            
            const monthSales = salesData.filter(s => 
                s.date >= currentDate && s.date <= monthEnd
            ).reduce((sum, s) => sum + s.totalProfit, 0);
            
            const monthPurchases = purchaseData.filter(p => 
                p.date >= currentDate && p.date <= monthEnd
            ).reduce((sum, p) => sum + p.totalAmount, 0);
            
            const monthMaintenance = maintenanceData.filter(m => 
                m.date >= currentDate && m.date <= monthEnd
            ).reduce((sum, m) => sum + m.amount, 0);
            
            groups.push({
                label: monthLabel,
                sales: monthSales,
                profit: monthSales,
                purchases: monthPurchases,
                maintenance: monthMaintenance,
                expenses: monthPurchases + monthMaintenance,
                net: monthSales - (monthPurchases + monthMaintenance)
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }
    
    return groups;
}

function renderProfitLossChart(groupedData) {
    const ctx = document.getElementById('profitLossChart').getContext('2d');
    const labels = groupedData.map(g => g.label);
    const profitData = groupedData.map(g => g.profit);
    const expenseData = groupedData.map(g => g.expenses);
    const netData = groupedData.map(g => g.net);
    
    if (profitLossChart) {
        profitLossChart.destroy();
    }
    
    profitLossChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gross Profit',
                    data: profitData,
                    borderColor: '#1cc88a',
                    backgroundColor: 'rgba(28, 200, 138, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Total Expenses',
                    data: expenseData,
                    borderColor: '#e74a3b',
                    backgroundColor: 'rgba(231, 74, 59, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Net Profit',
                    data: netData,
                    borderColor: '#f6c23e',
                    backgroundColor: 'rgba(246, 194, 62, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

function renderExpenseChart(purchaseData, maintenanceData) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Group maintenance by category
    const maintenanceByCategory = {};
    maintenanceData.forEach(m => {
        if (!maintenanceByCategory[m.category]) {
            maintenanceByCategory[m.category] = 0;
        }
        maintenanceByCategory[m.category] += m.amount;
    });
    
    const purchaseTotal = purchaseData.reduce((sum, p) => sum + p.totalAmount, 0);
    const maintenanceTotal = maintenanceData.reduce((sum, m) => sum + m.amount, 0);
    
    const labels = ['Purchases', ...Object.keys(maintenanceByCategory)];
    const data = [purchaseTotal, ...Object.values(maintenanceByCategory)];
    const backgroundColors = [
        '#4e73df', // Purchases
        '#1cc88a', // Maintenance categories
        '#36b9cc',
        '#f6c23e',
        '#e74a3b',
        '#858796'
    ];
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                hoverBackgroundColor: backgroundColors.map(c => c + 'cc'),
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'right',
                }
            },
            cutout: '70%',
        },
    });
}

function prepareDetailedBreakdown(salesData, purchaseData, maintenanceData) {
    const totalSales = salesData.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = salesData.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalPurchases = purchaseData.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalMaintenance = maintenanceData.reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = totalPurchases + totalMaintenance;
    const netProfit = totalProfit - totalExpenses;
    
    // Group maintenance by category
    const maintenanceByCategory = {};
    maintenanceData.forEach(m => {
        if (!maintenanceByCategory[m.category]) {
            maintenanceByCategory[m.category] = 0;
        }
        maintenanceByCategory[m.category] += m.amount;
    });
    
    let html = '';
    
    // Sales section
    html += `
        <tr>
            <td><strong>Total Sales</strong></td>
            <td><strong>₹${totalSales.toFixed(2)}</strong></td>
            <td>100%</td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
        <tr>
            <td>Cost of Goods Sold</td>
            <td>₹${(totalSales - totalProfit).toFixed(2)}</td>
            <td>${((totalSales - totalProfit) / totalSales * 100).toFixed(1)}%</td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
        <tr>
            <td><strong>Gross Profit</strong></td>
            <td><strong>₹${totalProfit.toFixed(2)}</strong></td>
            <td><strong>${(totalProfit / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
        <tr class="table-secondary">
            <td colspan="4"><strong>Expenses</strong></td>
        </tr>
        <tr>
            <td>Inventory Purchases</td>
            <td>₹${totalPurchases.toFixed(2)}</td>
            <td>${(totalPurchases / totalExpenses * 100).toFixed(1)}%</td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
    `;
    
    // Maintenance categories
    for (const [category, amount] of Object.entries(maintenanceByCategory)) {
        html += `
            <tr>
                <td>${category} Maintenance</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>${(amount / totalExpenses * 100).toFixed(1)}%</td>
                <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
            </tr>
        `;
    }
    
    // Totals
    html += `
        <tr>
            <td><strong>Total Expenses</strong></td>
            <td><strong>₹${totalExpenses.toFixed(2)}</strong></td>
            <td><strong>${(totalExpenses / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
        <tr class="table-primary">
            <td><strong>Net Profit</strong></td>
            <td><strong>₹${netProfit.toFixed(2)}</strong></td>
            <td><strong>${(netProfit / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
    `;
    
    elements.breakdownBody.innerHTML = html;
}

function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
            }

// ===== End of profit-loss.js =====


// ===== Start of reports.js =====
// ======================
// UTILITY FUNCTIONS
// ======================

function processSheetData(sheetData) {
    const transactionsMap = new Map();
    
    // Skip header row if it exists
    const startRow = sheetData[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        const siNo = String(row[2]);
        const date = parseDate(row[1]);
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                storeName: row[0],
                date: date,
                dateString: formatDateForDisplay(date),
                siNo: siNo,
                customerName: String(row[3]),
                items: [],
                paymentMode: row[8],
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
        
        transactionsMap.get(siNo).items.push({
            itemName: String(row[4]),
            quantity: parseFloat(row[5]) || 0,
            purchasePrice: parseFloat(row[6]) || 0,
            salePrice: parseFloat(row[7]) || 0,
            itemTotal: (parseFloat(row[5]) || 0) * (parseFloat(row[7]) || 0)
        });
    }
    
    return Array.from(transactionsMap.values());
}

function parseDate(dateValue) {
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'string') {
        // Try ISO format (YYYY-MM-DD)
        let date = new Date(dateValue);
        if (!isNaN(date.getTime())) return date;
        
        // Try DD/MM/YYYY format
        const dd_mm_yyyy = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dd_mm_yyyy) {
            return new Date(`${dd_mm_yyyy[3]}-${dd_mm_yyyy[2]}-${dd_mm_yyyy[1]}`);
        }
        
        // Try YYYY-MM-DD format (alternative)
        const yyyy_mm_dd = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (yyyy_mm_dd) {
            return new Date(`${yyyy_mm_dd[1]}-${yyyy_mm_dd[2]}-${yyyy_mm_dd[3]}`);
        }
    }
    
    console.warn("Could not parse date:", dateValue);
    return new Date();
}

function formatDateForDisplay(date) {
    try {
        return date.toLocaleDateString('en-IN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch {
        return "Invalid Date";
    }
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

// ======================
// REPORTS FUNCTIONS
// ======================

// Reports Configuration
let currentPeriod = 'daily';
let currentDate = new Date();
let salesChart = null;

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateBtn: document.getElementById('generate-report'),
    totalSales: document.getElementById('total-sales'),
    totalProfit: document.getElementById('total-profit'),
    totalTransactions: document.getElementById('total-transactions'),
    salesChart: document.getElementById('sales-chart'),
    paymentFilter: document.getElementById('payment-filter'),
    searchInput: document.getElementById('search-transactions'),
    reportData: document.getElementById('report-data')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    
    // Load initial report
    loadReport();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Period buttons
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            loadReport();
        });
    });
    
    // Generate report button
    elements.generateBtn.addEventListener('click', loadReport);
    
    // Filters
    elements.paymentFilter.addEventListener('change', filterTransactions);
    elements.searchInput.addEventListener('input', filterTransactions);
}

function updateSummaryCards(summary) {
    elements.totalSales.textContent = `₹${summary.totalSales.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    elements.totalProfit.textContent = `₹${summary.totalProfit.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    elements.totalTransactions.textContent = summary.transactionCount.toLocaleString('en-IN');
    
    updateChangeIndicator(
        elements.totalSales.parentElement.querySelector('.change'), 
        summary.salesChange
    );
    updateChangeIndicator(
        elements.totalProfit.parentElement.querySelector('.change'), 
        summary.profitChange
    );
}

function updateChangeIndicator(element, change) {
    if (change > 0) {
        element.className = 'change positive';
        element.innerHTML = `<i class="fas fa-arrow-up"></i> ${Math.abs(change)}%`;
    } else if (change < 0) {
        element.className = 'change negative';
        element.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(change)}%`;
    } else {
        element.className = 'change neutral';
        element.innerHTML = '-';
    }
}

let reportData = []; // Store the current report data at module level

async function loadReport() {
    try {
        showLoading();
        const selectedDate = elements.reportDate.value;
        const transactions = await fetchTransactions(selectedDate, currentPeriod);
        
        // Process data and store it
        reportData = groupByPeriod(transactions, currentPeriod);
        const chartData = prepareChartData(reportData, currentPeriod);
        
        updateSummaryCards(calculateSummary(reportData));
        renderChart(chartData);
        renderTransactionsTable(reportData.flatMap(g => g.transactions));
        
    } catch (error) {
        console.error('Error loading report:', error);
        alert('Failed to load report data. Please try again.');
    }
}

async function fetchTransactions(date, period) {
    // This should be replaced with your actual API call
    // For now, we'll use mock data
    const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec";
    const response = await fetch(scriptUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return processSheetData(data); // Reuse your existing function
}

function processReportData(transactions, period) {
    // Group transactions by period
    const grouped = groupByPeriod(transactions, period);
    
    // Calculate summary
    const summary = calculateSummary(grouped);
    
    // Prepare chart data
    const chartData = prepareChartData(grouped, period);
    
    return {
        summary,
        chartData,
        transactions: grouped.flatMap(group => group.transactions)
    };
}

function groupByPeriod(transactions, period) {
    const groupsMap = new Map();

    transactions.forEach(transaction => {
        // Parse the date and validate it
        let date = new Date(transaction.date);
        if (isNaN(date.getTime())) {
            console.warn("Invalid date in transaction:", transaction.date);
            date = new Date(); // Fallback to current date
        }

        // Create appropriate period key based on selected period
        let periodKey, periodStart, periodEnd;
        
        switch(period) {
            case 'daily':
                periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                periodStart = new Date(date.setHours(0, 0, 0, 0));
                periodEnd = new Date(date.setHours(23, 59, 59, 999));
                break;
                
            case 'weekly':
                const weekStart = getWeekStartDate(date);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                periodKey = `Week ${getWeekNumber(date)} (${weekStart.toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short' 
                })} - ${weekEnd.toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short' 
                })})`;
                periodStart = weekStart;
                periodEnd = weekEnd;
                break;
                
            case 'monthly':
                periodKey = date.toLocaleDateString('en-IN', { 
                    month: 'long', 
                    year: 'numeric' 
                });
                periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
                periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                break;
                
            case 'yearly':
                periodKey = date.getFullYear().toString();
                periodStart = new Date(date.getFullYear(), 0, 1);
                periodEnd = new Date(date.getFullYear(), 11, 31);
                break;
        }

        if (!groupsMap.has(periodKey)) {
            groupsMap.set(periodKey, {
                periodKey,
                periodStart,
                periodEnd,
                transactions: [],
                totalSales: 0,
                totalProfit: 0
            });
        }

        const group = groupsMap.get(periodKey);
        group.transactions.push(transaction);
        group.totalSales += transaction.totalAmount;
        group.totalProfit += transaction.totalProfit;
    });

    // Sort groups by period start date
    return Array.from(groupsMap.values()).sort((a, b) => a.periodStart - b.periodStart);
}

// Helper function to get start of week (Sunday)
function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

function calculateSummary(groups) {
    let totalSales = 0;
    let totalProfit = 0;
    let transactionCount = 0;
    
    groups.forEach(group => {
        totalSales += group.totalSales;
        totalProfit += group.totalProfit;
        transactionCount += group.transactions.length;
    });
    
    // Calculate percentage changes (you would compare with previous period)
    const salesChange = 0; // Calculate based on previous period
    const profitChange = 0; // Calculate based on previous period
    
    return {
        totalSales,
        totalProfit,
        transactionCount,
        salesChange,
        profitChange
    };
}

function prepareChartData(groups, period) {
    const labels = [];
    const salesData = [];
    const profitData = [];
    
    groups.forEach(group => {
        // Format label based on period
        let label;
        switch(period) {
            case 'daily':
                label = group.periodStart.toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short' 
                });
                break;
                
            case 'weekly':
                label = `Week ${getWeekNumber(group.periodStart)}`;
                break;
                
            case 'monthly':
                label = group.periodStart.toLocaleDateString('en-IN', { 
                    month: 'short' 
                });
                break;
                
            case 'yearly':
                label = group.periodStart.getFullYear().toString();
                break;
        }
        
        labels.push(label);
        salesData.push(group.totalSales);
        profitData.push(group.totalProfit);
    });
    
    return {
        labels,
        datasets: [
            {
                label: 'Sales',
                data: salesData,
                backgroundColor: 'rgba(74, 107, 255, 0.5)',
                borderColor: 'rgba(74, 107, 255, 1)',
                borderWidth: 1
            },
            {
                label: 'Profit',
                data: profitData,
                backgroundColor: 'rgba(0, 184, 148, 0.5)',
                borderColor: 'rgba(0, 184, 148, 1)',
                borderWidth: 1
            }
        ]
    };
}

function renderChart(chartData) {
    if (salesChart) {
        salesChart.destroy();
    }
    
    const ctx = elements.salesChart.getContext('2d');
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: getPeriodLabel(currentPeriod)
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Amount (₹)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return getTooltipTitle(context, currentPeriod);
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`;
                        }
                    }
                }
            }
        }
    });
}

function getPeriodLabel(period) {
    switch(period) {
        case 'daily': return 'Days';
        case 'weekly': return 'Weeks';
        case 'monthly': return 'Months';
        case 'yearly': return 'Years';
        default: return 'Period';
    }
}

function getTooltipTitle(context, period) {
    const index = context[0].dataIndex;
    const group = reportData[index]; // Assuming reportData is accessible
    
    switch(period) {
        case 'daily':
            return group.periodStart.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            
        case 'weekly':
            return `Week ${getWeekNumber(group.periodStart)} (${group.periodStart.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })} - ${group.periodEnd.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })})`;
            
        case 'monthly':
            return group.periodStart.toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });
            
        case 'yearly':
            return group.periodStart.getFullYear().toString();
            
        default:
            return group.periodKey;
    }
}

function renderTransactionsTable(transactions) {
    let html = '';
    
    transactions.forEach(transaction => {
        html += `
            <tr>
                <td>${transaction.siNo}</td>
                <td>${transaction.dateString}</td>
                <td>${transaction.customerName}</td>
                <td>₹${transaction.totalAmount.toFixed(2)}</td>
                <td>₹${transaction.totalProfit.toFixed(2)}</td>
                <td>${transaction.paymentMode}</td>
            </tr>
        `;
    });
    
    elements.reportData.innerHTML = html || '<tr><td colspan="6">No transactions found</td></tr>';
}

function filterTransactions() {
    const paymentFilter = elements.paymentFilter.value.toLowerCase();
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    const rows = elements.reportData.querySelectorAll('tr');
    
    rows.forEach(row => {
        const payment = row.cells[5].textContent.toLowerCase();
        const rowText = row.textContent.toLowerCase();
        
        const paymentMatch = !paymentFilter || payment.includes(paymentFilter);
        const searchMatch = !searchTerm || rowText.includes(searchTerm);
        
        row.style.display = paymentMatch && searchMatch ? '' : 'none';
    });
}

function showLoading() {
    elements.reportData.innerHTML = `
        <tr>
            <td colspan="6" class="loading-spinner">
                <div class="spinner"></div>
                Loading report data...
            </td>
        </tr>
    `;
}

// Helper functions
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// ===== End of reports.js =====
