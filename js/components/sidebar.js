/**
 * Sidebar.js - Sidebar Navigation Component
 * Shows sidebar menu for dashboard pages (Admin, Rider, Driver)
 */

class Sidebar {
    constructor() {
        this.container = document.getElementById('sidebar-container');
    }

    render(role = '') {
        let menuItems = [];

        switch (role) {
            case 'Admin':
                menuItems = [
                    { label: 'Overview', href: '#admin-dashboard/overview', icon: '📊' },
                    { label: 'Users', href: '#admin-dashboard/users', icon: '👥' },
                    { label: 'Drivers', href: '#admin-dashboard/drivers', icon: '🚗' },
                    { label: 'Vehicles', href: '#admin-dashboard/vehicles', icon: '🚙' },
                    { label: 'Rides', href: '#admin-dashboard/rides', icon: '🛣️' },
                    { label: 'Complaints', href: '#admin-dashboard/complaints', icon: '⚠️' },
                    { label: 'Reports', href: '#admin-dashboard/reports', icon: '📈' },
                    { label: 'Settings', href: '#admin-dashboard/settings', icon: '⚙️' }
                ];
                break;

            case 'Rider':
                menuItems = [
                    { label: 'Overview', href: '#rider-dashboard/overview', icon: '📍' },
                    { label: 'Request Ride', href: '#rider-dashboard/request', icon: '🚗' },
                    { label: 'Ride History', href: '#rider-dashboard/rides', icon: '🛣️' },
                    { label: 'Payments', href: '#rider-dashboard/payments', icon: '💳' },
                    { label: 'Ratings', href: '#rider-dashboard/ratings', icon: '⭐' },
                    { label: 'Complaints', href: '#rider-dashboard/complaints', icon: '⚠️' },
                    { label: 'Profile', href: '#rider-dashboard/profile', icon: '👤' },
                    { label: 'Support', href: '#rider-dashboard/support', icon: '💬' }
                ];
                break;

            case 'Driver':
                menuItems = [
                    { label: 'Overview', href: '#driver-dashboard/overview', icon: '📊' },
                    { label: 'Current Ride', href: '#driver-dashboard/current-ride', icon: '🚗' },
                    { label: 'Ride Requests', href: '#driver-dashboard/ride-requests', icon: '📩' },
                    { label: 'Earnings', href: '#driver-dashboard/earnings', icon: '💰' },
                    { label: 'Vehicles', href: '#driver-dashboard/vehicles', icon: '🚙' },
                    { label: 'Profile', href: '#driver-dashboard/profile', icon: '👤' },
                    { label: 'Support', href: '#driver-dashboard/support', icon: '💬' }
                ];
                break;
        }

        if (menuItems.length === 0) {
            this.container.innerHTML = '';
            return;
        }

        let menuHTML = menuItems.map(item => `
            <li class="sidebar-menu-item">
                <a href="${item.href}">
                    <span>${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            </li>
        `).join('');

        this.container.innerHTML = `
            <aside id="sidebar">
                <ul class="sidebar-menu">
                    ${menuHTML}
                </ul>
            </aside>
        `;
    }

    hide() {
        this.container.innerHTML = '';
    }

    setActive(href) {
        const activeHash = String(href || window.location.hash || '').split('/').slice(0, 2).join('/');
        const items = this.container.querySelectorAll('.sidebar-menu-item');
        items.forEach(item => {
            const link = item.querySelector('a');
            if (!link) return;
            const itemHash = String(link.getAttribute('href')).split('/').slice(0, 2).join('/');
            if (itemHash === activeHash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

const sidebar = new Sidebar();
