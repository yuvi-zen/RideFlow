/**
 * driver-layout.js - Driver Dashboard Layout Component
 * Provides the driver sidebar, topbar, and content container.
 */

class DriverLayout {
    constructor({ containerId = 'main-content', user = null }) {
        this.container = document.getElementById(containerId);
        this.user = user;
    }

    render(activeSection = 'overview') {
        this.container.innerHTML = `
            <div class="driver-shell">
                <aside class="driver-sidebar">
                    <div class="driver-brand">
                        <div class="driver-brand-logo">RF</div>
                        <div>
                            <div class="driver-brand-title">RideFlow</div>
                            <div class="driver-brand-subtitle">Driver Portal</div>
                        </div>
                    </div>

                    <nav class="driver-nav">
                        <button class="driver-nav-link" data-section="overview">Overview</button>
                        <button class="driver-nav-link" data-section="current-ride">Current Ride</button>
                        <button class="driver-nav-link" data-section="ride-requests">Ride Requests</button>
                        <button class="driver-nav-link" data-section="earnings">Earnings</button>
                        <button class="driver-nav-link" data-section="ratings">Ratings</button>
                        <button class="driver-nav-link" data-section="performance">Performance</button>
                        <button class="driver-nav-link" data-section="schedule">Schedule</button>
                        <button class="driver-nav-link" data-section="demand-zones">Demand Zones</button>
                        <button class="driver-nav-link" data-section="vehicles">Vehicles</button>
                        <button class="driver-nav-link" data-section="profile">Profile</button>
                        <button class="driver-nav-link" data-section="support">Support</button>
                    </nav>
                </aside>

                <section class="driver-main">
                    <header class="driver-topbar">
                        <div class="driver-topbar-left">
                            <h1>Welcome back, ${this.user?.full_name || 'Driver'}</h1>
                            <p class="text-muted">Manage rides, earnings, and vehicle status.</p>
                        </div>
                        <div class="driver-topbar-actions">
                            <button class="topbar-btn" onclick="notificationPanel.toggle()" style="position:relative;">🔔<span class="notification-badge" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:10px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;"></span></button>
                            <button class="topbar-btn">💬</button>
                            <button class="topbar-btn logout-btn">Logout</button>
                        </div>
                    </header>

                    <main class="driver-content" id="driver-dashboard-content"></main>
                </section>
            </div>
        `;

        this.bindNavigation();
        this.bindLogout();
        this.setActive(activeSection);
    }

    setActive(section) {
        const links = this.container.querySelectorAll('.driver-nav-link');
        links.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section || (section === 'overview' && link.dataset.section === 'overview'));
        });
    }

    bindNavigation() {
        const links = this.container.querySelectorAll('.driver-nav-link');
        links.forEach(link => {
            link.addEventListener('click', event => {
                links.forEach(item => item.classList.remove('active'));
                event.currentTarget.classList.add('active');
                const section = event.currentTarget.dataset.section;
                const content = document.getElementById('driver-dashboard-content');
                content.dispatchEvent(new CustomEvent('driverSectionChange', { detail: { section } }));
            });
        });
    }

    bindLogout() {
        const logoutBtn = this.container.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authStorage.logout();
                navigateTo('landing');
            });
        }
    }
}

window.DriverLayout = DriverLayout;
