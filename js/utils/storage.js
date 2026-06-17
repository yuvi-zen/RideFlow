/**
 * Storage.js - LocalStorage Utilities for RideFlow
 * Handles all localStorage operations for session persistence
 */

class StorageManager {
    constructor(prefix = 'rideflow_') {
        this.prefix = prefix;
    }

    // Set item in localStorage
    setItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(this.prefix + key, serialized);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    // Get item from localStorage
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    // Remove item from localStorage
    removeItem(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Clear all items with this prefix
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Check if key exists
    hasItem(key) {
        return localStorage.getItem(this.prefix + key) !== null;
    }

    // Get all items
    getAllItems() {
        const items = {};
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                items[cleanKey] = this.getItem(cleanKey);
            }
        });
        return items;
    }
}

// Create singleton instance
const storage = new StorageManager('rideflow_');

// Authentication storage — uses sessionStorage so each tab has its own session
const authStorage = {
    setAuthToken(token) {
        sessionStorage.setItem('rideflow_authToken', token);
    },

    getAuthToken() {
        return sessionStorage.getItem('rideflow_authToken') || null;
    },

    removeAuthToken() {
        sessionStorage.removeItem('rideflow_authToken');
    },

    setCurrentUser(user) {
        sessionStorage.setItem('rideflow_currentUser', JSON.stringify(user));
    },

    getCurrentUser() {
        try {
            const item = sessionStorage.getItem('rideflow_currentUser');
            return item ? JSON.parse(item) : null;
        } catch { return null; }
    },

    removeCurrentUser() {
        sessionStorage.removeItem('rideflow_currentUser');
    },

    logout() {
        this.removeAuthToken();
        this.removeCurrentUser();
        sessionStorage.removeItem('rideflow_userRole');
    }
};

// User preferences storage
const preferencesStorage = {
    setTheme(theme) {
        storage.setItem('theme', theme);
    },

    getTheme() {
        return storage.getItem('theme', 'light');
    },

    setLanguage(language) {
        storage.setItem('language', language);
    },

    getLanguage() {
        return storage.getItem('language', 'en');
    },

    setNotifications(enabled) {
        storage.setItem('notificationsEnabled', enabled);
    },

    getNotifications() {
        return storage.getItem('notificationsEnabled', true);
    }
};

// Ride storage
const rideStorage = {
    setRecentRideSearch(search) {
        storage.setItem('recentRideSearch', search);
    },

    getRecentRideSearch() {
        return storage.getItem('recentRideSearch');
    },

    setSavedLocations(locations) {
        storage.setItem('savedLocations', locations);
    },

    getSavedLocations() {
        return storage.getItem('savedLocations', []);
    },

    addSavedLocation(location) {
        const locations = this.getSavedLocations();
        locations.push(location);
        this.setSavedLocations(locations);
    },

    removeSavedLocation(locationId) {
        const locations = this.getSavedLocations();
        const filtered = locations.filter(loc => loc.id !== locationId);
        this.setSavedLocations(filtered);
    },

    setFavoritePlaces(places) {
        storage.setItem('favoritePlaces', places);
    },

    getFavoritePlaces() {
        return storage.getItem('favoritePlaces', []);
    },

    setCurrentRide(ride) {
        storage.setItem('currentRide', ride);
    },

    getCurrentRide() {
        return storage.getItem('currentRide');
    },

    removeCurrentRide() {
        storage.removeItem('currentRide');
    }
};

// Payment storage
const paymentStorage = {
    setPaymentMethods(methods) {
        storage.setItem('paymentMethods', methods);
    },

    getPaymentMethods() {
        return storage.getItem('paymentMethods', []);
    },

    setDefaultPaymentMethod(methodId) {
        storage.setItem('defaultPaymentMethod', methodId);
    },

    getDefaultPaymentMethod() {
        return storage.getItem('defaultPaymentMethod');
    },

    setPromoCode(code) {
        storage.setItem('promoCode', code);
    },

    getPromoCode() {
        return storage.getItem('promoCode');
    },

    removePromoCode() {
        storage.removeItem('promoCode');
    },

    setWalletBalance(balance) {
        storage.setItem('walletBalance', balance);
    },

    getWalletBalance() {
        return storage.getItem('walletBalance', 0);
    }
};

// Driver storage
const driverStorage = {
    setDriverStatus(status) {
        storage.setItem('driverStatus', status);
    },

    getDriverStatus() {
        return storage.getItem('driverStatus', 'Offline');
    },

    setCurrentLocation(location) {
        storage.setItem('currentLocation', location);
    },

    getCurrentLocation() {
        return storage.getItem('currentLocation');
    },

    setVehicles(vehicles) {
        storage.setItem('vehicles', vehicles);
    },

    getVehicles() {
        return storage.getItem('vehicles', []);
    },

    setActiveVehicle(vehicleId) {
        storage.setItem('activeVehicle', vehicleId);
    },

    getActiveVehicle() {
        return storage.getItem('activeVehicle');
    }
};

// Session storage
const sessionStorage_custom = {
    setPageState(page, state) {
        storage.setItem(`pageState_${page}`, state);
    },

    getPageState(page) {
        return storage.getItem(`pageState_${page}`);
    },

    removePageState(page) {
        storage.removeItem(`pageState_${page}`);
    },

    setModalOpen(modalId) {
        storage.setItem('openModal', modalId);
    },

    getModalOpen() {
        return storage.getItem('openModal');
    },

    removeModalOpen() {
        storage.removeItem('openModal');
    },

    setFormData(formId, data) {
        storage.setItem(`formData_${formId}`, data);
    },

    getFormData(formId) {
        return storage.getItem(`formData_${formId}`);
    },

    removeFormData(formId) {
        storage.removeItem(`formData_${formId}`);
    }
};

// Export everything
window.storage = storage;
window.authStorage = authStorage;
window.preferencesStorage = preferencesStorage;
window.rideStorage = rideStorage;
window.paymentStorage = paymentStorage;
window.driverStorage = driverStorage;
window.sessionStorage_custom = sessionStorage_custom;
