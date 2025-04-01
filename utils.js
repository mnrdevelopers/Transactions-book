// utils.js - Shared utility functions

/**
 * Processes raw sheet data into structured transaction objects
 * @param {Array} sheetData - Raw data from Google Sheets
 * @returns {Array} Processed transactions
 */
function processSheetData(sheetData) {
    if (!Array.isArray(sheetData)) {
        console.error("Invalid sheet data:", sheetData);
        return [];
    }
}

    const transactionsMap = new Map();
    
    // Skip header row if it exists
    const startRow = sheetData.length > 0 && sheetData[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || row.length < 11) continue; // Skip invalid rows
        
        const siNo = String(row[2] || "").trim();
        const date = parseDate(row[1]);
        
        if (!transactionsMap.has(siNo)) {
            transactionsMap.set(siNo, {
                storeName: String(row[0] || ""),
                date: date,
                dateString: formatDateForDisplay(date),
                siNo: siNo,
                customerName: String(row[3] || ""),
                items: [],
                paymentMode: String(row[8] || ""),
                totalAmount: parseFloat(row[9]) || 0,
                totalProfit: parseFloat(row[10]) || 0
            });
        }
        
        transactionsMap.get(siNo).items.push({
            itemName: String(row[4] || ""),
            quantity: parseFloat(row[5]) || 0,
            purchasePrice: parseFloat(row[6]) || 0,
            salePrice: parseFloat(row[7]) || 0,
            itemTotal: (parseFloat(row[5]) || 0) * (parseFloat(row[7]) || 0)
        });
    }
    
    return Array.from(transactionsMap.values());
}

/**
 * Parses various date formats into Date objects
 * @param {string|Date} dateValue - Date value to parse
 * @returns {Date} Parsed date
 */
function parseDate(dateValue) {
    // If it's already a valid Date object, return it
    if (dateValue instanceof Date && !isNaN(dateValue)) {
        return dateValue;
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
        // Try ISO format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            const parts = dateValue.split('-');
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        
        // Try Indian format (DD/MM/YYYY)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            const parts = dateValue.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    
    console.warn("Could not parse date:", dateValue);
    return new Date(); // Fallback to current date
}

/**
 * Formats a date for display in Indian format
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
function formatDateForDisplay(date, options) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.warn("Invalid date provided to formatDateForDisplay:", date);
        return "Invalid Date";
    }
    
    const defaultOptions = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        ...options
    };
    
    try {
        return date.toLocaleDateString('en-IN', defaultOptions);
    } catch (error) {
        console.error("Error formatting date:", error);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

/**
 * Gets the week number for a date (ISO week numbering)
 * @param {Date} date - Date to get week number for
 * @returns {number} Week number
 */
function getWeekNumber(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.warn("Invalid date provided to getWeekNumber:", date);
        return 0;
    }
    
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Shows a loading indicator in the specified container
 * @param {HTMLElement} container - DOM element to show spinner in
 */
function showLoading(container) {
    if (!container || !container.innerHTML) {
        console.warn("Invalid container provided to showLoading");
        return;
    }
    
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Loading...
        </div>
    `;
}

// Export functions if using ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        processSheetData,
        parseDate,
        formatDateForDisplay,
        getWeekNumber,
        showLoading
    };
}
