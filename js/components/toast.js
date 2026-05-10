/**
 * Toast.js - Toast Notification Component
 * Displays temporary notification messages
 */

class Toast {
    constructor(config) {
        this.config = {
            title: '',
            message: '',
            type: 'info', // success, error, warning, info
            duration: 3000,
            icon: '',
            ...config
        };
        this.element = null;
    }

    show() {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const container = document.getElementById('toast-container');
        
        this.element = document.createElement('div');
        this.element.className = `toast ${this.config.type}`;
        this.element.innerHTML = `
            <div class="toast-icon">${this.config.icon || icons[this.config.type]}</div>
            <div class="toast-content">
                ${this.config.title ? `<div class="toast-title">${this.config.title}</div>` : ''}
                ${this.config.message ? `<div class="toast-message">${this.config.message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        `;

        container.appendChild(this.element);

        if (this.config.duration > 0) {
            setTimeout(() => this.close(), this.config.duration);
        }

        return this;
    }

    close() {
        if (this.element) {
            this.element.classList.add('hide');
            setTimeout(() => {
                if (this.element && this.element.parentNode) {
                    this.element.remove();
                }
            }, 300);
        }
    }

    static show(config) {
        const toast = new Toast(config);
        return toast.show();
    }

    static success(message, title = 'Success') {
        return Toast.show({ type: 'success', title, message });
    }

    static error(message, title = 'Error') {
        return Toast.show({ type: 'error', title, message });
    }

    static warning(message, title = 'Warning') {
        return Toast.show({ type: 'warning', title, message });
    }

    static info(message, title = 'Info') {
        return Toast.show({ type: 'info', title, message });
    }
}

// Global function for quick access
function showToast(message, type = 'info', title = '') {
    return Toast.show({ type, title, message });
}

window.Toast = Toast;
window.showToast = showToast;
