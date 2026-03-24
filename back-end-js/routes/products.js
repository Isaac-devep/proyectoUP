const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ productos: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.json({ mensaje: "Producto creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
