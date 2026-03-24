const express = require('express');
const router = express.Router();
const Label = require('../models/Label');

// Create Label (Etiqueta complete)
router.post('/', async (req, res) => {
  try {
    const { 
      id_etiqueta, 
      p_advertencia, 
      inf_cas, 
      fecha, 
      id_producto,
      frases_h, // These should be ObjectIds if they are already in DB
      frases_p,
      pictogramas
    } = req.body;

    const newLabel = new Label({
      id_etiqueta,
      p_advertencia,
      inf_cas,
      fecha,
      id_producto,
      frases_h,
      frases_p,
      pictogramas
    });

    await newLabel.save();
    res.json({ mensaje: "Etiqueta registrada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional: Get all labels with population
router.get('/', async (req, res) => {
  try {
    const labels = await Label.find()
      .populate('frases_h')
      .populate('frases_p')
      .populate('pictogramas');
    res.json({ etiquetas: labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Label
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Label.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Etiqueta no encontrada" });
    res.json({ mensaje: "Etiqueta eliminada correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
