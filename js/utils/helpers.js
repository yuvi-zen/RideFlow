/**
 * Helpers.js - Utility Functions for RideFlow
 * Contains common helper functions used across the application
 */

// Format currency values
function formatCurrency(amount, currency = 'PKR') {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    });
    return formatter.format(amount);
}

// Format date
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time
function formatTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Format date and time
function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

// Capitalize first letter
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Get status color
function getStatusColor(status) {
    const statusColors = {
        'Requested': 'var(--color-primary)',
        'Accepted': 'var(--color-success)',
        'Driver En Route': 'var(--color-warning)',
        'In Progress': '#9933ff',
        'Completed': 'var(--color-success)',
        'Cancelled': 'var(--color-danger)',
        'Pending': 'var(--color-warning)',
        'Verified': 'var(--color-success)',
        'Rejected': 'var(--color-danger)',
        'Suspended': 'var(--color-warning)',
        'Active': 'var(--color-success)',
        'Banned': 'var(--color-danger)',
        'Online': 'var(--color-success)',
        'Offline': 'var(--color-text-muted)',
        'On Trip': '#9933ff',
    };
    return statusColors[status] || 'var(--color-text-muted)';
}

// Generate unique ID
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Email validation
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Phone validation
function isValidPhone(phone) {
    const regex = /^[0-9\-\+\(\)]+$/;
    return regex.test(phone) && phone.length >= 10;
}

// Password strength checker
function getPasswordStrength(password) {
    if (password.length < 6) return 'Weak';
    if (password.length < 8) return 'Fair';
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
        return 'Strong';
    }
    return 'Fair';
}

// Validate password
function isValidPassword(password) {
    return password.length >= 8;
}

// Distance calculation (simplified)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Returns distance in km
}

// Debounce function
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Throttle function
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            func(...args);
            lastCall = now;
        }
    };
}

// Get random element from array
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Clone object (deep copy)
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Merge objects
function mergeObjects(target, source) {
    return { ...target, ...source };
}

// Get URL parameters
function parseQueryString(queryString = '') {
    const params = new URLSearchParams(String(queryString).replace(/^\?/, ''));
    const obj = {};
    for (let [key, value] of params.entries()) {
        obj[key] = value;
    }
    return obj;
}

function getUrlParams() {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    for (let [key, value] of searchParams.entries()) {
        params[key] = value;
    }

    if (Object.keys(params).length > 0) {
        return params;
    }

    const normalized = normalizeHash();
    const queryIndex = normalized.indexOf('?');
    if (queryIndex === -1) {
        return {};
    }

    return parseQueryString(normalized.slice(queryIndex));
}

// Normalize a hash value and remove leading/trailing slashes
function normalizeHash(hash = window.location.hash) {
    let cleaned = String(hash || '').trim();
    if (cleaned.startsWith('#')) {
        cleaned = cleaned.slice(1);
    }
    return cleaned.replace(/^\/+|\/+$/g, '');
}

function getCurrentRoute() {
    const normalized = normalizeHash();
    if (!normalized) {
        return { page: 'landing', section: '', query: {} };
    }

    const [hashPath, queryPart] = normalized.split('?');
    const [page, ...rest] = String(hashPath).split('/');
    return {
        page: page || 'landing',
        section: rest.join('/') || '',
        query: parseQueryString(queryPart)
    };
}

function getCurrentPage() {
    return getCurrentRoute().page;
}

function getCurrentSection() {
    return getCurrentRoute().section;
}

function buildRouteHash(page, section = '') {
    const cleanPage = String(page || '').replace(/^#/, '');
    if (['landing', 'login', 'register', 'forgot-password'].includes(cleanPage)) {
        return `#${cleanPage}`;
    }

    const cleanSection = String(section || '').replace(/(^\/|\/$)/g, '');
    const finalSection = cleanSection || 'overview';
    return `#${cleanPage}/${finalSection}`;
}

function navigateTo(pageOrHash, section = '') {
    let hash = '';

    if (typeof pageOrHash !== 'string') {
        return;
    }

    if (pageOrHash.startsWith('#')) {
        hash = pageOrHash;
    } else {
        hash = buildRouteHash(pageOrHash, section);
    }

    // Use location.hash so getCurrentRoute() can actually read it
    window.location.hash = hash;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!sessionStorage.getItem('rideflow_authToken');
}

// Get current user role
function getCurrentUserRole() {
    try {
        const user = JSON.parse(sessionStorage.getItem('rideflow_currentUser') || 'null') || {};
        return user.role;
    } catch { return null; }
}

// Get current user
function getCurrentUser() {
    try {
        return JSON.parse(sessionStorage.getItem('rideflow_currentUser') || 'null') || {};
    } catch { return {}; }
}

// Check if current user is admin
function isAdmin() {
    return getCurrentUserRole() === 'Admin';
}

// Check if current user is rider
function isRider() {
    return getCurrentUserRole() === 'Rider';
}

// Check if current user is driver
function isDriver() {
    return getCurrentUserRole() === 'Driver';
}

// Sort array by property
function sortBy(array, property, order = 'asc') {
    return [...array].sort((a, b) => {
        const aVal = a[property];
        const bVal = b[property];
        if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

// Filter array by property
function filterBy(array, property, value) {
    return array.filter(item => item[property] === value);
}

// Group array by property
function groupBy(array, property) {
    return array.reduce((grouped, item) => {
        const key = item[property];
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
        return grouped;
    }, {});
}

// Calculate average
function calculateAverage(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// Calculate sum
function calculateSum(numbers) {
    return numbers.reduce((sum, num) => sum + num, 0);
}

// Get min value
function getMinValue(numbers) {
    return Math.min(...numbers);
}

// Get max value
function getMaxValue(numbers) {
    return Math.max(...numbers);
}

// Sleep function (for async operations)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Request animation frame wrapper
function animateTo(callback, duration = 300) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        callback(progress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
}

