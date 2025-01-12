import { logoBase64 } from '../utils/logoBase64';
const isElectron = window && window.electronAPI;

export const API = {
    // Product operations
    getAllProducts: () => {
        if (isElectron) return window.electronAPI.getAllProducts();
        return fetch('/api/products').then(res => res.json());
    },
    addProduct: (product) => {
        if (isElectron) return window.electronAPI.addProduct(product);
        return fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        }).then(res => res.json());
    },
    updateProduct: (id, data) => {
        if (isElectron) return window.electronAPI.updateProduct(id, data);
        return fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(res => res.json());
    },
    deleteProduct: (id) => {
        if (isElectron) return window.electronAPI.deleteProduct(id);
        return fetch(`/api/products/${id}`, {
            method: 'DELETE'
        }).then(res => res.json());
    },

    // Customer operations  
    getAllCustomers: () => {
        if (isElectron) return window.electronAPI.getAllCustomers();
        return fetch('/api/customers').then(res => res.json());
    },
    addCustomer: (customer) => {
        if (isElectron) return window.electronAPI.addCustomer(customer);
        return fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        }).then(res => res.json());
    },
    updateCustomer: (id, data) => {
        if (isElectron) return window.electronAPI.updateCustomer(id, data);
        return fetch(`/api/customers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(res => res.json());
    },
    deleteCustomer: (id) => {
        if (isElectron) return window.electronAPI.deleteCustomer(id);
        return fetch(`/api/customers/${id}`, {
            method: 'DELETE'
        }).then(res => res.json());
    },

    // Invoice operations
    getAllInvoices: () => {
        if (isElectron) return window.electronAPI.getAllInvoices();
        return fetch('/api/invoices').then(res => res.json());
    },
    createInvoice: (invoiceData) => {
        if (isElectron) return window.electronAPI.createInvoice(invoiceData);
        return fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        }).then(res => {
            if (!res.ok) throw new Error('Failed to create invoice');
            return res.json();
        });
    },
    printInvoice: (invoiceData) => {
        if (isElectron) return window.electronAPI.printInvoice(invoiceData);
        const printWindow = window.open('', '_blank');
        const content = `
           <!DOCTYPE html>
           <html>
           <head>
                <title>Invoice</title>
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { 
                        font-family: Arial;
                        width: 80mm;
                        padding: 5mm;
                        font-size: 12px;
                    }
                    .header { text-align: center; margin-bottom: 10px; }
                    .logo { max-width: 50px; margin-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: center; font-size: 12px; }
                    td { text-align: center; padding: 2px; font-size: 12px; }
                    .total { text-align: right; margin-right: 15px; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 10px; font-size: 10px; }
                </style>
            </head>
            <body onload="window.print()">
                <div class="header">
                    <img src="data:image/jpeg;base64,${logoBase64}" class="logo" alt="Logo">
                    <div>Your Shop Name</div>
                    <div>123, Shop Street, City - 123456</div>
                    <div>Phone: +91 1234567890</div>
                    <div>Invoice #${invoiceData.invoiceNumber}</div>
                    <div>Date: ${new Date(invoiceData.date).toLocaleDateString()}</div>
                </div>
                <div>
                    <div>Customer: ${invoiceData.customerDetails.name}</div>
                    <div>Mobile: ${invoiceData.customerDetails.mobile}</div>
                    <div>Address: ${invoiceData.customerDetails.address}</div>
                </div>
                <table>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amt</th>
                    </tr>
                    ${invoiceData.items.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.rate}</td>
                            <td>₹${item.total}</td>
                        </tr>
                    `).join('')}
                </table>
                <div class="total">Total: ₹${invoiceData.total}</div>
                 <div class="terms-conditions">
                <div>Terms & Conditions:</div>
                <ol>
                    <li>Goods once sold cannot be returned</li>
                    <li>All disputes are subject to local jurisdiction</li>
                </ol>
            </div>
            
            <div class="footer">
                Thank you for your business!<br>
                Visit Again
            </div>
            </body>
           </html>
       `;
        printWindow.document.write(content);
        printWindow.document.close();
        return Promise.resolve({ success: true });
    },

    // Analytics operations
    getAnalytics: () => {
        if (isElectron) return window.electronAPI.getAnalytics();
        return fetch('/api/analytics').then(res => res.json());
    }
};