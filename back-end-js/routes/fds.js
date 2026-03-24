const express = require('express');
const router = express.Router();
const FDS = require('../models/FDS');
const fs = require('fs');
const path = require('path');
router.get('/', async (req, res) => {
  try {
    const fdsList = await FDS.find();
    res.json({ fds: fdsList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIST FILES FROM ASSETS (Dynamic Discovery)
router.get('/list-files', (req, res) => {
  const assetsPath = path.join(__dirname, '../assets');
  
  fs.readdir(assetsPath, (err, files) => {
    if (err) {
      console.error("Error reading assets:", err);
      return res.status(500).json({ error: "No se pudo leer el directorio de archivos" });
    }
    
    // Filtrar solo PDFs
    const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf')).map(f => {
      const stats = fs.statSync(path.join(assetsPath, f));
      return {
        name: f,
        size: stats.size,
        mtime: stats.mtime
      };
    });
    
    res.json({ files: pdfs });
  });
});

// Create FDS
router.post('/', async (req, res) => {
  try {
    const newFDS = new FDS(req.body);
    await newFDS.save();
    res.json({ mensaje: "FDS creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
