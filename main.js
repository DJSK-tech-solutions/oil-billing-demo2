const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const htmlPdf = require('html-pdf');
const { print } = require('pdf-to-printer');
const {
    Product,
    Customer,
    Invoice,
    InvoiceItem,
    setupDatabase,
    sequelize,
    Op
} = require('./server/database');

const handlePrint = async (html) => {
    const options = {
        width: '80mm',
        height: 'auto',
        margin: {
            top: '5mm',
            right: '5mm',
            bottom: '5mm',
            left: '5mm'
        }
    };

    return new Promise((resolve, reject) => {
        htmlPdf.create(html, options).toFile('./temp-invoice.pdf', (err, result) => {
            if (err) return reject(err);
            print(result.filename)
                .then(() => {
                    fs.unlink(result.filename, () => {});
                    resolve({ success: true });
                })
                .catch(reject);
        });
    });
};


let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../build/index.html')}`
    );

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {
    try {
        const dbPath = path.join(process.env.ELECTRON_IS_DEV === 1 
            ? __dirname 
            : process.resourcesPath, 
            'database.sqlite'
        );
        console.log('Database path:', dbPath);
        console.log('Database exists:', fs.existsSync(dbPath));

        await setupDatabase();
        createWindow();
    } catch (error) {
        console.error('Failed to start application:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Product IPC Handlers
ipcMain.handle('product:getAll', async () => {
    try {
        const products = await Product.findAll({
            raw: true,
            order: [['name', 'ASC']]
        });
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
});

ipcMain.handle('product:add', async (_, productData) => {
    try {
        const product = await Product.create(productData);
        return product.get({ plain: true });
    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
});

ipcMain.handle('product:update', async (_, { id, data }) => {
    try {
        if (!id) throw new Error('Product ID is required');
        await Product.update(data, {
            where: { id: parseInt(id) }
        });
        const updatedProduct = await Product.findByPk(id, { raw: true });
        return updatedProduct;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
});

ipcMain.handle('product:delete', async (_, id) => {
    try {
        if (!id) throw new Error('Product ID is required');
        const result = await Product.destroy({
            where: { id: parseInt(id) }
        });
        return result > 0;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
});

// Customer IPC Handlers
ipcMain.handle('customer:getAll', async () => {
    try {
        const customers = await Customer.findAll({
            raw: true,
            order: [['name', 'ASC']]
        });
        return customers;
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
});

ipcMain.handle('customer:add', async (_, customerData) => {
    try {
        const customer = await Customer.create(customerData);
        return customer.get({ plain: true });
    } catch (error) {
        console.error('Error adding customer:', error);
        throw error;
    }
});

ipcMain.handle('customer:update', async (_, { id, data }) => {
    try {
        if (!id) throw new Error('Customer ID is required');
        await Customer.update(data, {
            where: { id: parseInt(id) }
        });
        const updatedCustomer = await Customer.findByPk(id, { raw: true });
        return updatedCustomer;
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
});

ipcMain.handle('customer:delete', async (_, id) => {
    try {
        if (!id) throw new Error('Customer ID is required');
        const result = await Customer.destroy({
            where: { id: parseInt(id) }
        });
        return result > 0;
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
});


ipcMain.handle('invoice:getAll', async () => {
    try {
        console.log('Starting to fetch invoices...');

        // Get count of records for debugging
        const counts = {
            invoices: await Invoice.count(),
            customers: await Customer.count(),
            products: await Product.count(),
            invoiceItems: await InvoiceItem.count()
        };

        console.log('Record counts:', counts);

        const invoices = await Invoice.findAll({
            include: [
                {
                    model: Customer,
                    required: false,
                    attributes: ['name', 'mobile', 'address']
                },
                {
                    model: InvoiceItem,
                    required: false,
                    include: [{
                        model: Product,
                        required: false,
                        attributes: ['name', 'rate']
                    }]
                }
            ],
            order: [['date', 'DESC']]
        });

        console.log(`Found ${invoices.length} invoices`);

        // Transform the data
        const transformedInvoices = invoices.map(invoice => {
            const plain = invoice.get({ plain: true });

            // Log any problematic transformations
            if (!plain.Customer) {
                console.log('Warning: Invoice without customer:', plain.id);
            }
            if (!plain.InvoiceItems || plain.InvoiceItems.length === 0) {
                console.log('Warning: Invoice without items:', plain.id);
            }

            return {
                id: plain.id,
                invoiceNumber: plain.invoiceNumber,
                date: plain.date,
                total: plain.total,
                customerDetails: {
                    name: plain.Customer?.name || 'N/A',
                    mobile: plain.Customer?.mobile || 'N/A',
                    address: plain.Customer?.address || 'N/A'
                },
                items: (plain.InvoiceItems || []).map(item => ({
                    name: item.Product?.name || 'N/A',
                    quantity: item.quantity,
                    rate: item.rate,
                    total: item.total
                }))
            };
        });

        console.log('Transformed invoices count:', transformedInvoices.length);
        return transformedInvoices;

    } catch (error) {
        console.error('Error in invoice:getAll:', error);
        throw error;
    }
});

ipcMain.handle('analytics:get', async () => {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Calculate date ranges
        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const startOfCurrentYear = new Date(currentYear, 0, 1);
        const startOfLastYear = new Date(currentYear - 1, 0, 1);
        const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

        // Get monthly revenue data for the chart
        const monthlyRevenue = await Invoice.findAll({
            attributes: [
                [sequelize.fn('strftime', '%Y-%m', sequelize.col('date')), 'month'],
                [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
            ],
            where: {
                date: {
                    [Op.gte]: new Date(currentYear - 1, currentMonth, 1) // Last 12 months
                }
            },
            group: [sequelize.fn('strftime', '%Y-%m', sequelize.col('date'))],
            order: [[sequelize.fn('strftime', '%Y-%m', sequelize.col('date')), 'ASC']],
            raw: true
        });

        // Current month revenue
        const currentMonthRevenue = await Invoice.sum('total', {
            where: {
                date: {
                    [Op.gte]: startOfCurrentMonth,
                    [Op.lte]: endOfCurrentMonth
                }
            }
        }) || 0;

        // Last month revenue
        const lastMonthRevenue = await Invoice.sum('total', {
            where: {
                date: {
                    [Op.gte]: startOfLastMonth,
                    [Op.lt]: startOfCurrentMonth
                }
            }
        }) || 0;

        // Current year revenue
        const currentYearRevenue = await Invoice.sum('total', {
            where: {
                date: {
                    [Op.gte]: startOfCurrentYear
                }
            }
        }) || 0;

        // Last year revenue
        const lastYearRevenue = await Invoice.sum('total', {
            where: {
                date: {
                    [Op.gte]: startOfLastYear,
                    [Op.lt]: startOfCurrentYear
                }
            }
        }) || 0;

        // Customer metrics
        const totalCustomers = await Customer.count();
        const newCustomersThisMonth = await Customer.count({
            where: {
                createdAt: {
                    [Op.gte]: startOfCurrentMonth
                }
            }
        });

        // Total products
        const totalProducts = await Product.count();

        // Top selling products
        const topSellingProducts = await InvoiceItem.findAll({
            attributes: [
                'ProductId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
                [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
            ],
            include: [{
                model: Product,
                attributes: ['name']
            }],
            where: {
                createdAt: {
                    [Op.gte]: startOfCurrentYear
                }
            },
            group: ['ProductId'],
            order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });

        // Product sales data for the chart
        const productSalesData = await InvoiceItem.findAll({
            attributes: [
                'ProductId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity']
            ],
            include: [{
                model: Product,
                attributes: ['name']
            }],
            where: {
                createdAt: {
                    [Op.gte]: startOfCurrentMonth
                }
            },
            group: ['ProductId'],
            order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
            limit: 10,
            raw: true,
            nest: true
        }).then(data => data.map(item => ({
            name: item.Product.name,
            quantity: parseInt(item.quantity)
        })));

        // Format monthly revenue for the chart
        const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
            month: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
            revenue: parseFloat(item.revenue)
        }));

        return {
            currentMonthRevenue,
            lastMonthRevenue,
            currentYearRevenue,
            lastYearRevenue,
            totalCustomers,
            newCustomersThisMonth,
            totalProducts,
            topSellingProducts,
            monthlyRevenue: formattedMonthlyRevenue,
            productSalesData
        };
    } catch (error) {
        console.error('Error getting analytics:', error);
        throw error;
    }
});

async function generateUniqueInvoiceNumber() {
    try {
        const date = new Date();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);

        const lastInvoice = await Invoice.findOne({
            where: {
                invoiceNumber: {
                    [Op.like]: `%/${month}/${year}`
                }
            },
            order: [['invoiceNumber', 'DESC']]
        });

        let nextNumber = 1;
        if (lastInvoice) {
            const lastSerial = parseInt(lastInvoice.invoiceNumber.split('/')[0]);
            nextNumber = lastSerial + 1;
        }

        const serial = String(nextNumber).padStart(3, '0');
        return `${serial}/${month}/${year}`;
    } catch (error) {
        console.error('Error generating invoice number:', error);
        throw error;
    }
}

ipcMain.handle('invoice:create', async (_, invoiceData) => {
    let transaction;
    try {
        // Verify customer exists
        const customer = await Customer.findByPk(invoiceData.customerId);
        if (!customer) {
            throw new Error('Invalid customer ID');
        }

        // Verify all products exist
        const productIds = invoiceData.items.map(item => item.id);
        const products = await Product.findAll({
            where: {
                id: {
                    [Op.in]: productIds
                }
            }
        });
        if (products.length !== productIds.length) {
            throw new Error('One or more products are invalid');
        }

        // Start transaction
        transaction = await sequelize.transaction();

        // Generate invoice number
        const invoiceNumber = await generateUniqueInvoiceNumber();
        console.log('Generated invoice number:', invoiceNumber);

        // Create invoice
        const invoice = await Invoice.create({
            invoiceNumber,
            date: new Date(),
            total: invoiceData.total,
            CustomerId: invoiceData.customerId
        }, { transaction });

        // Create invoice items with validation
        const invoiceItems = await Promise.all(invoiceData.items.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) throw new Error(`Product ${item.id} not found`);
            
            return InvoiceItem.create({
                InvoiceId: invoice.id,
                ProductId: item.id,
                quantity: item.quantity,
                rate: item.rate,
                total: item.total
            }, { transaction });
        }));

        await transaction.commit();

        return {
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                date: invoice.date,
                total: invoice.total
            },
            items: invoiceItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                rate: item.rate,
                total: item.total
            }))
        };

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error in invoice:create:', error);
        throw error;
    }
});

// Invoice Printing Handler
ipcMain.handle('printInvoice', async (_, invoiceData) => {
    try {
        const html = generateInvoiceHTML(invoiceData);
        await handlePrint(html);
        return { success: true };
    } catch (error) {
        console.error('Print error:', error);
        throw error;
    }
});
function generateInvoiceHTML(data) {
    const logoPath = path.join(__dirname, 'assets', 'oil-logo.jpg');
    const logoBase64 = fs.readFileSync(logoPath, 'base64');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 5px; width: 58mm; }
                .header { text-align: center; margin-bottom: 5px; }
                .header img { max-width: 50px; margin-bottom: 5px; }
                .invoice-details, .customer-details, .items, .total, .terms-conditions, .footer { margin-bottom: 5px; }
                .items { border-collapse: collapse; width: 100%; }
                .items th, .items td { border: 1px solid #ddd; padding: 2px; }
                .items th { background-color: #f2f2f2; }
                .total { text-align: right; font-weight: bold; }
                .footer { text-align: center; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="data:image/jpeg;base64,${logoBase64}" class="logo" alt="Logo">
                <div>Your Shop Name</div>
                <div>123, Shop Street, City - 123456</div>
                <div>Phone: +91 1234567890</div>
                <div>Invoice #: ${data.invoiceNumber}</div>
                <div>Date: ${new Date(data.date).toLocaleDateString()}</div>
            </div>
            
            <div class="customer-details">
                <div>Bill To:</div>
                <div>Name: ${data.customerDetails.name}</div>
                <div>Mobile: ${data.customerDetails.mobile}</div>
                <div>Address: ${data.customerDetails.address}</div>
            </div>
            
            <table class="items">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                </tr>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.rate}</td>
                        <td>₹${item.total}</td>
                    </tr>
                `).join('')}
            </table>
            
            <div class="total">
                Total: ₹${data.total}
            </div>
            
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
}

module.exports = { mainWindow };