/**
 * Landing.js - Landing Page
 * Hero section with features, call-to-action buttons, and testimonials
 */

class LandingPage {
    constructor() {
        this.container = document.getElementById('main-content');
    }

    render() {
        this.container.innerHTML = `
            <div class="landing">
                <!-- Hero Section -->
                <section class="hero-section">
                    <div class="hero-badge">🚀 Now Serving 15+ Cities</div>
                    <h1>RideFlow — Smarter Rides, Safer Journeys</h1>
                    <p>Book in seconds. Track in real-time. Arrive safely. The ride-hailing platform built for riders and drivers who demand more.</p>
                    <div class="hero-buttons">
                        <a href="#register?role=Rider" class="btn btn-accent">Get Started</a>
                        <a href="#login" class="btn btn-white">Sign In</a>
                    </div>
                    <div class="hero-stats" style="margin-top: 48px; display: flex; gap: 48px; justify-content: center; flex-wrap: wrap;">
                        <div><div class="stat-num">50K+</div><div class="stat-label">Rides Completed</div></div>
                        <div><div class="stat-num">4.8★</div><div class="stat-label">Average Rating</div></div>
                        <div><div class="stat-num">15+</div><div class="stat-label">Cities Covered</div></div>
                        <div><div class="stat-num">99%</div><div class="stat-label">On-Time Arrival</div></div>
                    </div>
                </section>

                <!-- How It Works -->
                <section class="how-it-works">
                    <h2>How It Works</h2>
                    <div class="steps-grid">
                        <div class="step-card">
                            <div class="step-number">1</div>
                            <h3>Set Pickup</h3>
                            <p>Enter your destination and choose your ride type.</p>
                        </div>
                        <div class="step-card">
                            <div class="step-number">2</div>
                            <h3>Match Driver</h3>
                            <p>Our smart engine finds the best nearby driver in seconds.</p>
                        </div>
                        <div class="step-card">
                            <div class="step-number">3</div>
                            <h3>Track & Ride</h3>
                            <p>Watch your driver arrive in real-time and enjoy the ride.</p>
                        </div>
                        <div class="step-card">
                            <div class="step-number">4</div>
                            <h3>Pay & Rate</h3>
                            <p>Cashless payment and quick rating to keep quality high.</p>
                        </div>
                    </div>
                </section>

                <!-- Features Section -->
                <section class="features-section">
                    <h2>Why Choose RideFlow?</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">⚡</div>
                            <h3>Smart Matching</h3>
                            <p>AI-powered driver matching with ETA, rating, and proximity scoring.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">💰</div>
                            <h3>Fair Pricing</h3>
                            <p>Transparent fares with no hidden charges. See price before booking.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">⭐</div>
                            <h3>Verified Drivers</h3>
                            <p>All drivers are verified and rated by the community.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🛡️</div>
                            <h3>Safety First</h3>
                            <p>SOS, trip sharing, live tracking, and lost-item support.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🗺️</div>
                            <h3>Route Engine</h3>
                            <p>Shortest-path routing with traffic-aware ETA estimation.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">💳</div>
                            <h3>Flexible Payments</h3>
                            <p>Pay with cash, card, wallet, or any method you prefer.</p>
                        </div>
                    </div>
                </section>

                <!-- For Riders Section -->
                <section style="padding: 80px var(--space-xl); background-color: var(--rf-bg);">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;">
                            <div>
                                <h2 style="color: var(--color-primary); margin-bottom: 24px;">For Riders</h2>
                                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 16px;">
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Request a ride with one tap</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Real-time ride tracking & route view</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Schedule rides in advance</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Exclusive promo codes & discounts</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Rate and review drivers</span></li>
                                </ul>
                                <a href="#register?role=Rider" class="btn btn-primary" style="margin-top: 24px;">Become a Rider</a>
                            </div>
                            <div style="text-align: center; background: var(--rf-surface); border-radius: var(--radius-xl); padding: 40px;">
                                <div style="font-size: 100px;">📱</div>
                                <p style="color: var(--rf-text-muted); margin-top: 16px;">Seamless booking experience</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- For Drivers Section -->
                <section style="padding: 80px var(--space-xl); background-color: var(--color-light);">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;">
                            <div style="text-align: center; background: var(--rf-surface); border-radius: var(--radius-xl); padding: 40px;">
                                <div style="font-size: 100px;">🚗</div>
                                <p style="color: var(--rf-text-muted); margin-top: 16px;">Maximize your earnings</p>
                            </div>
                            <div>
                                <h2 style="color: var(--color-primary); margin-bottom: 24px;">For Drivers</h2>
                                <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 16px;">
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Earn competitive fares with smart demand zones</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Choose your working hours</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Build your rating & unlock badges</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>Weekly payouts & earnings dashboard</span></li>
                                    <li style="display: flex; align-items: center; gap: 12px;"><span style="font-size: 24px; color: var(--color-secondary);">✓</span><span>24/7 support & safety tools</span></li>
                                </ul>
                                <a href="#register?role=Driver" class="btn btn-primary" style="margin-top: 24px;">Become a Driver</a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- CTA Section -->
                <section style="padding: 80px var(--space-xl); background: linear-gradient(135deg, var(--rf-accent), var(--rf-accent-dark)); color: white; text-align: center;">
                    <h2 style="color: white; margin-bottom: 24px;">Ready to Get Started?</h2>
                    <p style="color: rgba(255, 255, 255, 0.9); margin-bottom: 32px; font-size: 18px;">
                        Join thousands of users who trust RideFlow for safe, affordable, and reliable rides.
                    </p>
                    <div class="hero-buttons">
                        <a href="#register?role=Rider" class="btn btn-white">Sign Up as Rider</a>
                        <a href="#register?role=Driver" class="btn btn-white">Sign Up as Driver</a>
                    </div>
                </section>

                <!-- Footer -->
                <footer style="padding: 40px var(--space-xl); background-color: var(--color-dark); color: white; text-align: center;">
                    <p style="margin: 0; opacity: 0.8;">&copy; 2025 RideFlow. All rights reserved.</p>
                    <p style="margin: 8px 0 0; opacity: 0.6; font-size: 14px;">Built with ❤️ for safe and affordable transportation</p>
                </footer>
            </div>
        `;
    }
}

const landingPage = new LandingPage();
