const express = require('express');
const router = express.Router();
const Label = require('../models/Label');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para PDFs de FDS
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Mantener el nombre original para que coincida con el archivo de seguridad FDS
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Create Label (Etiqueta complete)
router.post('/', upload.single('fds_pdf'), async (req, res) => {
  try {
    const data = req.file ? req.body : req.body;
    
    // Si viene de FormData, los arrays llegan como strings
    const parseField = (f) => {
      if (typeof f === 'string') {
        try { return JSON.parse(f); } catch(e) { return f.split(',').map(s => s.trim()); }
      }
      return f || [];
    };

    const newLabel = new Label({
      id_etiqueta: req.body.id_etiqueta,
      p_advertencia: req.body.p_advertencia,
      inf_cas: req.body.inf_cas,
      fecha: req.body.fecha || Date.now(),
      id_producto: req.body.id_producto,
      fabricante: req.body.fabricante,
      frases_h: parseField(req.body.frases_h),
      frases_p: parseField(req.body.frases_p),
      pictogramas: parseField(req.body.pictogramas),
      fds_file: req.file ? req.file.originalname : req.body.fds_file
    });

    await newLabel.save();
    res.json({ mensaje: "Etiqueta registrada correctamente", fds_file: newLabel.fds_file });
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

// UPDATE Label
router.put('/:id', upload.single('fds_pdf'), async (req, res) => {
  try {
    // Si viene de FormData, los arrays llegan como strings
    const parseField = (f) => {
      if (typeof f === 'string') {
        try { return JSON.parse(f); } catch(e) { return f.split(',').map(s => s.trim()); }
      }
      return f || [];
    };

    const updateData = {
      id_etiqueta: req.body.id_etiqueta,
      p_advertencia: req.body.p_advertencia,
      inf_cas: req.body.inf_cas,
      id_producto: req.body.id_producto,
      fabricante: req.body.fabricante,
      frases_h: parseField(req.body.frases_h),
      frases_p: parseField(req.body.frases_p),
      pictogramas: parseField(req.body.pictogramas)
    };

    if (req.file) {
      updateData.fds_file = req.file.originalname;
    }

    const updated = await Label.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!updated) return res.status(404).json({ error: "Etiqueta no encontrada" });
    res.json({ mensaje: "Etiqueta actualizada correctamente", fds_file: updated.fds_file });
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
