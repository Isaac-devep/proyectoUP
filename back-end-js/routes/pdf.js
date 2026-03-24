const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// USAR MEMORY STORAGE PARA EVITAR QUE HERRAMIENTAS DE AUTO-REFRESH (VSCODE, ETC) 
// REINICIEN LA PÁGINA AL DETECTAR NUEVOS ARCHIVOS EN DISCO.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', (req, res, next) => {
    console.log("📥 Recibida petición POST en /extract_pdf_data (Memory Mode)");
    next();
}, upload.single('file'), async (req, res) => {
  try {
    console.log("📂 Archivo recibido en memoria:", req.file ? req.file.originalname : "NINGUNO");
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const texto = data.text;

    // Logic replicated from Python main.py
    let nombre = "NO DETECTADO";
    const patrones_nombre = [
        /(?:Identificación del producto|Nombre del producto|Producto|Nombre comercial)[\s:*-]+([^\n]+)/i,
        /1\s*\.\s*IDENTIFICACI[ÓO]N[^\n]*\n([^\n]+)/i,
        /^\s*([A-Z][A-Z0-9ÁÉÍÓÚÑ\s\-/%&\.\(\)]{5,})\s*$/m
    ];

    for (const patron of patrones_nombre) {
        const match = texto.match(patron);
        if (match) {
            nombre = match[1].trim();
            if (nombre.length > 5) break;
        }
    }

    // Indicaciones de peligro (H)
    const indicaciones = [];
    const hRegex = /\bH\s*[-:]?\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    let m;
    while ((m = hRegex.exec(texto)) !== null) {
        const codigo = m[1].toUpperCase();
        const descripcion = m[2].trim().replace(/[.;:-]+$/, "");
        indicaciones.push(descripcion ? `H${codigo}: ${descripcion}` : `H${codigo}`);
    }

    // Consejos de prudencia (P)
    const consejos = [];
    const pRegex = /\bP\s*[-:]?\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    while ((m = pRegex.exec(texto)) !== null) {
        const codigo = m[1].toUpperCase();
        const descripcion = m[2].trim().replace(/[.;:-]+$/, "");
        consejos.push(descripcion ? `P${codigo}: ${descripcion}` : `P${codigo}`);
    }

    // Pictogramas
    const pictogramas = [];
    const texto_lower = texto.toLowerCase();
    const pictogramas_mapping = {
        "inflamable": "inflamable",
        "llama": "inflamable",
        "oxidante": "oxidante",
        "llama sobre círculo": "oxidante",
        "explosivo": "explosivo",
        "bomba explotando": "explosivo",
        "corrosivo": "corrosivo",
        "corrosión": "corrosivo",
        "tóxica": "toxico",
        "veneno": "toxico",
        "calavera": "toxico",
        "peligro para la salud": "peligro-salud",
        "exclamación": "irritante",
        "exclamacion": "irritante",
        "irritantes": "irritante",
        "comburente": "oxidante",
        "peróxido": "oxidante",
        "oxidante": "oxidante",
        "líquido inflamable": "inflamable",
        "l[íi]quido inflamable": "inflamable",
        "s[óo]lido inflamable": "inflamable",
        "combustible espontáneo": "inflamable",
        "peligroso húmedo": "explosivo",
        "tóxica": "toxico",
        "veneno": "toxico",
        "calavera": "toxico",
        "cancerígena": "peligro-salud",
        "corrosiva": "corrosivo",
        "ácida": "corrosivo",
        "base": "corrosivo",
        "irritante": "irritante",
        "medio ambiente": "daño-ambiente",
        "acuático": "daño-ambiente",
        "daño al medio": "daño-ambiente",
        "cilindro de gas": "gas-presurizado",
        "cilindro": "gas-presurizado",
        "gas a presión": "gas-presurizado"
    };

    for (const [keyword, picto] of Object.entries(pictogramas_mapping)) {
        if (texto_lower.includes(keyword)) {
            pictogramas.push(picto);
        }
    }

    // Advertencia
    const advertMatch = texto.match(/(PELIGRO|ADVERTENCIA|PRECAUCI[ÓO]N|ATENCI[ÓO]N|WARNING|DANGER)/i);
    const advertencia = advertMatch ? advertMatch[0].charAt(0).toUpperCase() + advertMatch[0].slice(1).toLowerCase() : "No detectada";

    // CAS
    const casMatch = texto.match(/\b\d{2,7}-\d{2}-\d\b/);
    const cas = casMatch ? casMatch[0] : "No detectado";

    // Emergencia
    const emergenciaRegex = /(?:Tel[ée]fono|Contacto|EMERGENCIA|N[ÚU]MERO).*?[:\-]\s*([^\n]+)/gi;
    const emergencia = [];
    while ((m = emergenciaRegex.exec(texto)) !== null) {
        emergencia.push(m[1].trim());
    }

    res.json({
        nombre_producto: nombre,
        indicaciones_peligro: [...new Set(indicaciones)],
        consejos_prudencia: [...new Set(consejos)],
        informacion_emergencia: [...new Set(emergencia)],
        pictogramas: [...new Set(pictogramas)],
        palabra_advertencia: advertencia,
        cas: cas
    });

  } catch (err) {
    console.error("❌ ERROR EN EXTRACT_PDF_DATA:", err);
    res.status(500).json({ 
        detail: err.message,
        error: "Internal Server Error" 
    });
  }
});

module.exports = router;
