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
    // Form elements
    maintenanceForm: document.getElementById('maintenance-form'),
    categorySelect: document.getElementById('category'),
    vendorSelect: document.getElementById('vendor'),
    descriptionInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    paymentMethodSelect: document.getElementById('payment-method'),
    notesTextarea: document.getElementById('notes'),
    
    // Report elements
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
    
    // Table elements
    filterCategory: document.getElementById('filter-category'),
    filterVendor: document.getElementById('filter-vendor'),
    filterStatus: document.getElementById('filter-status'),
    searchInput: document.getElementById('search-transactions'),
    searchBtn: document.getElementById('search-btn'),
    transactionsBody: document.getElementById('transactions-body'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    
    // Modal elements
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-form'),
    cancelEditBtn: document.getElementById('cancel-edit')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    
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

// Load categories from backend
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}?action=getCategories`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Populate category dropdowns
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
        const response = await fetch(`${API_URL}?action=getVendors`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Populate vendor dropdowns
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
        showLoading();
        
        const response = await fetch(`${API_URL}?action=getTransactions`);
        const data = await response.json();
        
        if (data.status === 'success') {
            allTransactions = data.data;
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
            transaction.Notes.toLowerCase().includes(searchTerm);
        
        return matchesCategory && matchesVendor && matchesStatus && matchesSearch;
    });
    
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
            const date = new Date(transaction.Date).toLocaleDateString('en-IN');
            
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
    
    const record = {
        category: elements.categorySelect.value,
        description: elements.descriptionInput.value,
        vendor: elements.vendorSelect.value,
        amount: elements.amountInput.value,
        paymentMethod: elements.paymentMethodSelect.value,
        notes: elements.notesTextarea.value
    };
    
    try {
        const response = await fetch(`${API_URL}?action=addTransaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(record)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Maintenance record added successfully!');
            elements.maintenanceForm.reset();
            loadTransactions();
            loadReport();
        } else {
            throw new Error(data.message || 'Failed to add record');
        }
    } catch (error) {
        console.error('Error adding maintenance record:', error);
        alert('Failed to add maintenance record. Please try again.');
    }
}

// Open edit modal with transaction data
function openEditModal(transactionId) {
    const transaction = allTransactions.find(t => t.TransactionID === transactionId);
    if (!transaction) return;
    
    // Fill form with transaction data
    document.getElementById('edit-id').value = transaction.TransactionID;
    document.getElementById('edit-category').value = transaction.Category;
    document.getElementById('edit-vendor').value = transaction.Vendor;
    document.getElementById('edit-description').value = transaction.Description;
    document.getElementById('edit-amount').value = transaction.Amount;
    document.getElementById('edit-payment-method').value = transaction.PaymentMethod;
    document.getElementById('edit-status').value = transaction.Status;
    document.getElementById('edit-notes').value = transaction.Notes;
    
    // Show modal
    elements.editModal.style.display = 'block';
}

// Close edit modal
function closeEditModal() {
    elements.editModal.style.display = 'none';
}

// Update maintenance record
async function updateMaintenanceRecord(e) {
    e.preventDefault();
    
    const transactionId = document.getElementById('edit-id').value;
    const updatedData = {
        category: document.getElementById('edit-category').value,
        vendor: document.getElementById('edit-vendor').value,
        description: document.getElementById('edit-description').value,
        amount: document.getElementById('edit-amount').value,
        paymentMethod: document.getElementById('edit-payment-method').value,
        status: document.getElementById('edit-status').value,
        notes: document.getElementById('edit-notes').value
    };
    
    try {
        // In a real implementation, you would call your API to update the record
        // For now, we'll update the local data
        const index = allTransactions.findIndex(t => t.TransactionID === transactionId);
        if (index !== -1) {
            allTransactions[index] = {
                ...allTransactions[index],
                ...updatedData
            };
            
            // Re-filter and re-render
            filterTransactions();
            closeEditModal();
            alert('Record updated successfully!');
        }
    } catch (error) {
        console.error('Error updating record:', error);
        alert('Failed to update record. Please try again.');
    }
}

// Delete maintenance record
async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
        return;
    }
    
    try {
        // In a real implementation, you would call your API to delete the record
        // For now, we'll update the local data
        allTransactions = allTransactions.filter(t => t.TransactionID !== transactionId);
        filteredTransactions = filteredTransactions.filter(t => t.TransactionID !== transactionId);
        
        // Re-render
        renderTransactions();
        updatePagination();
        alert('Record deleted successfully!');
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Please try again.');
    }
}

// Load report data
async function loadReport() {
    try {
        const selectedDate = elements.reportDate.value;
        const response = await fetch(`${API_URL}?action=getReports&period=${currentPeriod}&date=${selectedDate}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            updateSummaryCards(data.data.summary);
            renderChart(data.data.chartData);
        }
    } catch (error) {
        console.error('Error loading report:', error);
        alert('Failed to load report data. Please try again.');
    }
}

// Update summary cards
function updateSummaryCards(summary) {
    elements.totalSpent.textContent = `₹${summary.totalSpent.toFixed(2)}`;
    elements.totalTransactions.textContent = summary.transactionCount;
    elements.topCategory.textContent = summary.topCategory || '-';
    elements.topCategoryAmount.textContent = summary.topCategoryAmount ? `₹${summary.topCategoryAmount.toFixed(2)}` : '-';
    
    // Update change indicators
    updateChangeIndicator(elements.spentChange, summary.spentChange);
    updateChangeIndicator(elements.transactionsChange, summary.transactionsChange);
}

function updateChangeIndicator(element, change) {
    if (change > 0) {
        element.innerHTML = `<i class="fas fa-arrow-up"></i> ${change}%`;
        element.parentElement.className = 'change positive';
    } else if (change < 0) {
        element.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(change)}%`;
        element.parentElement.className = 'change negative';
    } else {
        element.innerHTML = '-';
        element.parentElement.className = 'change neutral';
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

// UI helpers
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
