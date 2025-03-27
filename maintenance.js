// Configuration
const PAGE_SIZE = 10;
let currentPage = 1;
let totalPages = 1;
let allMaintenance = [];

// DOM Elements
const elements = {
    form: document.getElementById("maintenance-form"),
    dateInput: document.getElementById("maintenance-date"),
    amountInput: document.getElementById("maintenance-amount"),
    descriptionInput: document.getElementById("maintenance-description"),
    categoryInput: document.getElementById("maintenance-category"),
    tableBody: document.getElementById("maintenance-body"),
    prevBtn: document.getElementById("maintenance-prev-btn"),
    nextBtn: document.getElementById("maintenance-next-btn"),
    pageInfo: document.getElementById("maintenance-page-info")
};

// Initialize
document.addEventListener("DOMContentLoaded", function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    elements.dateInput.value = today;
    
    // Theme toggle
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    
    // Load saved theme
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-theme');
    }
    
    // Load maintenance records
    loadMaintenance();
    
    // Form submission
    elements.form.addEventListener("submit", submitMaintenance);
    
    // Pagination
    elements.prevBtn.addEventListener("click", goToPrevPage);
    elements.nextBtn.addEventListener("click", goToPrevPage);
});

async function loadMaintenance() {
    try {
        showLoading();
        
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=getMaintenance";
        const response = await fetch(scriptUrl);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        allMaintenance = data.map(item => ({
            id: item[0],
            date: formatDate(item[1]),
            amount: parseFloat(item[2]),
            description: item[3],
            category: item[4]
        }));
        
        renderMaintenance();
    } catch (error) {
        console.error("Error loading maintenance:", error);
        showError("Failed to load maintenance records. Please try again.");
    }
}

async function submitMaintenance(e) {
    e.preventDefault();
    
    const maintenanceData = {
        date: elements.dateInput.value,
        amount: elements.amountInput.value,
        description: elements.descriptionInput.value,
        category: elements.categoryInput.value
    };
    
    try {
        const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=addMaintenance";
        const response = await fetch(scriptUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(maintenanceData)
        });
        
        if (!response.ok) throw new Error("Failed to save maintenance");
        
        // Reset form and reload data
        elements.form.reset();
        elements.dateInput.value = new Date().toISOString().split('T')[0];
        loadMaintenance();
    } catch (error) {
        console.error("Error saving maintenance:", error);
        alert("Failed to save maintenance record. Please try again.");
    }
}

function renderMaintenance() {
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = startIdx + PAGE_SIZE;
    const pageData = allMaintenance.slice(startIdx, endIdx);
    
    elements.tableBody.innerHTML = "";
    
    if (pageData.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">
                    No maintenance records found
                </td>
            </tr>
        `;
        return;
    }
    
    pageData.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.date}</td>
            <td>₹${item.amount.toFixed(2)}</td>
            <td>${item.description}</td>
            <td>${item.category}</td>
            <td class="actions">
                <button class="delete-btn" data-id="${item.id}">Delete</button>
            </td>
        `;
        elements.tableBody.appendChild(row);
    });
    
    // Update pagination
    totalPages = Math.max(1, Math.ceil(allMaintenance.length / PAGE_SIZE));
    updatePagination();
    
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", deleteMaintenance);
    });
}

async function deleteMaintenance(e) {
    const id = e.target.getAttribute("data-id");
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;
    
    try {
        const scriptUrl = `https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec?action=deleteMaintenance&id=${id}`;
        const response = await fetch(scriptUrl);
        
        if (!response.ok) throw new Error("Failed to delete maintenance");
        
        loadMaintenance();
    } catch (error) {
        console.error("Error deleting maintenance:", error);
        alert("Failed to delete maintenance record. Please try again.");
    }
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevBtn.disabled = currentPage === 1;
    elements.nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderMaintenance();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderMaintenance();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
}

function showLoading() {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-spinner">
                <div class="spinner"></div>
                Loading maintenance records...
            </td>
        </tr>
    `;
}

function showError(message) {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="error-message">
                ${message}
                <button onclick="loadMaintenance()">Retry</button>
            </td>
        </tr>
    `;
}
