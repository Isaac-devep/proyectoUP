const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');

const storage = multer.memoryStorage();
const upload = multer({ storage });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════
//  TABLA DE VERDAD GHS — Determinística, sin IA, sin errores
//  Fuente: Reglamento CLP / GHS Rev.9 (ONU)
// ═══════════════════════════════════════════════════════════════════════════
const H_A_GHS = {
    // ghs01 - Explosivo
    H200:'ghs01', H201:'ghs01', H202:'ghs01', H203:'ghs01', H204:'ghs01', H205:'ghs01',
    H240:'ghs01', H241:'ghs01',
    // ghs02 - Inflamable
    H220:'ghs02', H221:'ghs02', H222:'ghs02', H223:'ghs02', H224:'ghs02', H225:'ghs02',
    H226:'ghs02', H228:'ghs02', H242:'ghs02', H250:'ghs02', H251:'ghs02', H252:'ghs02',
    H260:'ghs02', H261:'ghs02',
    // ghs03 - Comburente/Oxidante
    H270:'ghs03', H271:'ghs03', H272:'ghs03',
    // ghs04 - Gas a presión
    H280:'ghs04', H281:'ghs04',
    // ghs05 - Corrosivo
    H290:'ghs05', H314:'ghs05', H318:'ghs05',
    // ghs06 - Tóxico agudo (categorías 1-3)
    H300:'ghs06', H301:'ghs06', H310:'ghs06', H311:'ghs06', H330:'ghs06', H331:'ghs06',
    // ghs07 - Nocivo/Irritante (categoría 4 y efectos locales)
    H302:'ghs07', H312:'ghs07', H315:'ghs07', H317:'ghs07', H319:'ghs07',
    H332:'ghs07', H335:'ghs07', H336:'ghs07',
    // ghs08 - Peligro para la salud a largo plazo
    H304:'ghs08', H334:'ghs08', H340:'ghs08', H341:'ghs08', H350:'ghs08', H351:'ghs08',
    H360:'ghs08', H361:'ghs08', H370:'ghs08', H371:'ghs08', H372:'ghs08', H373:'ghs08',
    // ghs09 - Peligro para el medio ambiente acuático
    H400:'ghs09', H410:'ghs09', H411:'ghs09',
};

// Extrae códigos H de una lista de frases (ej: ["H225: Inflamable", "H318: ..."])
function extraerCodigosH(indicaciones) {
    const codigos = new Set();
    for (const frase of indicaciones) {
        const match = frase.match(/\bH(\d{3}[A-Z]?)\b/gi);
        if (match) match.forEach(m => codigos.add(m.toUpperCase()));
    }
    return codigos;
}

// Mapea códigos H a pictogramas GHS con reglas de precedencia
function mapearPictogramas(indicaciones) {
    const codigosH = extraerCodigosH(indicaciones);
    const pictos = new Set();

    for (const h of codigosH) {
        if (H_A_GHS[h]) pictos.add(H_A_GHS[h]);
    }

    // Regla de precedencia: si hay ghs05 (corrosivo) y ghs07 SOLO viene de
    // irritación leve (H315/H317/H319), se suprime ghs07.
    // PERO si hay también H302/H312/H332 (toxicidad aguda cat.4), se mantiene ghs07.
    const tieneToxicidadAguda4 = codigosH.has('H302') || codigosH.has('H312') || codigosH.has('H332');
    if (pictos.has('ghs05') && !tieneToxicidadAguda4) {
        pictos.delete('ghs07');
    }

    // Orden de prioridad visual SGA
    const orden = ['ghs01','ghs02','ghs03','ghs04','ghs05','ghs06','ghs08','ghs07','ghs09'];
    return orden.filter(g => pictos.has(g));
}

// ═══════════════════════════════════════════════════════════════════════════
//  IA — Solo extrae texto estructurado, NO decide pictogramas
// ═══════════════════════════════════════════════════════════════════════════
async function extraerDatosConIA(texto) {
    const prompt = `Eres un experto en fichas de datos de seguridad (FDS). Extrae la informacion del documento y devuelve UNICAMENTE un JSON valido sin markdown ni explicaciones.

INSTRUCCIONES:
- nombre_producto: nombre comercial exacto de la Seccion 1 (NO incluyas "Producto:", "Nombre:", ni el nombre de la empresa).
- cas: numero CAS principal (formato: XXXXXXX-XX-X). Si no hay, usa "".
- palabra_advertencia: "PELIGRO" o "ATENCION" segun la Seccion 2.
- indicaciones_peligro: lista de frases H de la Seccion 2 en formato "Hxxx: descripcion".
- consejos_prudencia: lista de frases P de la Seccion 2 en formato "Pxxx: descripcion".
- informacion_emergencia: numeros de telefono de emergencia de la Seccion 1.

FORMATO REQUERIDO:
{"nombre_producto":"...","cas":"...","palabra_advertencia":"PELIGRO","indicaciones_peligro":["H225: Liquido y vapores muy inflamables"],"consejos_prudencia":["P210: Mantener alejado de fuentes de ignicion"],"informacion_emergencia":["018000511414"]}`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 2000,
        messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Analiza esta FDS:\n\n${texto.substring(0, 12000)}` }
        ]
    });

    const raw = completion.choices[0].message.content.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const resultado = JSON.parse(raw);

    // Limpiar nombre
    resultado.nombre_producto = (resultado.nombre_producto || '')
        .replace(/^(nombre\s+(comercial\s+)?(del\s+)?producto|producto|identificaci[oó]n(\s+del\s+producto)?)[:\s\-]*/i, '')
        .trim();

    // Garantizar arrays
    if (!Array.isArray(resultado.indicaciones_peligro)) resultado.indicaciones_peligro = [];
    if (!Array.isArray(resultado.consejos_prudencia)) resultado.consejos_prudencia = [];
    if (!Array.isArray(resultado.informacion_emergencia)) resultado.informacion_emergencia = [];

    // LOS PICTOGRAMAS LOS CALCULAMOS NOSOTROS — NO la IA
    resultado.pictogramas = mapearPictogramas(resultado.indicaciones_peligro);

    console.log('📤 [SAGA] Resultado final:', {
        nombre: resultado.nombre_producto,
        frases_h: extraerCodigosH(resultado.indicaciones_peligro),
        pictogramas: resultado.pictogramas
    });

    return resultado;
}

// ═══════════════════════════════════════════════════════════════════════════
//  RUTA PRINCIPAL  POST /extract_pdf_data
// ═══════════════════════════════════════════════════════════════════════════
router.post('/', (req, res, next) => {
    console.log('📥 [FDS] Peticion recibida');
    next();
}, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subio ningun archivo' });
        }
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'Servicio de IA no configurado. Falta OPENAI_API_KEY.' });
        }

        console.log(`📂 [FDS] Procesando: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        const data = await pdfParse(req.file.buffer);
        const texto = data.text;
        console.log(`📝 [FDS] Texto extraido: ${texto.length} caracteres`);

        if (!texto || texto.trim().length < 50) {
            return res.status(422).json({ error: 'El PDF no contiene texto extraible (posiblemente es una imagen escaneada)' });
        }

        console.log('🤖 [FDS] Extrayendo datos con GPT-4o-mini...');
        const resultado = await extraerDatosConIA(texto);
        console.log(`✅ [FDS] "${resultado.nombre_producto}" | Pictogramas: [${resultado.pictogramas.join(', ')}]`);

        res.json({
            ...resultado,
            _meta: {
                metodo_analisis: 'openai',
                paginas: data.numpages,
                caracteres_extraidos: texto.length
            }
        });

    } catch (err) {
        console.error('❌ [FDS] Error:', err.message);
        res.status(500).json({
            error: 'Error al analizar el PDF con IA',
            detail: err.message
        });
    }
});

module.exports = router;
