// At the top of reports.js
import { formatDateForDisplay, parseDate, processSheetData } from './utils.js';

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
    // Set default date to today in proper format
    const today = formatDateForDisplay(new Date());
    elements.reportDate.value = today.split('/').reverse().join('-'); // Convert to YYYY-MM-DD for input
    
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
    elements.searchInput.addEventListener('input', debounce(filterTransactions, 300));
}

function updateSummaryCards(summary) {
    if (!summary) {
        console.error("Invalid summary data");
        return;
    }

    elements.totalSales.textContent = `₹${(summary.totalSales || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    elements.totalProfit.textContent = `₹${(summary.totalProfit || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    elements.totalTransactions.textContent = (summary.transactionCount || 0).toLocaleString('en-IN');
    
    updateChangeIndicator(
        elements.totalSales.parentElement.querySelector('.change'), 
        summary.salesChange || 0
    );
    updateChangeIndicator(
        elements.totalProfit.parentElement.querySelector('.change'), 
        summary.profitChange || 0
    );
}

function updateChangeIndicator(element, change) {
    if (!element) return;
    
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
        
        if (!transactions || !Array.isArray(transactions)) {
            throw new Error("Invalid transactions data received");
        }
        
        // Process data and store it
        reportData = groupByPeriod(transactions, currentPeriod);
        const chartData = prepareChartData(reportData, currentPeriod);
        
        updateSummaryCards(calculateSummary(reportData));
        renderChart(chartData);
        renderTransactionsTable(reportData.flatMap(g => g.transactions));
        
    } catch (error) {
        console.error('Error loading report:', error);
        showError('Failed to load report data. Please try again.');
    }
}

async function fetchTransactions(date, period) {
    try {
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return processSheetData(data);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
}

function groupByPeriod(transactions, period) {
    if (!transactions || !Array.isArray(transactions)) {
        console.warn("Invalid transactions array");
        return [];
    }

    const groupsMap = new Map();

    transactions.forEach(transaction => {
        if (!transaction || !transaction.date) {
            console.warn("Invalid transaction:", transaction);
            return;
        }

        // Parse the date using the utility function
        let date;
        try {
            date = parseDate(transaction.date);
            if (isNaN(date.getTime())) throw new Error("Invalid date");
        } catch (e) {
            console.warn("Invalid date in transaction:", transaction.date);
            date = new Date(); // Fallback to current date
        }

        // Create appropriate period key based on selected period
        let periodKey, periodStart, periodEnd;
        
        switch(period) {
            case 'daily':
                periodKey = formatDateForDisplay(date);
                periodStart = new Date(date);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd = new Date(date);
                periodEnd.setHours(23, 59, 59, 999);
                break;
                
            case 'weekly':
                const weekStart = getWeekStartDate(date);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                periodKey = `Week ${getWeekNumber(date)} (${formatDateForDisplay(weekStart, {month: 'short'})} - ${formatDateForDisplay(weekEnd, {month: 'short'})})`;
                periodStart = weekStart;
                periodEnd = weekEnd;
                break;
                
            case 'monthly':
                periodKey = formatDateForDisplay(date, {month: 'long', year: 'numeric'});
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
        group.totalSales += transaction.totalAmount || 0;
        group.totalProfit += transaction.totalProfit || 0;
    });

    // Sort groups by period start date (newest first)
    return Array.from(groupsMap.values()).sort((a, b) => b.periodStart - a.periodStart);
}

// Helper function to get start of week (Sunday)
function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

function calculateSummary(groups) {
    if (!groups || !Array.isArray(groups)) {
        return {
            totalSales: 0,
            totalProfit: 0,
            transactionCount: 0,
            salesChange: 0,
            profitChange: 0
        };
    }

    const summary = groups.reduce((acc, group) => {
        acc.totalSales += group.totalSales || 0;
        acc.totalProfit += group.totalProfit || 0;
        acc.transactionCount += group.transactions?.length || 0;
        return acc;
    }, { totalSales: 0, totalProfit: 0, transactionCount: 0 });

    // TODO: Implement proper change calculation
    summary.salesChange = 0;
    summary.profitChange = 0;
    
    return summary;
}

function prepareChartData(groups, period) {
    if (!groups || !Array.isArray(groups)) {
        return {
            labels: [],
            datasets: []
        };
    }

    const labels = [];
    const salesData = [];
    const profitData = [];
    
    groups.forEach(group => {
        // Format label based on period
        let label;
        switch(period) {
            case 'daily':
                label = formatDateForDisplay(group.periodStart, {day: 'numeric', month: 'short'});
                break;
            case 'weekly':
                label = `Week ${getWeekNumber(group.periodStart)}`;
                break;
            case 'monthly':
                label = formatDateForDisplay(group.periodStart, {month: 'short'});
                break;
            case 'yearly':
                label = group.periodStart.getFullYear().toString();
                break;
            default:
                label = group.periodKey;
        }
        
        labels.push(label);
        salesData.push(group.totalSales || 0);
        profitData.push(group.totalProfit || 0);
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
    if (!elements.salesChart) return;

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
    if (!reportData || !Array.isArray(reportData)) return '';
    
    const index = context[0].dataIndex;
    const group = reportData[index];
    if (!group) return '';

    switch(period) {
        case 'daily':
            return formatDateForDisplay(group.periodStart, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
        case 'weekly':
            return `Week ${getWeekNumber(group.periodStart)} (${formatDateForDisplay(group.periodStart, {day: 'numeric', month: 'short'})} - ${formatDateForDisplay(group.periodEnd, {day: 'numeric', month: 'short'})})`;
        case 'monthly':
            return formatDateForDisplay(group.periodStart, {month: 'long', year: 'numeric'});
        case 'yearly':
            return group.periodStart.getFullYear().toString();
        default:
            return group.periodKey;
    }
}

function renderTransactionsTable(transactions) {
    if (!elements.reportData) return;

    let html = '';
    
    if (transactions && Array.isArray(transactions)) {
        transactions.forEach(transaction => {
            if (!transaction) return;
            
            html += `
                <tr>
                    <td>${transaction.siNo || ''}</td>
                    <td>${transaction.dateString || formatDateForDisplay(new Date(transaction.date))}</td>
                    <td>${transaction.customerName || ''}</td>
                    <td>₹${(transaction.totalAmount || 0).toFixed(2)}</td>
                    <td>₹${(transaction.totalProfit || 0).toFixed(2)}</td>
                    <td>${transaction.paymentMode || ''}</td>
                </tr>
            `;
        });
    }
    
    elements.reportData.innerHTML = html || '<tr><td colspan="6">No transactions found</td></tr>';
}

function filterTransactions() {
    if (!elements.reportData || !elements.paymentFilter || !elements.searchInput) return;
    
    const paymentFilter = elements.paymentFilter.value.toLowerCase();
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    const rows = elements.reportData.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (!row.cells || row.cells.length < 6) return;
        
        const payment = row.cells[5].textContent.toLowerCase();
        const rowText = row.textContent.toLowerCase();
        
        const paymentMatch = !paymentFilter || payment.includes(paymentFilter);
        const searchMatch = !searchTerm || rowText.includes(searchTerm);
        
        row.style.display = paymentMatch && searchMatch ? '' : 'none';
    });
}

function showLoading() {
    if (!elements.reportData) return;
    
    elements.reportData.innerHTML = `
        <tr>
            <td colspan="6" class="loading-spinner">
                <div class="spinner"></div>
                Loading report data...
            </td>
        </tr>
    `;
}

function showError(message) {
    if (!elements.reportData) return;
    
    elements.reportData.innerHTML = `
        <tr>
            <td colspan="6" class="error-message">
                ${message || 'An error occurred'}
                <button onclick="loadReport()">Retry</button>
            </td>
        </tr>
    `;
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
