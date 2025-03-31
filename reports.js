// Reports Configuration
let currentPeriod = 'daily';
let currentDate = new Date();
let salesChart = null;

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateBtn: document.getElementById('generate-report'),
    downloadBtn: document.getElementById('download-report'),
    printBtn: document.getElementById('print-report'),
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

    // Download and print buttons
    elements.downloadBtn.addEventListener('click', downloadReport);
    elements.printBtn.addEventListener('click', printReport);

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

let reportData = []; // Store the current report data at module level

async function loadReport() {
    try {
        showLoading();
        const selectedDate = elements.reportDate.value;
        const transactions = await fetchTransactions(selectedDate, currentPeriod);
        
        // Process data and store it
        reportData = groupByPeriod(transactions, currentPeriod);
        const chartData = prepareChartData(reportData, currentPeriod);
        
        updateSummaryCards(calculateSummary(reportData));
        renderChart(chartData);
        renderTransactionsTable(reportData.flatMap(g => g.transactions));
        
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
    const groupsMap = new Map();

    transactions.forEach(transaction => {
        // Parse the date and validate it
        let date = new Date(transaction.date);
        if (isNaN(date.getTime())) {
            console.warn("Invalid date in transaction:", transaction.date);
            date = new Date(); // Fallback to current date
        }

        // Create appropriate period key based on selected period
        let periodKey, periodStart, periodEnd;
        
        switch(period) {
            case 'daily':
                periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
                periodStart = new Date(date.setHours(0, 0, 0, 0));
                periodEnd = new Date(date.setHours(23, 59, 59, 999));
                break;
                
            case 'weekly':
                const weekStart = getWeekStartDate(date);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                periodKey = `Week ${getWeekNumber(date)} (${weekStart.toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short' 
                })} - ${weekEnd.toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short' 
                })})`;
                periodStart = weekStart;
                periodEnd = weekEnd;
                break;
                
            case 'monthly':
                periodKey = date.toLocaleDateString('en-IN', { 
                    month: 'long', 
                    year: 'numeric' 
                });
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
        group.totalSales += transaction.totalAmount;
        group.totalProfit += transaction.totalProfit;
    });

    // Sort groups by period start date
    return Array.from(groupsMap.values()).sort((a, b) => a.periodStart - b.periodStart);
}

// Helper function to get start of week (Sunday)
function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
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
        switch(period) {
            case 'daily':
                label = group.periodStart.toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short' 
                });
                break;
                
            case 'weekly':
                label = `Week ${getWeekNumber(group.periodStart)}`;
                break;
                
            case 'monthly':
                label = group.periodStart.toLocaleDateString('en-IN', { 
                    month: 'short' 
                });
                break;
                
            case 'yearly':
                label = group.periodStart.getFullYear().toString();
                break;
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
            animation: {
                onComplete: function() {
                    // This ensures the chart is ready for export
                }
            },
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
                legend: {
                    position: 'top',
                },
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
    const index = context[0].dataIndex;
    const group = reportData[index]; // Assuming reportData is accessible
    
    switch(period) {
        case 'daily':
            return group.periodStart.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            
        case 'weekly':
            return `Week ${getWeekNumber(group.periodStart)} (${group.periodStart.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })} - ${group.periodEnd.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })})`;
            
        case 'monthly':
            return group.periodStart.toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });
            
        case 'yearly':
            return group.periodStart.getFullYear().toString();
            
        default:
            return group.periodKey;
    }
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

// New functions for report export
function downloadReport() {
    const { summary, chartData } = processReportData(reportData.flatMap(g => g.transactions), currentPeriod);
    
    // Create a HTML string for the report
    const reportHTML = generateReportHTML(summary, chartData);
    
    // Create a blob with the HTML content
    const blob = new Blob([reportHTML], { type: 'text/html' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RK_Fashions_${currentPeriod}_Report_${formatDateForFilename(new Date())}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printReport() {
    const { summary, chartData } = processReportData(reportData.flatMap(g => g.transactions), currentPeriod);
    const reportHTML = generateReportHTML(summary, chartData);
    
    // Open a new window with the report HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
        printWindow.print();
    };
}

function generateReportHTML(summary, chartData) {
    const periodLabel = getPeriodLabel(currentPeriod).toUpperCase();
    const dateRange = getCurrentDateRange();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>RK Fashions ${periodLabel} Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #6c5ce7;
            padding-bottom: 10px;
        }
        .header h1 {
            color: #6c5ce7;
            margin: 0;
        }
        .header p {
            margin: 5px 0 0;
            color: #666;
        }
        .summary-cards {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .summary-card {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            width: 30%;
            text-align: center;
        }
        .summary-card h3 {
            margin-top: 0;
            color: #555;
        }
        .amount {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
            color: #6c5ce7;
        }
        .chart-container {
            width: 100%;
            height: 400px;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        .detailed-report {
            margin-top: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 12px;
            color: #999;
        }
        @media print {
            .summary-cards {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            .summary-card {
                border: 1px solid #ddd;
                padding: 10px;
                width: 30%;
            }
            .chart-container {
                page-break-inside: avoid;
            }
            .detailed-report {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RK Fashions ${periodLabel} Sales Report</h1>
        <p>${dateRange}</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
    </div>
    
    <div class="summary-cards">
        <div class="summary-card">
            <h3>Total Sales</h3>
            <p class="amount">${elements.totalSales.textContent}</p>
        </div>
        <div class="summary-card">
            <h3>Total Profit</h3>
            <p class="amount">${elements.totalProfit.textContent}</p>
        </div>
        <div class="summary-card">
            <h3>Transactions</h3>
            <p class="amount">${elements.totalTransactions.textContent}</p>
        </div>
    </div>
    
    <div class="chart-container">
        <img src="${chartToImage()}" alt="Sales Chart" style="width: 100%; height: auto;">
    </div>
    
    <div class="detailed-report">
        <h2>Detailed Transactions</h2>
        ${elements.reportTableContainer.innerHTML}
    </div>
    
    <div class="footer">
        RK Fashions - Sales Report System
    </div>
</body>
</html>
`;
}

function chartToImage() {
    // Convert chart to base64 image
    return salesChart.toBase64Image();
}

function getCurrentDateRange() {
    if (reportData.length === 0) return '';
    
    const firstDate = reportData[0].periodStart;
    const lastDate = reportData[reportData.length - 1].periodEnd;
    
    switch(currentPeriod) {
        case 'daily':
            return firstDate.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
        case 'weekly':
            return `Week ${getWeekNumber(firstDate)} (${firstDate.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })} - ${lastDate.toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short' 
            })})`;
        case 'monthly':
            return firstDate.toLocaleDateString('en-IN', { 
                month: 'long', 
                year: 'numeric' 
            });
        case 'yearly':
            return firstDate.getFullYear().toString();
        default:
            return '';
    }
}

function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
}
