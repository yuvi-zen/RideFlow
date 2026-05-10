/**
 * rideState.js — Shared Ride State for RideFlow
 * Communicates ride data between rider and driver dashboards
 * via localStorage + polling (simulates real-time backend for cross-tab sync)
 */

(function () {
    'use strict';

    var LS_KEY = 'rideflow_active_ride';

    window.RideState = {

        currentRide: null,
        listeners: [],

        /** Save a new ride to localStorage + notify all listeners */
        setRide: function (rideData) {
            this.currentRide = rideData;
            try {
                localStorage.setItem(LS_KEY, JSON.stringify(rideData));
            } catch (e) { /* ignore */ }
            this._notify();
        },

        /** Update specific fields of current ride */
        updateRide: function (updates) {
            if (!this.currentRide) return;
            var keys = Object.keys(updates);
            for (var i = 0; i < keys.length; i++) {
                this.currentRide[keys[i]] = updates[keys[i]];
            }
            try {
                localStorage.setItem(LS_KEY, JSON.stringify(this.currentRide));
            } catch (e) { /* ignore */ }
            this._notify();
        },

        /** Get current ride (from memory or localStorage) */
        getRide: function () {
            if (this.currentRide) return this.currentRide;
            try {
                var stored = localStorage.getItem(LS_KEY);
                if (stored) {
                    this.currentRide = JSON.parse(stored);
                    return this.currentRide;
                }
            } catch (e) { /* ignore */ }
            return null;
        },

        /** Clear ride on completion */
        clearRide: function () {
            this.currentRide = null;
            try {
                localStorage.removeItem(LS_KEY);
            } catch (e) { /* ignore */ }
            this._notify();
        },

        /** Subscribe to ride changes. Returns unsubscribe function. */
        onChange: function (callback) {
            this.listeners.push(callback);
            var self = this;
            return function () {
                self.listeners = self.listeners.filter(function (l) { return l !== callback; });
            };
        },

        _notify: function () {
            for (var i = 0; i < this.listeners.length; i++) {
                try {
                    this.listeners[i](this.currentRide);
                } catch (e) {
                    console.error('[RideState] listener error:', e);
                }
            }
        }
    };

    // ── Poll localStorage every 1 second for cross-tab sync ──────
    // Simulates real-time backend for rider/driver on different tabs
    setInterval(function () {
        var stored = null;
        try {
            var raw = localStorage.getItem(LS_KEY);
            stored = raw ? JSON.parse(raw) : null;
        } catch (e) { return; }

        var currentId = window.RideState.currentRide ? window.RideState.currentRide.id : null;
        var storedId = stored ? stored.id : null;
        var currentStatus = window.RideState.currentRide ? window.RideState.currentRide.status : null;
        var storedStatus = stored ? stored.status : null;
        var currentDriverLoc = window.RideState.currentRide ? window.RideState.currentRide.driverLocation : null;
        var storedDriverLoc = stored ? stored.driverLocation : null;

        // Notify if id, status, or driver location changed
        var locChanged = false;
        if (storedDriverLoc && currentDriverLoc) {
            locChanged = storedDriverLoc.lat !== currentDriverLoc.lat || storedDriverLoc.lng !== currentDriverLoc.lng;
        } else if (storedDriverLoc && !currentDriverLoc) {
            locChanged = true;
        }

        if (storedId !== currentId || storedStatus !== currentStatus || locChanged) {
            window.RideState.currentRide = stored;
            window.RideState._notify();
        }
    }, 1000);

})();
