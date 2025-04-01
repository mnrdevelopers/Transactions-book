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

/**
 * Parses various date formats into Date objects
 * @param {string|Date} dateValue - Date value to parse
 * @returns {Date} Parsed date
 */
function parseDate(dateValue) {
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'string') {
        // Try DD/MM/YYYY format first (as shown in your screenshot)
        const parts = dateValue.split('/');
        if (parts.length === 3) {
            // Note: months are 0-based in JavaScript Date
            const date = new Date(parts[2], parts[1] - 1, parts[0]);
            if (!isNaN(date.getTime())) return date;
        }
        
        // Try ISO format (YYYY-MM-DD)
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) return date;
    }
    
    console.warn("Could not parse date:", dateValue);
    return new Date(); // fallback to current date
}

/**
 * Formats a date for display in the correct format
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
function formatDateForDisplay(date) {
    try {
        if (isNaN(date.getTime())) return "Invalid Date";
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        // For display purposes, use DD/MM/YYYY format
        return `${day}/${month}/${year}`;
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
