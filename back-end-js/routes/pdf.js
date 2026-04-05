const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');

// ─── Multer (memory storage) ───────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ─── OpenAI Client ─────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Diccionario GHS de respaldo ───────────────────────────────────────────
const GHS_PHRASES = {
    "H220": "Gas extremadamente inflamable", "H221": "Gas inflamable",
    "H222": "Aerosol extremadamente inflamable", "H224": "Líquido y vapores extremadamente inflamables",
    "H225": "Líquido y vapores muy inflamables", "H226": "Líquidos y vapores inflamables",
    "H227": "Líquido combustible", "H228": "Sólido inflamable",
    "H280": "Contiene gas a presión; peligro de explosión en caso de calentamiento",
    "H300": "Mortal en caso de ingestión", "H301": "Tóxico en caso de ingestión",
    "H302": "Nocivo en caso de ingestión", "H310": "Mortal en contacto con la piel",
    "H311": "Tóxico en contacto con la piel", "H312": "Nocivo en contacto con la piel",
    "H314": "Provoca quemaduras graves en la piel y lesiones oculares graves",
    "H315": "Provoca irritación cutánea", "H317": "Puede provocar una reacción alérgica en la piel",
    "H318": "Provoca lesiones oculares graves", "H319": "Provoca irritación ocular grave",
    "H330": "Mortal en caso de inhalación", "H331": "Tóxico en caso de inhalación",
    "H332": "Nocivo en caso de inhalación", "H335": "Puede irritar las vías respiratorias",
    "H336": "Puede provocar somnolencia o vértigo", "H350": "Puede provocar cáncer",
    "H351": "Se sospecha que provoca cáncer",
    "H400": "Muy tóxico para los organismos acuáticos",
    "H410": "Muy tóxico para los organismos acuáticos, con efectos nocivos duraderos",
    "H411": "Tóxico para los organismos acuáticos, con efectos nocivos duraderos",
    "P101": "Si se necesita consejo médico, tener a mano el envase o la etiqueta",
    "P102": "Mantener fuera del alcance de los niños",
    "P201": "Pedir instrucciones especiales antes del uso",
    "P210": "Mantener alejado del calor, de chispas, de llamas abiertas y de cualquier otra fuente de ignición. No fumar",
    "P232": "Proteger de la humedad", "P233": "Mantener el recipiente herméticamente cerrado",
    "P234": "Conservar únicamente en el recipiente original",
    "P260": "No respirar el polvo/el humo/el gas/la niebla/los vapores/el aerosol",
    "P261": "Evitar respirar el polvo/el humo/el gas/la niebla/los vapores/el aerosol",
    "P264": "Lavarse concienzudamente tras la manipulación",
    "P270": "No comer, beber ni fumar durante su utilización",
    "P273": "Evitar su liberación al medio ambiente",
    "P280": "Llevar guantes/prendas/gafas/máscara de protección",
    "P301": "EN CASO DE INGESTIÓN:", "P302": "EN CASO DE CONTACTO CON LA PIEL:",
    "P303": "EN CASO DE CONTACTO CON LA PIEL (o el pelo):", "P304": "EN CASO DE INHALACIÓN:",
    "P305": "EN CASO DE CONTACTO CON LOS OJOS:",
    "P310": "Llamar inmediatamente a un centro de toxicología o a un médico",
    "P330": "Enjuagar la boca", "P331": "NO provocar el vómito",
    "P351": "Aclarar cuidadosamente con agua durante varios minutos",
    "P353": "Aclarar la piel con agua [o ducharse]",
    "P361": "Quitar inmediatamente todas las prendas contaminadas",
    "P403": "Almacenar en un lugar bien ventilado", "P405": "Guardar bajo llave",
    "P410": "Proteger de la luz del sol",
    "P501": "Eliminar el contenido/el recipiente en una planta autorizada"
};

// ─── Pictogramas GHS válidos que el sistema puede renderizar ───────────────
const VALID_PICTOGRAMS = [
    'explosivo', 'inflamable', 'oxidante', 'gas-presurizado',
    'corrosivo', 'toxico', 'peligro-salud', 'irritante', 'daño-ambiente'
];

// ═══════════════════════════════════════════════════════════════════════════
//  ANÁLISIS IA  →  GPT-4o-mini con prompt especializado en SGA/GHS
// ═══════════════════════════════════════════════════════════════════════════
async function analizarFDSconIA(texto) {
    const PROMPT_SISTEMA = `Eres un experto en Fichas de Datos de Seguridad (FDS/SDS) y en el Sistema Globalmente Armonizado (SGA/GHS).
Tu tarea es analizar el texto extraído de un documento FDS/SDS y devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta, sin texto adicional, sin markdown, solo el JSON puro:

{
  "nombre_producto": "string — nombre comercial del producto químico",
  "cas": "string — número CAS en formato XX-XX-X o 'No detectado'",
  "palabra_advertencia": "PELIGRO" o "ATENCIÓN" (solo estos dos valores),
  "indicaciones_peligro": ["array de strings con formato 'Hxxx: descripción' — todas las frases H encontradas"],
  "consejos_prudencia": ["array de strings con formato 'Pxxx: descripción' — todos los consejos P encontrados"],
  "pictogramas": ["array de strings — solo valores de esta lista exacta: explosivo, inflamable, oxidante, gas-presurizado, corrosivo, toxico, peligro-salud, irritante, daño-ambiente"],
  "informacion_emergencia": ["array de strings con teléfonos o contactos de emergencia encontrados"]
}

REGLAS CRÍTICAS:
1. Para pictogramas, infiere cuáles aplican basándote en las frases H y descripción del producto:
   - H200-H290 explosivos/reactivos → "explosivo"
   - H220-H228, H242 inflamables → "inflamable"  
   - H270-H272 comburentes → "oxidante"
   - H280-H281 gases a presión → "gas-presurizado"
   - H290, H314, H318 corrosivos → "corrosivo"
   - H300, H310, H330, H301, H311, H331 tóxicos → "toxico"
   - H334, H340, H341, H350, H351, H360, H361, H370, H371, H372, H373 → "peligro-salud"
   - H302, H312, H332, H315, H317, H319, H335, H336 irritantes → "irritante"
   - H400, H410, H411, H412, H413 acuáticos → "daño-ambiente"
2. Aplica SIEMPRE las reglas de precedencia SGA: si hay "toxico" o "corrosivo" o "peligro-salud", NO incluyas "irritante"
3. Si la palabra de advertencia no está clara, determínala por las frases H (H300/H310/H330 → PELIGRO, frases menores → ATENCIÓN)
4. Extrae TODAS las frases H y P que encuentres, incluso si están en tablas o formatos poco estándar
5. Para el nombre del producto, prioriza la Sección 1 del FDS`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: PROMPT_SISTEMA },
            {
                role: 'user',
                content: `Analiza el siguiente texto extraído de una Ficha de Datos de Seguridad (FDS) y devuelve el JSON estructurado:\n\n${texto.substring(0, 12000)}`
            }
        ]
    });

    const respuestaRaw = completion.choices[0].message.content.trim();
    
    // Limpiar posibles bloques markdown que el modelo pueda añadir
    const jsonStr = respuestaRaw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    
    const resultado = JSON.parse(jsonStr);

    // Validar y sanitizar pictogramas contra la lista permitida
    if (Array.isArray(resultado.pictogramas)) {
        resultado.pictogramas = resultado.pictogramas
            .map(p => p.toLowerCase().trim())
            .filter(p => VALID_PICTOGRAMS.includes(p));
    }

    return resultado;
}

// ═══════════════════════════════════════════════════════════════════════════
//  FALLBACK  →  Extracción por regex (método original mejorado)
// ═══════════════════════════════════════════════════════════════════════════
function analizarFDSconRegex(texto) {
    // Nombre del producto
    let nombre = "NO DETECTADO";
    const patronesNombre = [
        /(?:Identificación del producto|Nombre del producto|Producto|Nombre comercial)[\s:*-]+([^\n]+)/i,
        /1\s*\.\s*IDENTIFICACI[ÓO]N[^\n]*\n([^\n]+)/i,
        /^\s*([A-Z][A-Z0-9ÁÉÍÓÚÑ\s\-/%&\.]{5,})\s*$/m
    ];
    for (const patron of patronesNombre) {
        const match = texto.match(patron);
        if (match && match[1].trim().length > 5) { nombre = match[1].trim(); break; }
    }

    const placeholderText = "ver ficha técnica";

    // Frases H
    const indicaciones = [];
    const hRegex = /\bH\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    let m;
    while ((m = hRegex.exec(texto)) !== null) {
        const codigo = "H" + m[1].toUpperCase();
        let desc = m[2].trim().replace(/[.;:-]+$/, "");
        if (desc.toLowerCase().includes("ficha") || desc.length < 5) desc = GHS_PHRASES[codigo] || desc;
        if (!desc.toLowerCase().includes(placeholderText)) indicaciones.push(`${codigo}: ${desc}`);
    }

    // Frases P
    const consejos = [];
    const pRegex = /\bP\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    while ((m = pRegex.exec(texto)) !== null) {
        const codigo = "P" + m[1].toUpperCase();
        let desc = m[2].trim().replace(/[.;:-]+$/, "");
        if (desc.toLowerCase().includes("ficha") || desc.length < 5) desc = GHS_PHRASES[codigo] || desc;
        if (!desc.toLowerCase().includes(placeholderText)) consejos.push(`${codigo}: ${desc}`);
    }

    // Pictogramas por palabras clave
    const pictogramas = [];
    const textoL = texto.toLowerCase();
    const pictoMap = {
        "inflamable": "inflamable", "llama": "inflamable", "oxidante": "oxidante",
        "llama sobre círculo": "oxidante", "explosivo": "explosivo", "bomba explotando": "explosivo",
        "corrosivo": "corrosivo", "corrosión": "corrosivo", "tóxica": "toxico",
        "veneno": "toxico", "calavera": "toxico", "peligro para la salud": "peligro-salud",
        "exclamación": "irritante", "exclamacion": "irritante", "irritantes": "irritante",
        "comburente": "oxidante", "peróxido": "oxidante", "acuático": "daño-ambiente",
        "daño al medio": "daño-ambiente", "gas a presión": "gas-presurizado", "cilindro": "gas-presurizado"
    };
    for (const [kw, pic] of Object.entries(pictoMap)) {
        if (textoL.includes(kw)) pictogramas.push(pic);
    }

    // Advertencia
    const advMatch = texto.match(/(PELIGRO|ADVERTENCIA|PRECAUCI[ÓO]N|ATENCI[ÓO]N|WARNING|DANGER)/i);
    const advertencia = advMatch ? advMatch[0].toUpperCase() : "No detectada";
    const palabraAdv = advertencia.includes('ATENCI') || advertencia.includes('ADVERTENCIA') ? 'ATENCIÓN' : 'PELIGRO';

    // CAS
    const casMatch = texto.match(/\b\d{2,7}-\d{2}-\d\b/);

    // Emergencia
    const emergencia = [];
    const emergRegex = /(?:Tel[ée]fono|Contacto|EMERGENCIA|N[ÚU]MERO).*?[:\-]\s*([^\n]+)/gi;
    while ((m = emergRegex.exec(texto)) !== null) emergencia.push(m[1].trim());

    return {
        nombre_producto: nombre,
        indicaciones_peligro: [...new Set(indicaciones)],
        consejos_prudencia: [...new Set(consejos)],
        informacion_emergencia: [...new Set(emergencia)],
        pictogramas: [...new Set(pictogramas)],
        palabra_advertencia: palabraAdv,
        cas: casMatch ? casMatch[0] : "No detectado"
    };
}

// ═══════════════════════════════════════════════════════════════════════════
//  RUTA PRINCIPAL  POST /extract_pdf_data
// ═══════════════════════════════════════════════════════════════════════════
router.post('/', (req, res, next) => {
    console.log("📥 [FDS] Petición recibida en /extract_pdf_data");
    next();
}, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ningún archivo" });
        }

        console.log(`📂 [FDS] Procesando: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        // 1. Extraer texto del PDF
        const data = await pdfParse(req.file.buffer);
        const texto = data.text;

        if (!texto || texto.trim().length < 50) {
            return res.status(422).json({ error: "El PDF no contiene texto extraíble (posiblemente es una imagen escaneada)" });
        }

        // 2. Intentar análisis con IA primero
        let resultado = null;
        let metodo = 'openai';

        if (process.env.OPENAI_API_KEY) {
            try {
                console.log("🤖 [FDS] Analizando con GPT-4o-mini...");
                resultado = await analizarFDSconIA(texto);
                console.log(`✅ [FDS] IA completada — Producto: "${resultado.nombre_producto}" | Pictogramas: [${(resultado.pictogramas || []).join(', ')}]`);
            } catch (iaError) {
                console.warn(`⚠️ [FDS] IA falló (${iaError.message}), usando regex como fallback...`);
                metodo = 'regex-fallback';
            }
        } else {
            console.warn("⚠️ [FDS] OPENAI_API_KEY no configurada, usando regex");
            metodo = 'regex-fallback';
        }

        // 3. Fallback a regex si la IA no funcionó
        if (!resultado) {
            resultado = analizarFDSconRegex(texto);
        }

        // 4. Respuesta enriquecida con metadatos del análisis
        res.json({
            ...resultado,
            _meta: {
                metodo_analisis: metodo,
                paginas: data.numpages,
                caracteres_extraidos: texto.length
            }
        });

    } catch (err) {
        console.error("❌ [FDS] Error crítico:", err);
        res.status(500).json({ error: "Error procesando el PDF", detail: err.message });
    }
});

module.exports = router;
