// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allTransactions = [];
let filteredTransactions = [];

document.addEventListener("DOMContentLoaded", function() {
    // Theme toggle
    document.getElementById("theme-toggle")?.addEventListener("click", function() {
        document.body.classList.toggle("dark-theme");
    });

    // Load transactions
    loadTransactions();

    // Setup event listeners
    document.getElementById("search-btn").addEventListener("click", filterTransactions);
    document.getElementById("search-input").addEventListener("keyup", function(e) {
        if (e.key === "Enter") filterTransactions();
    });
    document.getElementById("date-filter").addEventListener("change", filterTransactions);
    document.getElementById("payment-filter").addEventListener("change", filterTransactions);
    document.getElementById("prev-btn").addEventListener("click", goToPrevPage);
    document.getElementById("next-btn").addEventListener("click", goToNextPage);
    document.querySelector(".close").addEventListener("click", closeModal);
    document.getElementById("add-edit-item").addEventListener("click", addEditItem);
    document.getElementById("edit-form").addEventListener("submit", saveEditedTransaction);
});

async function loadTransactions() {
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec");
        const data = await response.json();
        
        // Process data from Google Sheets
        allTransactions = processSheetData(data);
        
        // Extract unique dates for filter
        const uniqueDates = [...new Set(allTransactions.map(t => t.date))].sort();
        const dateFilter = document.getElementById("date-filter");
        uniqueDates.forEach(date => {
            const option = document.createElement("option");
            option.value = date;
            option.textContent = date;
            dateFilter.appendChild(option);
        });
        
        filterTransactions();
    } catch (error) {
        console.error("Error loading transactions:", error);
        alert("Failed to load transactions. Please try again.");
    }
}

function processSheetData(sheetData) {
    // Group items by SI No since your sheet has one row per item
    const transactionsMap = new Map();
    
    // Skip header row if exists
    const startRow = sheetData[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        const siNo = row[2]; // SI No is at index 2
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                storeName: row[0],
                date: row[1],
                siNo: siNo,
                customerName: row[3],
                items: [],
                paymentMode: row[8],
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
        
        // Add item to transaction
        transactionsMap.get(siNo).items.push({
            itemName: row[4],
            quantity: parseFloat(row[5]) || 0,
            purchasePrice: parseFloat(row[6]) || 0,
            salePrice: parseFloat(row[7]) || 0
        });
    }
    
    return Array.from(transactionsMap.values());
}

function filterTransactions() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const dateFilter = document.getElementById("date-filter").value;
    const paymentFilter = document.getElementById("payment-filter").value;
    
    filteredTransactions = allTransactions.filter(transaction => {
        // Search filter
        const matchesSearch = 
            transaction.siNo.toLowerCase().includes(searchTerm) ||
            transaction.customerName.toLowerCase().includes(searchTerm) ||
            transaction.items.some(item => item.itemName.toLowerCase().includes(searchTerm));
        
        // Date filter
        const matchesDate = dateFilter === "" || transaction.date === dateFilter;
        
        // Payment filter
        const matchesPayment = paymentFilter === "" || transaction.paymentMode === paymentFilter;
        
        return matchesSearch && matchesDate && matchesPayment;
    });
    
    totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
    currentPage = 1;
    renderTransactions();
}

function renderTransactions() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageTransactions = filteredTransactions.slice(startIdx, endIdx);
    
    const tbody = document.getElementById("transactions-body");
    tbody.innerHTML = "";
    
    if (pageTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">No transactions found</td></tr>`;
        return;
    }
    
    pageTransactions.forEach(transaction => {
        const row = document.createElement("tr");
        
        // Count unique items
        const itemCount = transaction.items.length;
        const itemsSummary = itemCount === 1 
            ? transaction.items[0].itemName 
            : `${itemCount} items`;
        
        row.innerHTML = `
            <td>${transaction.siNo}</td>
            <td>${transaction.date}</td>
            <td>${transaction.customerName}</td>
            <td>${itemsSummary}</td>
            <td>₹${transaction.totalAmount.toFixed(2)}</td>
            <td>₹${transaction.totalProfit.toFixed(2)}</td>
            <td>${transaction.paymentMode}</td>
            <td class="actions">
                <button class="view-btn" data-si-no="${transaction.siNo}">View</button>
                <button class="edit-btn" data-si-no="${transaction.siNo}">Edit</button>
                <button class="delete-btn" data-si-no="${transaction.siNo}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update pagination info
    document.getElementById("page-info").textContent = 
        `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prev-btn").disabled = currentPage === 1;
    document.getElementById("next-btn").disabled = currentPage === totalPages;
    
    // Add event listeners to action buttons
    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", viewTransaction);
    });
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", editTransaction);
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", deleteTransaction);
    });
}

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

function viewTransaction(e) {
    const siNo = e.target.getAttribute("data-si-no");
    const transaction = allTransactions.find(t => t.siNo === siNo);
    
    if (!transaction) return;
    
    alert(`Transaction Details:\n
SI No: ${transaction.siNo}
Date: ${transaction.date}
Customer: ${transaction.customerName}
Items: ${transaction.items.map(i => `\n- ${i.itemName} (Qty: ${i.quantity}, Price: ₹${i.salePrice})`).join('')}
Total: ₹${transaction.totalAmount.toFixed(2)}
Profit: ₹${transaction.totalProfit.toFixed(2)}
Payment: ${transaction.paymentMode}`);
}

function editTransaction(e) {
    const siNo = e.target.getAttribute("data-si-no");
    const transaction = allTransactions.find(t => t.siNo === siNo);
    
    if (!transaction) return;
    
    // Populate modal
    document.getElementById("edit-si-no").value = transaction.siNo;
    document.getElementById("edit-customer").value = transaction.customerName;
    document.getElementById("edit-payment").value = transaction.paymentMode;
    
    // Clear and add items
    const itemsContainer = document.getElementById("edit-items-container");
    itemsContainer.innerHTML = "";
    
    transaction.items.forEach((item, index) => {
        addEditItem(item);
    });
    
    // Update totals
    updateEditTotals();
    
    // Show modal
    document.getElementById("edit-modal").style.display = "block";
}

function addEditItem(itemData = null) {
    const itemsContainer = document.getElementById("edit-items-container");
    const itemDiv = document.createElement("div");
    itemDiv.className = "edit-item";
    
    itemDiv.innerHTML = `
        <div class="form-group">
            <label>Item Name:</label>
            <input type="text" class="edit-item-name" value="${itemData?.itemName || ''}" required>
        </div>
        <div class="form-group">
            <label>Quantity:</label>
            <input type="number" class="edit-quantity" min="1" value="${itemData?.quantity || 1}" required>
        </div>
        <div class="form-group">
            <label>Purchase Price:</label>
            <input type="number" class="edit-purchase-price" min="0" step="0.01" value="${itemData?.purchasePrice || 0}" required>
        </div>
        <div class="form-group">
            <label>Sale Price:</label>
            <input type="number" class="edit-sale-price" min="0" step="0.01" value="${itemData?.salePrice || 0}" required>
        </div>
        <button type="button" class="remove-edit-item">Remove</button>
    `;
    
    itemsContainer.appendChild(itemDiv);
    
    // Add event listeners for calculations
    itemDiv.querySelector(".edit-quantity").addEventListener("input", updateEditTotals);
    itemDiv.querySelector(".edit-sale-price").addEventListener("input", updateEditTotals);
    itemDiv.querySelector(".edit-purchase-price").addEventListener("input", updateEditTotals);
    itemDiv.querySelector(".remove-edit-item").addEventListener("click", function() {
        itemDiv.remove();
        updateEditTotals();
    });
}

function updateEditTotals() {
    let totalAmount = 0;
    let totalProfit = 0;
    
    document.querySelectorAll(".edit-item").forEach(itemDiv => {
        const quantity = parseFloat(itemDiv.querySelector(".edit-quantity").value) || 0;
        const salePrice = parseFloat(itemDiv.querySelector(".edit-sale-price").value) || 0;
        const purchasePrice = parseFloat(itemDiv.querySelector(".edit-purchase-price").value) || 0;
        
        totalAmount += quantity * salePrice;
        totalProfit += quantity * (salePrice - purchasePrice);
    });
    
    document.getElementById("edit-total").textContent = totalAmount.toFixed(2);
    document.getElementById("edit-profit").textContent = totalProfit.toFixed(2);
}

async function saveEditedTransaction(e) {
    e.preventDefault();
    
    const siNo = document.getElementById("edit-si-no").value;
    const customerName = document.getElementById("edit-customer").value.trim();
    const paymentMode = document.getElementById("edit-payment").value;
    
    if (!customerName) {
        alert("Please enter customer name");
        return;
    }
    
    const items = [];
    let isValid = true;
    
    document.querySelectorAll(".edit-item").forEach(itemDiv => {
        const itemName = itemDiv.querySelector(".edit-item-name").value.trim();
        const quantity = itemDiv.querySelector(".edit-quantity").value;
        const purchasePrice = itemDiv.querySelector(".edit-purchase-price").value;
        const salePrice = itemDiv.querySelector(".edit-sale-price").value;
        
        if (!itemName || !quantity || !salePrice) {
            isValid = false;
            itemDiv.style.border = "1px solid red";
        } else {
            itemDiv.style.border = "";
            items.push({
                itemName,
                quantity,
                purchasePrice,
                salePrice
            });
        }
    });
    
    if (!isValid || items.length === 0) {
        alert("Please check all item fields");
        return;
    }
    
    const totalAmount = parseFloat(document.getElementById("edit-total").textContent);
    const totalProfit = parseFloat(document.getElementById("edit-profit").textContent);
    
    const transactionData = {
        siNo,
        customerName,
        paymentMode,
        items,
        totalAmount,
        totalProfit
    };
    
    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.text();
        if (result === "Updated") {
            alert("Transaction updated successfully!");
            closeModal();
            loadTransactions(); // Refresh data
        } else {
            throw new Error(result);
        }
    } catch (error) {
        console.error("Error updating transaction:", error);
        alert("Failed to update transaction. Please try again.");
    }
}

async function deleteTransaction(e) {
    const siNo = e.target.getAttribute("data-si-no");
    
    if (!confirm(`Are you sure you want to delete transaction ${siNo}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=delete&siNo=${encodeURIComponent(siNo)}`);
        const result = await response.text();
        
        if (result === "Deleted") {
            alert("Transaction deleted successfully!");
            loadTransactions(); // Refresh data
        } else {
            throw new Error(result);
        }
    } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Failed to delete transaction. Please try again.");
    }
}

function closeModal() {
    document.getElementById("edit-modal").style.display = "none";
}

// Close modal when clicking outside
window.addEventListener("click", function(e) {
    if (e.target === document.getElementById("edit-modal")) {
        closeModal();
    }
});
