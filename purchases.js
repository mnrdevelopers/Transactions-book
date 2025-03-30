// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allPurchases = [];
let filteredPurchases = [];
let purchaseChart = null;
let currentPurchaseId = null;

// DOM Elements
const elements = {
    // Summary Cards
    totalPurchases: document.getElementById("total-purchases"),
    creditDue: document.getElementById("credit-due"),
    stockValue: document.getElementById("stock-value"),
    suppliersCount: document.getElementById("suppliers-count"),
    
    // Purchase Form
    purchaseForm: document.getElementById("purchase-form"),
    purchaseDate: document.getElementById("purchase-date"),
    supplierName: document.getElementById("supplier-name"),
    supplierContact: document.getElementById("supplier-contact"),
    billNumber: document.getElementById("bill-number"),
    paymentMode: document.getElementById("payment-mode"),
    dueDate: document.getElementById("due-date"),
    dueDateContainer: document.getElementById("due-date-container"),
    billAmount: document.getElementById("bill-amount"),
    paidAmount: document.getElementById("paid-amount"),
    balanceAmount: document.getElementById("balance-amount"),
    billImage: document.getElementById("bill-image"),
    purchaseNotes: document.getElementById("purchase-notes"),
    purchaseItemsContainer: document.getElementById("purchase-items-container"),
    addPurchaseItemBtn: document.getElementById("add-purchase-item"),
    
    // Purchase Table
    purchaseSupplierFilter: document.getElementById("purchase-supplier-filter"),
    purchasePaymentFilter: document.getElementById("purchase-payment-filter"),
    purchaseStatusFilter: document.getElementById("purchase-status-filter"),
    purchaseSearch: document.getElementById("purchase-search"),
    purchaseSearchBtn: document.getElementById("purchase-search-btn"),
    purchasesBody: document.getElementById("purchases-body"),
    purchasePrevBtn: document.getElementById("purchase-prev-btn"),
    purchaseNextBtn: document.getElementById("purchase-next-btn"),
    purchasePageInfo: document.getElementById("purchase-page-info"),
    
    // Modals
    purchaseModal: document.getElementById("purchase-modal"),
    paymentModal: document.getElementById("payment-modal"),
    modalTitle: document.getElementById("modal-title"),
    purchaseDetails: document.getElementById("purchase-details"),
    billImageContainer: document.getElementById("bill-image-container"),
    makePaymentBtn: document.getElementById("make-payment-btn"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    paymentForm: document.getElementById("payment-form"),
    paymentDate: document.getElementById("payment-date"),
    paymentAmount: document.getElementById("payment-amount"),
    paymentModeInput: document.getElementById("payment-mode-input"),
    paymentReference: document.getElementById("payment-reference"),
    paymentNotes: document.getElementById("payment-notes"),
    cancelPaymentBtn: document.getElementById("cancel-payment-btn"),
    
    // Chart
    purchaseChart: document.getElementById("purchase-chart")
};

// Initialize the page
document.addEventListener("DOMContentLoaded", function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.purchaseDate.value = today;
    elements.paymentDate.value = today;
    
    // Load initial data
    loadPurchases();
    loadSuppliers();
    updateSummaryCards();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Payment mode change
    elements.paymentMode.addEventListener("change", function() {
        if (this.value === "Credit") {
            elements.dueDateContainer.style.display = "block";
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // Default 30 days credit
            elements.dueDate.value = dueDate.toISOString().split('T')[0];
        } else {
            elements.dueDateContainer.style.display = "none";
        }
        calculateBalance();
    });
    
    // Amount calculations
    elements.billAmount.addEventListener("input", calculateBalance);
    elements.paidAmount.addEventListener("input", calculateBalance);
    
    // Add purchase item
    elements.addPurchaseItemBtn.addEventListener("click", addPurchaseItem);
    
    // Form submission
    elements.purchaseForm.addEventListener("submit", handlePurchaseSubmit);
    
    // Table filters
    elements.purchaseSupplierFilter.addEventListener("change", filterPurchases);
    elements.purchasePaymentFilter.addEventListener("change", filterPurchases);
    elements.purchaseStatusFilter.addEventListener("change", filterPurchases);
    elements.purchaseSearch.addEventListener("keyup", function(e) {
        if (e.key === "Enter") filterPurchases();
    });
    elements.purchaseSearchBtn.addEventListener("click", filterPurchases);
    
    // Pagination
    elements.purchasePrevBtn.addEventListener("click", goToPrevPage);
    elements.purchaseNextBtn.addEventListener("click", goToNextPage);
    
    // Modal controls
    document.querySelectorAll(".close").forEach(btn => {
        btn.addEventListener("click", closeModal);
    });
    elements.closeModalBtn.addEventListener("click", closeModal);
    elements.cancelPaymentBtn.addEventListener("click", function() {
        closeModal();
        elements.purchaseModal.style.display = "flex";
    });
    
    // Payment actions
    elements.makePaymentBtn.addEventListener("click", function() {
        elements.purchaseModal.style.display = "none";
        elements.paymentModal.style.display = "flex";
    });
    
    elements.paymentForm.addEventListener("submit", handlePaymentSubmit);
}

function calculateBalance() {
    const billAmount = parseFloat(elements.billAmount.value) || 0;
    const paidAmount = parseFloat(elements.paidAmount.value) || 0;
    const balance = billAmount - paidAmount;
    elements.balanceAmount.value = balance.toFixed(2);
}

function addPurchaseItem() {
    const itemDiv = document.createElement("div");
    itemDiv.className = "purchase-item";
    itemDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Item Name</label>
                <input type="text" class="item-name" required>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="item-qty" min="1" value="1" required>
            </div>
            <div class="form-group">
                <label>Unit Price (₹)</label>
                <input type="number" class="item-price" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Total (₹)</label>
                <input type="number" class="item-total" readonly>
            </div>
            <div class="form-group">
                <label>&nbsp;</label>
                <button type="button" class="remove-item"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
    
    elements.purchaseItemsContainer.appendChild(itemDiv);
    
    // Add event listeners for calculations
    const qtyInput = itemDiv.querySelector(".item-qty");
    const priceInput = itemDiv.querySelector(".item-price");
    const totalInput = itemDiv.querySelector(".item-total");
    
    qtyInput.addEventListener("input", calculateItemTotal);
    priceInput.addEventListener("input", calculateItemTotal);
    
    function calculateItemTotal() {
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        totalInput.value = (qty * price).toFixed(2);
    }
    
    // Add remove event
    itemDiv.querySelector(".remove-item").addEventListener("click", function() {
        itemDiv.remove();
    });
}

async function loadPurchases() {
    try {
        showLoading();
        
        // This would be replaced with your actual API call to Google Sheets
        const scriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getPurchases";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allPurchases = processPurchaseData(data);
        
        // Update filters
        updateSupplierFilter();
        
        // Initial filter and render
        filterPurchases();
        
        // Update chart
        updatePurchaseChart();
        
        // Update summary cards
        updateSummaryCards();
    } catch (error) {
        console.error("Error loading purchases:", error);
        showError("Failed to load purchases. Please try again.");
    }
}

function processPurchaseData(data) {
    // Process data from Google Sheets
    // This assumes your sheet has columns in this order:
    // ID, Date, Supplier, Contact, BillNo, Items, BillAmount, PaidAmount, Balance, 
    // PaymentMode, DueDate, Status, Notes, ImageURL, CreatedAt
    
    return data.map(row => {
        return {
            id: row[0],
            date: formatDate(row[1]),
            dateString: formatDateForDisplay(row[1]),
            supplier: row[2],
            contact: row[3],
            billNumber: row[4],
            items: JSON.parse(row[5] || '[]'),
            billAmount: parseFloat(row[6]) || 0,
            paidAmount: parseFloat(row[7]) || 0,
            balance: parseFloat(row[8]) || 0,
            paymentMode: row[9],
            dueDate: row[10] ? formatDateForDisplay(row[10]) : null,
            status: row[11] || (parseFloat(row[8]) > 0 ? "Pending" : "Paid"),
            notes: row[12],
            imageUrl: row[13],
            createdAt: row[14]
        };
    });
}

function formatDate(dateString) {
    // Format date from Google Sheets to JavaScript Date object
    if (!dateString) return new Date();
    
    // Try different date formats
    const date = new Date(dateString);
    if (!isNaN(date)) return date;
    
    // Try common spreadsheet formats
    const parts = dateString.split(/[-/]/);
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    // Fallback to current date
    return new Date();
}

function formatDateForDisplay(dateString) {
    const date = formatDate(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function updateSupplierFilter() {
    const uniqueSuppliers = [...new Set(allPurchases.map(p => p.supplier))].sort();
    
    elements.purchaseSupplierFilter.innerHTML = '<option value="">All Suppliers</option>';
    uniqueSuppliers.forEach(supplier => {
        const option = document.createElement("option");
        option.value = supplier;
        option.textContent = supplier;
        elements.purchaseSupplierFilter.appendChild(option);
    });
}

function loadSuppliers() {
    // Load suppliers from localStorage or Google Sheets
    const savedSuppliers = localStorage.getItem('rkFashionsSuppliers');
    if (savedSuppliers) {
        const suppliers = JSON.parse(savedSuppliers);
        updateSupplierDatalist(suppliers);
    }
    
    // This would be replaced with your actual API call to Google Sheets
    const scriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getSuppliers";
    fetch(scriptUrl)
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            const suppliers = data.map(row => row[0]); // Assuming first column is supplier name
            updateSupplierDatalist(suppliers);
            localStorage.setItem('rkFashionsSuppliers', JSON.stringify(suppliers));
        })
        .catch(error => {
            console.error("Error loading suppliers:", error);
        });
}

function updateSupplierDatalist(suppliers) {
    elements.supplierList.innerHTML = '';
    suppliers.forEach(supplier => {
        const option = document.createElement("option");
        option.value = supplier;
        elements.supplierList.appendChild(option);
    });
}

function filterPurchases() {
    const supplierFilter = elements.purchaseSupplierFilter.value;
    const paymentFilter = elements.purchasePaymentFilter.value;
    const statusFilter = elements.purchaseStatusFilter.value;
    const searchTerm = elements.purchaseSearch.value.toLowerCase();
    
    filteredPurchases = allPurchases.filter(purchase => {
        // Supplier filter
        const matchesSupplier = supplierFilter === "" || purchase.supplier === supplierFilter;
        
        // Payment mode filter
        const matchesPayment = paymentFilter === "" || purchase.paymentMode === paymentFilter;
        
        // Status filter
        const matchesStatus = statusFilter === "" || purchase.status === statusFilter;
        
        // Search term
        const matchesSearch = searchTerm === "" || 
            purchase.supplier.toLowerCase().includes(searchTerm) ||
            purchase.billNumber.toLowerCase().includes(searchTerm) ||
            purchase.notes.toLowerCase().includes(searchTerm);
        
        return matchesSupplier && matchesPayment && matchesStatus && matchesSearch;
    });
    
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
                <td colspan="9" class="no-results">
                    No purchases found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    pagePurchases.forEach(purchase => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${purchase.dateString}</td>
            <td>${purchase.supplier}</td>
            <td>${purchase.billNumber}</td>
            <td>₹${purchase.billAmount.toFixed(2)}</td>
            <td>₹${purchase.paidAmount.toFixed(2)}</td>
            <td>₹${purchase.balance.toFixed(2)}</td>
            <td>${purchase.paymentMode}</td>
            <td><span class="status-badge ${purchase.status.toLowerCase()}">${purchase.status}</span></td>
            <td class="actions">
                <button class="view-btn" data-id="${purchase.id}"><i class="fas fa-eye"></i></button>
                <button class="edit-btn" data-id="${purchase.id}"><i class="fas fa-edit"></i></button>
            </td>
        `;
        elements.purchasesBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination();
    
    // Add event listeners to action buttons
    setupRowEventListeners();
}

function setupRowEventListeners() {
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", viewPurchaseDetails);
    });
    
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", editPurchase);
    });
}

function viewPurchaseDetails(e) {
    const purchaseId = e.currentTarget.getAttribute("data-id");
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    // Format items as a table
    const itemsHtml = purchase.items.length > 0 ? `
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${purchase.items.map(item => `
                    <tr>
                        <td>${item.name || ''}</td>
                        <td>${item.quantity || 0}</td>
                        <td>₹${(item.price || 0).toFixed(2)}</td>
                        <td>₹${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    ` : '<p>No items recorded</p>';
    
    // Create purchase details HTML
    elements.purchaseDetails.innerHTML = `
        <div class="transaction-header">
            <p><strong>Date:</strong> ${purchase.dateString}</p>
            <p><strong>Supplier:</strong> ${purchase.supplier}</p>
            <p><strong>Contact:</strong> ${purchase.contact || 'N/A'}</p>
            <p><strong>Bill No:</strong> ${purchase.billNumber}</p>
            <p><strong>Payment Mode:</strong> ${purchase.paymentMode}</p>
            ${purchase.dueDate ? `<p><strong>Due Date:</strong> ${purchase.dueDate}</p>` : ''}
            <p><strong>Status:</strong> <span class="status-badge ${purchase.status.toLowerCase()}">${purchase.status}</span></p>
        </div>
        
        <div class="transaction-items">
            ${itemsHtml}
        </div>
        
        <div class="transaction-totals">
            <p><strong>Bill Amount:</strong> ₹${purchase.billAmount.toFixed(2)}</p>
            <p><strong>Paid Amount:</strong> ₹${purchase.paidAmount.toFixed(2)}</p>
            <p><strong>Balance Due:</strong> ₹${purchase.balance.toFixed(2)}</p>
        </div>
        
        ${purchase.notes ? `<div class="transaction-notes"><p><strong>Notes:</strong> ${purchase.notes}</p></div>` : ''}
    `;
    
    // Show bill image if available
    elements.billImageContainer.innerHTML = '';
    if (purchase.imageUrl) {
        const img = document.createElement("img");
        img.src = purchase.imageUrl;
        img.alt = "Bill Image";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "300px";
        elements.billImageContainer.appendChild(img);
    }
    
    // Set current purchase ID
    currentPurchaseId = purchase.id;
    
    // Show/hide payment button based on status
    elements.makePaymentBtn.style.display = purchase.balance > 0 ? "block" : "none";
    
    // Show modal
    elements.modalTitle.textContent = `Purchase #${purchase.billNumber}`;
    elements.purchaseModal.style.display = "flex";
}

function editPurchase(e) {
    const purchaseId = e.currentTarget.getAttribute("data-id");
    const purchase = allPurchases.find(p => p.id === purchaseId);
    
    if (!purchase) return;
    
    // Fill form with purchase data
    elements.purchaseDate.value = purchase.date.split('T')[0];
    elements.supplierName.value = purchase.supplier;
    elements.supplierContact.value = purchase.contact || '';
    elements.billNumber.value = purchase.billNumber;
    elements.paymentMode.value = purchase.paymentMode;
    
    if (purchase.paymentMode === "Credit" && purchase.dueDate) {
        const dueDate = new Date(purchase.dueDate);
        elements.dueDate.value = dueDate.toISOString().split('T')[0];
        elements.dueDateContainer.style.display = "block";
    } else {
        elements.dueDateContainer.style.display = "none";
    }
    
    elements.billAmount.value = purchase.billAmount.toFixed(2);
    elements.paidAmount.value = purchase.paidAmount.toFixed(2);
    elements.balanceAmount.value = purchase.balance.toFixed(2);
    elements.purchaseNotes.value = purchase.notes || '';
    
    // Clear existing items and add new ones
    elements.purchaseItemsContainer.innerHTML = '';
    purchase.items.forEach(item => {
        addPurchaseItem();
        const lastItem = elements.purchaseItemsContainer.lastElementChild;
        lastItem.querySelector(".item-name").value = item.name || '';
        lastItem.querySelector(".item-qty").value = item.quantity || 0;
        lastItem.querySelector(".item-price").value = item.price || 0;
        lastItem.querySelector(".item-total").value = ((item.quantity || 0) * (item.price || 0)).toFixed(2);
    });
    
    // Set current purchase ID for update
    currentPurchaseId = purchase.id;
    
    // Scroll to form
    elements.purchaseForm.scrollIntoView({ behavior: 'smooth' });
}

function updatePagination() {
    elements.purchasePageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.purchasePrevBtn.disabled = currentPage === 1;
    elements.purchaseNextBtn.disabled = currentPage === totalPages || totalPages === 0;
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
    elements.purchaseModal.style.display = "none";
    elements.paymentModal.style.display = "none";
}

function updateSummaryCards() {
    // Calculate total purchases
    const totalPurchases = allPurchases.reduce((sum, purchase) => sum + purchase.billAmount, 0);
    elements.totalPurchases.textContent = `₹${totalPurchases.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    // Calculate credit due
    const creditDue = allPurchases.reduce((sum, purchase) => sum + purchase.balance, 0);
    elements.creditDue.textContent = `₹${creditDue.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    // Calculate stock value (simplified - would need actual inventory data)
    const stockValue = allPurchases.reduce((sum, purchase) => {
        return sum + purchase.items.reduce((itemSum, item) => {
            return itemSum + ((item.quantity || 0) * (item.price || 0));
        }, 0);
    }, 0);
    elements.stockValue.textContent = `₹${stockValue.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    
    // Count unique suppliers
    const suppliersCount = new Set(allPurchases.map(p => p.supplier)).size;
    elements.suppliersCount.textContent = suppliersCount;
}

function updatePurchaseChart() {
    // Group purchases by month for the chart
    const monthlyData = {};
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Initialize for last 6 months
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthYear = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        monthlyData[monthYear] = { total: 0, credit: 0 };
    }
    
    // Process purchases
    allPurchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.date);
        const monthYear = purchaseDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        
        if (monthlyData[monthYear]) {
            monthlyData[monthYear].total += purchase.billAmount;
            if (purchase.paymentMode === "Credit") {
                monthlyData[monthYear].credit += purchase.billAmount;
            }
        }
    });
    
    // Prepare chart data
    const labels = Object.keys(monthlyData);
    const totalData = labels.map(label => monthlyData[label].total);
    const creditData = labels.map(label => monthlyData[label].credit);
    
    // Create or update chart
    if (purchaseChart) {
        purchaseChart.data.labels = labels;
        purchaseChart.data.datasets[0].data = totalData;
        purchaseChart.data.datasets[1].data = creditData;
        purchaseChart.update();
    } else {
        const ctx = elements.purchaseChart.getContext('2d');
        purchaseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Purchases',
                        data: totalData,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Credit Purchases',
                        data: creditData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
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
}

function handlePurchaseSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validatePurchaseForm()) return;
    
    // Prepare purchase data
    const purchaseData = {
        date: elements.purchaseDate.value,
        supplier: elements.supplierName.value,
        contact: elements.supplierContact.value,
        billNumber: elements.billNumber.value,
        paymentMode: elements.paymentMode.value,
        billAmount: parseFloat(elements.billAmount.value),
        paidAmount: parseFloat(elements.paidAmount.value),
        balance: parseFloat(elements.balanceAmount.value),
        dueDate: elements.paymentMode.value === "Credit" ? elements.dueDate.value : null,
        notes: elements.purchaseNotes.value,
        items: []
    };
    
    // Collect items
    document.querySelectorAll(".purchase-item").forEach(itemDiv => {
        purchaseData.items.push({
            name: itemDiv.querySelector(".item-name").value,
            quantity: parseFloat(itemDiv.querySelector(".item-qty").value),
            price: parseFloat(itemDiv.querySelector(".item-price").value)
        });
    });
    
    // Handle bill image upload
    const file = elements.billImage.files[0];
    if (file) {
        uploadBillImage(file)
            .then(imageUrl => {
                purchaseData.imageUrl = imageUrl;
                savePurchase(purchaseData);
            })
            .catch(error => {
                console.error("Error uploading image:", error);
                alert("Error uploading bill image. The purchase will be saved without the image.");
                savePurchase(purchaseData);
            });
    } else {
        savePurchase(purchaseData);
    }
}

function validatePurchaseForm() {
    // Check required fields
    if (!elements.supplierName.value.trim()) {
        alert("Please enter supplier name");
        return false;
    }
    
    if (!elements.billNumber.value.trim()) {
        alert("Please enter bill number");
        return false;
    }
    
    if (isNaN(elements.billAmount.value) || parseFloat(elements.billAmount.value) <= 0) {
        alert("Please enter a valid bill amount");
        return false;
    }
    
    if (isNaN(elements.paidAmount.value) || parseFloat(elements.paidAmount.value) < 0) {
        alert("Please enter a valid paid amount");
        return false;
    }
    
    // Check at least one item exists
    if (document.querySelectorAll(".purchase-item").length === 0) {
        alert("Please add at least one item");
        return false;
    }
    
    // Validate all items
    let valid = true;
    document.querySelectorAll(".purchase-item").forEach(itemDiv => {
        const name = itemDiv.querySelector(".item-name").value;
        const qty = itemDiv.querySelector(".item-qty").value;
        const price = itemDiv.querySelector(".item-price").value;
        
        if (!name || !qty || !price || isNaN(qty) || isNaN(price)) {
            itemDiv.style.border = "1px solid red";
            valid = false;
        } else {
            itemDiv.style.border = "";
        }
    });
    
    if (!valid) {
        alert("Please check all item fields");
        return false;
    }
    
    return true;
}

function uploadBillImage(file) {
    return new Promise((resolve, reject) => {
        // In a real implementation, this would upload to Google Drive via Apps Script
        // For demo purposes, we'll just create a mock URL
        setTimeout(() => {
            const mockUrl = URL.createObjectURL(file);
            resolve(mockUrl);
            
            // Actual implementation would look like:
            /*
            const formData = new FormData();
            formData.append('file', file);
            
            fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=uploadImage", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => resolve(data.url))
            .catch(error => reject(error));
            */
        }, 1000);
    });
}

function savePurchase(purchaseData) {
    const submitBtn = document.querySelector("#purchase-form [type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Add/update ID for existing purchase
    if (currentPurchaseId) {
        purchaseData.id = currentPurchaseId;
    }
    
    // Determine status
    purchaseData.status = purchaseData.balance > 0 ? 
        (new Date(purchaseData.dueDate) < new Date() ? "Overdue" : "Pending") : 
        "Paid";
    
    // This would be replaced with your actual API call to Google Sheets
    const scriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=savePurchase";
    fetch(scriptUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(purchaseData)
    })
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(data => {
        // Reset form
        elements.purchaseForm.reset();
        elements.purchaseItemsContainer.innerHTML = '';
        currentPurchaseId = null;
        elements.dueDateContainer.style.display = "none";
        
        // Reload purchases
        loadPurchases();
        
        alert("Purchase saved successfully!");
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error saving purchase. Please try again.");
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
}

function handlePaymentSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!elements.paymentAmount.value || parseFloat(elements.paymentAmount.value) <= 0) {
        alert("Please enter a valid payment amount");
        return;
    }
    
    const paymentData = {
        purchaseId: currentPurchaseId,
        date: elements.paymentDate.value,
        amount: parseFloat(elements.paymentAmount.value),
        mode: elements.paymentModeInput.value,
        reference: elements.paymentReference.value,
        notes: elements.paymentNotes.value
    };
    
    // This would be replaced with your actual API call to Google Sheets
    const scriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=savePayment";
    fetch(scriptUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(paymentData)
    })
    .then(response => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
    })
    .then(data => {
        // Reset form
        elements.paymentForm.reset();
        closeModal();
        
        // Reload purchases
        loadPurchases();
        
        alert("Payment recorded successfully!");
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error recording payment. Please try again.");
    });
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
