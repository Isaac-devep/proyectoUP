document.addEventListener('DOMContentLoaded', function() {
    // 1. Definición de Clases SGA (Reglas de Almacenamiento)
    const ghsClasses = [
        { id: '2.1', name: 'Gases Inflamables', icon: 'ghs02' },
        { id: '2.2', name: 'Gases No Inflamables', icon: 'ghs04' },
        { id: '3',   name: 'Líquidos Inflamables', icon: 'ghs02' },
        { id: '5.1', name: 'Sustancias Oxidantes', icon: 'ghs03' },
        { id: '6.1', name: 'Tóxicos', icon: 'ghs06' },
        { id: '8B',  name: 'Corrosivos Básicos (Álcalis)', icon: 'ghs05' },
        { id: '8A',  name: 'Corrosivos Ácidos', icon: 'ghs05' },
        { id: '9',   name: 'Bajo Riesgo / No Clasificadas', icon: 'ghs09' }
    ];

    const matrix = {
        '2.1': { '2.1':'G', '2.2':'Y', '3':'R',   '5.1':'R', '6.1':'Y', '8B':'Y', '8A':'Y', '9':'G' },
        '2.2': { '2.1':'Y', '2.2':'G', '3':'Y',   '5.1':'Y', '6.1':'G', '8B':'Y', '8A':'Y', '9':'G' },
        '3':   { '2.1':'R', '2.2':'Y', '3':'G',   '5.1':'R', '6.1':'Y', '8B':'Y', '8A':'Y', '9':'G' },
        '5.1': { '2.1':'R', '2.2':'Y', '3':'R',   '5.1':'G', '6.1':'Y', '8B':'Y', '8A':'Y', '9':'R' },
        '6.1': { '2.1':'Y', '2.2':'G', '3':'Y',   '5.1':'Y', '6.1':'G', '8B':'Y', '8A':'Y', '9':'G' },
        '8B':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '6.1':'Y', '8B':'G', '8A':'R', '9':'G' },
        '8A':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '6.1':'Y', '8B':'R', '8A':'G', '9':'G' },
        '9':   { '2.1':'G', '2.2':'G', '3':'G',   '5.1':'R', '6.1':'G', '8B':'G', '8A':'G', '9':'G' }
    };

    const unPictos = {
        '1':   { color: '#ef4444', icon: 'explosivo', label: '1' },        // Explosivo
        '2.1': { color: '#ef4444', icon: 'inflamable', label: '2.1' },     // Gas Inflamable
        '2.2': { color: '#22c55e', icon: 'gas-presurizado', label: '2.2' }, // Gas comprimido   
        '3':   { color: '#ef4444', icon: 'inflamable', label: '3' },       // Líquido Inflamable
        '5.1': { color: '#eab308', icon: 'oxidante', label: '5.1' },      // Oxidante
        '6.1': { color: '#f8fafc', icon: 'toxico', label: '6.1' },        // Tóxico (Blanco)
        '8A':  { color: '#334155', icon: 'corrosivo', label: '8' },        // Corrosivo Ácido
        '8B':  { color: '#334155', icon: 'corrosivo', label: '8' },        // Corrosivo Básico
        '9':   { color: '#94a3b8', icon: 'irritante', label: '9' }        // Irritantes/Varios
    };

    // Mapa ghsXX → nombre de imagen (consistente con etiquetas.js y la lista de productos)
    const PICTO_IMAGE_MAP = {
        'ghs01': 'explosivo',       'ghs02': 'inflamable',    'ghs03': 'oxidante',
        'ghs04': 'gas-presurizado', 'ghs05': 'corrosivo',     'ghs06': 'toxico',
        'ghs07': 'irritante',       'ghs08': 'peligro-salud', 'ghs09': 'daño-ambiente'
    };

    function getUnPictoHtml(claseOrArray, limit = null, size = 24) {
        if (!claseOrArray) return '';
        let codes = Array.isArray(claseOrArray) ? [...claseOrArray] : [claseOrArray];

        if (limit && codes.length > limit) {
            codes = codes.slice(0, limit);
        }

        return codes.map(code => {
            const imgName = PICTO_IMAGE_MAP[code.toLowerCase()];
            if (!imgName) return '';
            return `<img src="../../images/${imgName}.png" alt="${code}" title="${code}"
                        style="width:${size}px; height:${size}px; object-fit:contain;"
                        onerror="this.style.display='none'">`;
        }).join('');
    }

    const detailRules = {
        '2.1-3': 'Segregar por gabinete o barrera. Riesgo de explosión por calor.',
        '5.1-3': 'PELIGRO: Separación mínima de 3m. Ignición espontánea.',
        '8A-8B': 'PELIGRO: Reacción violenta Ácido-Base. Segregar estrictamente.',
        '5.1-2.1': 'Peligro extremo. Los oxidantes alimentan el fuego de gases.',
        '9-5.1': 'Oxidantes alejados de cualquier combustible/bajo riesgo.'
    };

    // 2. Estado Global
    let dbProductos = [];
    let selectedProductIds = new Set();
    let storageLocations = JSON.parse(localStorage.getItem('saga_locations')) || [];

    // Selectores UI
    const productListContainer = document.getElementById('comp-product-list');
    const searchInput = document.getElementById('compSearch');
    const btnClear = document.getElementById('btnClearCompSelection');
    const btnGenerate = document.getElementById('btnGenStorageMatrix');
    const matrixContainer = document.getElementById('storage-matrix-container');
    const selectedCountSpan = document.getElementById('comp-selected-count');
    const tipsArea = document.getElementById('storage-tips-area');
    const hazardNotes = document.getElementById('storage-hazard-notes');
    
    // Selectores de Ubicación
    const locationSelect = document.getElementById('storage-location-select');
    const btnManageLoc = document.getElementById('btnManageLocations');
    const modalLoc = document.getElementById('modalLocations');
    const formNewLoc = document.getElementById('formNewLocation');
    const locationListDiv = document.getElementById('locationList');
    const matrixTitle = document.getElementById('storage-matrix-title');
    const locationLabel = document.getElementById('storage-location-label');

    const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");

    // 3. Cargar y Clasificar Productos
    async function cargarInventario() {
        try {
            const res = await fetch(`${API_URL}/etiquetas`);
            const data = await res.json();
            
            const priorityMap = {
                'ghs01': 1, 'ghs03': 2, 'ghs02': 3, 'ghs04': 4,
                'ghs05': 5, 'ghs06': 6, 'ghs08': 7, 'ghs07': 8, 'ghs09': 9
            };

            dbProductos = (data.etiquetas || []).map(p => {
                const rawStrings = (p.pictogramas || []).map(pic => pic.toString().toLowerCase().trim());
                
                // Mapeo Maestro: Normalizar cualquier nombre o código a 'ghsXX'
                const normalizePicto = (s) => {
                    if (s.match(/^ghs\d+$/)) return s;
                    const map = {
                        'explosivo': 'ghs01', 'llama': 'ghs02', 'inflamable': 'ghs02',
                        'oxidante': 'ghs03', 'comburente': 'ghs03', 'gas': 'ghs04',
                        'cilindro': 'ghs04', 'corrosivo': 'ghs05', 'toxico': 'ghs06',
                        'calavera': 'ghs06', 'irritante': 'ghs07', 'exclamacion': 'ghs07',
                        'salud': 'ghs08', 'ambiente': 'ghs09', 'daño-ambiente': 'ghs09'
                    };
                    for (let key in map) { if (s.includes(key)) return map[key]; }
                    const ghsMatch = s.match(/ghs\d+/);
                    return ghsMatch ? ghsMatch[0] : s;
                };

                let rawPictos = rawStrings.map(normalizePicto);
                const name = (p.id_producto || "").toLowerCase();
                const clearName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                // Deduplicar y filtrar solo códigos ghsXX válidos
                let pictos = [...new Set(rawPictos)].filter(c => /^ghs\d+$/.test(c));

                // Regla de precedencia SGA mínima:
                // ghs05 (Corrosivo) incluye daño ocular grave (H318),
                // que es más severo que la mera irritación ocular (H319→ghs07).
                // Solo eliminamos ghs07 si HAY ghs05 y NO hay ghs06 (tóxico).
                if (pictos.includes('ghs05') && !pictos.includes('ghs06')) {
                    pictos = pictos.filter(c => c !== 'ghs07');
                }

                // 2. Ordenar por prioridad
                pictos.sort((a, b) => (priorityMap[a] || 99) - (priorityMap[b] || 99));

                // Determinar clase principal para matriz lógica (basado en pictogramas reales)
                let clase = '9';
                if (pictos.includes('ghs06')) {
                    clase = '6.1';
                } else if (pictos.includes('ghs05')) {
                    clase = clearName.includes('acido') ? '8A' : '8B';
                } else if (pictos.includes('ghs01')) {
                    clase = '1';
                } else if (pictos.includes('ghs04')) {
                    // ghs04 puede ser gas inflamable (2.1) o no inflamable (2.2)
                    clase = pictos.includes('ghs02') ? '2.1' : '2.2';
                } else if (pictos.includes('ghs02')) {
                    // Verificar si es gas inflamable por el nombre
                    clase = clearName.match(/propano|butano|gas licuado|glp/) ? '2.1' : '3';
                } else if (pictos.includes('ghs03')) {
                    clase = '5.1';
                }

                return { ...p, compClass: clase, matrixPictos: pictos.length > 0 ? pictos : ['ghs07'] };
            });
            renderProductChecklist();
        } catch (err) {
            console.error("Error cargando inventario:", err);
            productListContainer.innerHTML = `<p class="error" style="text-align:center; padding:10px; color:#ef4444; font-size:12px;">Error al conectar con el servidor.<br><small>${err.message}</small></p>`;
        }
    }

    function renderProductChecklist(filter = "") {
        const filtered = dbProductos.filter(p => p.id_producto.toLowerCase().includes(filter.toLowerCase()));
        
        if (filtered.length === 0) {
            productListContainer.innerHTML = '<p style="text-align:center; padding:10px; font-size:12px;">No se encontraron productos.</p>';
            return;
        }

        // Mapa ghsXX → nombre de imagen (igual que etiquetas.js)
        const pictoImageMap = {
            'ghs01': 'explosivo',       'ghs02': 'inflamable',    'ghs03': 'oxidante',
            'ghs04': 'gas-presurizado', 'ghs05': 'corrosivo',     'ghs06': 'toxico',
            'ghs07': 'irritante',       'ghs08': 'peligro-salud', 'ghs09': 'daño-ambiente'
        };

        productListContainer.innerHTML = filtered.map(p => {
            // Usar matrixPictos (ya normalizados, deduplicados y ordenados)
            const pictoHtml = (p.matrixPictos || []).map(code => {
                const imgName = pictoImageMap[code];
                if (!imgName) return '';
                return `<img src="../../images/${imgName}.png" alt="${code}" title="${code}" onerror="this.style.display='none'">`;
            }).join('');

            return `
                <div class="comp-item" data-id="${p._id}">
                    <input type="checkbox" ${selectedProductIds.has(p._id) ? 'checked' : ''} onclick="event.stopPropagation()">
                    <span>${p.id_producto}</span>
                    <div class="picto-previews">
                        ${pictoHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Listeners para toda la fila
        productListContainer.querySelectorAll('.comp-item').forEach(item => {
            item.onclick = () => {
                const cb = item.querySelector('input');
                cb.checked = !cb.checked;
                toggleProduct(item.dataset.id, cb.checked);
            };
            item.querySelector('input').onchange = (e) => {
                toggleProduct(item.dataset.id, e.target.checked);
            };
        });
    }

    function toggleProduct(id, isSelected) {
        if (isSelected) selectedProductIds.add(id);
        else selectedProductIds.delete(id);
        
        selectedCountSpan.innerText = `${selectedProductIds.size} productos seleccionados`;
        selectedCountSpan.classList.toggle('active', selectedProductIds.size > 0);
    }

    // 4. Lógica de la Matriz Dinámica N x N
    function generateMatrix() {
        if (selectedProductIds.size < 2) {
            return showToast("Seleccione al menos 2 productos para la matriz.", "warning");
        }

        const selected = dbProductos.filter(p => selectedProductIds.has(p._id));
        let globalStatus = 'G'; // G, Y, R
        let hazardsFound = new Set();

        // Decidir si usamos modo compacto (Vista Pájaro)
        const isCompact = selected.length > 10;
        const tableClass = isCompact ? 'matrix-table compact' : 'matrix-table';

        let html = `<table class="${tableClass}" style="width:100%; border-collapse:collapse; background:#fff;">`;
        html += '<thead><tr><th class="cell-name">SGA</th>';
        // Headers Pictogramas (X)
        // Headers Pictogramas (X)
        selected.forEach(p => {
            html += `<th style="text-align:center; padding:10px 5px;">
                        <div style="display:flex; justify-content:center; gap:2px; flex-wrap: wrap; width: 100%;">
                            ${getUnPictoHtml(p.matrixPictos, null, 18)}
                        </div>
                     </th>`;
        });
        html += '</tr><tr><th class="cell-name">Producto</th>';
        // Headers Nombres (X) con wrapping para rotación si es compacto
        selected.forEach(p => {
            const shortName = p.id_producto.length > 10 ? p.id_producto.substring(0, 10) + '...' : p.id_producto;
            html += `<th title="${p.id_producto}"><span>${shortName}</span></th>`;
        });
        html += '</tr></thead><tbody>';
        
        selected.forEach(rowP => {
            html += `<tr>
                <td class="cell-name" style="padding: 6px 15px;">
                    <div style="display:flex; align-items:center; gap:10px; width:100%;">
                        <span style="font-weight:600; flex:1; white-space: normal;">${rowP.id_producto}</span>
                        <div style="display:flex; justify-content:center; align-items:center; gap:4px; flex-wrap:wrap;">
                            ${getUnPictoHtml(rowP.matrixPictos, null, 18)}
                        </div>
                    </div>
                </td>`;
            selected.forEach(colP => {
                // Diagonal (Mismo producto)
                if (rowP._id === colP._id) {
                    html += '<td style="background:#92d050; border:1px solid #000 !important; color:#000000; text-align:center;"><i class="fas fa-check"></i></td>';
                    return;
                }

                // 1. Regla GHS Base
                let rule = matrix[rowP.compClass]?.[colP.compClass] || 'G';
                let interactionNote = null;

                // 2. Motor de Reactividad Específica (Overrides)
                const n1 = (rowP.id_producto || "").toLowerCase();
                const n2 = (colP.id_producto || "").toLowerCase();
                
                // Hipoclorito vs Ácidos/Limpiadores
                const isCloro = n1.includes('hipoclorito') || n2.includes('hipoclorito');
                const isAcido = n1.includes('evap clean') || n1.includes('desengrasante industrial no. 1') || 
                                n2.includes('evap clean') || n2.includes('desengrasante industrial no. 1');
                if (isCloro && isAcido) {
                    rule = 'R';
                    interactionNote = "¡PELIGRO LETAL! Hipoclorito + Ácido libera GAS CLORO.";
                }

                // Hipoclorito vs Amoníaco
                const isAmonia = n1.includes('limpia vidrios') || n1.includes('ambientador') || 
                                 n2.includes('limpia vidrios') || n2.includes('ambientador');
                if (isCloro && isAmonia) {
                    rule = 'R';
                    interactionNote = "¡RIESGO QUÍMICO! Mezcla genera VAPORES DE CLORAMINAS TÓXICOS.";
                }

                // Hipoclorito vs Alcohol
                const isAlcohol = n1.includes('etanol') || n1.includes('alcohol') || 
                                  n2.includes('etanol') || n2.includes('alcohol');
                if (isCloro && isAlcohol) {
                    rule = 'R';
                    interactionNote = "¡PELIGRO! Hipoclorito + Etanol reaccionan formando CLOROFORMO.";
                }

                // Soda Cáustica vs Agua/Jabón
                const isBases = n1.includes('soda cáustica') || n1.includes('diablo rojo') || 
                                n2.includes('soda cáustica') || n2.includes('diablo rojo');
                const isBaseAgua = n1.includes('jabón líquido') || n1.includes('cera') || 
                                   n2.includes('jabón líquido') || n2.includes('cera');
                if (isBases && isBaseAgua) {
                    rule = 'Y';
                    interactionNote = "¡REACCIÓN EXOTÉRMICA! Soda Cáustica + Agua genera calor extremo/salpicaduras.";
                }

                // Inflamables vs Gases
                const isInflamable = rowP.compClass === '3' || colP.compClass === '3';
                const isGasInflam = rowP.compClass === '2.1' || colP.compClass === '2.1';
                if (isInflamable && isGasInflam) {
                    rule = 'Y';
                    interactionNote = "SEGURIDAD CIUDADANA: Líquidos Inflamables a mín. 6m de Gases o con Muro Cortafuego.";
                }

                if (rule === 'R') globalStatus = 'R';
                else if (rule === 'Y' && globalStatus !== 'R') globalStatus = 'Y';

                // Guardar nota de peligro
                if (interactionNote) hazardsFound.add(interactionNote);
                
                const key = `${rowP.compClass}-${colP.compClass}`;
                const revKey = `${colP.compClass}-${rowP.compClass}`;
                if (detailRules[key]) hazardsFound.add(detailRules[key]);
                else if (detailRules[revKey]) hazardsFound.add(detailRules[revKey]);

                const cellClass = rule === 'G' ? 'cell-green' : (rule === 'Y' ? 'cell-yellow' : 'cell-red');
                const icon = rule === 'G' ? 'fa-check' : (rule === 'Y' ? 'fa-exclamation' : 'fa-times');
                
                html += `<td class="cell-result ${cellClass}" title="${interactionNote || rowP.id_producto + ' vs ' + colP.id_producto}" style="text-align:center;">
                    <i class="fas ${icon}"></i>
                </td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        matrixContainer.style.display = 'block';
        matrixContainer.innerHTML = html;

        renderGlobalAlert(globalStatus);
        renderHazards(Array.from(hazardsFound));
    }

    function renderGlobalAlert(status) {
        const alert = document.getElementById('global-safety-alert');
        const icon = document.getElementById('global-safety-icon');
        const title = document.getElementById('global-safety-title');
        const desc = document.getElementById('global-safety-desc');

        alert.className = status === 'G' ? 'safe' : (status === 'Y' ? 'warning' : 'danger');
        alert.style.display = 'block';
        
        if (status === 'G') {
            icon.className = 'fas fa-check-shield';
            title.innerText = "Área Compatible";
            desc.innerText = "Todos los productos seleccionados pueden almacenarse juntos sin restricciones mayores.";
        } else if (status === 'Y') {
            icon.className = 'fas fa-exclamation-triangle';
            title.innerText = "Almacenamiento Condicional";
            desc.innerText = "Existen productos que requieren medidas preventivas o segregación parcial (verificar la sección 7 y 10 de la hoja de seguridad).";
        } else {
            icon.className = 'fas fa-skull-crossbones';
            title.innerText = "ALERTA: INCOMPATIBLE";
            desc.innerText = "Se han detectado cruces PROHIBIDOS. No almacene estos grupos juntos bajo ninguna circunstancia.";
        }
    }

    function renderHazards(hazards) {
        tipsArea.style.display = hazards.length > 0 ? 'block' : 'none';
        hazardNotes.innerHTML = hazards.map(h => `
            <div class="hazard-note-card">
                <h5>RIESGO DETECTADO</h5>
                <p>${h}</p>
            </div>
        `).join('');
    }

    // 5. Interactividad
    searchInput.oninput = (e) => renderProductChecklist(e.target.value);
    
    btnClear.onclick = () => {
        selectedProductIds.clear();
        renderProductChecklist();
        selectedCountSpan.innerText = "0 productos seleccionados";
        alert('Selección limpiada');
    };

    btnGenerate.onclick = generateMatrix;

    // Inicialización
    cargarInventario();
    renderLocDropdown();

    // 7. Gestión de Ubicaciones (NUEVO)
    function renderLocDropdown() {
        locationSelect.innerHTML = '<option value="manual">-- Selección Manual --</option>' + 
            storageLocations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
    }

    function renderLocList() {
        if (storageLocations.length === 0) {
            locationListDiv.innerHTML = '<p style="padding:15px; text-align:center; font-size:12px; color:var(--text-muted);">No hay lugares guardados.</p>';
            return;
        }

        locationListDiv.innerHTML = storageLocations.map(loc => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border);">
                <div>
                    <h5 style="font-size:13px; margin:0;">${loc.name}</h5>
                    <p style="font-size:11px; color:var(--text-muted); margin:0;">${loc.productIds.length} productos asignados</p>
                </div>
                <button class="btn btn-outline btn-sm" onclick="window.deleteLocation('${loc.id}')" style="color:#ef4444; border-color:#fee2e2;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    window.deleteLocation = (id) => {
        if (!confirm("¿Seguro que desea eliminar este lugar de almacenamiento?")) return;
        storageLocations = storageLocations.filter(l => l.id !== id);
        saveAndSync();
    };

    function saveAndSync() {
        localStorage.setItem('saga_locations', JSON.stringify(storageLocations));
        renderLocDropdown();
        renderLocList();
    }

    btnManageLoc.onclick = () => {
        renderLocList();
        modalLoc.style.display = 'flex';
    };

    formNewLoc.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('newLocationName').value;
        if (selectedProductIds.size === 0) return showToast("Primero seleccione productos en la lista.", "error");

        const newLoc = {
            id: 'loc-' + Date.now(),
            name: name,
            productIds: Array.from(selectedProductIds)
        };

        storageLocations.push(newLoc);
        saveAndSync();
        document.getElementById('newLocationName').value = '';
        showToast(`✅ Lugar "${name}" creado exitosamente.`, "success");
    };

    locationSelect.onchange = (e) => {
        const val = e.target.value;
        if (val === 'manual') {
            matrixTitle.innerText = "Matriz de Almacenamiento";
            locationLabel.innerText = "Selección personalizada";
            return;
        }

        const loc = storageLocations.find(l => l.id === val);
        if (loc) {
            selectedProductIds = new Set(loc.productIds);
            renderProductChecklist();
            selectedCountSpan.innerText = `${selectedProductIds.size} productos seleccionados`;
            matrixTitle.innerText = `Matriz: ${loc.name}`;
            locationLabel.innerText = "Controlado por ubicación guardada";
            generateMatrix(); // Auto-generar
        }
    };

    // 8. Tooltips y Toggle de Referencia (NUEVO)
    const toggleRef = document.getElementById('toggleRefMatrix');
    const refContent = document.getElementById('refMatrixContent');
    const refIcon = document.getElementById('refMatrixIcon');

    if (toggleRef) {
        toggleRef.onclick = () => {
            const isHidden = refContent.style.display === 'none';
            refContent.style.display = isHidden ? 'block' : 'none';
            refIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        };
    }

    // 9. Impresión de Matriz
    window.printStorageMatrix = () => {
        if (selectedProductIds.size === 0) return showToast("No hay una matriz cargada para imprimir.", "error");
        
        // Agregar info extra antes de imprimir
        const container = document.getElementById('storage-matrix-container');
        const printHeader = document.createElement('div');
        printHeader.className = 'print-report-header'; // New class for targeted styling
        printHeader.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1.5px solid #000; padding-bottom:3px; margin-bottom:8px;">
                <img src="../../assets/logo.png" style="height:32px; filter: grayscale(1) contrast(1.2);">
                <div style="text-align:right;">
                    <h1 style="margin:0; font-size:18px; color:#000; letter-spacing:1px;">REPORTE DE COMPATIBILIDAD QUÍMICA</h1>
                    <p style="margin:0; font-size:9px; text-transform:uppercase; color:#333;">Generado por Sistema SAGA • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                </div>
            </div>
            <div style="margin-bottom:8px;">
                <h3 style="margin:0; font-size:14px; color:#1e40af;">${matrixTitle.innerText.toUpperCase()}</h3>
                <p style="margin:2px 0 0 0; font-size:10px; color:#333;">Este documento certifica la validación técnica de almacenamiento y segregación de sustancias para la ubicación seleccionada.</p>
            </div>
        `;
        
        container.prepend(printHeader);

        // Clonar leyenda para que aparezca en el reporte
        const originalLegend = document.getElementById('matrix-legend');
        let printLegend = null;
        if (originalLegend) {
            printLegend = originalLegend.cloneNode(true);
            printLegend.style.display = 'block';
            printLegend.classList.add('page-break'); // Force second page
            printLegend.id = 'print-legend-clone';
            container.appendChild(printLegend);
        }

        window.print();
        
        // Limpiar después de imprimir
        printHeader.remove();
        if (printLegend) printLegend.remove();
    };

    // 6. Matriz Referencial (Guía Original)
    const refMatrixBody = document.getElementById('matrixGridBody');
    if (refMatrixBody) {
        let html = '<tr><th style="font-size:10px;">ONU</th>' + ghsClasses.map(c => `<th title="${c.name}">${c.name}</th>`).join('') + '</tr>';
        ghsClasses.forEach(row => {
            html += `<tr><td style="font-weight:800; font-size:11px; background:var(--bg-main);" title="${row.name}">${row.name}</td>`;
            ghsClasses.forEach(col => {
                const type = matrix[row.id]?.[col.id] || 'G';
                const cellClass = type === 'G' ? 'cell-green' : (type === 'Y' ? 'cell-yellow' : 'cell-red');
                const icon = type === 'G' ? 'fa-check' : (type === 'Y' ? 'fa-exclamation' : 'fa-times');
                html += `<td class="${cellClass}"><i class="fas ${icon}"></i></td>`;
            });
            html += '</tr>';
        });
        refMatrixBody.innerHTML = html;
    }
});