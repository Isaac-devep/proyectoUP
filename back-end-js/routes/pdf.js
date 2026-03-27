const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// USAR MEMORY STORAGE PARA EVITAR QUE HERRAMIENTAS DE AUTO-REFRESH (VSCODE, ETC) 
// REINICIEN LA PÁGINA AL DETECTAR NUEVOS ARCHIVOS EN DISCO.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const GHS_PHRASES = {
    // Hazard (H)
    "H220": "Gas extremadamente inflamable", "H221": "Gas inflamable", "H222": "Aerosol extremadamente inflamable",
    "H224": "Líquido y vapores extremadamente inflamables", "H225": "Líquido y vapores muy inflamables", "H226": "Líquidos y vapores inflamables",
    "H227": "Líquido combustible", "H228": "Sólido inflamable", "H280": "Contiene gas a presión; peligro de explosión en caso de calentamiento",
    "H300": "Mortal en caso de ingestión", "H301": "Tóxico en caso de ingestión", "H302": "Nocivo en caso de ingestión",
    "H310": "Mortal en contacto con la piel", "H311": "Tóxico en contacto con la piel", "H312": "Nocivo en contacto con la piel",
    "H314": "Provoca quemaduras graves en la piel y lesiones oculares graves", "H315": "Provoca irritación cutánea",
    "H317": "Puede provocar una reacción alérgica en la piel", "H318": "Provoca lesiones oculares graves",
    "H319": "Provoca irritación ocular grave", "H330": "Mortal en caso de inhalación", "H331": "Tóxico en caso de inhalación",
    "H332": "Nocivo en caso de inhalación", "H335": "Puede irritar las vías respiratorias",
    "H336": "Puede provocar somnolencia o vértigo", "H350": "Puede provocar cáncer", "H351": "Se sospecha que provoca cáncer",
    "H400": "Muy tóxico para los organismos acuáticos", "H410": "Muy tóxico para los organismos acuáticos, con efectos nocivos duraderos",
    "H411": "Tóxico para los organismos acuáticos, con efectos nocivos duraderos",

    // Precautionary (P)
    "P101": "Si se necesita consejo médico, tener a mano el envase o la etiqueta", "P102": "Mantener fuera del alcance de los niños",
    "P201": "Pedir instrucciones especiales antes del uso", "P210": "Mantener alejado del calor, de chispas, de llamas abiertas y de cualquier otra fuente de ignición. No fumar",
    "P232": "Proteger de la humedad", "P233": "Mantener el recipiente herméticamente cerrado",
    "P234": "Conservar únicamente en el recipiente original", "P260": "No respirar el polvo/el humo/el gas/la niebla/los vapores/el aerosol",
    "P261": "Evitar respirar el polvo/el humo/el gas/la niebla/los vapores/el aerosol", "P264": "Lavarse concienzudamente tras la manipulación",
    "P270": "No comer, beber ni fumar durante su utilización", "P273": "Evitar su liberación al medio ambiente",
    "P280": "Llevar guantes/prendas/gafas/máscara de protección", "P301": "EN CASO DE INGESTIÓN:",
    "P302": "EN CASO DE CONTACTO CON LA PIEL:", "P303": "EN CASO DE CONTACTO CON LA PIEL (o el pelo):",
    "P304": "EN CASO DE INHALACIÓN:", "P305": "EN CASO DE CONTACTO CON LOS OJOS:",
    "P310": "Llamar inmediatamente a un centro de toxicología o a un médico",
    "P330": "Enjuagar la boca", "P331": "NO provocar el vómito",
    "P351": "Aclarar cuidadosamente con agua durante varios minutos", "P353": "Aclarar la piel con agua [o ducharse]",
    "P361": "Quitar inmediatamente todas las prendas contaminadas", "P403": "Almacenar en un lugar bien ventilado",
    "P405": "Guardar bajo llave", "P410": "Proteger de la luz del sol", "P501": "Eliminar el contenido/el recipiente en una planta autorizada"
};

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

    const placeholderText = "Ver ficha técnica para detalles de peligros";

    // Indicaciones de peligro (H)
    const indicaciones = [];
    const hRegex = /\bH\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    let m;
    while ((m = hRegex.exec(texto)) !== null) {
        const codigo = "H" + m[1].toUpperCase();
        let descripcion = m[2].trim().replace(/[.;:-]+$/, "");
        
        // Si la descripción extraída es el placeholder o muy corta, buscar en diccionario
        if (descripcion.toLowerCase().includes("ficha") || descripcion.length < 5) {
            descripcion = GHS_PHRASES[codigo] || descripcion;
        }
        
        if (descripcion !== placeholderText) {
            indicaciones.push(`${codigo}: ${descripcion}`);
        }
    }

    // Consejos de prudencia (P)
    const consejos = [];
    const pRegex = /\bP\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    while ((m = pRegex.exec(texto)) !== null) {
        const codigo = "P" + m[1].toUpperCase();
        let descripcion = m[2].trim().replace(/[.;:-]+$/, "");
        
        if (descripcion.toLowerCase().includes("ficha") || descripcion.length < 5) {
            descripcion = GHS_PHRASES[codigo] || descripcion;
        }
        
        if (descripcion !== placeholderText) {
            consejos.push(`${codigo}: ${descripcion}`);
        }
    }

    // Pictogramas
    const pictogramas = [];
    const texto_lower = texto.toLowerCase();
    const pictogramas_mapping = {
        "inflamable": "inflamable", "llama": "inflamable", "oxidante": "oxidante",
        "llama sobre círculo": "oxidante", "explosivo": "explosivo", "bomba explotando": "explosivo",
        "corrosivo": "corrosivo", "corrosión": "corrosivo", "tóxica": "toxico",
        "veneno": "toxico", "calavera": "toxico", "peligro para la salud": "peligro-salud",
        "exclamación": "irritante", "exclamacion": "irritante", "irritantes": "irritante",
        "comburente": "oxidante", "peróxido": "oxidante", "acuático": "daño-ambiente",
        "daño al medio": "daño-ambiente", "gas a presión": "gas-presurizado", "cilindro": "gas-presurizado"
    };

    for (const [keyword, picto] of Object.entries(pictogramas_mapping)) {
        if (texto_lower.includes(keyword)) pictogramas.push(picto);
    }

    // Advertencia
    const advertMatch = texto.match(/(PELIGRO|ADVERTENCIA|PRECAUCI[ÓO]N|ATENCI[ÓO]N|WARNING|DANGER)/i);
    const advertencia = advertMatch ? advertMatch[0].toUpperCase() : "No detectada";

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
    res.status(500).json({ error: "Error procesando el PDF", detail: err.message });
  }
});

module.exports = router;
