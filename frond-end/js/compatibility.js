document.addEventListener('DOMContentLoaded', function() {
    // Definición de Clases GHS / SGA segun requerimiento del usuario
    const ghsClasses = [
        { id: '2.1', name: 'Gases Inflamables / Licuados', icon: 'ghs02' },
        { id: '2.2', name: 'Gases No Inflamables / A Presión', icon: 'ghs04' },
        { id: '3',   name: 'Líquidos Altamente Inflamables', icon: 'ghs02' },
        { id: '5.1', name: 'Sustancias Oxidantes', icon: 'ghs03' },
        { id: '8B',  name: 'Corrosivos Básicos (Álcalis)', icon: 'ghs05' },
        { id: '8A',  name: 'Corrosivos Ácidos', icon: 'ghs05' },
        { id: '9',   name: 'Bajo Riesgo / No Clasificadas', icon: 'ghs09' }
    ];

    // Matriz de Compatibilidad (REGLAS DEL USUARIO)
    // G: Verde (Si), R: Rojo (No), Y: Amarillo (Condicional)
    const matrix = {
        '2.1': { '2.1':'G', '2.2':'Y', '3':'R',   '5.1':'R', '8B':'Y', '8A':'Y', '9':'G' },
        '2.2': { '2.1':'Y', '2.2':'G', '3':'Y',   '5.1':'Y', '8B':'Y', '8A':'Y', '9':'G' },
        '3':   { '2.1':'R', '2.2':'Y', '3':'G',   '5.1':'R', '8B':'Y', '8A':'Y', '9':'G' },
        '5.1': { '2.1':'R', '2.2':'Y', '3':'R',   '5.1':'G', '8B':'Y', '8A':'Y', '9':'R' },
        '8B':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '8B':'G', '8A':'R', '9':'G' },
        '8A':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '8B':'R', '8A':'G', '9':'G' },
        '9':   { '2.1':'G', '2.2':'G', '3':'G',   '5.1':'R', '8B':'G', '8A':'G', '9':'G' }
    };

    const matrixBody = document.getElementById('matrixGridBody');
    const selectA = document.getElementById('comp-prod-a');
    const selectB = document.getElementById('comp-prod-b');
    const btnCheck = document.getElementById('btnCheckComp');
    const resultDiv = document.getElementById('comp-result');
    const alertBox = document.getElementById('comp-alert');
    const statusText = document.getElementById('comp-status-text');
    const ruleText = document.getElementById('comp-rule-text');

    // 1. Renderizar la Matriz Visual
    if (matrixBody) {
        let html = '<tr><th style="font-size:10px;">GHS</th>' + ghsClasses.map(c => `<th title="${c.name}">${c.id}</th>`).join('') + '</tr>';
        ghsClasses.forEach(row => {
            html += `<tr><td style="font-weight:800; font-size:11px; background:var(--bg-main);" title="${row.name}">${row.id}</td>`;
            ghsClasses.forEach(col => {
                const type = matrix[row.id]?.[col.id] || 'G';
                const cellClass = type === 'G' ? 'cell-green' : (type === 'Y' ? 'cell-yellow' : 'cell-red');
                const icon = type === 'G' ? 'fa-check-circle' : (type === 'Y' ? 'fa-exclamation-triangle' : 'fa-times-circle');
                
                html += `
                    <td class="${cellClass}" title="${row.name} vs ${col.name}">
                        <i class="fas ${icon}"></i>
                        <i class="fas fa-info-circle" style="font-size:8px; position:absolute; top:4px; right:4px; opacity:0.3;"></i>
                    </td>`;
            });
            html += '</tr>';
        });
        matrixBody.innerHTML = html;
    }

    // 2. Poblar Selects con Productos Reales de la BD
    let dbProductos = []; // Guardar para consulta rápida de pictos
    async function cargarProductosParaComp() {
        try {
            const res = await fetch("http://127.0.0.1:8000/etiquetas");
            const data = await res.json();
            dbProductos = data.etiquetas || [];

            if (selectA && selectB) {
                const options = dbProductos.map(e => {
                    let clase = '9'; // Default
                    const n = e.id_producto.toLowerCase();
                    const p = e.pictogramas || [];

                    if (n.includes('propano') || n.includes('glp') || n.includes('butano')) clase = '2.1';
                    else if (n.includes('refrigerante') || n.includes('gas')) clase = '2.2';
                    else if (n.includes('thinner') || n.includes('soldadura') || n.includes('limpiador') || n.includes('gasolina') || n.includes('pintura') || n.includes('esmalte') || n.includes('anticorrosivo')) {
                        if (p.includes('inflamable')) clase = '3';
                    }
                    else if (n.includes('hipoclorito')) clase = '5.1';
                    else if (n.includes('diablo') || n.includes('soda') || n.includes('evap') || n.includes('desengrasante')) clase = '8B';
                    // Nota: Si hubiera ácidos irían a 8A
                    
                    return `<option value="${clase}" data-id="${e._id}">${e.id_producto}</option>`;
                }).join("");

                const defaultOpt = `<option value="">Seleccione producto...</option>`;
                selectA.innerHTML = defaultOpt + options;
                selectB.innerHTML = defaultOpt + options;
            }
        } catch (err) {
            console.error("Error cargando productos para comp:", err);
        }
    }

    cargarProductosParaComp();

    // 3. Lógica del Verificador con Spinner
    if (btnCheck) {
        // Escuchar cambios para Resetear vista si cambian
        const resetResult = () => {
            if (resultDiv.style.display !== 'none') {
                resultDiv.style.opacity = '0.4';
                // Limpiar pictos para evitar confusión
                document.getElementById('picto-a-box').innerHTML = '';
                document.getElementById('picto-b-box').innerHTML = '';
            }
        };
        selectA.addEventListener('change', resetResult);
        selectB.addEventListener('change', resetResult);

        btnCheck.addEventListener('click', async () => {
            const classA = selectA.value;
            const classB = selectB.value;
            const idA = selectA.options[selectA.selectedIndex].dataset.id;
            const idB = selectB.options[selectB.selectedIndex].dataset.id;

            if (!classA || !classB) return showToast("Seleccione ambos productos para comparar.", "error");

            // Mostrar Spinner en Botón
            const originalContent = btnCheck.innerHTML;
            btnCheck.disabled = true;
            btnCheck.innerHTML = '<div class="spinner-sm"></div> Procesando...';
            
            // Simular carga para Mejor UX (Feedback visual)
            await new Promise(r => setTimeout(r, 600));

            const type = matrix[classA]?.[classB] || 'G';
            resultDiv.style.display = 'block';
            resultDiv.style.opacity = '1';
            
            const iconBox = document.getElementById('comp-icon-box');
            const statusText = document.getElementById('comp-status-text');
            const ruleText = document.getElementById('comp-rule-text');
            const safetyTip = document.getElementById('comp-safety-tip');
            const pictoABox = document.getElementById('picto-a-box');
            const pictoBBox = document.getElementById('picto-b-box');

            // Renderizar mini pictos
            const renderMiniPictos = (id, box) => {
               const prod = dbProductos.find(p => p._id === id);
               if (prod && prod.pictogramas) {
                  box.innerHTML = prod.pictogramas.map(p => `<img src="../../images/${p}.png" style="height:24px; opacity:0.8;" onerror="this.remove()">`).join('');
               } else {
                  box.innerHTML = '<span style="font-size:10px;">(Sin Pictos)</span>';
               }
            };
            renderMiniPictos(idA, pictoABox);
            renderMiniPictos(idB, pictoBBox);

            // 4. Determinar nota detallada (REGLAS DEL USUARIO)
            const detailRules = {
                '2.1-3': 'NO almacenar en el mismo gabinete de inflamables. Requieren segregación o gabinetes separados.',
                '3-2.1': 'NO almacenar en el mismo gabinete de inflamables. Requieren segregación o gabinetes separados.',
                '5.1-3': 'Mantener separadas por una distancia mínima (ej. 3 metros) o una barrera incombustible.',
                '3-5.1': 'Mantener separadas por una distancia mínima (ej. 3 metros) o una barrera incombustible.',
                '5.1-2.1': 'Separación estricta. Mantener a 3 metros o con barrera incombustible.',
                '2.1-5.1': 'Separación estricta. Mantener a 3 metros o con barrera incombustible.',
                '8A-8B': 'Separar estrictamente los ÁCIDOS de las BASES (Álcalis) para evitar reacciones violentas.',
                '8B-8A': 'Separar estrictamente los ÁCIDOS de las BASES (Álcalis) para evitar reacciones violentas.',
                '2.1-8A': 'Asegurar ventilación adecuada y evitar el contacto directo.',
                '2.1-8B': 'Asegurar ventilación adecuada y evitar el contacto directo.',
                '3-8A': 'Evitar mismo gabinete si los corrosivos son volátiles o ácidos fuertes.',
                '3-8B': 'Evitar mismo gabinete si los corrosivos son volátiles.',
                '5.1-8A': 'Consultar SDS del oxidante para verificar compatibilidad con ácidos fuertes.',
                '5.1-8B': 'Consultar SDS del oxidante para verificar compatibilidad con bases fuertes.',
                '2.1-2.2': 'Almacenar en áreas separadas o utilizar barreras físicas para gases a presión.',
                '2.2-2.1': 'Almacenar en áreas separadas o utilizar barreras físicas para gases a presión.',
                '9-5.1': 'Los oxidantes deben estar alejados de cualquier sustancia combustible o de bajo riesgo.',
                '5.1-9': 'Los oxidantes deben estar alejados de cualquier sustancia combustible o de bajo riesgo.'
            };

            const hazardExplanations = {
                '2.1-5.1': 'Alto riesgo de incendio y explosión. Los oxidantes aceleran violentamente la combustión de gases.',
                '5.1-2.1': 'Alto riesgo de incendio y explosión. Los oxidantes aceleran violentamente la combustión de gases.',
                '3-5.1': 'Riesgo de ignición espontánea o explosión al contacto entre líquidos combustibles y agentes oxidantes.',
                '5.1-3': 'Riesgo de ignición espontánea o explosión al contacto entre líquidos combustibles y agentes oxidantes.',
                '8A-8B': 'Peligro de reacción exotérmica violenta con liberación intensa de calor y posibles salpicaduras corrosivas.',
                '8B-8A': 'Peligro de reacción exotérmica violenta con liberación intensa de calor y posibles salpicaduras corrosivas.',
                '2.1-3': 'Riesgo acumulativo de fuego. Ante un incendio externo, los cilindros de gas pueden explotar por el calor de los líquidos.',
                '3-2.1': 'Riesgo acumulativo de fuego. Ante un incendio externo, los cilindros de gas pueden explotar por el calor de los líquidos.',
                '5.1-9': 'Incluso productos de bajo riesgo (jabones, ceras) pueden actuar como combustible y alimentar un fuego oxidante.'
            };

            const ruleKey = `${classA}-${classB}`;
            const userNote = detailRules[ruleKey] || 'Consultar la Ficha de Datos de Seguridad (SDS) específica.';
            const hazardText = hazardExplanations[ruleKey] || '';

            const hazardBox = document.getElementById('comp-hazard-box');
            const hazardPara = document.getElementById('comp-hazard-text');

            if (hazardText) {
                hazardBox.style.display = 'block';
                hazardPara.innerText = hazardText;
            } else {
                hazardBox.style.display = 'none';
            }

            if (type === 'G') {
                alertBox.className = 'cell-green';
                iconBox.innerHTML = '<i class="fas fa-check-circle"></i>';
                statusText.innerText = '✅ COMPATIBLE (✔)';
                ruleText.innerText = 'Co-almacenamiento permitido. Las sustancias pueden guardarse juntas.';
                safetyTip.innerText = userNote || 'Se recomienda mantener un orden alfabético para facilitar inventarios.';
            } else if (type === 'Y') {
                alertBox.className = 'cell-yellow';
                iconBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                statusText.innerText = '⚠️ CONDICIONAL (C)';
                ruleText.innerText = 'Co-almacenamiento permitido bajo condiciones específicas.';
                safetyTip.innerText = userNote;
            } else {
                alertBox.className = 'cell-red';
                iconBox.innerHTML = '<i class="fas fa-times-circle"></i>';
                statusText.innerText = '❌ PROHIBIDO (✘)';
                ruleText.innerText = 'Co-almacenamiento PROHIBIDO. Se requiere segregación estricta.';
                safetyTip.innerText = userNote;
            }

            // Restaurar Botón
            btnCheck.innerHTML = originalContent;
            btnCheck.disabled = false;
        });
    }
});
