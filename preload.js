const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Product operations
    getAllProducts: () => ipcRenderer.invoke('product:getAll'),
    addProduct: (product) => ipcRenderer.invoke('product:add', product),
    updateProduct: (id, data) => ipcRenderer.invoke('product:update', { id, data }),
    deleteProduct: (id) => ipcRenderer.invoke('product:delete', id),

    // Customer operations
    getAllCustomers: () => ipcRenderer.invoke('customer:getAll'),
    addCustomer: (customer) => ipcRenderer.invoke('customer:add', customer),
    updateCustomer: (id, data) => ipcRenderer.invoke('customer:update', { id, data }),
    deleteCustomer: (id) => ipcRenderer.invoke('customer:delete', id),

    // Invoice operations
    getAllInvoices: () => ipcRenderer.invoke('invoice:getAll'),
    printInvoice: (invoiceData) => ipcRenderer.invoke('printInvoice', invoiceData)
        .then(result => {
            if (!result.success) {
                throw new Error('Print failed');
            }
            return result;
        }),

    // Analytics operations
    getAnalytics: () => ipcRenderer.invoke('analytics:get'),
    createInvoice: (invoiceData) => ipcRenderer.invoke('invoice:create', invoiceData)
});