/**
 * App.js - Main Application Router
 * Handles navigation, page rendering, and app initialization
 */

class RideFlowApp {
    constructor() {
        this.currentPage = null;
        this.currentUser = null;
    }

    async init() {
        // Setup global navigation
        window.addEventListener('hashchange', () => this.route());

        // Initial route
        this.route();

        // Check authentication
        this.checkAuthStatus();

        // Initialize notification badge
        if (window.notificationPanel) {
            notificationPanel.updateBadge();
        }
    }

    checkAuthStatus() {
        const token = authStorage.getAuthToken();
        const user = authStorage.getCurrentUser();

        if (token && user) {
            this.currentUser = user;
        } else {
            this.currentUser = null;
        }
    }

    async route() {
        const route = getCurrentRoute();
        const page = route.page;
        const section = route.section || '';

        if (page === this.currentPage && ['admin-dashboard', 'rider-dashboard', 'driver-dashboard'].includes(page)) {
            this.updateLayout(page, section);
            return;
        }

        // Update app layout based on page and current route
        this.updateLayout(page, section);

        // Route to appropriate page
        switch (page) {
            case 'landing':
                this.renderLandingPage();
                break;

            case 'login':
                this.renderLoginPage();
                break;

            case 'register':
                this.renderRegisterPage();
                break;

            case 'forgot-password':
                this.renderForgotPasswordPage();
                break;

            case 'admin-dashboard':
                this.checkAuth('Admin', () => this.renderAdminDashboard());
                break;

            case 'rider-dashboard':
                this.checkAuth('Rider', () => this.renderRiderDashboard());
                break;

            case 'driver-dashboard':
                this.checkAuth('Driver', () => this.renderDriverDashboard());
                break;

            default:
                navigateTo('landing');
                break;
        }
    }

    updateLayout(page, section = '') {
        const app = document.getElementById('app');

        // Determine layout type
        if (['landing'].includes(page)) {
            app.className = 'landing-layout';
        } else if (['login', 'register', 'forgot-password'].includes(page)) {
            app.className = 'auth-layout';
        } else if (['admin-dashboard', 'rider-dashboard', 'driver-dashboard'].includes(page)) {
            app.className = 'dashboard-layout';
        } else {
            app.className = '';
        }

        // Update navbar and body theme role
        const user = authStorage.getCurrentUser();
        if (user) {
            document.body.setAttribute('data-role', user.role);
            navBar.render(user);
        } else {
            document.body.removeAttribute('data-role');
            navBar.render(null);
        }

        // Dashboard pages use their own internal layout sidebar
        if (['admin-dashboard', 'rider-dashboard', 'driver-dashboard'].includes(page)) {
            sidebar.hide();
        } else {
            sidebar.hide();
        }
    }

    checkAuth(requiredRole, callback) {
        this.checkAuthStatus();

        console.log('[RideFlow] checkAuth →', { requiredRole, currentUser: this.currentUser });

        if (!this.currentUser || !this.currentUser.id) {
            console.warn('[RideFlow] No valid user found → redirecting to login');
            showToast('Please log in first', 'warning');
            navigateTo('login');
            return;
        }

        if (this.currentUser.role !== requiredRole) {
            console.warn('[RideFlow] Role mismatch →', this.currentUser.role, '!==', requiredRole);
            showToast('Unauthorized — redirecting to your dashboard', 'error');
            const rolePage = this.currentUser.role === 'Admin' ? 'admin-dashboard' :
                             this.currentUser.role === 'Rider' ? 'rider-dashboard' :
                             'driver-dashboard';
            navigateTo(rolePage);
            return;
        }

        console.log('[RideFlow] Auth passed → rendering', requiredRole, 'dashboard');
        callback();
    }

    renderLandingPage() {
        this.currentPage = 'landing';
        landingPage.render();
    }

    renderLoginPage() {
        this.currentPage = 'login';
        authPages.renderLogin();
    }

    renderRegisterPage() {
        this.currentPage = 'register';
        authPages.renderRegister();
    }

    renderForgotPasswordPage() {
        this.currentPage = 'forgot-password';
        authPages.renderForgotPassword();
    }

    async renderAdminDashboard() {
        this.currentPage = 'admin-dashboard';
        try { await adminDash.render(); }
        catch(err) { console.error('[RideFlow] Admin render failed:', err); this._showRenderError(err); }
    }

    async renderRiderDashboard() {
        this.currentPage = 'rider-dashboard';
        try { await riderDash.render(); }
        catch(err) { console.error('[RideFlow] Rider render failed:', err); this._showRenderError(err); }
    }

    async renderDriverDashboard() {
        this.currentPage = 'driver-dashboard';
        try { await driverDash.render(); }
        catch(err) { console.error('[RideFlow] Driver render failed:', err); this._showRenderError(err); }
    }

    _showRenderError(err) {
        const el = document.getElementById('main-content');
        if (el) el.innerHTML = `<div style="padding:40px;color:red;font-family:monospace;">
            <h2>⚠️ Dashboard render error (check DevTools Console)</h2>
            <pre>${err.message}
${err.stack}</pre>
        </div>`;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new RideFlowApp();
        app.init();
        window.app = app; // Global reference
    });
} else {
    const app = new RideFlowApp();
    app.init();
    window.app = app;
}
