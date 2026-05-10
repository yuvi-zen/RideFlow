/**
 * Card.js - Reusable Card Components
 * Contains functions to create different types of cards
 */

class CardFactory {
    // Create a simple card
    static createCard(config) {
        const {
            title,
            content,
            footer,
            className = '',
            onClick
        } = config;

        const card = document.createElement('div');
        card.className = `card ${className}`;

        let html = '';
        if (title) {
            html += `<div class="card-header"><h3>${title}</h3></div>`;
        }
        if (content) {
            html += `<div class="card-body">${content}</div>`;
        }
        if (footer) {
            html += `<div class="card-footer">${footer}</div>`;
        }

        card.innerHTML = html;

        if (onClick) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', onClick);
        }

        return card;
    }

    // Create a stat card (for dashboards)
    static createStatCard(config) {
        const {
            icon,
            label,
            value,
            change,
            changeType = 'positive',
            backgroundColor = 'primary',
            onClick
        } = config;

        const card = document.createElement('div');
        card.className = 'stat-card';

        const iconHTML = icon ? `<div class="stat-card-icon ${backgroundColor}">${icon}</div>` : '';
        const changeHTML = change ? `<div class="stat-card-change ${changeType}">${change}</div>` : '';

        card.innerHTML = `
            ${iconHTML}
            <div class="stat-card-label">${label}</div>
            <div class="stat-card-value">${value}</div>
            ${changeHTML}
        `;

        if (onClick) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', onClick);
        }

        return card;
    }

    // Create a ride card
    static createRideCard(ride) {
        const statusClass = `status-${ride.status.toLowerCase().replace(/\s+/g, '-')}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="flex-between" style="margin-bottom: 12px;">
                    <h3 style="margin: 0;">Ride #${ride.id}</h3>
                    <span class="status-label ${statusClass}">
                        <span class="status-dot"></span>
                        ${ride.status}
                    </span>
                </div>
                
                <div class="ride-info" style="margin-bottom: 12px;">
                    <div>
                        <span class="text-muted" style="font-size: 12px;">Pickup</span>
                        <p style="margin: 4px 0;">📍 ${ride.pickup_location || 'TBD'}</p>
                    </div>
                    <div>
                        <span class="text-muted" style="font-size: 12px;">Dropoff</span>
                        <p style="margin: 4px 0;">📍 ${ride.dropoff_location || 'TBD'}</p>
                    </div>
                </div>
                
                <div class="flex-between">
                    <span class="text-muted">Fare: <strong>${formatCurrency(ride.fare || 0)}</strong></span>
                    <span class="text-muted">${formatDateTime(ride.created_at)}</span>
                </div>
            </div>
        `;

        return card;
    }

    // Create a driver card
    static createDriverCard(driver) {
        const statusClass = `status-${driver.verification_status.toLowerCase()}`;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="flex-between" style="margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; margin-bottom: 4px;">${driver.name}</h3>
                        <span class="text-muted" style="font-size: 12px;">License: ${driver.license_number}</span>
                    </div>
                    <span class="status-label ${statusClass}">
                        <span class="status-dot"></span>
                        ${driver.verification_status}
                    </span>
                </div>
                
                <div class="flex-between" style="margin-bottom: 12px;">
                    <div>
                        <span class="text-muted" style="font-size: 12px;">Rating</span>
                        <p style="margin: 4px 0; font-weight: bold;">⭐ ${driver.average_rating} / 5.0</p>
                    </div>
                    <div>
                        <span class="text-muted" style="font-size: 12px;">Trips</span>
                        <p style="margin: 4px 0; font-weight: bold;">${driver.total_trips}</p>
                    </div>
                </div>
                
                <div class="flex-between">
                    <span class="status-label ${driver.availability_status === 'Online' ? 'status-accepted' : 'status-cancelled'}">
                        <span class="status-dot"></span>
                        ${driver.availability_status}
                    </span>
                    <span class="text-muted" style="font-size: 12px;">📱 ${driver.phone_number}</span>
                </div>
            </div>
        `;

        return card;
    }

    // Create a user card
    static createUserCard(user) {
        const statusClass = `status-${user.account_status.toLowerCase()}`;
        const roleIcon = user.role === 'Admin' ? '👨‍💼' : user.role === 'Driver' ? '🚗' : '👤';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-body">
                <div class="flex-between" style="margin-bottom: 12px;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="font-size: 28px;">${roleIcon}</span>
                        <div>
                            <h3 style="margin: 0; margin-bottom: 4px;">${user.full_name}</h3>
                            <span class="text-muted" style="font-size: 12px;">${user.role}</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <p style="margin: 4px 0; font-size: 12px; color: var(--color-text-muted);">📧 ${user.email}</p>
                    <p style="margin: 4px 0; font-size: 12px; color: var(--color-text-muted);">📱 ${user.phone_number}</p>
                </div>
                
                <div class="flex-between">
                    <span class="status-label ${statusClass}">
                        <span class="status-dot"></span>
                        ${user.account_status}
                    </span>
                    <span class="text-muted" style="font-size: 12px;">${formatDate(user.registration_date)}</span>
                </div>
            </div>
        `;

        return card;
    }

    // Create an empty state card
    static createEmptyState(icon, title, message, actionButton = null) {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.textAlign = 'center';
        card.innerHTML = `
            <div class="card-body">
                <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
                <h3>${title}</h3>
                <p class="text-muted">${message}</p>
                ${actionButton ? `<div style="margin-top: 16px;">${actionButton}</div>` : ''}
            </div>
        `;
        return card;
    }
}

window.CardFactory = CardFactory;
