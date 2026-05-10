/**
 * admin-components.js - Reusable admin dashboard UI helpers
 */

function getBadgeClass(status) {
    const key = String(status || '').toLowerCase().replace(/\s+/g, '-');
    const map = {
        'active': 'badge-success',
        'verified': 'badge-success',
        'pending': 'badge-warning',
        'review': 'badge-warning',
        'in review': 'badge-warning',
        'open': 'badge-danger',
        'cancelled': 'badge-danger',
        'resolved': 'badge-secondary',
        'completed': 'badge-success',
        'requested': 'badge-primary',
        'accepted': 'badge-info',
        'driver en route': 'badge-info',
        'in progress': 'badge-warning',
        'suspended': 'badge-danger',
        'offline': 'badge-secondary',
        'online': 'badge-success'
    };
    return map[key] || 'badge-secondary';
}

function createBadge(status) {
    return `<span class="badge ${getBadgeClass(status)}">${status || 'Unknown'}</span>`;
}

function formatAdminDate(value) {
    if (!value) return '—';
    return formatDate(value);
}

function formatDateTimeAdmin(value) {
    if (!value) return '—';
    return formatDateTime(value);
}

function createEmptyStateMessage(title, subtitle) {
    return `
        <div class="admin-empty-state">
            <div class="admin-empty-icon">📄</div>
            <h3>${title}</h3>
            <p>${subtitle}</p>
        </div>
    `;
}

window.getBadgeClass = getBadgeClass;
window.createBadge = createBadge;
window.formatAdminDate = formatAdminDate;
window.formatDateTimeAdmin = formatDateTimeAdmin;
window.createEmptyStateMessage = createEmptyStateMessage;
