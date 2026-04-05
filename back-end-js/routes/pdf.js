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
const VALID_PICTOS = {
    'ghs01': 'explosivo', 'ghs02': 'inflamable', 'ghs03': 'oxidante',
    'ghs04': 'gas-presurizado', 'ghs05': 'corrosivo', 'ghs06': 'toxico',
    'ghs07': 'irritante', 'ghs08': 'peligro-salud', 'ghs09': 'daño-ambiente'
};

// ═══════════════════════════════════════════════════════════════════════════
//  ANÁLISIS IA  →  GPT-4o-mini con prompt especializado en SGA/GHS
// ═══════════════════════════════════════════════════════════════════════════
async function analizarFDSconIA(texto) {
    const PROMPT_SISTEMA = `Eres un experto en Fichas de Datos de Seguridad (FDS/SDS) y en el Sistema Globalmente Armonizado (SGA/GHS). 
Tu tarea es analizar el texto extraído de un documento FDS y devolver ÚNICAMENTE un objeto JSON.

REGLAS DE IDENTIFICACIÓN:
1. **PICTOGRAMAS**: Devuelve una lista de códigos (ej: ["ghs05", "ghs07"]). 
   - Usa solo estos códigos: ghs01 (Bomba), ghs02 (Llama), ghs03 (Llama sobre círculo), ghs04 (Cilindro), ghs05 (Corrosión), ghs06 (Calavera), ghs07 (Exclamación), ghs08 (Peligro Salud), ghs09 (Medio Ambiente).
   - **IMPORTANTE**: No infieras peligros que no estén explícitos. Si un producto es "Diablo Rojo" pero el texto no menciona frases H22x, NO es inflamable.
   - **H402 / H401**: Estas frases de peligro ambiental NO llevan pictograma ghs09. Solo ghs09 si hay H400, H410 o H411.
   - **REGLA DE PRECEDENCIA**: 
     - Si hay ghs06 (Calavera), no pongas ghs07 (Exclamación).
     - Si hay ghs05 (Corrosión) para piel/ojos, no pongas ghs07 para irritación.
2. **DATOS**:
   - nombre_producto: El nombre comercial exacto (ej: "DIABLO ROJO").
   - cas: El número CAS o "No detectado".
   - palabra_advertencia: Solo "PELIGRO" o "ATENCIÓN".
   - indicaciones_peligro: Lista de frases H encontradas (ej: ["H314: Provoca quemaduras..."]).
   - consejos_prudencia: Lista de frases P encontradas (ej: ["P260: No respirar..."]).

JSON FINAL (Sin texto extra, solo el objeto):
{
  "nombre_producto": "string",
  "cas": "string",
  "palabra_advertencia": "PELIGRO" | "ATENCIÓN",
  "indicaciones_peligro": ["Hxxx: descripción", ...],
  "consejos_prudencia": ["Pxxx: descripción", ...],
  "pictogramas": ["ghs01", "ghs02", ...],
  "informacion_emergencia": ["string", ...]
}`;

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
            .filter(p => !!VALID_PICTOS[p]);
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

    // Pictogramas por palabras clave (Códigos GHS estándar)
    const pictogramas = [];
    const textoL = texto.toLowerCase();
    const pictoMap = {
        "inflamable": "ghs02", "llama": "ghs02", "oxidante": "ghs03",
        "llama sobre círculo": "ghs03", "explosivo": "ghs01", "bomba explotando": "ghs01",
        "corrosivo": "ghs05", "corrosión": "ghs05", "tóxica": "ghs06",
        "veneno": "ghs06", "calavera": "ghs06", "peligro para la salud": "ghs08",
        "exclamación": "ghs07", "exclamacion": "ghs07", "irritantes": "ghs07",
        "comburente": "ghs03", "peróxido": "ghs03", "acuático": "ghs09",
        "daño al medio": "ghs09", "gas a presión": "ghs04", "cilindro": "ghs04"
    };
    for (const [kw, code] of Object.entries(pictoMap)) {
        if (textoL.includes(kw)) pictogramas.push(code);
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
