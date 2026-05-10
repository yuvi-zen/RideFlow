/**
 * Auth.js - Authentication Pages (Login & Register)
 * Handles user login, registration, and role selection
 */

class AuthPages {
    constructor() {
        this.container = document.getElementById('main-content');
        this.selectedRole = null;
    }

    renderLogin() {
        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <h1>RideFlow</h1>
                    <p>Sign in to your account</p>
                    
                    <form class="auth-form" id="login-form">
                        <div class="form-group required">
                            <label>Email Address</label>
                            <input type="email" name="email" class="form-control" placeholder="your@email.com" required>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group required">
                            <label>Password</label>
                            <input type="password" name="password" class="form-control" placeholder="••••••••" required>
                            <div class="form-error"></div>
                        </div>

                        <a href="#forgot-password" style="color: var(--color-primary); font-size: 14px;">Forgot password?</a>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 16px;">Sign In</button>
                    </form>
                    <div class="auth-footer">
                        Don't have an account? <a href="#register">Sign up here</a>
                    </div>
                </div>
            </div>
        `;

        // Handle login form submission
        const form = document.getElementById('login-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = form.querySelector('input[name="email"]').value;
            const password = form.querySelector('input[name="password"]').value;

            try {
                showToast('Logging in...', 'info');
                const response = await authAPI.login(email, password);

                if (response.success) {
                    showToast('Login successful!', 'success');
                    setTimeout(() => {
                        const user = response.user;
                        const dashboardPage = user.role === 'Admin' ? 'admin-dashboard' : 
                                            user.role === 'Rider' ? 'rider-dashboard' : 
                                            'driver-dashboard';
                        navigateTo(dashboardPage);
                    }, 500);
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    renderRegister() {
        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <h1>RideFlow</h1>
                    <p>Create your account</p>

                    <!-- Role Selection -->
                    <div style="margin-bottom: 24px;">
                        <label style="font-weight: 600; margin-bottom: 12px; display: block;">Select Your Role</label>
                        <div class="role-selector">
                            <div class="role-option" id="role-rider" onclick="authPages.selectRole('Rider')">
                                <div class="role-option-icon">👤</div>
                                <div class="role-option-label">Rider</div>
                            </div>
                            <div class="role-option" id="role-driver" onclick="authPages.selectRole('Driver')">
                                <div class="role-option-icon">🚗</div>
                                <div class="role-option-label">Driver</div>
                            </div>
                        </div>
                    </div>

                    <form class="auth-form" id="register-form">
                        <div class="form-group required">
                            <label>Full Name</label>
                            <input type="text" name="full_name" class="form-control" placeholder="John Doe" required>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group required">
                            <label>Email Address</label>
                            <input type="email" name="email" class="form-control" placeholder="your@email.com" required>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group required">
                            <label>Phone Number</label>
                            <input type="tel" name="phone_number" class="form-control" placeholder="+923001234567" required>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group required">
                            <label>Password</label>
                            <input type="password" name="password" class="form-control" placeholder="••••••••" required>
                            <div class="form-help">At least 8 characters</div>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group required">
                            <label>Confirm Password</label>
                            <input type="password" name="confirm_password" class="form-control" placeholder="••••••••" required>
                            <div class="form-error"></div>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="agree_terms" style="margin-right: 6px;" required>
                                I agree to the Terms & Conditions
                            </label>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">Create Account</button>
                    </form>

                    <div class="auth-footer">
                        Already have an account? <a href="#login">Sign in here</a>
                    </div>
                </div>
            </div>
        `;

        // Check URL for role parameter
        const params = getUrlParams();
        if (params.role) {
            this.selectRole(params.role);
        }

        // Handle register form submission
        const form = document.getElementById('register-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!this.selectedRole) {
                showToast('Please select a role', 'warning');
                return;
            }

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validation
            if (data.password !== data.confirm_password) {
                showToast('Passwords do not match', 'error');
                return;
            }

            if (!isValidEmail(data.email)) {
                showToast('Invalid email format', 'error');
                return;
            }

            if (!isValidPassword(data.password)) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }

            try {
                showToast('Creating account...', 'info');
                
                const userData = {
                    full_name: data.full_name,
                    email: data.email,
                    phone_number: data.phone_number,
                    password: data.password,
                    role: this.selectedRole,
                    account_status: 'Active'
                };

                const response = await authAPI.register(userData);

                if (response.success) {
                    showToast('Account created successfully!', 'success');
                    setTimeout(() => {
                        const user = response.user;
                        const dashboardPage = user.role === 'Admin' ? 'admin-dashboard' : 
                                            user.role === 'Rider' ? 'rider-dashboard' : 
                                            'driver-dashboard';
                        navigateTo(dashboardPage);
                    }, 500);
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }

    selectRole(role) {
        this.selectedRole = role;
        
        // Update UI
        document.querySelectorAll('.role-option').forEach(el => {
            el.classList.remove('selected');
        });

        const selectedElement = document.getElementById(`role-${role.toLowerCase()}`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }

    renderForgotPassword() {
        this.container.innerHTML = `
            <div class="auth-page">
                <div class="auth-card">
                    <h1>RideFlow</h1>
                    <p>Reset your password</p>

                    <form class="auth-form" id="forgot-form">
                        <div class="form-group required">
                            <label>Email Address</label>
                            <input type="email" name="email" class="form-control" placeholder="your@email.com" required>
                            <div class="form-help">We'll send you a link to reset your password</div>
                            <div class="form-error"></div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">Send Reset Link</button>
                    </form>

                    <div class="auth-footer">
                        <a href="#login">Back to login</a>
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('forgot-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.querySelector('input[name="email"]').value;

            try {
                showToast('Sending reset link...', 'info');
                await authAPI.forgotPassword(email);
                showToast('Reset link sent to your email', 'success');
                setTimeout(() => navigateTo('login'), 1500);
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
}

const authPages = new AuthPages();
