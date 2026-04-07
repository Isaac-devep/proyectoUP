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

const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Usar el nombre original del nuevo archivo
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// DELETE file from assets
router.delete('/assets/:filename', (req, res) => {
  const filepath = path.join(__dirname, '../assets', req.params.filename);
  if (fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath);
      res.json({ mensaje: "Archivo eliminado correctamente" });
    } catch (err) {
      res.status(500).json({ error: "No se pudo eliminar el archivo: " + err.message });
    }
  } else {
    res.status(404).json({ error: "Archivo no encontrado" });
  }
});

// UPDATE file in assets
router.put('/assets/:filename', upload.single('fds_pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se envió ningún archivo" });
  
  const oldFilename = req.params.filename;
  const newFilename = req.file.originalname;

  try {
    // Si el nombre del nuevo archivo es diferente al original, eliminamos el original
    if (oldFilename !== newFilename) {
      const oldFilepath = path.join(__dirname, '../assets', oldFilename);
      if (fs.existsSync(oldFilepath)) {
        fs.unlinkSync(oldFilepath);
      }
      
      // Actualizar automáticamente todas las etiquetas en la BD que referenciaban al archivo viejo
      const Label = require('../models/Label');
      await Label.updateMany({ fds_file: oldFilename }, { fds_file: newFilename });
    }
    
    res.json({ mensaje: "Archivo reemplazado y actualizado correctamente", filename: newFilename });
  } catch (err) {
    res.status(500).json({ error: "Error procesando el reemplazo: " + err.message });
  }
});

module.exports = router;
