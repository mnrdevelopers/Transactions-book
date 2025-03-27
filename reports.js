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
    const groupsMap = new Map();
    
    transactions.forEach(transaction => {
        // Ensure we have a valid date object
        let dateObj = new Date(transaction.date);
        if (isNaN(dateObj.getTime())) {
            console.warn("Invalid date in transaction:", transaction.date);
            dateObj = new Date(); // Fallback to current date
        }
        
        // Create period key based on selected period
        let periodKey;
        switch(period) {
            case 'daily':
                periodKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                break;
            case 'weekly':
                const year = dateObj.getFullYear();
                const week = getWeekNumber(dateObj);
                periodKey = `${year}-W${week.toString().padStart(2, '0')}`;
                break;
            case 'monthly':
                periodKey = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2, '0')}`;
                break;
            case 'yearly':
                periodKey = dateObj.getFullYear().toString();
                break;
        }
        
        if (!groupsMap.has(periodKey)) {
            groupsMap.set(periodKey, {
                date: dateObj,
                periodKey,
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
    
    // Convert map to array and sort by date
    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.date - b.date);
    return sortedGroups;
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
        // Format label based on period with proper date handling
        let label;
        const dateObj = new Date(group.date);
        
        if (isNaN(dateObj.getTime())) {
            console.warn("Invalid date:", group.date);
            label = "N/A";
        } else {
            switch(period) {
                case 'daily':
                    label = dateObj.toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short' 
                    });
                    break;
                case 'weekly':
                    label = `Week ${getWeekNumber(dateObj)} (${dateObj.toLocaleDateString('en-IN', { 
                        month: 'short' 
                    })})`;
                    break;
                case 'monthly':
                    label = dateObj.toLocaleDateString('en-IN', { 
                        month: 'short', 
                        year: 'numeric' 
                    });
                    break;
                case 'yearly':
                    label = dateObj.getFullYear().toString();
                    break;
                default:
                    label = dateObj.toLocaleDateString();
            }
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
                },
                legend: {
                    position: 'top',
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
