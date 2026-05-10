/**
 * Navbar.js - Navigation Bar Component
 * Displays app header with logo, navigation menu, and user menu
 */

class NavBar {
    constructor() {
        this.container = document.getElementById('navbar-container');
    }

    render(user = null) {
        const isAuthenticated = !!user;
        const userRole = user?.role || '';
        const dashboardHash = userRole === 'Admin' ? '#admin-dashboard/overview' : userRole === 'Rider' ? '#rider-dashboard/overview' : userRole === 'Driver' ? '#driver-dashboard/overview' : '#landing';

        this.container.innerHTML = `
            <nav id="navbar" class="navbar">
                <div class="navbar-logo">🚗 RideFlow</div>
                
                <ul class="navbar-menu">
                    ${isAuthenticated ? `
                        <li><a href="${dashboardHash}">Dashboard</a></li>
                        ${userRole === 'Admin' ? '<li><a href="#admin-dashboard/reports">Reports</a></li>' : ''}
                        ${userRole === 'Admin' ? '<li><a href="#admin-dashboard/settings">Settings</a></li>' : ''}
                    ` : `
                        <li><a href="#landing">Home</a></li>
                    `}
                    <li>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${isAuthenticated ? `
                                <span style="color: var(--color-text-muted);">Hi, ${user.full_name}</span>
                                <button class="btn btn-secondary btn-sm" onclick="navBar.logout()">
                                    Logout
                                </button>
                            ` : `
                                <a href="#login" class="btn btn-primary btn-sm">Login</a>
                            `}
                        </div>
                    </li>
                </ul>
            </nav>
        `;
    }

    logout() {
        authStorage.logout();
        showToast('Logged out successfully', 'success');
        navigateTo('landing');
        setTimeout(() => location.reload(), 500);
    }
}

const navBar = new NavBar();
