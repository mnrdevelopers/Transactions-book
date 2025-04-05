// auth.js - Authentication and Profile Management

// Configuration
const AUTH_API_URL = 'https://script.google.com/macros/s/YOUR_AUTH_SCRIPT_ID/exec';
const USER_KEY = 'rkFashionsUser';
const TOKEN_KEY = 'rkFashionsToken';

// DOM Elements (if needed on current page)
const authElements = {
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    profileForm: document.getElementById('profile-form'),
    logoutBtn: document.getElementById('logout-btn'),
    authNav: document.getElementById('auth-nav'),
    userNav: document.getElementById('user-nav'),
    userNameDisplay: document.getElementById('user-name'),
    shopNameDisplay: document.getElementById('shop-name')
};

// Initialize auth system
export function initAuth() {
    // Check if user is logged in
    if (isLoggedIn()) {
        setupAuthenticatedUI();
    } else {
        setupUnauthenticatedUI();
    }
    
    // Setup event listeners if elements exist
    if (authElements.loginForm) {
        authElements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (authElements.registerForm) {
        authElements.registerForm.addEventListener('submit', handleRegister);
    }
    
    if (authElements.profileForm) {
        authElements.profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    if (authElements.logoutBtn) {
        authElements.logoutBtn.addEventListener('click', handleLogout);
    }
}

// Check if user is logged in
export function isLoggedIn() {
    return localStorage.getItem(TOKEN_KEY) !== null;
}

// Get current user
export function getCurrentUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

// Get auth token
export function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Setup UI for authenticated user
function setupAuthenticatedUI() {
    const user = getCurrentUser();
    
    if (authElements.authNav) authElements.authNav.style.display = 'none';
    if (authElements.userNav) authElements.userNav.style.display = 'block';
    if (authElements.userNameDisplay) authElements.userNameDisplay.textContent = user.name;
    if (authElements.shopNameDisplay) authElements.shopNameDisplay.textContent = user.shopName;
    
    // Update dashboard header with shop name
    const dashboardHeader = document.querySelector('.dashboard-container header h1');
    if (dashboardHeader) {
        dashboardHeader.textContent = `${user.shopName} Bill Book`;
    }
}

// Setup UI for unauthenticated user
function setupUnauthenticatedUI() {
    if (authElements.authNav) authElements.authNav.style.display = 'block';
    if (authElements.userNav) authElements.userNav.style.display = 'none';
    
    // If on a protected page, redirect to login
    if (isProtectedPage()) {
        window.location.href = 'login.html';
    }
}

// Check if current page requires authentication
function isProtectedPage() {
    const protectedPages = ['dashboard.html', 'add-transaction.html', 'transactions.html', 'reports.html', 'maintenance.html', 'purchases.html'];
    return protectedPages.some(page => window.location.pathname.endsWith(page));
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${AUTH_API_URL}?action=login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            localStorage.setItem(TOKEN_KEY, data.token);
            setupAuthenticatedUI();
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            showAuthError(data.message || 'Login failed');
        }
    } catch (error) {
        showAuthError('Network error. Please try again.');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const shopName = document.getElementById('register-shop-name').value;
    const phone = document.getElementById('register-phone').value;
    
    try {
        const response = await fetch(`${AUTH_API_URL}?action=register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, shopName, phone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';
        } else {
            showAuthError(data.message || 'Registration failed');
        }
    } catch (error) {
        showAuthError('Network error. Please try again.');
    }
}

// Handle profile update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const shopName = document.getElementById('profile-shop-name').value;
    const phone = document.getElementById('profile-phone').value;
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    
    const user = getCurrentUser();
    const token = getAuthToken();
    
    try {
        const response = await fetch(`${AUTH_API_URL}?action=updateProfile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                userId: user.id,
                name, 
                shopName, 
                phone,
                currentPassword,
                newPassword: newPassword || undefined
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.user) {
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                setupAuthenticatedUI();
            }
            showAuthSuccess('Profile updated successfully');
        } else {
            showAuthError(data.message || 'Profile update failed');
        }
    } catch (error) {
        showAuthError('Network error. Please try again.');
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setupUnauthenticatedUI();
    window.location.href = 'login.html';
}

// Show auth error
function showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(message);
    }
}

// Show auth success
function showAuthSuccess(message) {
    const successElement = document.getElementById('auth-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => successElement.style.display = 'none', 3000);
    } else {
        alert(message);
    }
}

// Add auth headers to existing API calls
export function addAuthHeader(headers = {}) {
    if (isLoggedIn()) {
        return {
            ...headers,
            'Authorization': `Bearer ${getAuthToken()}`
        };
    }
    return headers;
}
