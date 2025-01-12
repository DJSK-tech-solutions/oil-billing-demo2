const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./server/database');
const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Routes
const productRoutes = require('./server/routes/products');
const customerRoutes = require('./server/routes/customers');
const invoiceRoutes = require('./server/routes/invoices');

// Log middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// API endpoints
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const { 
            Invoice, 
            Customer, 
            Product, 
            InvoiceItem, 
            sequelize 
        } = require('./server/database');

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const startOfCurrentYear = new Date(currentYear, 0, 1);
        const startOfLastYear = new Date(currentYear - 1, 0, 1);

        const analytics = {
            currentMonthRevenue: await Invoice.sum('total', {
                where: { date: { [Op.gte]: startOfCurrentMonth } }
            }) || 0,
            lastMonthRevenue: await Invoice.sum('total', {
                where: { 
                    date: { 
                        [Op.gte]: startOfLastMonth,
                        [Op.lt]: startOfCurrentMonth
                    }
                }
            }) || 0,
            currentYearRevenue: await Invoice.sum('total', {
                where: { date: { [Op.gte]: startOfCurrentYear } }
            }) || 0,
            lastYearRevenue: await Invoice.sum('total', {
                where: { 
                    date: { 
                        [Op.gte]: startOfLastYear,
                        [Op.lt]: startOfCurrentYear
                    }
                }
            }) || 0,
            totalCustomers: await Customer.count(),
            newCustomersThisMonth: await Customer.count({
                where: { createdAt: { [Op.gte]: startOfCurrentMonth } }
            }),
            totalProducts: await Product.count(),
            monthlyRevenue: await Invoice.findAll({
                attributes: [
                    [sequelize.fn('strftime', '%Y-%m', sequelize.col('date')), 'month'],
                    [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
                ],
                where: {
                    date: {
                        [Op.gte]: new Date(currentYear - 1, currentMonth, 1)
                    }
                },
                group: [sequelize.fn('strftime', '%Y-%m', sequelize.col('date'))],
                order: [[sequelize.fn('strftime', '%Y-%m', sequelize.col('date')), 'ASC']],
                raw: true
            })
        };

        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
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

// Initialize database and start server
setupDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});