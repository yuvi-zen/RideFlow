/**
 * Form.js - Form Validation and Handling
 * Provides utilities for form validation, submission, and error handling
 */

class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
        this.rules = {};
    }

    addRule(fieldName, rule, message) {
        if (!this.rules[fieldName]) {
            this.rules[fieldName] = [];
        }
        this.rules[fieldName].push({ rule, message });
    }

    validate() {
        this.errors = {};
        let isValid = true;

        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;

            const value = field.value.trim();

            this.rules[fieldName].forEach(({ rule, message }) => {
                if (!rule(value)) {
                    if (!this.errors[fieldName]) {
                        this.errors[fieldName] = [];
                    }
                    this.errors[fieldName].push(message);
                    isValid = false;
                }
            });
        });

        this.displayErrors();
        return isValid;
    }

    displayErrors() {
        // Clear previous errors
        this.form.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
            const errorDiv = group.querySelector('.form-error');
            if (errorDiv) {
                errorDiv.remove();
            }
        });

        // Display new errors
        Object.keys(this.errors).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const group = field.closest('.form-group');
                if (group) {
                    group.classList.add('error');
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'form-error';
                    errorDiv.textContent = this.errors[fieldName][0];
                    group.appendChild(errorDiv);
                }
            }
        });
    }

    getFormData() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData);
    }
}

// Common validation rules
const ValidationRules = {
    required: (value) => value.length > 0,
    email: (value) => isValidEmail(value) || value === '',
    phone: (value) => isValidPhone(value) || value === '',
    password: (value) => isValidPassword(value),
    minLength: (min) => (value) => value.length >= min,
    maxLength: (max) => (value) => value.length <= max,
    match: (fieldName) => (value) => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        return field && field.value === value;
    },
    number: (value) => !isNaN(value) && value !== '',
    custom: (fn) => fn
};

// Form builder
class FormBuilder {
    constructor(config = {}) {
        this.config = {
            id: 'form-' + Date.now(),
            class: 'auth-form',
            ...config
        };
        this.fields = [];
        this.submitButton = { label: 'Submit', className: 'btn-primary' };
        this.cancelButton = null;
    }

    addField(field) {
        this.fields.push(field);
        return this;
    }

    addFields(fields) {
        this.fields.push(...fields);
        return this;
    }

    setSubmitButton(label, className = 'btn-primary', onClick = null) {
        this.submitButton = { label, className, onClick };
        return this;
    }

    setCancelButton(label, onClick = null) {
        this.cancelButton = { label, onClick };
        return this;
    }

    build() {
        const form = document.createElement('form');
        form.id = this.config.id;
        form.className = this.config.class;
        form.onsubmit = (e) => e.preventDefault();

        // Add fields
        this.fields.forEach(field => {
            const {
                name,
                label,
                type = 'text',
                placeholder = '',
                required = false,
                value = '',
                options = [],
                help = '',
                className = ''
            } = field;

            const group = document.createElement('div');
            group.className = `form-group ${required ? 'required' : ''} ${className}`;

            if (label) {
                const labelElement = document.createElement('label');
                labelElement.htmlFor = name;
                labelElement.textContent = label;
                group.appendChild(labelElement);
            }

            let input;

            if (type === 'select') {
                input = document.createElement('select');
                input.innerHTML = `<option value="">Select ${label.toLowerCase()}</option>`;
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    input.appendChild(option);
                });
            } else if (type === 'textarea') {
                input = document.createElement('textarea');
                input.textContent = value;
            } else if (type === 'radio' || type === 'checkbox') {
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.gap = '16px';
                container.style.marginTop = '8px';

                options.forEach(opt => {
                    const div = document.createElement('div');
                    const input = document.createElement('input');
                    input.type = type;
                    input.name = name;
                    input.value = opt.value;
                    input.id = `${name}-${opt.value}`;

                    const label = document.createElement('label');
                    label.htmlFor = `${name}-${opt.value}`;
                    label.textContent = opt.label;
                    label.style.marginLeft = '6px';

                    div.appendChild(input);
                    div.appendChild(label);
                    container.appendChild(div);
                });

                group.appendChild(container);
                form.appendChild(group);
                return;
            } else {
                input = document.createElement('input');
                input.type = type;
                input.value = value;
            }

            input.name = name;
            input.className = 'form-control';
            input.placeholder = placeholder;
            if (required) input.required = true;

            group.appendChild(input);

            if (help) {
                const helpText = document.createElement('div');
                helpText.className = 'form-help';
                helpText.textContent = help;
                group.appendChild(helpText);
            }

            form.appendChild(group);
        });

        // Add buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.marginTop = '16px';

        if (this.cancelButton) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = `btn btn-secondary`;
            cancelBtn.textContent = this.cancelButton.label;
            cancelBtn.onclick = this.cancelButton.onClick;
            buttonContainer.appendChild(cancelBtn);
        }

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = `btn ${this.submitButton.className} btn-block`;
        submitBtn.textContent = this.submitButton.label;
        submitBtn.onclick = this.submitButton.onClick;
        buttonContainer.appendChild(submitBtn);

        form.appendChild(buttonContainer);

        return form;
    }
}

window.FormValidator = FormValidator;
window.ValidationRules = ValidationRules;
window.FormBuilder = FormBuilder;
