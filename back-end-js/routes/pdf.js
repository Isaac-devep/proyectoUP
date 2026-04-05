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
//  ANÁLISIS IA  →  GPT-4o-mini con tabla de mapeo estricta
// ═══════════════════════════════════════════════════════════════════════════
async function analizarFDSconIA(texto) {
    const PROMPT_SISTEMA = `Eres un experto en seguridad química. Tu única misión es extraer datos de una FDS y mapear pictogramas GHS usando esta TABLA DE VERDAD estricta basada en frases H:

1. GHS01 (ghs01): H200, H201, H202, H203, H204, H205, H240, H241
2. GHS02 (ghs02): H220, H221, H222, H223, H224, H225, H226, H228, H242, H250, H251, H252, H260, H261
3. GHS03 (ghs03): H270, H271, H272
4. GHS04 (ghs04): H280, H281
5. GHS05 (ghs05): H290, H314, H318
6. GHS06 (ghs06): H300, H301, H310, H311, H330, H331
7. GHS07 (ghs07): H302, H312, H332, H315, H317, H319, H335, H336
8. GHS08 (ghs08): H304, H334, H340, H341, H350, H351, H360, H361, H370, H371, H372, H373
9. GHS09 (ghs09): H400, H410, H411

REGLAS DE ORO:
- **H402 / H401**: NO llevan pictogramas. 
- **NO INFIERAS**: Si la frase H no está en el texto, no pongas el pictograma.
- **PRECEDENCIA**: Si hay ghs05 o ghs06, quita el ghs07 (solo si es por irritación piel/ojos).
- **NOMBRE**: Extrae el nombre comercial literal de la sección 1.

Devuelve solo este JSON:
{
  "nombre_producto": "string",
  "cas": "string",
  "palabra_advertencia": "PELIGRO" | "ATENCIÓN",
  "indicaciones_peligro": ["Hxxx: descripción", ...],
  "consejos_prudencia": ["Pxxx: descripción", ...],
  "pictogramas": ["ghs0x", ...],
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

    // Pictogramas basados estrictamente en frases H extraídas (Mapeo GHS oficial)
    const pictogramas = new Set();
    indicaciones.forEach(frase => {
        const codigo = frase.split(':')[0].trim().toUpperCase();
        
        // Mapeo lógico SGA/GHS
        if (/H20[0-5]|H24[01]/.test(codigo)) pictogramas.add("ghs01"); // Explosivos
        if (/H22[0-8]|H242|H25[0-2]|H26[01]/.test(codigo)) pictogramas.add("ghs02"); // Inflamables
        if (/H27[0-2]/.test(codigo)) pictogramas.add("ghs03"); // Comburentes
        if (/H28[01]/.test(codigo)) pictogramas.add("ghs04"); // Gases presión
        if (/H290|H314|H318/.test(codigo)) pictogramas.add("ghs05"); // Corrosivos
        if (/H30[01]|H31[01]|H33[01]/.test(codigo)) pictogramas.add("ghs06"); // Tóxicos agudos
        if (/H302|H312|H332|H31[579]|H33[56]/.test(codigo)) pictogramas.add("ghs07"); // Irritantes/Nocivos
        if (/H304|H334|H34[01]|H35[01]|H36[01]|H37[0-3]/.test(codigo)) pictogramas.add("ghs08"); // Peligro salud
        if (/H400|H41[01]/.test(codigo)) pictogramas.add("ghs09"); // Medio ambiente (Solo cat 1 y 2)
    });

    // Regla de precedencia SGA
    if (pictogramas.has("ghs05") || pictogramas.has("ghs06")) {
        pictogramas.delete("ghs07"); 
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
