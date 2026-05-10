/**
 * Table.js - Reusable Data Table Component
 * Creates responsive tables with sorting, filtering, and actions
 */

class DataTable {
    constructor(config) {
        this.config = {
            columns: [],
            data: [],
            actions: [],
            sortable: true,
            filterable: true,
            paginated: true,
            itemsPerPage: 10,
            ...config
        };
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortOrder = 'asc';
        this.filteredData = this.config.data;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'table-container';

        // Header with search and actions
        let headerHTML = '';
        if (this.config.filterable) {
            headerHTML = `
                <div style="padding: 16px; background-color: white; border-bottom: 1px solid var(--color-border); display: flex; gap: 12px; justify-content: space-between;">
                    <input type="text" class="form-control" placeholder="Search..." style="flex: 1; max-width: 300px;" 
                        onkeyup="this.closest('.table-container')._table.filter(this.value)">
                </div>
            `;
        }

        // Table
        let tableHTML = `<table class="table">
            <thead>
                <tr>
                    ${this.config.columns.map(col => `
                        <th ${this.config.sortable ? `onclick="this.closest('.table-container')._table.sort('${col.key}')" style="cursor: pointer;"` : ''}>
                            ${col.label} ${this.config.sortable ? '↕️' : ''}
                        </th>
                    `).join('')}
                    ${this.config.actions.length > 0 ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${this.getPageData().map(row => `
                    <tr>
                        ${this.config.columns.map(col => `
                            <td>${this.formatCell(row[col.key], col.type)}</td>
                        `).join('')}
                        ${this.config.actions.length > 0 ? `
                            <td>
                                <div class="table-actions">
                                    ${this.config.actions.map(action => `
                                        <button class="btn btn-sm btn-${action.className || 'secondary'}" 
                                            onclick="this.closest('.table-container')._table.onAction('${action.key}', ${row.id})"
                                            title="${action.label}">
                                            ${action.icon || action.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>`;

        // Pagination
        let paginationHTML = '';
        if (this.config.paginated && this.filteredData.length > this.config.itemsPerPage) {
            const totalPages = Math.ceil(this.filteredData.length / this.config.itemsPerPage);
            paginationHTML = `
                <div style="padding: 16px; background-color: white; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--color-text-muted);">
                        Page ${this.currentPage} of ${totalPages} | Total: ${this.filteredData.length} items
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="this.closest('.table-container')._table.previousPage(this.closest('.table-container'))">← Previous</button>
                        <button class="btn btn-sm btn-secondary" onclick="this.closest('.table-container')._table.nextPage(this.closest('.table-container'))">Next →</button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = headerHTML + tableHTML + paginationHTML;
        container.dataset.table = 'true';
        container._table = this;
        this.container = container;

        return container;
    }

    formatCell(value, type) {
        if (value === null || value === undefined) return '-';

        switch (type) {
            case 'currency':
                return formatCurrency(value);
            case 'date':
                return formatDate(value);
            case 'datetime':
                return formatDateTime(value);
            case 'status':
                return `<span class="status-label status-${value.toLowerCase()}">${value}</span>`;
            case 'badge':
                return `<span class="badge badge-primary">${value}</span>`;
            default:
                return value;
        }
    }

    filter(query) {
        query = query.toLowerCase();
        this.filteredData = this.config.data.filter(row => {
            return this.config.columns.some(col => {
                const cellValue = String(row[col.key]).toLowerCase();
                return cellValue.includes(query);
            });
        });
        this.currentPage = 1;
        this.updateTable(this.container);
    }

    sort(column) {
        if (this.sortColumn === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortOrder = 'asc';
        }

        this.filteredData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];

            if (typeof aVal === 'string') {
                return this.sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        this.updateTable(this.container);
    }

    getPageData() {
        if (!this.config.paginated) {
            return this.filteredData;
        }

        const start = (this.currentPage - 1) * this.config.itemsPerPage;
        const end = start + this.config.itemsPerPage;
        return this.filteredData.slice(start, end);
    }

    nextPage(container) {
        const totalPages = Math.ceil(this.filteredData.length / this.config.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateTable(container);
        }
    }

    previousPage(container) {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateTable(container);
        }
    }

    updateTable(container) {
        if (container) {
            const newContainer = this.render();
            container.parentNode.replaceChild(newContainer, container);
        }
    }
}

window.DataTable = DataTable;
