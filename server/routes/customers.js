const express = require('express');
const router = express.Router();
const { Customer } = require('../database');

router.get('/', async (req, res) => {
    try {
        const customers = await Customer.findAll({
            raw: true,
            order: [['name', 'ASC']]
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const customer = await Customer.create(req.body);
        res.json(customer.get({ plain: true }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await Customer.update(req.body, {
            where: { id: parseInt(req.params.id) }
        });
        const updatedCustomer = await Customer.findByPk(req.params.id, { raw: true });
        res.json(updatedCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await Customer.destroy({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: result > 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;