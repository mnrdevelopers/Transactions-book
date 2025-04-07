// Configuration
const SALES_API_URL = 'https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec';
const PURCHASES_API_URL = 'https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec';
const MAINTENANCE_API_URL = 'https://script.google.com/macros/s/AKfycbzlL_nSw4bTq_RkeRvEm42AV9D84J0HIHlG2GuDJ6N0rRy7_wsiGxeAYe1w-1Gz1A4/exec';

let currentPeriod = 'monthly';
let profitLossChart = null;
let expenseChart = null;
let allSalesData = [];
let allPurchaseData = [];
let allMaintenanceData = [];

// DOM Elements
const elements = {
    periodBtns: document.querySelectorAll('.btn-period'),
    startDate: document.getElementById('start-date'),
    endDate: document.getElementById('end-date'),
    totalSales: document.getElementById('total-sales'),
    grossProfit: document.getElementById('gross-profit'),
    totalExpenses: document.getElementById('total-expenses'),
    netProfit: document.getElementById('net-profit'),
    breakdownBody: document.getElementById('breakdownBody'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    elements.startDate.value = firstDay.toISOString().split('T')[0];
    elements.endDate.value = today.toISOString().split('T')[0];
    
    // Load initial data
    loadAllData();
    
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
            updateDateRangeByPeriod();
            loadAllData();
        });
    });
    
    // Date range changes
    elements.startDate.addEventListener('change', loadAllData);
    elements.endDate.addEventListener('change', loadAllData);
}

function updateDateRangeByPeriod() {
    const today = new Date();
    let startDate, endDate = today;
    
    switch(currentPeriod) {
        case 'monthly':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'quarterly':
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            break;
        case 'yearly':
            startDate = new Date(today.getFullYear(), 0, 1);
            break;
    }
    
    elements.startDate.value = startDate.toISOString().split('T')[0];
    elements.endDate.value = endDate.toISOString().split('T')[0];
}

async function loadAllData() {
    showLoading();
    
    try {
        // Load data from all three sources in parallel
        const [salesData, purchaseData, maintenanceData] = await Promise.all([
            fetchSalesData(),
            fetchPurchaseData(),
            fetchMaintenanceData()
        ]);
        
        allSalesData = salesData;
        allPurchaseData = purchaseData;
        allMaintenanceData = maintenanceData;
        
        // Process and display the data
        processAndDisplayData();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please try again.');
    } finally {
        hideLoading();
    }
}

async function fetchSalesData() {
    const response = await fetch(SALES_API_URL);
    const data = await response.json();
    
    // Process sales data similar to transactions.js
    const transactionsMap = new Map();
    const startRow = data[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        const siNo = String(row[2] || "").trim();
        const date = parseDate(row[1]);
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                date: date,
                dateString: formatDateForDisplay(date),
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
    }
    
    return Array.from(transactionsMap.values());
}

async function fetchPurchaseData() {
    const response = await fetch(PURCHASES_API_URL);
    const data = await response.json();
    
    // Process purchase data similar to purchases.js
    return data.map(row => ({
        date: parseDate(row.date),
        totalAmount: parseFloat(row.totalamount) || 0,
        amountPaid: parseFloat(row.amountpaid) || 0,
        status: calculatePurchaseStatus(row.paymenttype, parseFloat(row.totalamount), parseFloat(row.amountpaid))
    }));
}

async function fetchMaintenanceData() {
    const response = await fetch(`${MAINTENANCE_API_URL}?action=getMaintenance`);
    const data = await response.json();
    
    if (data.status === 'success') {
        return data.data.map(item => ({
            date: new Date(item.Date),
            amount: parseFloat(item.Amount) || 0,
            category: item.Category,
            status: item.Status
        }));
    }
    return [];
}

function calculatePurchaseStatus(paymentType, totalAmount, amountPaid) {
    if (paymentType === 'spot') return 'paid';
    if (amountPaid >= totalAmount) return 'paid';
    if (amountPaid > 0) return 'partial';
    return 'pending';
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

function processAndDisplayData() {
    const startDate = new Date(elements.startDate.value);
    const endDate = new Date(elements.endDate.value);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter data by date range
    const filteredSales = allSalesData.filter(t => {
        const transDate = new Date(t.date);
        return transDate >= startDate && transDate <= endDate;
    });
    
    const filteredPurchases = allPurchaseData.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate >= startDate && purchaseDate <= endDate;
    });
    
    const filteredMaintenance = allMaintenanceData.filter(m => {
        const maintDate = new Date(m.date);
        return maintDate >= startDate && maintDate <= endDate;
    });
    
    // Calculate totals
    const totalSales = filteredSales.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalProfit = filteredSales.reduce((sum, t) => sum + t.totalProfit, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalMaintenance = filteredMaintenance.reduce((sum, m) => sum + m.amount, 0);
    
    // Calculate net profit (Profit - Expenses)
    const totalExpenses = totalPurchases + totalMaintenance;
    const netProfit = totalProfit - totalExpenses;
    
    // Update summary cards
    elements.totalSales.textContent = `₹${totalSales.toFixed(2)}`;
    elements.grossProfit.textContent = `₹${totalProfit.toFixed(2)}`;
    elements.totalExpenses.textContent = `₹${totalExpenses.toFixed(2)}`;
    elements.netProfit.textContent = `₹${netProfit.toFixed(2)}`;
    
    // Prepare data for charts
    prepareChartData(filteredSales, filteredPurchases, filteredMaintenance);
    
    // Prepare detailed breakdown
    prepareDetailedBreakdown(filteredSales, filteredPurchases, filteredMaintenance);
}

function prepareChartData(salesData, purchaseData, maintenanceData) {
    // Group data by time period based on currentPeriod
    const groupedData = groupDataByPeriod(salesData, purchaseData, maintenanceData);
    
    // Prepare Profit & Loss Chart
    renderProfitLossChart(groupedData);
    
    // Prepare Expense Breakdown Chart
    renderExpenseChart(purchaseData, maintenanceData);
}

function groupDataByPeriod(salesData, purchaseData, maintenanceData) {
    const startDate = new Date(elements.startDate.value);
    const endDate = new Date(elements.endDate.value);
    const groups = [];
    
    if (currentPeriod === 'monthly') {
        // Group by day
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const daySales = salesData.filter(s => 
                s.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, s) => sum + s.totalProfit, 0);
            
            const dayPurchases = purchaseData.filter(p => 
                p.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, p) => sum + p.totalAmount, 0);
            
            const dayMaintenance = maintenanceData.filter(m => 
                m.date.toISOString().split('T')[0] === dateStr
            ).reduce((sum, m) => sum + m.amount, 0);
            
            groups.push({
                label: currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                sales: daySales,
                profit: daySales,
                purchases: dayPurchases,
                maintenance: dayMaintenance,
                expenses: dayPurchases + dayMaintenance,
                net: daySales - (dayPurchases + dayMaintenance)
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else if (currentPeriod === 'quarterly') {
        // Group by week
        const currentDate = new Date(startDate);
        let weekStart = new Date(currentDate);
        
        while (currentDate <= endDate) {
            // Check if we've reached Sunday or end date
            if (currentDate.getDay() === 0 || currentDate >= endDate) {
                const weekEnd = new Date(currentDate);
                const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
                
                const weekSales = salesData.filter(s => 
                    s.date >= weekStart && s.date <= weekEnd
                ).reduce((sum, s) => sum + s.totalProfit, 0);
                
                const weekPurchases = purchaseData.filter(p => 
                    p.date >= weekStart && p.date <= weekEnd
                ).reduce((sum, p) => sum + p.totalAmount, 0);
                
                const weekMaintenance = maintenanceData.filter(m => 
                    m.date >= weekStart && m.date <= weekEnd
                ).reduce((sum, m) => sum + m.amount, 0);
                
                groups.push({
                    label: weekLabel,
                    sales: weekSales,
                    profit: weekSales,
                    purchases: weekPurchases,
                    maintenance: weekMaintenance,
                    expenses: weekPurchases + weekMaintenance,
                    net: weekSales - (weekPurchases + weekMaintenance)
                });
                
                weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() + 1);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
    } else {
        // Group by month
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        
        while (currentDate <= endDate) {
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const monthLabel = currentDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            
            const monthSales = salesData.filter(s => 
                s.date >= currentDate && s.date <= monthEnd
            ).reduce((sum, s) => sum + s.totalProfit, 0);
            
            const monthPurchases = purchaseData.filter(p => 
                p.date >= currentDate && p.date <= monthEnd
            ).reduce((sum, p) => sum + p.totalAmount, 0);
            
            const monthMaintenance = maintenanceData.filter(m => 
                m.date >= currentDate && m.date <= monthEnd
            ).reduce((sum, m) => sum + m.amount, 0);
            
            groups.push({
                label: monthLabel,
                sales: monthSales,
                profit: monthSales,
                purchases: monthPurchases,
                maintenance: monthMaintenance,
                expenses: monthPurchases + monthMaintenance,
                net: monthSales - (monthPurchases + monthMaintenance)
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }
    
    return groups;
}

function renderProfitLossChart(groupedData) {
    const ctx = document.getElementById('profitLossChart').getContext('2d');
    const labels = groupedData.map(g => g.label);
    const profitData = groupedData.map(g => g.profit);
    const expenseData = groupedData.map(g => g.expenses);
    const netData = groupedData.map(g => g.net);
    
    if (profitLossChart) {
        profitLossChart.destroy();
    }
    
    profitLossChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gross Profit',
                    data: profitData,
                    borderColor: '#1cc88a',
                    backgroundColor: 'rgba(28, 200, 138, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Total Expenses',
                    data: expenseData,
                    borderColor: '#e74a3b',
                    backgroundColor: 'rgba(231, 74, 59, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Net Profit',
                    data: netData,
                    borderColor: '#f6c23e',
                    backgroundColor: 'rgba(246, 194, 62, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                }
            }
        }
    });
}

function renderExpenseChart(purchaseData, maintenanceData) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    // Group maintenance by category
    const maintenanceByCategory = {};
    maintenanceData.forEach(m => {
        if (!maintenanceByCategory[m.category]) {
            maintenanceByCategory[m.category] = 0;
        }
        maintenanceByCategory[m.category] += m.amount;
    });
    
    const purchaseTotal = purchaseData.reduce((sum, p) => sum + p.totalAmount, 0);
    const maintenanceTotal = maintenanceData.reduce((sum, m) => sum + m.amount, 0);
    
    const labels = ['Purchases', ...Object.keys(maintenanceByCategory)];
    const data = [purchaseTotal, ...Object.values(maintenanceByCategory)];
    const backgroundColors = [
        '#4e73df', // Purchases
        '#1cc88a', // Maintenance categories
        '#36b9cc',
        '#f6c23e',
        '#e74a3b',
        '#858796'
    ];
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                hoverBackgroundColor: backgroundColors.map(c => c + 'cc'),
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'right',
                }
            },
            cutout: '70%',
        },
    });
}

function prepareDetailedBreakdown(salesData, purchaseData, maintenanceData) {
    const totalSales = salesData.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = salesData.reduce((sum, s) => sum + s.totalProfit, 0);
    const totalPurchases = purchaseData.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalMaintenance = maintenanceData.reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = totalPurchases + totalMaintenance;
    const netProfit = totalProfit - totalExpenses;
    
    // Group maintenance by category
    const maintenanceByCategory = {};
    maintenanceData.forEach(m => {
        if (!maintenanceByCategory[m.category]) {
            maintenanceByCategory[m.category] = 0;
        }
        maintenanceByCategory[m.category] += m.amount;
    });
    
    let html = '';
    
    // Sales section
    html += `
        <tr>
            <td><strong>Total Sales</strong></td>
            <td><strong>₹${totalSales.toFixed(2)}</strong></td>
            <td>100%</td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
        <tr>
            <td>Cost of Goods Sold</td>
            <td>₹${(totalSales - totalProfit).toFixed(2)}</td>
            <td>${((totalSales - totalProfit) / totalSales * 100).toFixed(1)}%</td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
        <tr>
            <td><strong>Gross Profit</strong></td>
            <td><strong>₹${totalProfit.toFixed(2)}</strong></td>
            <td><strong>${(totalProfit / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
        <tr class="table-secondary">
            <td colspan="4"><strong>Expenses</strong></td>
        </tr>
        <tr>
            <td>Inventory Purchases</td>
            <td>₹${totalPurchases.toFixed(2)}</td>
            <td>${(totalPurchases / totalExpenses * 100).toFixed(1)}%</td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
    `;
    
    // Maintenance categories
    for (const [category, amount] of Object.entries(maintenanceByCategory)) {
        html += `
            <tr>
                <td>${category} Maintenance</td>
                <td>₹${amount.toFixed(2)}</td>
                <td>${(amount / totalExpenses * 100).toFixed(1)}%</td>
                <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
            </tr>
        `;
    }
    
    // Totals
    html += `
        <tr>
            <td><strong>Total Expenses</strong></td>
            <td><strong>₹${totalExpenses.toFixed(2)}</strong></td>
            <td><strong>${(totalExpenses / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-danger"></i> 0%</td>
        </tr>
        <tr class="table-primary">
            <td><strong>Net Profit</strong></td>
            <td><strong>₹${netProfit.toFixed(2)}</strong></td>
            <td><strong>${(netProfit / totalSales * 100).toFixed(1)}%</strong></td>
            <td><i class="fas fa-arrow-up text-success"></i> 0%</td>
        </tr>
    `;
    
    elements.breakdownBody.innerHTML = html;
}

function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
            }
