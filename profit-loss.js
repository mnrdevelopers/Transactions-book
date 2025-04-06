// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let currentPeriod = 'monthly';
let profitLossChart = null;
let allFinancialData = [];
let filteredFinancialData = [];

// API URLs for each system
const API_URLS = {
    transactions: 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec',
    purchases: 'https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec',
    maintenance: 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec'
};

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateReportBtn: document.getElementById('generate-report'),
    totalRevenue: document.getElementById('total-revenue'),
    totalPurchases: document.getElementById('total-purchases'),
    maintenanceCosts: document.getElementById('maintenance-costs'),
    netProfit: document.getElementById('net-profit'),
    revenueChange: document.getElementById('revenue-change'),
    purchasesChange: document.getElementById('purchases-change'),
    maintenanceChange: document.getElementById('maintenance-change'),
    profitChange: document.getElementById('profit-change'),
    profitLossChart: document.getElementById('profit-loss-chart'),
    filterCategory: document.getElementById('filter-category'),
    filterType: document.getElementById('filter-type'),
    searchInput: document.getElementById('search-transactions'),
    searchBtn: document.getElementById('search-btn'),
    transactionsBody: document.getElementById('transactions-body'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    
    // Load initial data
    loadFinancialData();
    
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
            loadFinancialData();
        });
    });
    
    // Generate report button
    elements.generateReportBtn.addEventListener('click', loadFinancialData);
    
    // Filters
    elements.filterCategory.addEventListener('change', filterTransactions);
    elements.filterType.addEventListener('change', filterTransactions);
    elements.searchInput.addEventListener('input', filterTransactions);
    elements.searchBtn.addEventListener('click', filterTransactions);
    
    // Pagination
    elements.prevBtn.addEventListener('click', goToPrevPage);
    elements.nextBtn.addEventListener('click', goToNextPage);
}

// UI Helpers
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSuccessMessage(message = 'Report generated successfully!') {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        document.getElementById('success-modal').style.display = 'none';
    }, 3000);
}

// Load all financial data from separate APIs
async function loadFinancialData() {
    showLoading();
    
    try {
        // Load data from all sources in parallel
        const [salesData, purchasesData, maintenanceData] = await Promise.all([
            fetchDataFromAPI('transactions', 'getTransactions'),
            fetchDataFromAPI('purchases', 'getPurchases'),
            fetchDataFromAPI('maintenance', 'getMaintenance')
        ]);
        
        // Process and combine data
        allFinancialData = [
            ...processSalesData(salesData),
            ...processPurchasesData(purchasesData),
            ...processMaintenanceData(maintenanceData)
        ];
        
        // Sort by date (newest first)
        allFinancialData.sort((a, b) => b.date - a.date);
        
        // Update UI
        updateSummaryCards();
        renderChart();
        updateFilters();
        filterTransactions();
        
        showSuccessMessage();
    } catch (error) {
        console.error('Error loading financial data:', error);
        alert('Failed to load financial data. Please try again.');
    } finally {
        hideLoading();
    }
}

// Generic function to fetch data from any of the APIs
async function fetchDataFromAPI(source, action) {
    try {
        const apiUrl = API_URLS[source];
        const response = await fetch(`${apiUrl}?action=${action}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different response structures
        if (data.status === 'success') {
            return data.data || [];
        } else if (Array.isArray(data)) {
            return data; // Some APIs might return array directly
        } else if (data.error) {
            throw new Error(data.error);
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching ${source} data:`, error);
        return []; // Return empty array to allow other data to load
    }
}

// Process sales/transactions data
function processSalesData(data) {
    return data.map(t => ({
        id: t.TransactionID || `sale-${Date.now()}`,
        date: parseDate(t.Date),
        type: 'sale',
        description: t.CustomerName || 'Retail Sale',
        category: 'Sales',
        amount: parseFloat(t.TotalAmount) || 0,
        profit: parseFloat(t.TotalProfit) || 0,
        paymentMode: t.PaymentMode || 'Cash'
    }));
}

// Process purchases data
function processPurchasesData(data) {
    return data.map(p => ({
        id: p.TransactionID || `purchase-${Date.now()}`,
        date: parseDate(p.Date),
        type: 'purchase',
        description: p.Description || 'Inventory Purchase',
        category: p.Category || 'Purchases',
        amount: -Math.abs(parseFloat(p.Amount) || 0, // Negative for expenses
        profit: -Math.abs(parseFloat(p.Amount) || 0, // Negative for profit calculation
        paymentMode: p.PaymentMethod || 'Cash'
    }));
}

// Process maintenance data
function processMaintenanceData(data) {
    return data.map(m => ({
        id: m.TransactionID || `maintenance-${Date.now()}`,
        date: parseDate(m.Date),
        type: 'maintenance',
        description: m.Description || 'Maintenance',
        category: m.Category || 'Maintenance',
        amount: -Math.abs(parseFloat(m.Amount) || 0), // Negative for expenses
        profit: -Math.abs(parseFloat(m.Amount) || 0), // Negative for profit calculation
        paymentMode: m.PaymentMethod || 'Cash'
    }));
}

// Helper function to parse dates from different formats
function parseDate(dateValue) {
    if (dateValue instanceof Date) return dateValue;
    if (!dateValue) return new Date(); // Default to current date if missing
    
    // Try ISO format
    const isoDate = new Date(dateValue);
    if (!isNaN(isoDate.getTime())) return isoDate;
    
    // Try other common formats
    const formats = [
        'yyyy-MM-dd', 'MM/dd/yyyy', 'dd-MM-yyyy', 
        'dd/MM/yyyy', 'yyyy/MM/dd'
    ];
    
    for (const format of formats) {
        const parts = format.split(/[-\/]/);
        const dateParts = dateValue.split(/[-\/]/);
        
        if (dateParts.length === parts.length) {
            const dateObj = {};
            parts.forEach((part, i) => {
                dateObj[part] = parseInt(dateParts[i], 10);
            });
            
            if (dateObj.yyyy && dateObj.MM && dateObj.dd) {
                return new Date(dateObj.yyyy, dateObj.MM - 1, dateObj.dd);
            } else if (dateObj.MM && dateObj.dd && dateObj.yyyy) {
                return new Date(dateObj.yyyy, dateObj.MM - 1, dateObj.dd);
            } else if (dateObj.dd && dateObj.MM && dateObj.yyyy) {
                return new Date(dateObj.yyyy, dateObj.MM - 1, dateObj.dd);
            }
        }
    }
    
    console.warn('Could not parse date:', dateValue);
    return new Date(); // Fallback to current date
}

// Update summary cards with financial overview
function updateSummaryCards() {
    const today = new Date(elements.reportDate.value);
    const { startDate, endDate } = getDateRange(currentPeriod, today);
    
    // Filter data for the selected period
    const periodData = allFinancialData.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
    });
    
    // Calculate totals
    const revenue = periodData
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const purchases = periodData
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const maintenance = periodData
        .filter(t => t.type === 'maintenance')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalExpenses = purchases + maintenance;
    const netProfit = revenue - totalExpenses;
    
    // Update UI
    elements.totalRevenue.textContent = `₹${revenue.toFixed(2)}`;
    elements.totalPurchases.textContent = `₹${purchases.toFixed(2)}`;
    elements.maintenanceCosts.textContent = `₹${maintenance.toFixed(2)}`;
    elements.netProfit.textContent = `₹${netProfit.toFixed(2)}`;
    
    // Update styling based on values
    elements.netProfit.className = `amount ${netProfit >= 0 ? 'positive' : 'negative'}`;
    elements.profitChange.className = `change ${netProfit >= 0 ? 'positive' : 'negative'}`;
    
    // Calculate percentage changes (placeholder - would need historical data)
    elements.revenueChange.textContent = calculateChangeText(revenue, 0);
    elements.purchasesChange.textContent = calculateChangeText(purchases, 0);
    elements.maintenanceChange.textContent = calculateChangeText(maintenance, 0);
    elements.profitChange.textContent = calculateChangeText(netProfit, 0);
}

// Helper function to calculate change text (placeholder implementation)
function calculateChangeText(currentValue, previousValue) {
    if (previousValue === 0) return 'No previous data';
    
    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const direction = change >= 0 ? 'increase' : 'decrease';
    const absChange = Math.abs(change).toFixed(1);
    
    return `${change >= 0 ? '+' : ''}${absChange}% ${direction} vs previous period`;
}

// Get date range based on period
function getDateRange(period, date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    
    switch(period) {
        case 'monthly':
            startDate.setDate(1);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of month
            break;
            
        case 'quarterly':
            const quarter = Math.floor(startDate.getMonth() / 3);
            startDate.setMonth(quarter * 3);
            startDate.setDate(1);
            endDate.setMonth((quarter + 1) * 3);
            endDate.setDate(0);
            break;
            
        case 'yearly':
            startDate.setMonth(0);
            startDate.setDate(1);
            endDate.setMonth(11);
            endDate.setDate(31);
            break;
            
        default: // Monthly
            startDate.setDate(1);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
}

// Render chart
function renderChart() {
    const today = new Date(elements.reportDate.value);
    const { startDate, endDate } = getDateRange(currentPeriod, today);
    
    // Group data by time period
    const groupedData = groupDataByPeriod(allFinancialData, startDate, endDate);
    
    // Prepare chart data
    const labels = groupedData.map(g => g.periodLabel);
    const revenueData = groupedData.map(g => g.revenue);
    const costData = groupedData.map(g => g.costs);
    const profitData = groupedData.map(g => g.profit);
    
    if (profitLossChart) {
        profitLossChart.destroy();
    }
    
    const ctx = elements.profitLossChart.getContext('2d');
    profitLossChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Costs',
                    data: costData,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Profit',
                    data: profitData,
                    type: 'line',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Period'
                    }
                },
                y: {
                    stacked: false,
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

// Group data by period for chart
function groupDataByPeriod(data, startDate, endDate) {
    const groups = [];
    const period = currentPeriod;
    
    if (period === 'monthly') {
        // Group by month
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const monthStart = new Date(current);
            const monthEnd = new Date(current);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setDate(0);
            
            const periodData = data.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= monthStart && transDate <= monthEnd;
            });
            
            const revenue = periodData
                .filter(t => t.type === 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const costs = periodData
                .filter(t => t.type !== 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const profit = revenue - costs;
            
            groups.push({
                periodLabel: monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                revenue,
                costs,
                profit
            });
            
            current.setMonth(current.getMonth() + 1);
        }
    } else if (period === 'quarterly') {
        // Group by quarter
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const quarter = Math.floor(current.getMonth() / 3);
            const quarterStart = new Date(current.getFullYear(), quarter * 3, 1);
            const quarterEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
            
            const periodData = data.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= quarterStart && transDate <= quarterEnd;
            });
            
            const revenue = periodData
                .filter(t => t.type === 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const costs = periodData
                .filter(t => t.type !== 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const profit = revenue - costs;
            
            groups.push({
                periodLabel: `Q${quarter + 1} ${current.getFullYear()}`,
                revenue,
                costs,
                profit
            });
            
            current.setMonth(current.getMonth() + 3);
        }
    } else {
        // Group by year
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const yearStart = new Date(current.getFullYear(), 0, 1);
            const yearEnd = new Date(current.getFullYear(), 11, 31);
            
            const periodData = data.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= yearStart && transDate <= yearEnd;
            });
            
            const revenue = periodData
                .filter(t => t.type === 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const costs = periodData
                .filter(t => t.type !== 'sale')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const profit = revenue - costs;
            
            groups.push({
                periodLabel: current.getFullYear().toString(),
                revenue,
                costs,
                profit
            });
            
            current.setFullYear(current.getFullYear() + 1);
        }
    }
    
    return groups;
}

// Update filters dropdowns
function updateFilters() {
    // Update category filter
    const categories = [...new Set(allFinancialData.map(t => t.category))].filter(c => c);
    elements.filterCategory.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.filterCategory.appendChild(option);
    });
}

// Filter transactions
function filterTransactions() {
    const categoryFilter = elements.filterCategory.value;
    const typeFilter = elements.filterType.value;
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredFinancialData = allFinancialData.filter(transaction => {
        // Category filter
        const matchesCategory = !categoryFilter || 
            transaction.category === categoryFilter;
        
        // Type filter
        const matchesType = !typeFilter || 
            transaction.type === typeFilter;
        
        // Search term
        const matchesSearch = !searchTerm || 
            transaction.description.toLowerCase().includes(searchTerm) ||
            (transaction.category && transaction.category.toLowerCase().includes(searchTerm));
        
        return matchesCategory && matchesType && matchesSearch;
    });
    
    // Sort by date (newest first)
    filteredFinancialData.sort((a, b) => b.date - a.date);
    
    totalPages = Math.max(1, Math.ceil(filteredFinancialData.length / PAGE_SIZE));
    currentPage = 1;
    renderTransactions();
}

// Render transactions table
function renderTransactions() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageTransactions = filteredFinancialData.slice(startIdx, endIdx);
    
    elements.transactionsBody.innerHTML = "";
    
    if (pageTransactions.length === 0) {
        elements.transactionsBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-results">
                    No transactions found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    pageTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Determine type icon and color
        let typeIcon, typeClass;
        switch(transaction.type) {
            case 'sale':
                typeIcon = '<i class="fas fa-rupee-sign"></i>';
                typeClass = 'sale';
                break;
            case 'purchase':
                typeIcon = '<i class="fas fa-shopping-cart"></i>';
                typeClass = 'purchase';
                break;
            case 'maintenance':
                typeIcon = '<i class="fas fa-tools"></i>';
                typeClass = 'maintenance';
                break;
            default:
                typeIcon = '<i class="fas fa-exchange-alt"></i>';
                typeClass = '';
        }
        
        // Format date
        const dateStr = transaction.date.toLocaleDateString('en-IN');
        
        // Format amount with color based on type
        const amount = parseFloat(transaction.amount);
        const amountClass = transaction.type === 'sale' ? 'positive' : 'negative';
        const amountStr = `₹${Math.abs(amount).toFixed(2)}`;
        
        // Format profit/loss
        const profit = parseFloat(transaction.profit);
        const profitClass = profit >= 0 ? 'positive' : 'negative';
        const profitStr = profit >= 0 ? `+₹${profit.toFixed(2)}` : `-₹${Math.abs(profit).toFixed(2)}`;
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td><span class="transaction-type ${typeClass}">${typeIcon} ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</span></td>
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td class="${amountClass}">${amountStr}</td>
            <td class="${profitClass}">${profitStr}</td>
        `;
        elements.transactionsBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
}

// Pagination functions
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

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        }
