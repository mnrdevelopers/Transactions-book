// profit-loss.js
// Configuration
const TRANSACTIONS_API = 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec';
const PURCHASES_API = 'https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec';
const MAINTENANCE_API = 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec';

let currentPeriod = 'daily';
let currentPaymentMode = 'all';
let profitChart = null;

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateReportBtn: document.getElementById('generate-report'),
    paymentMode: document.getElementById('payment-mode'),
    totalSales: document.getElementById('total-sales'),
    stockValue: document.getElementById('stock-value'),
    maintenanceCosts: document.getElementById('maintenance-costs'),
    netProfit: document.getElementById('net-profit'),
    salesChange: document.getElementById('sales-change'),
    stockChange: document.getElementById('stock-change'),
    maintenanceChange: document.getElementById('maintenance-change'),
    profitChange: document.getElementById('profit-change'),
    profitChart: document.getElementById('profitChart'),
    loadingOverlay: document.getElementById('loading-overlay'),
    successModal: document.getElementById('success-modal'),
    successMessage: document.getElementById('success-message'),
    closeModal: document.querySelector('.close')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    
    // Load initial data
    loadData();
    
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
            loadData();
        });
    });
    
    // Generate report button
    elements.generateReportBtn.addEventListener('click', loadData);
    
    // Payment mode filter
    elements.paymentMode.addEventListener('change', function() {
        currentPaymentMode = this.value;
        loadData();
    });
    
    // Modal close button
    elements.closeModal.addEventListener('click', function() {
        elements.successModal.style.display = 'none';
    });
}

async function loadData() {
    showLoading();
    
    try {
        const selectedDate = elements.reportDate.value;
        
        // Fetch data from all three systems in parallel
        const [transactionsData, purchasesData, maintenanceData] = await Promise.all([
            fetchTransactions(selectedDate),
            fetchPurchases(),
            fetchMaintenance(selectedDate)
        ]);
        
        // Process and display data
        processData(transactionsData, purchasesData, maintenanceData);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please try again.');
    } finally {
        hideLoading();
    }
}

async function fetchTransactions(date) {
    try {
        const response = await fetch(`${TRANSACTIONS_API}?action=getTransactions&date=${date}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

async function fetchPurchases() {
    try {
        const response = await fetch(`${PURCHASES_API}?action=getPurchases`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching purchases:', error);
        throw error;
    }
}

async function fetchMaintenance(date) {
    try {
        const response = await fetch(`${MAINTENANCE_API}?action=getMaintenance&date=${date}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching maintenance data:', error);
        throw error;
    }
}

function processData(transactions, purchases, maintenance) {
    // Filter transactions by payment mode if needed
    const filteredTransactions = currentPaymentMode === 'all' 
        ? transactions 
        : transactions.filter(t => t.paymentMode === currentPaymentMode);
    
    // Calculate totals
    const totalSales = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.totalAmount) || 0), 0);
    const totalProfit = filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.totalProfit) || 0), 0);
    
    // Calculate stock value from purchases
    const stockItems = {};
    purchases.forEach(purchase => {
        purchase.items.forEach(item => {
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
    
    // Calculate maintenance costs
    const maintenanceCosts = maintenance.reduce((sum, m) => sum + (parseFloat(m.Amount) || 0), 0);
    
    // Calculate net profit (sales profit - maintenance costs)
    const netProfit = totalProfit - maintenanceCosts;
    
    // Update UI
    updateSummaryCards(totalSales, stockValue, maintenanceCosts, netProfit);
    updateChart(totalSales, stockValue, maintenanceCosts, netProfit);
}

function updateSummaryCards(sales, stock, maintenance, profit) {
    elements.totalSales.textContent = `₹${sales.toFixed(2)}`;
    elements.stockValue.textContent = `₹${stock.toFixed(2)}`;
    elements.maintenanceCosts.textContent = `₹${maintenance.toFixed(2)}`;
    elements.netProfit.textContent = `₹${profit.toFixed(2)}`;
    
    // Style net profit based on value
    if (profit < 0) {
        elements.netProfit.style.color = '#d63031';
    } else {
        elements.netProfit.style.color = '#00b894';
    }
    
    // Update change indicators
    elements.salesChange.textContent = currentPaymentMode === 'all' 
        ? 'All payment modes' 
        : `Via ${currentPaymentMode}`;
    
    elements.profitChange.textContent = profit < 0 ? 'Net Loss' : 'Net Profit';
}

function updateChart(sales, stock, maintenance, profit) {
    const ctx = elements.profitChart.getContext('2d');
    
    // Destroy previous chart if exists
    if (profitChart) {
        profitChart.destroy();
    }
    
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sales', 'Stock Value', 'Maintenance', 'Net Profit/Loss'],
            datasets: [{
                label: 'Amount (₹)',
                data: [sales, stock, maintenance, profit],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    profit >= 0 ? 'rgba(75, 192, 192, 0.7)' : 'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)',
                    profit >= 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
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

function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

function showError(message) {
    elements.successMessage.textContent = message;
    elements.successModal.style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        elements.successModal.style.display = 'none';
    }, 3000);
}

function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successModal.style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        elements.successModal.style.display = 'none';
    }, 3000);
}
