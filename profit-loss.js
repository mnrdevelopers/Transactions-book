// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let currentPeriod = 'monthly';
let profitLossChart = null;
let allFinancialData = [];
let filteredFinancialData = [];
const API_URL = 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec';

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

// Load all financial data
async function loadFinancialData() {
    showLoading();
    
    try {
        // Load data from all sources
        const [salesData, purchasesData, maintenanceData] = await Promise.all([
            fetchSalesData(),
            fetchPurchasesData(),
            fetchMaintenanceData()
        ]);
        
        // Process and combine data
        allFinancialData = processFinancialData(salesData, purchasesData, maintenanceData);
        
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

// Fetch sales data from transactions
async function fetchSalesData() {
    try {
        const response = await fetch(`${API_URL}?action=getTransactions`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data.map(t => ({
                id: t.TransactionID || `sale-${Date.now()}`,
                date: new Date(t.Date),
                type: 'sale',
                description: t.CustomerName || 'Retail Sale',
                category: 'Sales',
                amount: parseFloat(t.TotalAmount) || 0,
                profit: parseFloat(t.TotalProfit) || 0,
                paymentMode: t.PaymentMode || 'Cash'
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching sales data:', error);
        return [];
    }
}

// Fetch purchases data
async function fetchPurchasesData() {
    try {
        const response = await fetch(`${API_URL}?action=getPurchases`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data.map(p => ({
                id: p.TransactionID || `purchase-${Date.now()}`,
                date: new Date(p.Date),
                type: 'purchase',
                description: p.Description || 'Inventory Purchase',
                category: p.Category || 'Purchases',
                amount: parseFloat(p.Amount) || 0,
                profit: -parseFloat(p.Amount) || 0, // Purchases are negative for profit
                paymentMode: p.PaymentMethod || 'Cash'
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching purchases data:', error);
        return [];
    }
}

// Fetch maintenance data
async function fetchMaintenanceData() {
    try {
        const response = await fetch(`${API_URL}?action=getMaintenance`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return data.data.map(m => ({
                id: m.TransactionID || `maintenance-${Date.now()}`,
                date: new Date(m.Date),
                type: 'maintenance',
                description: m.Description || 'Maintenance',
                category: m.Category || 'Maintenance',
                amount: parseFloat(m.Amount) || 0,
                profit: -parseFloat(m.Amount) || 0, // Costs are negative for profit
                paymentMode: m.PaymentMethod || 'Cash'
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching maintenance data:', error);
        return [];
    }
}

// Process and combine all financial data
function processFinancialData(sales, purchases, maintenance) {
    // Combine all data
    const combined = [...sales, ...purchases, ...maintenance];
    
    // Sort by date (newest first)
    combined.sort((a, b) => b.date - a.date);
    
    return combined;
}

// Update summary cards with financial overview
function updateSummaryCards() {
    const today = new Date(elements.reportDate.value);
    
    // Filter data for the selected period
    const { startDate, endDate } = getDateRange(currentPeriod, today);
    
    const periodData = allFinancialData.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
    });
    
    // Calculate totals
    const revenue = periodData
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const purchases = periodData
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const maintenance = periodData
        .filter(t => t.type === 'maintenance')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const netProfit = revenue + purchases + maintenance; // Purchases and maintenance are negative
    
    // Update UI
    elements.totalRevenue.textContent = `₹${revenue.toFixed(2)}`;
    elements.totalPurchases.textContent = `₹${Math.abs(purchases).toFixed(2)}`;
    elements.maintenanceCosts.textContent = `₹${Math.abs(maintenance).toFixed(2)}`;
    elements.netProfit.textContent = `₹${netProfit.toFixed(2)}`;
    
    // Update profit change color
    elements.netProfit.className = `amount ${netProfit >= 0 ? 'positive' : 'negative'}`;
    elements.profitChange.className = `change ${netProfit >= 0 ? 'positive' : 'negative'}`;
    
    // TODO: Calculate percentage changes vs previous period
    elements.revenueChange.textContent = '+0% vs previous period';
    elements.purchasesChange.textContent = '+0% vs previous period';
    elements.maintenanceChange.textContent = '+0% vs previous period';
    elements.profitChange.textContent = `${netProfit >= 0 ? '+' : ''}0% vs previous period`;
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
                .reduce((sum, t) => sum + t.amount, 0);
            
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
                .reduce((sum, t) => sum + t.amount, 0);
            
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
                .reduce((sum, t) => sum + t.amount, 0);
            
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
