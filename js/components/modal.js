/**
 * Modal.js - Modal Dialog Component
 * Reusable modal for confirmations, forms, and content display
 */

class Modal {
    constructor(config) {
        this.config = {
            title: 'Modal',
            content: '',
            size: 'md', // sm, md, lg
            buttons: [],
            closeButton: true,
            backdrop: true,
            onOpen: null,
            onClose: null,
            ...config
        };
        this.isOpen = false;
    }

    open() {
        this.isOpen = true;
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.onclick = (e) => {
            if (e.target === backdrop && this.config.backdrop) {
                this.close();
            }
        };

        const modal = document.createElement('div');
        modal.className = 'modal';

        let buttonsHTML = '';
        if (this.config.buttons.length > 0) {
            buttonsHTML = `
                <div class="modal-footer">
                    ${this.config.buttons.map(btn => `
                        <button class="btn btn-${btn.className || 'secondary'}" onclick="document.querySelector('.modal-backdrop')._modal.handleButtonClick('${btn.action}')">
                            ${btn.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        modal.innerHTML = `
            ${this.config.title ? `
                <div class="modal-header">
                    <h2>${this.config.title}</h2>
                    ${this.config.closeButton ? `
                        <button class="modal-close-btn" onclick="document.querySelector('.modal-backdrop')._modal.close()">×</button>
                    ` : ''}
                </div>
            ` : ''}
            <div class="modal-body">
                ${typeof this.config.content === 'string' ? this.config.content : ''}
            </div>
            ${buttonsHTML}
        `;

        backdrop.appendChild(modal);
        backdrop._modal = this;
        document.getElementById('modal-container').appendChild(backdrop);

        if (this.config.onOpen) {
            this.config.onOpen();
        }
    }

    close() {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        this.isOpen = false;
        if (this.config.onClose) {
            this.config.onClose();
        }
    }

    handleButtonClick(action) {
        const button = this.config.buttons.find(b => b.action === action);
        if (button && button.onClick) {
            button.onClick();
        }
        this.close();
    }

    static confirm(config) {
        const modal = new Modal({
            title: config.title || 'Confirm',
            content: config.message,
            buttons: [
                {
                    label: config.cancelLabel || 'Cancel',
                    className: 'secondary',
                    action: 'cancel',
                    onClick: config.onCancel
                },
                {
                    label: config.confirmLabel || 'Confirm',
                    className: config.confirmClass || 'primary',
                    action: 'confirm',
                    onClick: config.onConfirm
                }
            ],
            ...config
        });
        modal.open();
        return modal;
    }

    static alert(config) {
        const modal = new Modal({
            title: config.title || 'Alert',
            content: config.message,
            buttons: [
                {
                    label: 'OK',
                    className: 'primary',
                    action: 'ok',
                    onClick: config.onOK
                }
            ],
            ...config
        });
        modal.open();
        return modal;
    }

    static form(config) {
        let formHTML = '<form id="modal-form" style="display: flex; flex-direction: column; gap: 16px;">';

        (config.fields || []).forEach(field => {
            const { name, label, type = 'text', required = false, options = [], value = '' } = field;
            const requiredClass = required ? 'required' : '';

            formHTML += `
                <div class="form-group ${requiredClass}">
                    <label for="${name}">${label}</label>
            `;

            if (type === 'select') {
                formHTML += `
                    <select id="${name}" name="${name}" class="form-control">
                        <option value="">Select ${label.toLowerCase()}</option>
                        ${options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                    </select>
                `;
            } else if (type === 'textarea') {
                formHTML += `
                    <textarea id="${name}" name="${name}" class="form-control" ${required ? 'required' : ''}></textarea>
                `;
            } else {
                formHTML += `
                    <input type="${type}" id="${name}" name="${name}" class="form-control" 
                        value="${value}" ${required ? 'required' : ''}>
                `;
            }

            formHTML += '</div>';
        });

        formHTML += '</form>';

        const modal = new Modal({
            title: config.title || 'Form',
            content: formHTML,
            buttons: [
                {
                    label: 'Cancel',
                    className: 'secondary',
                    action: 'cancel'
                },
                {
                    label: config.submitLabel || 'Submit',
                    className: 'primary',
                    action: 'submit',
                    onClick: () => {
                        const form = document.getElementById('modal-form');
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        if (config.onSubmit) {
                            config.onSubmit(data);
                        }
                    }
                }
            ],
            ...config
        });

        modal.open();
        return modal;
    }
}

window.Modal = Modal;
