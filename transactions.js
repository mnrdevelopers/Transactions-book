
    localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));

}

async function loadTransactions() {

    try {

        showLoading();

        

        const scriptUrl = "https://script.google.com/macros/s/AKfycbzqpQ-Yf6QTNQwBJOt9AZgnrgwKs8vzJxYMLRl-gOaspbKJuFYZm6IvYXAx6QRMbCdN/exec";

        const response = await fetch(scriptUrl);

        

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        

        const data = await response.json();

        allTransactions = processSheetData(data);

        

        // Update date filter options
