const express = require('express');
const router = express.Router();
const PhraseP = require('../models/PhraseP');

// Get all PhraseP
router.get('/', async (req, res) => {
  try {
    const phrases = await PhraseP.find();
    res.json({ frases_p: phrases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create PhraseP
router.post('/', async (req, res) => {
  try {
    const newPhrase = new PhraseP(req.body);
    await newPhrase.save();
    res.json({ mensaje: "Frase P registrada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
