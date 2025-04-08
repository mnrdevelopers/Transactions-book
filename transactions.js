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
