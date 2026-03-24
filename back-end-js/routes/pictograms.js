const express = require('express');
const router = express.Router();
const Pictogram = require('../models/Pictogram');

// Get all Pictograms
router.get('/', async (req, res) => {
  try {
    const pictograms = await Pictogram.find();
    res.json({ pictogramas: pictograms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Pictogram
router.post('/', async (req, res) => {
  try {
    const newPictogram = new Pictogram(req.body);
    await newPictogram.save();
    res.json({ mensaje: "Pictograma registrado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
