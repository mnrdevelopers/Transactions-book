// ======================
// UTILITY FUNCTIONS
// ======================

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
                paymentMode: row[8],
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
        
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

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

// ======================
// REPORTS FUNCTIONS
// ======================

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

// ==========================
// DOWNLOAD REPORTS SECTION
// ==========================

function exportToCSV(filename, rows) {
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(","),
        ...rows.map(row =>
            headers.map(field => `"${(row[field] ?? "").toString().replace(/"/g, '""')}"`).join(",")
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function downloadDailyReport() {
    const today = new Date().toDateString();
    const allReports = processSheetData(sheetData); // ensure sheetData is available globally
    const todayReports = allReports.filter(r => formatDateForDisplay(r.date) === formatDateForDisplay(new Date()));
    exportToCSV(`Daily_Report_${today}.csv`, todayReports);
}

function downloadMonthlyReport() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const allReports = processSheetData(sheetData);
    const monthReports = allReports.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    exportToCSV(`Monthly_Report_${now.getFullYear()}-${now.getMonth() + 1}.csv`, monthReports);
}

function addDownloadButtons() {
    const container = document.getElementById("reports-buttons") || document.body;

    const buttonStyles = `
        background: linear-gradient(to right, #4A00E0, #8E2DE2);
        color: white;
        font-weight: 600;
        font-size: 14px;
        padding: 10px 16px;
        margin: 10px 5px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    `;

    const hoverStyles = `
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.15);
    `;

    function createStyledButton(label, onClick) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = buttonStyles;
        btn.onmouseenter = () => btn.style.cssText += hoverStyles;
        btn.onmouseleave = () => btn.style.cssText = buttonStyles;
        btn.onclick = onClick;
        return btn;
    }

    const dailyBtn = createStyledButton("📅 Download Daily Report", downloadDailyReport);
    const monthlyBtn = createStyledButton("🗓️ Download Monthly Report", downloadMonthlyReport);

    container.appendChild(dailyBtn);
    container.appendChild(monthlyBtn);
}

// Call this after DOM loads
document.addEventListener("DOMContentLoaded", addDownloadButtons);


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
