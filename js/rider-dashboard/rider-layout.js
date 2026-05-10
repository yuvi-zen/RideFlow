/**
 * rider-layout.js - Rider Dashboard Layout Component
 * Provides the rider sidebar, header, and content container.
 */

class RiderLayout {
    constructor({ containerId = 'main-content', user = null }) {
        this.container = document.getElementById(containerId);
        this.user = user;
    }

    render(activePanel = 'overview') {
        this.container.innerHTML = `
            <div class="rider-shell">
                <aside class="rider-sidebar">
                    <div class="rider-brand">
                        <div class="rider-brand-logo">RF</div>
                        <div>
                            <div class="rider-brand-title">RideFlow</div>
                            <div class="rider-brand-subtitle">Rider Portal</div>
                        </div>
                    </div>

                    <nav class="rider-nav">
                        <button class="rider-nav-link" data-panel="overview">Overview</button>
                        <button class="rider-nav-link" data-panel="request">Request Ride</button>
                        <button class="rider-nav-link" data-panel="rides">Ride History</button>
                        <button class="rider-nav-link" data-panel="payments">Payments</button>
                        <button class="rider-nav-link" data-panel="ratings">Ratings</button>
                        <button class="rider-nav-link" data-panel="complaints">Complaints</button>
                        <button class="rider-nav-link" data-panel="profile">Profile</button>
                        <button class="rider-nav-link" data-panel="support">Support</button>
                    </nav>
                </aside>

                <section class="rider-main">
                    <header class="rider-topbar">
                        <div class="rider-topbar-left">
                            <h1>Welcome back, ${this.user?.full_name || 'Rider'}</h1>
                            <p class="text-muted">Track your rides, request new trips, and manage your account.</p>
                        </div>
                        <div class="rider-topbar-actions">
                            <button class="topbar-btn" onclick="notificationPanel.toggle()" style="position:relative;">🔔<span class="notification-badge" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:10px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;"></span></button>
                            <button class="topbar-btn">💬</button>
                            <button class="topbar-btn logout-btn">Logout</button>
                        </div>
                    </header>

                    <main class="rider-content" id="rider-dashboard-content"></main>
                </section>
            </div>
        `;

        this.bindNavigation();
        this.bindLogout();
        this.setActive(activePanel);
    }

    setActive(panel) {
        const links = this.container.querySelectorAll('.rider-nav-link');
        links.forEach(link => {
            link.classList.toggle('active', link.dataset.panel === panel || (panel === 'overview' && link.dataset.panel === 'overview'));
        });
    }

    bindNavigation() {
        const links = this.container.querySelectorAll('.rider-nav-link');
        links.forEach(link => {
            link.addEventListener('click', event => {
                links.forEach(item => item.classList.remove('active'));
                event.currentTarget.classList.add('active');
                const panel = event.currentTarget.dataset.panel;
                const content = document.getElementById('rider-dashboard-content');
                content.dispatchEvent(new CustomEvent('riderPanelChange', { detail: { panel } }));
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

window.RiderLayout = RiderLayout;
