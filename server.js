const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase, getDatabase, dbHelpers } = require('./server/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Log middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Initialize database
let dbInitialized = false;

app.use(async (req, res, next) => {
    if (!dbInitialized) {
        try {
            await setupDatabase();
            dbInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            return res.status(500).json({ error: 'Database initialization failed' });
        }
    }
    next();
});

// Products Routes
app.get('/api/products', (req, res) => {
    try {
        const products = dbHelpers.getAllProducts();
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', (req, res) => {
    try {
        const db = getDatabase();
        const { name, rate } = req.body;
        
        db.run('INSERT INTO Products (name, rate) VALUES (?, ?)', [name, rate]);
        const result = db.exec('SELECT * FROM Products WHERE id = last_insert_rowid()');
        
        res.json({
            id: result[0].values[0][0],
            name: result[0].values[0][1],
            rate: result[0].values[0][2]
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const { name, rate } = req.body;
        
        db.run('UPDATE Products SET name = ?, rate = ? WHERE id = ?', [name, rate, id]);
        const result = db.exec('SELECT * FROM Products WHERE id = ?', [id]);
        
        if (result[0]?.values?.length > 0) {
            res.json({
                id: result[0].values[0][0],
                name: result[0].values[0][1],
                rate: result[0].values[0][2]
            });
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        
        db.run('DELETE FROM Products WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: error.message });
    }
});

// Customers Routes
app.get('/api/customers', (req, res) => {
    try {
        const customers = dbHelpers.getAllCustomers();
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', (req, res) => {
    try {
        const db = getDatabase();
        const { name, mobile, address } = req.body;
        
        db.run('INSERT INTO Customers (name, mobile, address) VALUES (?, ?, ?)', 
            [name, mobile, address]);
        const result = db.exec('SELECT * FROM Customers WHERE id = last_insert_rowid()');
        
        res.json({
            id: result[0].values[0][0],
            name: result[0].values[0][1],
            mobile: result[0].values[0][2],
            address: result[0].values[0][3]
        });
    } catch (error) {
        console.error('Error adding customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// Invoices Routes
app.get('/api/invoices', (req, res) => {
    try {
        const invoices = dbHelpers.getAllInvoices();
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    const db = getDatabase();
    try {
        const { customerId, total, items } = req.body;

        // Generate invoice number
        const date = new Date();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        
        // Get last invoice number for the month
        const lastInvoiceResult = db.exec(`
            SELECT invoiceNumber 
            FROM Invoices 
            WHERE strftime('%m/%y', date) = '${month}/${year}'
            ORDER BY id DESC 
            LIMIT 1
        `);

        let nextNumber = 1;
        if (lastInvoiceResult[0]?.values?.length > 0) {
            const lastSerial = parseInt(lastInvoiceResult[0].values[0][0].split('/')[0]);
            nextNumber = lastSerial + 1;
        }
        
        const invoiceNumber = `${String(nextNumber).padStart(3, '0')}/${month}/${year}`;

        // Create invoice
        db.run(`
            INSERT INTO Invoices (invoiceNumber, date, total, CustomerId)
            VALUES (?, datetime('now'), ?, ?)
        `, [invoiceNumber, total, customerId]);

        const invoiceResult = db.exec('SELECT * FROM Invoices WHERE id = last_insert_rowid()');
        const invoiceId = invoiceResult[0].values[0][0];

        // Create invoice items
        items.forEach(item => {
            db.run(`
                INSERT INTO InvoiceItems (InvoiceId, ProductId, quantity, rate, total)
                VALUES (?, ?, ?, ?, ?)
            `, [invoiceId, item.id, item.quantity, item.rate, item.total]);
        });

        res.json({
            success: true,
            invoice: {
                id: invoiceId,
                invoiceNumber,
                date: date.toISOString(),
                total
            }
        });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
    try {
        const db = getDatabase();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Current month revenue
        const currentMonthRevenue = db.exec(`
            SELECT COALESCE(SUM(total), 0) as revenue
            FROM Invoices
            WHERE strftime('%Y-%m', date) = '${currentYear}-${String(currentMonth).padStart(2, '0')}'
        `)[0].values[0][0];

        // Monthly revenue for the last 12 months
        const monthlyRevenue = db.exec(`
            SELECT 
                strftime('%Y-%m', date) as month,
                SUM(total) as revenue
            FROM Invoices
            WHERE date >= date('now', '-12 months')
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month ASC
        `);

        const analytics = {
            currentMonthRevenue,
            monthlyRevenue: monthlyRevenue[0]?.values.map(row => ({
                month: new Date(row[0] + '-01').toLocaleString('default', { month: 'short' }),
                revenue: row[1]
            })) || []
        };

        res.json(analytics);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

// Serve React app - must be after API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server if not in production
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
