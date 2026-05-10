/**
 * notification-panel.js - Persistent notification panel for RideFlow
 * Stores notifications in localStorage and renders a dropdown panel
 */

class NotificationPanel {
    constructor() {
        this.storageKey = 'rf_notifications';
        this.maxNotifications = 50;
        this.panelVisible = false;
    }

    getNotifications() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        } catch {
            return [];
        }
    }

    saveNotifications(notifications) {
        localStorage.setItem(this.storageKey, JSON.stringify(notifications.slice(0, this.maxNotifications)));
    }

    add(notification) {
        const notifications = this.getNotifications();
        notifications.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
        });
        this.saveNotifications(notifications);
        this.updateBadge();
        return notifications[0];
    }

    markAllRead() {
        const notifications = this.getNotifications();
        notifications.forEach(n => { n.read = true; });
        this.saveNotifications(notifications);
        this.updateBadge();
    }

    clearAll() {
        this.saveNotifications([]);
        this.updateBadge();
        this.render();
    }

    getUnreadCount() {
        return this.getNotifications().filter(n => !n.read).length;
    }

    updateBadge() {
        const badges = document.querySelectorAll('.notification-badge');
        const count = this.getUnreadCount();
        badges.forEach(badge => {
            badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    toggle() {
        this.panelVisible = !this.panelVisible;
        this.render();
    }

    hide() {
        this.panelVisible = false;
        const panel = document.getElementById('notification-panel');
        if (panel) panel.remove();
    }

    render() {
        let panel = document.getElementById('notification-panel');
        const notifications = this.getNotifications();

        if (!this.panelVisible) {
            if (panel) panel.remove();
            return;
        }

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            document.body.appendChild(panel);

            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!panel.contains(e.target) && !e.target.closest('.topbar-icon-btn[title="Notifications"]')) {
                        this.hide();
                    }
                }, { once: true });
            }, 100);
        }

        const unread = notifications.filter(n => !n.read).length;

        panel.style.cssText = `
            position: fixed; top: 60px; right: 20px; width: 360px; max-height: 480px;
            background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
            z-index: 1000; overflow: hidden; display: flex; flex-direction: column;
            font-family: 'Inter', system-ui, sans-serif;
        `;

        panel.innerHTML = `
            <div style="padding:16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-weight:700;font-size:16px;">Notifications ${unread > 0 ? `<span style="background:#2563eb;color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${unread}</span>` : ''}</div>
                <div style="display:flex;gap:8px;">
                    ${unread > 0 ? `<button onclick="notificationPanel.markAllRead();notificationPanel.render();" style="background:none;border:none;color:#2563eb;font-size:12px;cursor:pointer;">Mark all read</button>` : ''}
                    <button onclick="notificationPanel.clearAll();" style="background:none;border:none;color:#ef4444;font-size:12px;cursor:pointer;">Clear</button>
                </div>
            </div>
            <div style="overflow-y:auto;flex:1;max-height:400px;">
                ${notifications.length === 0 ? `
                    <div style="padding:40px 20px;text-align:center;color:#94a3b8;">
                        <div style="font-size:32px;margin-bottom:8px;">🔔</div>
                        <div>No notifications yet</div>
                    </div>
                ` : notifications.slice(0, 20).map(n => {
                    const typeColor = { success: '#059669', error: '#dc2626', warning: '#f59e0b', info: '#2563eb', ride: '#7c3aed' }[n.type] || '#64748b';
                    const timeAgo = this.timeAgo(n.timestamp);
                    return `
                        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;${!n.read ? 'background:#eff6ff;' : ''}display:flex;gap:10px;align-items:flex-start;">
                            <div style="width:8px;height:8px;border-radius:50%;background:${typeColor};margin-top:6px;flex-shrink:0;${n.read ? 'opacity:0.3;' : ''}"></div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:${n.read ? '400' : '600'};font-size:13px;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.title || 'Notification'}</div>
                                ${n.message ? `<div style="font-size:12px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.message}</div>` : ''}
                                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${timeAgo}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.updateBadge();
    }

    timeAgo(timestamp) {
        const now = Date.now();
        const then = new Date(timestamp).getTime();
        const diff = Math.floor((now - then) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // Seed demo notifications
    seedDemoNotifications() {
        const existing = this.getNotifications();
        if (existing.length > 0) return;

        const demoNotifications = [
            { type: 'ride', title: 'Ride Completed', message: 'Your trip to Blue Area was completed. Fare: PKR 350.', read: true },
            { type: 'info', title: 'Promo Code Available', message: 'Use SAVE20 for 20% off your next ride!', read: false },
            { type: 'warning', title: 'Surge Pricing Active', message: 'High demand in F-10 area. Fares may be increased.', read: false },
            { type: 'success', title: 'Driver Rated', message: 'You rated your last driver 5 stars. Thanks for the feedback!', read: true },
            { type: 'ride', title: 'Ride Cancelled', message: 'Your ride request was cancelled by the driver.', read: false },
            { type: 'info', title: 'New Feature', message: 'Demand Zones are now available! See where rides are needed most.', read: false }
        ];

        const now = Date.now();
        demoNotifications.forEach((n, i) => {
            n.id = now - i * 3600000;
            n.timestamp = new Date(now - i * 3600000).toISOString();
        });

        this.saveNotifications(demoNotifications);
        this.updateBadge();
    }
}

window.notificationPanel = new NotificationPanel();

// Seed demo notifications on first load
window.notificationPanel.seedDemoNotifications();
