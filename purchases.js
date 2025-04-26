// Purchase Management System
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allPurchases = [];
let filteredPurchases = [];
let purchaseChart = null;
let currentPeriod = 'monthly';
let currentPurchaseId = null;

// DOM Elements
const elements = {
    // Summary cards
    totalPurchases: document.getElementById('total-purchases'),
    pendingPayments: document.getElementById('pending-payments'),
    stockValue: document.getElementById('stock-value'),
    supplierCount: document.getElementById('supplier-count'),
    purchaseChange: document.getElementById('purchase-change'),
    pendingChange: document.getElementById('pending-change'),
    stockChange: document.getElementById('stock-change'),
    lastSupplier: document.getElementById('last-supplier'),
    supplierAnalyticsFilter: document.getElementById('supplier-analytics-filter'),
    viewSupplierDetails: document.getElementById('view-supplier-details'),
    supplierTotal: document.getElementById('supplier-total'),
    supplierPending: document.getElementById('supplier-pending'),
    supplierItems: document.getElementById('supplier-items'),
    supplierFrequency: document.getElementById('supplier-frequency'),
    supplierLastDate: document.getElementById('supplier-last-date'),
    supplierPendingBills: document.getElementById('supplier-pending-bills'),
    supplierUniqueItems: document.getElementById('supplier-unique-items'),
    supplierAvgDays: document.getElementById('supplier-avg-days'),
    

    
    // Chart
    purchaseChart: document.getElementById('purchaseChart'),
    
    // Controls
    periodBtns: document.querySelectorAll('.period-btn'),
    reportDate: document.getElementById('report-date'),
    generateBtn: document.getElementById('generate-report'),
    supplierFilter: document.getElementById('supplier-filter'),
    paymentFilter: document.getElementById('payment-filter'),
    itemFilter: document.getElementById('item-filter'),
    searchInput: document.getElementById('search-purchases'),
    searchBtn: document.getElementById('search-btn'),
    
    // Table
    purchasesBody: document.getElementById('purchases-body'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    pageInfo: document.getElementById('page-info'),
    
    // Modals
    addPurchaseBtn: document.getElementById('add-purchase-btn'),
    purchaseModal: document.getElementById('purchase-modal'),
    viewModal: document.getElementById('view-modal'),
    modalTitle: document.getElementById('modal-title'),
    purchaseForm: document.getElementById('purchase-form'),
    purchaseDetails: document.getElementById('purchase-details'),
    
    // Form elements
    purchaseDate: document.getElementById('purchase-date'),
    billNo: document.getElementById('bill-no'),
    supplierName: document.getElementById('supplier-name'),
    supplierList: document.getElementById('supplier-list'),
    paymentType: document.getElementById('payment-type'),
    amountPaid: document.getElementById('amount-paid'),
    dueDate: document.getElementById('due-date'),
    billImage: document.getElementById('bill-image'),
    imagePreview: document.getElementById('image-preview'),
    purchaseItemsContainer: document.getElementById('purchase-items-container'),
    addItemBtn: document.getElementById('add-item-btn'),
    totalAmount: document.getElementById('total-amount'),
    notes: document.getElementById('notes'),
    cancelPurchase: document.getElementById('cancel-purchase'),
    savePurchase: document.getElementById('save-purchase')
};

// UI Helpers for loading and success messages
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showSuccessMessage(message = 'Operation completed successfully!') {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').style.display = 'flex';
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        document.getElementById('success-modal').style.display = 'none';
    }, 3000);
}

// Setup success modal close button
document.getElementById('close-success-modal')?.addEventListener('click', function() {
    document.getElementById('success-modal').style.display = 'none';
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.reportDate.value = today;
    elements.purchaseDate.value = today;
    
    // Load initial data
    loadPurchases();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Period buttons
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadPurchases();
        });
    });

    // Generate report button
    elements.generateBtn?.addEventListener('click', loadPurchases);

   elements.supplierAnalyticsFilter.addEventListener('change', function() {
    updateSupplierAnalytics(this.value || null);
});

    // Filters
    elements.supplierFilter?.addEventListener('change', filterPurchases);
    elements.paymentFilter?.addEventListener('change', filterPurchases);
    elements.itemFilter?.addEventListener('change', filterPurchases);

    elements.searchInput?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') filterPurchases();
    });
    elements.searchBtn?.addEventListener('click', filterPurchases);

    // Pagination
    elements.prevBtn?.addEventListener('click', goToPrevPage);
    elements.nextBtn?.addEventListener('click', goToNextPage);

    // Add purchase button
    elements.addPurchaseBtn?.addEventListener('click', showAddPurchaseModal);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Cancel purchase button
    elements.cancelPurchase?.addEventListener('click', closeModal);

    // Payment type change
    elements.paymentType?.addEventListener('change', () => {
        const type = elements.paymentType.value;
        if (type === 'spot') {
            elements.amountPaid.value = '';
            elements.amountPaid.readOnly = true;
            elements.dueDate.disabled = true;
        } else {
            elements.amountPaid.value = type === 'credit' ? '0' : '';
            elements.amountPaid.readOnly = false;
            elements.dueDate.disabled = false;
        }
    });

    // Bill image upload
    elements.billImage?.addEventListener('change', () => {
        const file = elements.billImage.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                elements.imagePreview.innerHTML = `
                    <img src="${e.target.result}" 
                         style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    });

    // Add item button
    elements.addItemBtn?.addEventListener('click', addPurchaseItem);

    // Form submission
    elements.purchaseForm?.addEventListener('submit', handlePurchaseSubmit);

    // Initialize with one item
    addPurchaseItem();
}


async function loadPurchases() {
    try {
        showLoading();
        
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        allPurchases = processPurchaseData(data);
        
        updateFilters();
        updateSupplierFilter(); // Make sure this is called
        updateSummaryCards();
        renderChart();
        filterPurchases();
    } catch (error) {
        console.error("Error loading purchases:", error);
        showError("Failed to load purchases. Please try again.");
    } finally {
        hideLoading();
    }
}

function processPurchaseData(sheetData) {
    const purchases = [];
    
    for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        
        purchases.push({
            id: row.id || `purchase-${i}`,
            date: row.date || new Date().toISOString().split('T')[0],
            billNo: row.billno || '',
            supplier: row.supplier || '',
            items: row.items || [],
            totalAmount: parseFloat(row.totalamount) || 0,
            paymentType: row.paymenttype || 'credit',
            amountPaid: parseFloat(row.amountpaid) || 0,
            dueDate: row.duedate || '',
            billImage: row.billimage || '',
            notes: row.notes || '',
            status: calculateStatus(row.paymenttype, parseFloat(row.totalamount), parseFloat(row.amountpaid)),
            balance: (parseFloat(row.totalamount) || 0) - (parseFloat(row.amountpaid) || 0),
            createdAt: row.createdat || new Date().toISOString()
        });
    }
    // Sort purchases by date in descending order (newest first)
    purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return purchases;
}

function calculateStatus(paymentType, totalAmount, amountPaid) {
    if (paymentType === 'spot') return 'paid';
    if (amountPaid >= totalAmount) return 'paid';
    if (amountPaid > 0) return 'partial';
    return 'pending';
}

function updateFilters() {
    // Update supplier filter
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
    elements.supplierList.innerHTML = '';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier;
        option.textContent = supplier;
        elements.supplierFilter.appendChild(option.cloneNode(true));
        elements.supplierList.appendChild(option);
    });
    
    // Update item filter
    const allItems = [];
    allPurchases.forEach(p => {
        p.items.forEach(item => {
            if (item.name && !allItems.includes(item.name)) {
                allItems.push(item.name);
            }
        });
    });
    
    elements.itemFilter.innerHTML = '<option value="">All Items</option>';
    allItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        elements.itemFilter.appendChild(option);
    });
}

function updateSupplierFilter() {
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierAnalyticsFilter.innerHTML = '<option value="">Select Supplier</option>';
    
    suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier;
        option.textContent = supplier;
        elements.supplierAnalyticsFilter.appendChild(option);
    });
}

function updateSummaryCards() {
    if (allPurchases.length === 0) return;
   
    // Total purchases
    const total = allPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    elements.totalPurchases.textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    // Pending payments
    const pending = allPurchases.filter(p => p.status === 'pending' || p.status === 'partial')
                               .reduce((sum, p) => sum + p.balance, 0);
    elements.pendingPayments.textContent = `₹${pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    
    // Supplier count
    const suppliers = [...new Set(allPurchases.map(p => p.supplier))].filter(s => s);
    elements.supplierCount.textContent = suppliers.length;
    
    // Last supplier
    const lastPurchase = [...allPurchases].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    elements.lastSupplier.textContent = lastPurchase?.supplier || 'None';
    
    // Stock value and count
    const stockItems = {};
    allPurchases.forEach(p => {
        p.items.forEach(item => {
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
    
    const stockCount = Object.keys(stockItems).length;
    elements.stockValue.textContent = `₹${stockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    elements.stockChange.textContent = stockCount;
    
    // Calculate changes (simplified - would compare with previous period)
    elements.purchaseChange.textContent = '0%';
    elements.pendingChange.textContent = allPurchases.filter(p => p.status === 'pending').length;
}

function updateSupplierAnalytics(selectedSupplier = null) {
    if (!selectedSupplier) {
        resetSupplierAnalytics();
        return;
    }

    const supplierPurchases = allPurchases.filter(p => p.supplier === selectedSupplier);
    if (supplierPurchases.length === 0) {
        resetSupplierAnalytics();
        return;
    }

    // Total business
    const total = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    elements.supplierTotal.textContent = `₹${total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    // Pending payments
    const pending = supplierPurchases
        .filter(p => p.status === 'pending' || p.status === 'partial')
        .reduce((sum, p) => sum + p.balance, 0);
    elements.supplierPending.textContent = `₹${pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    elements.supplierPendingBills.textContent = supplierPurchases
        .filter(p => p.status === 'pending' || p.status === 'partial').length;

    // Items purchased
    const allItems = [];
    const uniqueItems = new Set();
    supplierPurchases.forEach(p => {
        p.items.forEach(item => {
            allItems.push({
                name: item.name,
                quantity: parseFloat(item.quantity) || 0
            });
            uniqueItems.add(item.name);
        });
    });
    const totalItems = allItems.reduce((sum, item) => sum + item.quantity, 0);
    elements.supplierItems.textContent = totalItems;
    elements.supplierUniqueItems.textContent = uniqueItems.size;

    // Purchase frequency
    const sortedDates = supplierPurchases
        .map(p => new Date(p.date))
        .sort((a, b) => a - b);
    
    elements.supplierFrequency.textContent = supplierPurchases.length;
    
    if (sortedDates.length > 1) {
        const dateDiffs = [];
        for (let i = 1; i < sortedDates.length; i++) {
            dateDiffs.push((sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24));
        }
        const avgDays = Math.round(dateDiffs.reduce((a, b) => a + b, 0) / dateDiffs.length);
        elements.supplierAvgDays.textContent = avgDays;
    } else {
        elements.supplierAvgDays.textContent = 'N/A';
    }

    // Last purchase date
    const lastPurchase = sortedDates[sortedDates.length - 1];
    elements.supplierLastDate.textContent = lastPurchase.toLocaleDateString();
}

function resetSupplierAnalytics() {
    elements.supplierTotal.textContent = '₹0.00';
    elements.supplierPending.textContent = '₹0.00';
    elements.supplierItems.textContent = '0';
    elements.supplierFrequency.textContent = '0';
    elements.supplierLastDate.textContent = 'None';
    elements.supplierPendingBills.textContent = '0';
    elements.supplierUniqueItems.textContent = '0';
    elements.supplierAvgDays.textContent = '0';
}

function showSupplierDetails() {
    const selectedSupplier = elements.supplierAnalyticsFilter.value;
    if (!selectedSupplier) {
        alert('Please select a supplier first');
        return;
    }

    const supplierPurchases = allPurchases.filter(p => p.supplier === selectedSupplier);
    if (supplierPurchases.length === 0) {
        alert('No purchases found for this supplier');
        return;
    }

    // Create detailed HTML
    const html = `
        <div class="supplier-details-header">
            <h2>${selectedSupplier}</h2>
            <p>${supplierPurchases.length} purchases since ${new Date(supplierPurchases[supplierPurchases.length-1].date).toLocaleDateString()}</p>
        </div>
        
        <div class="supplier-stats-grid">
            <div class="stat-card">
                <h3>Total Business</h3>
                <p class="stat-value">₹${supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
            <div class="stat-card">
                <h3>Avg. Purchase Value</h3>
                <p class="stat-value">₹${(supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0) / supplierPurchases.length).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
            <div class="stat-card">
                <h3>Pending Payments</h3>
                <p class="stat-value">₹${supplierPurchases.filter(p => p.status === 'pending' || p.status === 'partial').reduce((sum, p) => sum + p.balance, 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
            </div>
           <div class="stat-card">
    <h3>Payment Compliance</h3>
    <p class="stat-value">${Math.round((supplierPurchases.filter(p => p.status === 'paid').length / supplierPurchases.length) * 100)})%</p>
    </div>
</div>

        
        <h3>Purchase History</h3>
        <div class="purchase-history">
            ${supplierPurchases.slice(0, 10).map(purchase => `
                <div class="purchase-item">
                    <div class="purchase-date">${formatDate(purchase.date)}</div>
                    <div class="purchase-amount">₹${purchase.totalAmount.toFixed(2)}</div>
                    <div class="purchase-status ${purchase.status}">${purchase.status}</div>
                    <div class="purchase-actions">
                        <button class="view-btn" data-id="${purchase.id}">View</button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <h3>Top Purchased Items</h3>
        <div class="top-items">
            ${getTopItems(supplierPurchases, 5).map(item => `
                <div class="item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-quantity">${item.quantity} units</div>
                    <div class="item-value">₹${item.totalValue.toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
    `;

    elements.purchaseDetails.innerHTML = html;
    elements.viewModal.style.display = 'flex';
    
    // Add event listeners to view buttons
    document.querySelectorAll('.purchase-actions .view-btn').forEach(btn => {
        btn.addEventListener('click', viewPurchaseDetails);
    });
}

function getTopItems(purchases, limit = 5) {
    const itemsMap = {};
    
    purchases.forEach(purchase => {
        purchase.items.forEach(item => {
            if (!itemsMap[item.name]) {
                itemsMap[item.name] = {
                    name: item.name,
                    quantity: 0,
                    totalValue: 0
                };
            }
            itemsMap[item.name].quantity += parseFloat(item.quantity) || 0;
            itemsMap[item.name].totalValue += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
        });
    });
    
    return Object.values(itemsMap)
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, limit);
}

function renderChart() {
    // Group purchases by period
    const grouped = groupPurchasesByPeriod();
    
    // Prepare chart data
    const labels = [];
    const purchaseData = [];
    const paymentData = [];
    
    grouped.forEach(group => {
        labels.push(group.periodLabel);
        purchaseData.push(group.totalPurchases);
        paymentData.push(group.totalPayments);
    });
    
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: 'Purchases',
                data: purchaseData,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                label: 'Payments',
                data: paymentData,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }
        ]
    };
    
    if (purchaseChart) {
        purchaseChart.destroy();
    }
    
    const ctx = elements.purchaseChart.getContext('2d');
    purchaseChart = new Chart(ctx, {
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
                }
            }
        }
    });
}

function groupPurchasesByPeriod() {
    const groups = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    if (currentPeriod === 'monthly') {
        // Last 12 months including current month
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, now.getMonth() - i, 1);
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            const periodLabel = `${month} ${year}`;
            
            const startDate = new Date(year, date.getMonth(), 1);
            const endDate = new Date(year, date.getMonth() + 1, 0);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.unshift({  // Add to beginning to maintain chronological order
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    } else if (currentPeriod === 'quarterly') {
        // Last 4 quarters
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        
        for (let i = 3; i >= 0; i--) {
            const quarter = (currentQuarter - i - 1 + 4) % 4 + 1;
            let year = now.getFullYear();
            if (quarter > currentQuarter) year--;
            
            const periodLabel = `Q${quarter} ${year}`;
            
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            
            const startDate = new Date(year, startMonth, 1);
            const endDate = new Date(year, endMonth + 1, 0);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.push({
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    } else { // yearly
        // Last 5 years
        for (let i = 4; i >= 0; i--) {
            const year = now.getFullYear() - i;
            const periodLabel = year.toString();
            
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            
            const periodPurchases = allPurchases.filter(p => {
                const purchaseDate = new Date(p.date);
                return purchaseDate >= startDate && purchaseDate <= endDate;
            });
            
            const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPayments = periodPurchases.reduce((sum, p) => sum + p.amountPaid, 0);
            
            groups.push({
                periodLabel,
                totalPurchases,
                totalPayments
            });
        }
    }
    
    return groups;
}

function filterPurchases() {
    const supplierFilter = elements.supplierFilter.value.toLowerCase();
    const paymentFilter = elements.paymentFilter.value.toLowerCase();
    const itemFilter = elements.itemFilter.value.toLowerCase();
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    filteredPurchases = allPurchases.filter(purchase => {
        // Supplier filter
        const matchesSupplier = !supplierFilter || 
            purchase.supplier.toLowerCase().includes(supplierFilter);
        
        // Payment filter
        const matchesPayment = !paymentFilter || 
            purchase.status.toLowerCase() === paymentFilter;
        
        // Item filter
        const matchesItem = !itemFilter || 
            purchase.items.some(item => item.name.toLowerCase().includes(itemFilter));
        
        // Search term
        const matchesSearch = !searchTerm || 
            purchase.billNo.toLowerCase().includes(searchTerm) ||
            purchase.supplier.toLowerCase().includes(searchTerm) ||
            purchase.items.some(item => item.name.toLowerCase().includes(searchTerm));
        
        return matchesSupplier && matchesPayment && matchesItem && matchesSearch;
    });

    // Maintain sorting by date (newest first)
    filteredPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
    currentPage = 1;
    renderPurchases();
}

function renderPurchases() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pagePurchases = filteredPurchases.slice(startIdx, endIdx);
    
    elements.purchasesBody.innerHTML = "";
    
    if (pagePurchases.length === 0) {
        elements.purchasesBody.innerHTML = `
            <tr>
                <td colspan="10" class="no-results"> <!-- Update colspan to 10 -->
                    No purchases found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    pagePurchases.forEach(purchase => {
        const itemsSummary = purchase.items.length === 1 
            ? purchase.items[0].name 
            : `${purchase.items.length} items`;
        
        // Create image link or placeholder
        const billImageLink = purchase.billImage 
            ? `<a href="${purchase.billImage}" target="_blank" class="view-image-btn">View Bill</a>`
            : '<span class="no-image">No Image</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(purchase.date)}</td>
            <td>${purchase.billNo}</td>
            <td>${purchase.supplier}</td>
            <td>${itemsSummary}</td>
            <td>₹${purchase.totalAmount.toFixed(2)}</td>
            <td>₹${purchase.amountPaid.toFixed(2)}</td>
            <td>₹${purchase.balance.toFixed(2)}</td>
            <td><span class="status-badge ${purchase.status}">${purchase.status}</span></td>
            <td>${billImageLink}</td>
            <td class="actions">
                <button class="view-btn" data-id="${purchase.id}">View</button>
                <button class="edit-btn" data-id="${purchase.id}">Edit</button>
            </td>
        `;
        elements.purchasesBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
    
    // Add event listeners to buttons
    setupRowEventListeners();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function setupRowEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', viewPurchaseDetails);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', editPurchase);
    });
}

function viewPurchaseDetails(e) {
    const purchaseId = e.target.getAttribute('data-id');
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    // Format items as a table
    const itemsHtml = `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${purchase.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>₹${(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Create purchase details HTML
    elements.purchaseDetails.innerHTML = `
        <div class="purchase-header">
            <p><strong>Date:</strong> ${formatDate(purchase.date)}</p>
            <p><strong>Bill No:</strong> ${purchase.billNo}</p>
            <p><strong>Supplier:</strong> ${purchase.supplier}</p>
            <p><strong>Payment Type:</strong> ${purchase.paymentType}</p>
            ${purchase.dueDate ? `<p><strong>Due Date:</strong> ${formatDate(purchase.dueDate)}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-badge ${purchase.status}">${purchase.status}</span></p>
        </div>
        
        <div class="purchase-items">
            <h3>Items</h3>
            ${itemsHtml}
        </div>
        
        <div class="purchase-totals">
            <p><strong>Total Amount:</strong> ₹${purchase.totalAmount.toFixed(2)}</p>
            <p><strong>Amount Paid:</strong> ₹${purchase.amountPaid.toFixed(2)}</p>
            <p><strong>Balance Due:</strong> ₹${purchase.balance.toFixed(2)}</p>
        </div>
        
        ${purchase.billImage ? `
        <div class="bill-image">
            <h3>Bill Image</h3>
            <img src="${purchase.billImage}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        ` : ''}
        
        ${purchase.notes ? `
        <div class="purchase-notes">
            <h3>Notes</h3>
            <p>${purchase.notes}</p>
        </div>
        ` : ''}
    `;
    
    // Show modal
    elements.viewModal.style.display = 'flex';
}

function editPurchase(e) {
    const purchaseId = e.target.getAttribute('data-id');
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    currentPurchaseId = purchaseId;
    elements.modalTitle.textContent = 'Edit Purchase';
    
    // Fill form with purchase data
    elements.purchaseDate.value = purchase.date;
    elements.billNo.value = purchase.billNo;
    elements.supplierName.value = purchase.supplier;
    elements.paymentType.value = purchase.paymentType;
    elements.amountPaid.value = purchase.amountPaid;
    elements.dueDate.value = purchase.dueDate || '';
    elements.totalAmount.value = purchase.totalAmount;
    elements.notes.value = purchase.notes || '';
    
    // Set payment type specific fields
    if (purchase.paymentType === 'spot') {
        elements.amountPaid.readOnly = true;
        elements.dueDate.disabled = true;
    } else {
        elements.amountPaid.readOnly = false;
        elements.dueDate.disabled = false;
    }
    
    // Clear and add items
    elements.purchaseItemsContainer.innerHTML = '';
    purchase.items.forEach(item => {
        addPurchaseItem(item);
    });
    
    // Show bill image if exists
    if (purchase.billImage) {
        elements.imagePreview.innerHTML = `
            <img src="${purchase.billImage}" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; border-radius: 4px;">
        `;
    } else {
        elements.imagePreview.innerHTML = '';
    }
    
    // Show modal
    elements.purchaseModal.style.display = 'flex';
}

function showAddPurchaseModal() {
    currentPurchaseId = null;
    elements.modalTitle.textContent = 'Add New Purchase';
    
    // Reset form
    elements.purchaseForm.reset();
    elements.purchaseDate.value = new Date().toISOString().split('T')[0];
    elements.paymentType.value = 'credit';
    elements.amountPaid.value = '0';
    elements.amountPaid.readOnly = false;
    elements.dueDate.disabled = false;
    elements.totalAmount.value = '0';
    elements.imagePreview.innerHTML = '';
    
    // Clear and add one empty item
    elements.purchaseItemsContainer.innerHTML = '';
    addPurchaseItem();
    
    // Show modal
    elements.purchaseModal.style.display = 'flex';
}

function addPurchaseItem(itemData = {}) {
    const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // New sale ID
    
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = itemId;
    itemRow.innerHTML = `
        <div class="form-group">
            <label for="${itemId}-name">Item Name</label>
            <input type="text" id="${itemId}-name" class="item-name" value="${itemData.name || ''}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-quantity">Quantity</label>
            <input type="number" id="${itemId}-quantity" class="item-quantity" min="1" value="${itemData.quantity || 1}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-price">Price (₹)</label>
            <input type="number" id="${itemId}-price" class="item-price" min="0" step="0.01" value="${itemData.price || ''}" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-total">Total (₹)</label>
            <input type="number" id="${itemId}-total" class="item-total" min="0" step="0.01" value="${(itemData.quantity || 0) * (itemData.price || 0)}" readonly>
        </div>
        <input type="hidden" id="${itemId}-saleid" class="item-saleid" value="${itemData.saleId || saleId}">
        <button type="button" class="remove-item" data-item="${itemId}">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    elements.purchaseItemsContainer.appendChild(itemRow);
    
    // Add event listeners for calculations
    const quantityInput = itemRow.querySelector('.item-quantity');
    const priceInput = itemRow.querySelector('.item-price');
    const totalInput = itemRow.querySelector('.item-total');
    
    quantityInput.addEventListener('input', calculateItemTotal);
    priceInput.addEventListener('input', calculateItemTotal);
    
    // Add remove event
    itemRow.querySelector('.remove-item').addEventListener('click', function() {
        itemRow.remove();
        calculatePurchaseTotal();
    });
    
    // Calculate initial total if data was provided
    if (itemData.quantity && itemData.price) {
        calculateItemTotal({ target: quantityInput });
    }
}

function calculateItemTotal(e) {
    const itemRow = e.target.closest('.item-row');
    const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const total = quantity * price;
    
    itemRow.querySelector('.item-total').value = total.toFixed(2);
    calculatePurchaseTotal();
}

function calculatePurchaseTotal() {
    let total = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const itemTotal = parseFloat(row.querySelector('.item-total').value) || 0;
        total += itemTotal;
    });
    
    elements.totalAmount.value = total.toFixed(2);
    
    // If payment type is spot, set amount paid equal to total
    if (elements.paymentType.value === 'spot') {
        elements.amountPaid.value = total.toFixed(2);
    }
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validatePurchaseForm()) return;
    
    // Disable form during submission
    const formElements = elements.purchaseForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = true;
    }
    elements.savePurchase.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Prepare items data
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        items.push({
            name: row.querySelector('.item-name').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value),
            price: parseFloat(row.querySelector('.item-price').value),
            saleId: row.querySelector('.item-saleid').value // Include sale ID
        });
    });
    
    // Prepare purchase data
    const purchaseData = {
        id: currentPurchaseId || `purchase-${Date.now()}`,
        date: elements.purchaseDate.value,
        billNo: elements.billNo.value,
        supplier: elements.supplierName.value,
        items: items,
        totalAmount: parseFloat(elements.totalAmount.value),
        paymentType: elements.paymentType.value,
        amountPaid: parseFloat(elements.amountPaid.value) || 0,
        dueDate: elements.dueDate.value || '',
        notes: elements.notes.value || '',
        status: calculateStatus(elements.paymentType.value, parseFloat(elements.totalAmount.value), parseFloat(elements.amountPaid.value) || 0),
        balance: parseFloat(elements.totalAmount.value) - (parseFloat(elements.amountPaid.value) || 0)
    };
    
    // Upload bill image if selected
    if (elements.billImage.files && elements.billImage.files[0]) {
        try {
            const imageUrl = await uploadImageToImgBB(elements.billImage.files[0]);
            purchaseData.billImage = imageUrl;
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload bill image. The purchase will be saved without the image.");
        }
    } else if (currentPurchaseId) {
        // Keep existing image if editing
        const existingPurchase = allPurchases.find(p => p.id === currentPurchaseId);
        if (existingPurchase && existingPurchase.billImage) {
            purchaseData.billImage = existingPurchase.billImage;
        }
    }
    
    // Save purchase
    savePurchase(purchaseData);
    
    // Re-enable form elements (they'll be cleared when modal closes)
    setTimeout(() => {
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].disabled = false;
        }
        elements.savePurchase.innerHTML = '<i class="fas fa-save"></i> Save Purchase';
    }, 3000);
}

function validatePurchaseForm() {
    // Validate required fields
    if (!elements.billNo.value.trim()) {
        alert("Please enter bill number");
        return false;
    }
    
    if (!elements.supplierName.value.trim()) {
        alert("Please enter supplier name");
        return false;
    }
    
    // Validate at least one item exists
    if (document.querySelectorAll('.item-row').length === 0) {
        alert("Please add at least one item");
        return false;
    }
    
    // Validate all items
    let valid = true;
    document.querySelectorAll('.item-row').forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const quantity = row.querySelector('.item-quantity').value;
        const price = row.querySelector('.item-price').value;
        
        if (!name || !quantity || !price || isNaN(quantity) || isNaN(price)) {
            row.style.border = "1px solid red";
            valid = false;
        } else {
            row.style.border = "";
        }
    });
    
    if (!valid) {
        alert("Please check all item fields");
        return false;
    }
    
    // Validate payment details
    if (elements.paymentType.value !== 'spot') {
        const amountPaid = parseFloat(elements.amountPaid.value) || 0;
        const totalAmount = parseFloat(elements.totalAmount.value) || 0;
        
        if (amountPaid > totalAmount) {
            alert("Amount paid cannot be greater than total amount");
            return false;
        }
        
        if (elements.paymentType.value === 'credit' && !elements.dueDate.value) {
            alert("Please select due date for credit purchases");
            return false;
        }
    }
    
    return true;
}

async function uploadImageToImgBB(imageFile) {
    try {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Use your actual imgBB API key
        const apiKey = '0040c80066f01e3ed221aa25f355f762';
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let the browser set it with the boundary
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            const errorMsg = data.error?.message || 
                            data.error?.context || 
                            'Image upload failed without specific error message';
            throw new Error(`ImgBB Error: ${errorMsg} (Status: ${response.status})`);
        }
        
        return data.data.url;
    } catch (error) {
        console.error("Full upload error:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}

function savePurchase(purchaseData) {
    const isNew = !currentPurchaseId;
    const submitBtn = elements.savePurchase;
    const originalText = submitBtn.innerHTML;
    
    showLoading();
    
    // This would be replaced with your actual API call
    const scriptUrl = "https://script.google.com/macros/s/AKfycbzrXjUC62d6LsjiXfuMRNmx7UpOy116g8SIwzRfdNRHg0eNE7vHDkvgSky71Z4RrW1b/exec";
    
    fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(purchaseData)
    })
    .then(() => {
        // Update local data
        if (isNew) {
            allPurchases.push(purchaseData);
        } else {
            const index = allPurchases.findIndex(p => p.id === currentPurchaseId);
            if (index !== -1) {
                allPurchases[index] = purchaseData;
            }
        }
        
        // Update UI
        updateFilters();
        updateSummaryCards();
        renderChart();
        filterPurchases();
        
        // Show success message
        showSuccessMessage(`Purchase ${isNew ? 'added' : 'updated'} successfully!`);
        
        // Close modal
        closeModal();
    })
    .catch(error => {
        console.error("Error:", error);
        alert('Failed to save purchase. Please try again.');
    })
    .finally(() => {
        hideLoading();
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPurchases();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderPurchases();
    }
}

function closeModal() {
    elements.purchaseModal.style.display = 'none';
    elements.viewModal.style.display = 'none';
}

function showLoading() {
    elements.purchasesBody.innerHTML = `
        <tr>
            <td colspan="9" class="loading-spinner">
                <div class="spinner"></div>
                Loading purchases...
            </td>
        </tr>
    `;
}

function showError(message) {
    elements.purchasesBody.innerHTML = `
        <tr>
            <td colspan="9" class="error-message">
                ${message}
                <button onclick="loadPurchases()">Retry</button>
            </td>
        </tr>
    `;
}
