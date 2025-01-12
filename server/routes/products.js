const express = require('express');
const router = express.Router();
const { Product } = require('../database');

router.get('/', async (req, res) => {
    try {
        const products = await Product.findAll({
            raw: true,
            order: [['name', 'ASC']]
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.json(product.get({ plain: true }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await Product.update(req.body, {
            where: { id: parseInt(req.params.id) }
        });
        const updatedProduct = await Product.findByPk(req.params.id, { raw: true });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const result = await Product.destroy({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ success: result > 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;