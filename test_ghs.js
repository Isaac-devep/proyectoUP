const { GHS_PHRASES } = require('./back-end-js/routes/pdf.js'); // Assuming I can import parts or just mock them

// Mocking the extraction logic from pdf.js (Strict Mapping)
function testGHSMapping(texto) {
    const indicaciones = [];
    const hRegex = /\bH\s*(\d{3,4}[A-Za-z]?)\b\s*[:\-]?\s*([^\n]+)/gi;
    let m;
    while ((m = hRegex.exec(texto)) !== null) {
        indicaciones.push("H" + m[1].toUpperCase());
    }

    const pictogramas = new Set();
    indicaciones.forEach(codigo => {
        if (/H20[0-5]|H24[01]/.test(codigo)) pictogramas.add("ghs01");
        if (/H22[0-8]|H242|H25[0-2]|H26[01]/.test(codigo)) pictogramas.add("ghs02");
        if (/H27[0-2]/.test(codigo)) pictogramas.add("ghs03");
        if (/H28[01]/.test(codigo)) pictogramas.add("ghs04");
        if (/H290|H314|H318/.test(codigo)) pictogramas.add("ghs05");
        if (/H30[01]|H31[01]|H33[01]/.test(codigo)) pictogramas.add("ghs06");
        if (/H302|H312|H332|H31[579]|H33[56]/.test(codigo)) pictogramas.add("ghs07");
        if (/H304|H334|H34[01]|H35[01]|H36[01]|H37[0-3]/.test(codigo)) pictogramas.add("ghs08");
        if (/H400|H41[01]/.test(codigo)) pictogramas.add("ghs09");
    });

    if (pictogramas.has("ghs05") || pictogramas.has("ghs06")) {
        pictogramas.delete("ghs07"); 
    }

    return { 
        frases: indicaciones, 
        pictos: Array.from(pictogramas) 
    };
}

const diabloRojoText = `
DIABLO ROJO
H290 Puede ser corrosiva para los metales
H314 Provoca graves quemaduras en la piel y lesiones oculares
H302 Nocivo en caso de ingestión
H312 Nocivo en contacto con la piel
H318 Provoca lesiones oculares graves
H402 Nocivo para los organismos acuáticos
`;

console.log("RESULTADO TEST DIABLO ROJO:");
console.log(JSON.stringify(testGHSMapping(diabloRojoText), null, 2));
