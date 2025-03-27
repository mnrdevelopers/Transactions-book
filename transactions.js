// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allTransactions = [];
let filteredTransactions = [];

// DOM Elements
const elements = {
    searchInput: document.getElementById("search-input"),
    searchBtn: document.getElementById("search-btn"),
    dateFilter: document.getElementById("date-filter"),
    paymentFilter: document.getElementById("payment-filter"),
    transactionsBody: document.getElementById("transactions-body"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    pageInfo: document.getElementById("page-info"),
    viewModal: document.getElementById("view-modal"),
    transactionDetails: document.getElementById("transaction-details")
};

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-theme');
    }
    
    loadTransactions();
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
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
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
        updateDateFilter();
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
                maintenanceItems: [],
                paymentMode: row[8],
                totalAmount: parseFloat(row[9]) || 0,
                grossProfit: parseFloat(row[10]) || 0,
                maintenanceTotal: parseFloat(row[12]) || 0,
                netProfit: parseFloat(row[14]) || 0
            });
            
            // Add maintenance items if they exist
            if (row[11] && row[12] > 0) {
                transactionsMap.get(siNo).maintenanceItems.push({
                    category: row[11],
                    amount: parseFloat(row[12]) || 0,
                    notes: row[13] || ""
                });
            }
        }
        
        // Add item to transaction
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
        let date = new Date(dateValue);
        if (!isNaN(date)) return date;
        date = new Date(dateValue.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
        if (!isNaN(date)) return date;
        date = new Date(dateValue.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'));
        if (!isNaN(date)) return date;
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
        const siNo = String(transaction.siNo || "").toLowerCase();
        const customerName = String(transaction.customerName || "").toLowerCase();
        
        const matchesSearch = 
            siNo.includes(searchTerm) ||
            customerName.includes(searchTerm) ||
            transaction.items.some(item => 
                String(item.itemName || "").toLowerCase().includes(searchTerm)
            );
        
        const matchesDate = dateFilter === "" || transaction.dateString === dateFilter;
        const matchesPayment = paymentFilter === "" || transaction.paymentMode === paymentFilter;
        
        return matchesSearch && matchesDate && matchesPayment;
    });
    
    totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
    currentPage = 1;
    renderTransactions();
}

function renderTransactions() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageTransactions = filteredTransactions.slice(startIdx, endIdx);
    
    elements.transactionsBody.innerHTML = "";
    
    if (pageTransactions.length === 0) {
        elements.transactionsBody.innerHTML = `
            <tr>
                <td colspan="10" class="no-results">
                    No transactions found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    const groupedTransactions = groupByDate(pageTransactions);
    let currentDateHeader = null;
    
    groupedTransactions.forEach(transaction => {
        if (transaction.dateString !== currentDateHeader) {
            currentDateHeader = transaction.dateString;
            const dateHeader = document.createElement("tr");
            dateHeader.className = "date-header";
            dateHeader.innerHTML = `
                <td colspan="10">
                    <strong>${getDateHeaderText(transaction.date)}</strong>
                </td>
            `;
            elements.transactionsBody.appendChild(dateHeader);
        }
        
        const itemCount = transaction.items.length;
        const itemsSummary = itemCount === 1 
            ? transaction.items[0].itemName 
            : `${itemCount} items`;
        
        const maintenanceCount = transaction.maintenanceItems.length;
        const maintenanceSummary = maintenanceCount > 0 
            ? `${maintenanceCount} maintenance items` 
            : "None";
        
        const row = document.createElement("tr");
        row.className = "transaction-row";
        row.innerHTML = `
            <td>${transaction.siNo}</td>
            <td>${transaction.dateString}</td>
            <td>${transaction.customerName}</td>
            <td>${itemsSummary}</td>
            <td>₹${transaction.totalAmount.toFixed(2)}</td>
            <td>₹${transaction.grossProfit.toFixed(2)}</td>
            <td>₹${transaction.maintenanceTotal.toFixed(2)}</td>
            <td>₹${transaction.netProfit.toFixed(2)}</td>
            <td>${transaction.paymentMode}</td>
            <td class="actions">
                <button class="view-btn" data-si-no="${transaction.siNo}">View</button>
            </td>
        `;
        elements.transactionsBody.appendChild(row);
    });
    
    updatePagination();
    setupRowEventListeners();
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
    
    // Format maintenance details if any
    let maintenanceHtml = "";
    if (transaction.maintenanceItems.length > 0) {
        maintenanceHtml = `
            <div class="maintenance-details">
                <h3>Maintenance</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transaction.maintenanceItems.map(item => `
                            <tr>
                                <td>${item.category}</td>
                                <td>₹${item.amount.toFixed(2)}</td>
                                <td>${item.notes || '-'}</td>
                            </tr>
                        `).join("")}
                        <tr>
                            <td><strong>Total</strong></td>
                            <td><strong>₹${transaction.maintenanceTotal.toFixed(2)}</strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
    
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
        
        ${maintenanceHtml}
        
        <div class="transaction-totals">
            <p><strong>Total Amount:</strong> ₹${transaction.totalAmount.toFixed(2)}</p>
            <p><strong>Gross Profit:</strong> ₹${transaction.grossProfit.toFixed(2)}</p>
            ${transaction.maintenanceItems.length > 0 ? 
              `<p><strong>Total Maintenance:</strong> ₹${transaction.maintenanceTotal.toFixed(2)}</p>` : ''}
            <p><strong>Net Profit:</strong> ₹${transaction.netProfit.toFixed(2)}</p>
        </div>
    `;
    
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
            <td colspan="10" class="loading-spinner">
                <div class="spinner"></div>
                Loading transactions...
            </td>
        </tr>
    `;
}

function showError(message) {
    elements.transactionsBody.innerHTML = `
        <tr>
            <td colspan="10" class="error-message">
                ${message}
                <button onclick="loadTransactions()">Retry</button>
            </td>
        </tr>
    `;
}
