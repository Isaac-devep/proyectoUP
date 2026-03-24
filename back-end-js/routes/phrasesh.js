const express = require('express');
const router = express.Router();
const PhraseH = require('../models/PhraseH');

// Get all PhraseH
router.get('/', async (req, res) => {
  try {
    const phrases = await PhraseH.find();
    res.json({ frases_h: phrases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create PhraseH
router.post('/', async (req, res) => {
  try {
    const newPhrase = new PhraseH(req.body);
    await newPhrase.save();
    res.json({ mensaje: "Frase H registrada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
