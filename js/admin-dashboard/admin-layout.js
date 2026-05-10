/**
 * admin-layout.js - Admin Dashboard Layout Component
 * Handles the main dashboard shell, sidebar navigation, header, and content area.
 */

class AdminLayout {
    constructor({ containerId = 'main-content', user = null }) {
        this.container = document.getElementById(containerId);
        this.user = user;
    }

    render(activeSection = 'overview') {
        this.container.innerHTML = `
            <div class="admin-dashboard-shell">
                <aside class="admin-sidebar">
                    <div class="admin-sidebar-brand">
                        <div class="brand-mark">RF</div>
                        <div>
                            <div class="brand-title">RideFlow Admin</div>
                            <div class="brand-subtitle">University Project</div>
                        </div>
                    </div>

                    <nav class="admin-sidebar-nav">
                        <button class="admin-sidebar-link" data-section="overview">Overview</button>
                        <button class="admin-sidebar-link" data-section="users">Users</button>
                        <button class="admin-sidebar-link" data-section="drivers">Drivers</button>
                        <button class="admin-sidebar-link" data-section="vehicles">Vehicles</button>
                        <button class="admin-sidebar-link" data-section="rides">Rides</button>
                        <button class="admin-sidebar-link" data-section="complaints">Complaints</button>
                        <button class="admin-sidebar-link" data-section="reports">Reports</button>
                        <button class="admin-sidebar-link" data-section="settings">Settings</button>
                    </nav>
                </aside>

                <section class="admin-main-panel">
                    <header class="admin-topbar">
                        <div class="admin-topbar-search">
                            <input type="search" placeholder="Search admin actions..." aria-label="Search admin actions">
                        </div>
                        <div class="admin-topbar-right">
                            <button class="topbar-icon-btn" title="Notifications" onclick="notificationPanel.toggle()" style="position:relative;">
                                <span class="icon-bell">🔔</span>
                                <span class="notification-badge" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:10px;min-width:18px;height:18px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:700;"></span>
                            </button>
                            <button class="topbar-icon-btn" title="Messages">
                                <span class="icon-message"></span>
                            </button>
                            <div class="topbar-profile">
                                <div class="profile-avatar">${this.user?.initials || 'AD'}</div>
                                <div>
                                    <div class="profile-name">${this.user?.full_name || 'Admin User'}</div>
                                    <div class="profile-role">Administrator</div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main class="admin-content" id="admin-dashboard-content"></main>
                </section>
            </div>
        `;

        this.bindNavigation();
        this.setActive(activeSection);
    }

    setActive(section) {
        const links = this.container.querySelectorAll('.admin-sidebar-link');
        links.forEach(link => {
            link.classList.toggle('active', link.dataset.section === section || (section === '' && link.dataset.section === 'overview'));
        });
    }

    bindNavigation() {
        const links = this.container.querySelectorAll('.admin-sidebar-link');
        links.forEach(link => {
            link.addEventListener('click', (event) => {
                links.forEach(item => item.classList.remove('active'));
                event.currentTarget.classList.add('active');
                const section = event.currentTarget.dataset.section;
                this.navigateTo(section);
            });
        });
    }

    navigateTo(section) {
        const content = document.getElementById('admin-dashboard-content');
        const event = new CustomEvent('adminSectionChange', { detail: { section }});
        content.dispatchEvent(event);
    }
}

window.AdminLayout = AdminLayout;
