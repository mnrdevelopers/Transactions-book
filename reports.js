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
    // Update total sales
    elements.totalSales.textContent = `₹${summary.totalSales.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    // Update total profit
    elements.totalProfit.textContent = `₹${summary.totalProfit.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    // Update transaction count
    elements.totalTransactions.textContent = summary.transactionCount;
    
    // Update change indicators
    updateChangeIndicator(elements.totalSales.parentElement.querySelector('.change'), summary.salesChange);
    updateChangeIndicator(elements.totalProfit.parentElement.querySelector('.change'), summary.profitChange);
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

async function loadReport() {
    try {
        // Get the selected date
        const selectedDate = elements.reportDate.value;
        
        // Show loading state
        showLoading();
        
        // Fetch transactions from your API
        const transactions = await fetchTransactions(selectedDate, currentPeriod);
        
        // Process data for the selected period
        const reportData = processReportData(transactions, currentPeriod);
        
        // Update UI
        updateSummaryCards(reportData.summary);
        renderChart(reportData.chartData);
        renderTransactionsTable(reportData.transactions);
        
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
    const groups = [];
    
    // This is a simplified version - you'll need to implement proper grouping
    // based on your date format and the selected period
    
    if (period === 'daily') {
        // Group by day
        const dayGroups = {};
        
        transactions.forEach(transaction => {
            const date = transaction.dateString;
            if (!dayGroups[date]) {
                dayGroups[date] = {
                    date,
                    transactions: [],
                    totalSales: 0,
                    totalProfit: 0
                };
            }
            
            dayGroups[date].transactions.push(transaction);
            dayGroups[date].totalSales += transaction.totalAmount;
            dayGroups[date].totalProfit += transaction.totalProfit;
        });
        
        // Convert to array
        for (const date in dayGroups) {
            groups.push(dayGroups[date]);
        }
        
        // Sort by date
        groups.sort((a, b) => new Date(a.date) - new Date(b.date));
        
    } else if (period === 'weekly') {
        // Group by week (similar logic but group by week number)
    } else if (period === 'monthly') {
        // Group by month
    } else if (period === 'yearly') {
        // Group by year
    }
    
    return groups;
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
        if (period === 'daily') {
            label = new Date(group.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } else if (period === 'weekly') {
            label = `Week ${getWeekNumber(new Date(group.date))}`;
        } else if (period === 'monthly') {
            label = new Date(group.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        } else if (period === 'yearly') {
            label = new Date(group.date).getFullYear();
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
    // Destroy previous chart if exists
    if (salesChart) {
        salesChart.destroy();
    }
    
    // Create new chart
    const ctx = elements.salesChart.getContext('2d');
    salesChart = new Chart(ctx, {
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
                            return context.dataset.label + ': ₹' + context.raw.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
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
