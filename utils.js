// utils.js - Shared utility functions

/**
 * Processes raw sheet data into structured transaction objects
 * @param {Array} sheetData - Raw data from Google Sheets
 * @returns {Array} Processed transactions
 */
function processSheetData(sheetData) {
    const transactionsMap = new Map();
    
    // Skip header row if it exists
    const startRow = sheetData[0][0] === "Store Name" ? 1 : 0;
    
    for (let i = startRow; i < sheetData.length; i++) {
        const row = sheetData[i];
        const siNo = String(row[2] || "").trim(); // Ensure SI No is a string
        const date = parseDate(row[1]); // Use the proper parseDate function
        
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

/**
 * Parses various date formats into Date objects
 * @param {string|Date} dateValue - Date value to parse
 * @returns {Date} Parsed date
 */
function parseDate(dateValue) {
    // If it's already a Date object, return it
    if (dateValue instanceof Date && !isNaN(dateValue)) {
        return dateValue;
    }
    
    // If it's in ISO format (YYYY-MM-DD)
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const parts = dateValue.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    
    // Fallback to current date
    console.warn("Could not parse date:", dateValue);
    return new Date();
}

/**
 * Formats a date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(date) {
    try {
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch {
        return "Invalid Date";
    }
}

/**
 * Gets the week number for a date
 * @param {Date} date - Date to get week number for
 * @returns {number} Week number
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Export functions if using ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        processSheetData,
        parseDate,
        formatDateForDisplay,
        getWeekNumber
    };
}

// Format date for display
function formatDateForDisplay(date) {
    try {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('en-IN', options);
    } catch {
        return "Invalid Date";
    }
}

// Get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Show loading indicator
function showLoading(container) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            Loading...
        </div>
    `;
}
