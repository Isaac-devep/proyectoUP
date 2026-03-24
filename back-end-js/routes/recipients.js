const express = require('express');
const router = express.Router();
const Recipient = require('../models/Recipient');

// Get all recipients
router.get('/', async (req, res) => {
  try {
    const recipients = await Recipient.find();
    res.json({ recipientes: recipients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create recipient
router.post('/', async (req, res) => {
  try {
    const newRecipient = new Recipient(req.body);
    await newRecipient.save();
    res.json({ mensaje: "Recipiente creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
