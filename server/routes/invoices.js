const express = require('express');
const router = express.Router();
const { Invoice, Customer, InvoiceItem, Product, sequelize, Op } = require('../database');

// Get all invoices
router.get('/', async (req, res) => {
   try {
       const invoices = await Invoice.findAll({
           include: [
               {
                   model: Customer,
                   attributes: ['name', 'mobile', 'address']
               },
               {
                   model: InvoiceItem,
                   include: [{
                       model: Product,
                       attributes: ['name', 'rate']
                   }]
               }
           ],
           order: [['date', 'DESC']]
       });

       const transformedInvoices = invoices.map(invoice => {
           const plain = invoice.get({ plain: true });
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

       res.json(transformedInvoices);
   } catch (error) {
       console.error('Error fetching invoices:', error);
       res.status(500).json({ error: error.message });
   }
});

// Create invoice
router.post('/', async (req, res) => {
   let transaction;
   try {
       const { customerId, total, items } = req.body;

       if (!customerId || !total || !items?.length) {
           return res.status(400).json({ error: 'Missing required fields' });
       }

       console.log('Creating invoice with data:', { customerId, total, items });
       
       transaction = await sequelize.transaction();

       // Generate invoice number
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
       const invoiceNumber = `${String(nextNumber).padStart(3, '0')}/${month}/${year}`;

       // Create invoice
       const invoice = await Invoice.create({
           invoiceNumber,
           date: date,
           total,
           CustomerId: customerId
       }, { transaction });

       // Create invoice items
       const invoiceItems = await Promise.all(items.map(item =>
           InvoiceItem.create({
               InvoiceId: invoice.id,
               ProductId: item.id,
               quantity: item.quantity,
               rate: item.rate,
               total: item.total
           }, { transaction })
       ));

       await transaction.commit();

       const response = {
           success: true,
           invoice: {
               id: invoice.id,
               invoiceNumber,
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

       console.log('Created invoice:', response);
       res.json(response);

   } catch (error) {
       console.error('Error creating invoice:', error);
       if (transaction) await transaction.rollback();
       res.status(500).json({ 
           error: error.message,
           details: process.env.NODE_ENV === 'development' ? error.stack : undefined
       });
   }
});

// Analytics endpoint
router.get('/analytics', async (req, res) => {
   try {
       const now = new Date();
       const currentYear = now.getFullYear();
       const currentMonth = now.getMonth();

       const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
       const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
       const startOfCurrentYear = new Date(currentYear, 0, 1);
       const startOfLastYear = new Date(currentYear - 1, 0, 1);

       const monthlyRevenue = await Invoice.findAll({
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
       });

       const analytics = {
           currentMonthRevenue: await Invoice.sum('total', {
               where: { date: { [Op.gte]: startOfCurrentMonth } }
           }) || 0,
           lastMonthRevenue: await Invoice.sum('total', {
               where: { date: { [Op.gte]: startOfLastMonth, [Op.lt]: startOfCurrentMonth } }
           }) || 0,
           currentYearRevenue: await Invoice.sum('total', {
               where: { date: { [Op.gte]: startOfCurrentYear } }
           }) || 0,
           lastYearRevenue: await Invoice.sum('total', {
               where: { date: { [Op.gte]: startOfLastYear, [Op.lt]: startOfCurrentYear } }
           }) || 0,
           totalCustomers: await Customer.count(),
           newCustomersThisMonth: await Customer.count({
               where: { createdAt: { [Op.gte]: startOfCurrentMonth } }
           }),
           totalProducts: await Product.count(),
           monthlyRevenue: monthlyRevenue.map(item => ({
               month: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
               revenue: parseFloat(item.revenue)
           }))
       };

       res.json(analytics);
   } catch (error) {
       console.error('Error fetching analytics:', error);
       res.status(500).json({ error: error.message });
   }
});

module.exports = router;