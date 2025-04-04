// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allTransactions = [];
let filteredTransactions = [];
const API_URL = 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec';


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
    editModal: document.getElementById("edit-modal"),
    editForm: document.getElementById("edit-form"),
    cancelEditBtn: document.getElementById("cancel-edit")
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

     // Modal controls
    elements.cancelEditBtn?.addEventListener("click", closeEditModal);
    elements.editForm?.addEventListener("submit", updateTransaction);
    document.querySelector('.close')?.addEventListener("click", closeEditModal);
    window.addEventListener("click", function(event) {
        if (event.target === elements.editModal) {
            closeEditModal();
        }
    });
    document.getElementById("close-success-modal")?.addEventListener("click", function() {
        document.getElementById("success-modal").style.display = "none";
    });
}

function updateSummaryCards() {
    if (allTransactions.length === 0) {
        // Reset to zero if no transactions
        elements.todaySales.textContent = '₹0.00';
        elements.todayProfit.textContent = '₹0.00';
        elements.todayTransactions.textContent = '0';
        elements.dailyAverage.textContent = '₹0.00';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's date in the same format used in the table
    const todayString = formatDateForDisplay(today);
    
    // Filter today's transactions - compare dates as Date objects
    const todayData = allTransactions.filter(t => {
        const transDate = new Date(t.date);
        transDate.setHours(0, 0, 0, 0);
        return transDate.getTime() === today.getTime();
    });

    // Calculate today's totals
    const todaySales = todayData.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const todayProfit = todayData.reduce((sum, t) => sum + parseFloat(t.totalProfit || 0), 0);
    const todayTransactionCount = todayData.length;

    // Update today's cards
    elements.todaySales.textContent = `₹${todaySales.toFixed(2)}`;
    elements.todayProfit.textContent = `₹${todayProfit.toFixed(2)}`;
    elements.todayTransactions.textContent = todayTransactionCount;

    // Calculate 7-day average
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today + 6 previous days
    
    const last7DaysData = allTransactions.filter(t => {
        const transDate = new Date(t.date);
        transDate.setHours(0, 0, 0, 0);
        return transDate >= sevenDaysAgo && transDate <= today;
    });
    
    const sevenDayTotal = last7DaysData.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
    const dailyAvg = sevenDayTotal / 7;
    elements.dailyAverage.textContent = `₹${dailyAvg.toFixed(2)}`;
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

async function editTransaction(e) {
    const siNo = e.currentTarget.getAttribute("data-si-no");
    const transaction = allTransactions.find(t => t.siNo === siNo);
    
    if (!transaction) return;
    
    showLoading();
    
    try {
        // Create edit form
        elements.editForm.innerHTML = `
            <input type="hidden" id="edit-si-no" value="${transaction.siNo}">
            <div class="form-group">
                <label for="edit-customer-name">Customer Name</label>
                <input type="text" id="edit-customer-name" value="${transaction.customerName}" required>
            </div>
            
            <div class="form-group">
                <label for="edit-payment-mode">Payment Mode</label>
                <select id="edit-payment-mode" required>
                    <option value="Cash" ${transaction.paymentMode === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Card" ${transaction.paymentMode === 'Card' ? 'selected' : ''}>Card</option>
                    <option value="UPI" ${transaction.paymentMode === 'UPI' ? 'selected' : ''}>UPI</option>
                </select>
            </div>
            
            <h3>Items:</h3>
            <div id="edit-items-container">
                ${transaction.items.map((item, index) => `
                    <div class="edit-item-row" data-index="${index}">
                        <input type="text" class="edit-item-name" value="${item.itemName}" placeholder="Item name" required>
                        <input type="number" class="edit-item-qty" value="${item.quantity}" min="1" placeholder="Qty" required>
                        <input type="number" class="edit-item-purchase" value="${item.purchasePrice}" min="0" step="0.01" placeholder="Purchase price" required>
                        <input type="number" class="edit-item-sale" value="${item.salePrice}" min="0" step="0.01" placeholder="Sale price" required>
                        <button type="button" class="remove-edit-item"><i class="fas fa-times"></i></button>
                    </div>
                `).join('')}
            </div>
            
            <button type="button" id="add-edit-item" class="btn-secondary"><i class="fas fa-plus"></i> Add Item</button>
        `;
        
        // Add event listeners for edit form
        document.getElementById("add-edit-item").addEventListener("click", addEditItem);
        document.querySelectorAll(".remove-edit-item").forEach(btn => {
            btn.addEventListener("click", function() {
                this.parentElement.remove();
            });
        });
        
        // Show modal
        elements.editModal.style.display = 'block';
    } catch (error) {
        console.error('Error opening edit modal:', error);
        alert('Failed to load transaction for editing. Please try again.');
    } finally {
        hideLoading();
    }
}

// Add function to add items in edit mode
function addEditItem() {
    const container = document.getElementById("edit-items-container");
    const newItem = document.createElement("div");
    newItem.className = "edit-item-row";
    newItem.innerHTML = `
        <input type="text" class="edit-item-name" placeholder="Item name" required>
        <input type="number" class="edit-item-qty" value="1" min="1" placeholder="Qty" required>
        <input type="number" class="edit-item-purchase" min="0" step="0.01" placeholder="Purchase price" required>
        <input type="number" class="edit-item-sale" min="0" step="0.01" placeholder="Sale price" required>
        <button type="button" class="remove-edit-item"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(newItem);
    
    newItem.querySelector(".remove-edit-item").addEventListener("click", function() {
        newItem.remove();
    });
}

// Add function to update transaction
async function updateTransaction(e) {
    e.preventDefault();
    showLoading();
    
    const siNo = document.getElementById('edit-si-no').value;
    const customerName = document.getElementById('edit-customer-name').value;
    const paymentMode = document.getElementById('edit-payment-mode').value;
    
    // Collect items
    const items = [];
    document.querySelectorAll('.edit-item-row').forEach(row => {
        items.push({
            itemName: row.querySelector('.edit-item-name').value,
            quantity: parseFloat(row.querySelector('.edit-item-qty').value),
            purchasePrice: parseFloat(row.querySelector('.edit-item-purchase').value),
            salePrice: parseFloat(row.querySelector('.edit-item-sale').value)
        });
    });
    
    // Calculate totals
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.salePrice), 0);
    const totalProfit = items.reduce((sum, item) => sum + (item.quantity * (item.salePrice - item.purchasePrice)), 0);
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update',
                siNo: siNo,
                customerName: customerName,
                paymentMode: paymentMode,
                items: items,
                totalAmount: totalAmount,
                totalProfit: totalProfit
            })
        });
        
        if (response.ok) {
            showSuccessMessage('Transaction updated successfully!');
            closeEditModal();
            loadTransactions();
        } else {
            throw new Error('Failed to update transaction');
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Failed to update transaction. Please try again.');
    } finally {
        hideLoading();
    }
}

// Add function to delete transaction
async function deleteTransaction(e) {
    const siNo = e.currentTarget.getAttribute("data-si-no");
    
    if (!confirm(`Are you sure you want to delete transaction ${siNo}? This cannot be undone.`)) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}?action=delete&siNo=${encodeURIComponent(siNo)}`, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        if (response.ok) {
            showSuccessMessage('Transaction deleted successfully!');
            // Remove from local data and refresh
            allTransactions = allTransactions.filter(t => t.siNo !== siNo);
            filterTransactions();
        } else {
            throw new Error('Failed to delete transaction');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction. Please try again.');
    } finally {
        hideLoading();
    }
}

// Add function to close edit modal
function closeEditModal() {
    elements.editModal.style.display = 'none';
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
            <button class="view-btn" data-si-no="${transaction.siNo}"><i class="fas fa-eye"></i></button>
            <button class="edit-btn" data-si-no="${transaction.siNo}"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-si-no="${transaction.siNo}"><i class="fas fa-trash"></i></button> 
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
