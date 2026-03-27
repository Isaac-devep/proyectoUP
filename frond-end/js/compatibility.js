document.addEventListener('DOMContentLoaded', function() {
    // 1. Definición de Clases SGA (Reglas de Almacenamiento)
    const ghsClasses = [
        { id: '2.1', name: 'Gases Inflamables', icon: 'ghs02' },
        { id: '2.2', name: 'Gases No Inflamables', icon: 'ghs04' },
        { id: '3',   name: 'Líquidos Inflamables', icon: 'ghs02' },
        { id: '5.1', name: 'Sustancias Oxidantes', icon: 'ghs03' },
        { id: '8B',  name: 'Corrosivos Básicos (Álcalis)', icon: 'ghs05' },
        { id: '8A',  name: 'Corrosivos Ácidos', icon: 'ghs05' },
        { id: '9',   name: 'Bajo Riesgo / No Clasificadas', icon: 'ghs09' }
    ];

    const matrix = {
        '2.1': { '2.1':'G', '2.2':'Y', '3':'R',   '5.1':'R', '8B':'Y', '8A':'Y', '9':'G' },
        '2.2': { '2.1':'Y', '2.2':'G', '3':'Y',   '5.1':'Y', '8B':'Y', '8A':'Y', '9':'G' },
        '3':   { '2.1':'R', '2.2':'Y', '3':'G',   '5.1':'R', '8B':'Y', '8A':'Y', '9':'G' },
        '5.1': { '2.1':'R', '2.2':'Y', '3':'R',   '5.1':'G', '8B':'Y', '8A':'Y', '9':'R' },
        '8B':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '8B':'G', '8A':'R', '9':'G' },
        '8A':  { '2.1':'Y', '2.2':'Y', '3':'Y',   '5.1':'Y', '8B':'R', '8A':'G', '9':'G' },
        '9':   { '2.1':'G', '2.2':'G', '3':'G',   '5.1':'R', '8B':'G', '8A':'G', '9':'G' }
    };

    const unPictos = {
        '2.1': { color: '#ef4444', icon: 'inflamable', label: '2.1' },     // Inflamable
        '2.2': { color: '#22c55e', icon: 'gas-presurizado', label: '2.2' }, // Gas
        '3':   { color: '#ef4444', icon: 'inflamable', label: '3' },       // Líquido Inflamable
        '5.1': { color: '#eab308', icon: 'oxidante', label: '5.1' },      // Oxidante
        '8A':  { color: '#334155', icon: 'corrosivo', label: '8' },        // Corrosivo
        '8B':  { color: '#334155', icon: 'corrosivo', label: '8' },        // Corrosivo
        '9':   { color: '#94a3b8', icon: 'daño-ambiente', label: '9' }     // Misceláneos
    };

    function getUnPictoHtml(claseOrArray) {
        if (!claseOrArray) return '';
        const classes = Array.isArray(claseOrArray) ? claseOrArray : [claseOrArray];
        
        return classes.map(clase => {
            // Mapeo dinámico de GHS a UN si es necesario
            let targetClase = clase;
            const ghsToUn = {
                'ghs02': '3',   'ghs03': '5.1', 'ghs04': '2.2', 
                'ghs05': '8A',  'ghs09': '9',   'ghs01': '1', 
                'ghs06': '6.1', 'ghs08': '6.1'
            };
            if (ghsToUn[clase.toLowerCase()]) targetClase = ghsToUn[clase.toLowerCase()];

            const p = unPictos[targetClase] || unPictos['9'];
            return `
                <div class="un-diamond" style="background:${p.color}; width:24px; height:24px; transform: rotate(45deg); display:flex; align-items:center; justify-content:center; margin: 0 4px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 1px 3px rgba(0,0,0,0.2); overflow:hidden;">
                    <img src="../../images/${p.icon}.png" style="width:130%; height:130%; transform: rotate(-45deg); object-fit: contain;" onerror="this.src='../../assets/pictogramas/${clase}.png';">
                </div>
            `;
        }).join('');
    }

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
                let rawPictos = (p.pictogramas || []).map(pic => pic.toString().toLowerCase().trim());
                
                // 1. Reglas de Precedencia SGA (Exclusiones)
                let pictos = [...new Set(rawPictos)];
                const hasCorrosivo = pictos.includes('ghs05');
                const hasToxico = pictos.includes('ghs06');
                const hasSalud = pictos.includes('ghs08');
                if (hasCorrosivo || hasToxico || hasSalud) {
                    pictos = pictos.filter(p => p !== 'ghs07');
                }

                // 2. Ordenar por prioridad
                pictos.sort((a, b) => (priorityMap[a] || 99) - (priorityMap[b] || 99));

                // Determinar clase principal para matriz lógica
                let clase = '9';
                if (pictos.includes('ghs02')) clase = '3';
                else if (pictos.includes('ghs03')) clase = '5.1';
                else if (pictos.includes('ghs05')) {
                   clase = (p.id_producto || "").toLowerCase().includes('acido') ? '8A' : '8B';
                }
                else if (pictos.includes('ghs04')) clase = '2.2';
                else if ((p.id_producto || "").toLowerCase().includes('propano')) clase = '2.1';

                return { ...p, compClass: clase, matrixPictos: pictos.length > 0 ? pictos : [clase] };
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

        productListContainer.innerHTML = filtered.map(p => {
            const pictos = (p.pictogramas || []).map(pic => {
                let s = pic.toString().toLowerCase().trim().replace(/\s+/g, '-');
                const pictoSwap = {
                   'ghs01': 'explosivo', 'explosivo': 'explosivo',
                   'ghs02': 'inflamable', 'llama': 'inflamable', 'inflamable': 'inflamable',
                   'ghs03': 'oxidante', 'oxidante': 'oxidante', 'comburente': 'oxidante',
                   'ghs04': 'gas-presurizado', 'gas': 'gas-presurizado', 'cilindro': 'gas-presurizado',
                   'ghs05': 'corrosivo', 'corrosivo': 'corrosivo',
                   'ghs06': 'toxico', 'toxico': 'toxico', 'calavera': 'toxico',
                   'ghs07': 'irritante', 'irritante': 'irritante', 'exclamacion': 'irritante',
                   'ghs08': 'peligro-salud', 'salud': 'peligro-salud',
                   'ghs09': 'daño-ambiente', 'ambiente': 'daño-ambiente'
                };
                if (pictoSwap[s]) s = pictoSwap[s];
                return `<img src="../../images/${s}.png" alt="${s}" onerror="this.src='../../images/default-pictogram.png';">`;
            }).join('');

            return `
                <div class="comp-item" data-id="${p._id}">
                    <input type="checkbox" ${selectedProductIds.has(p._id) ? 'checked' : ''} onclick="event.stopPropagation()">
                    <span>${p.id_producto}</span>
                    <div class="picto-previews">
                        ${pictos}
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
                        <div style="display:flex; justify-content:center; gap:2px;">
                            ${getUnPictoHtml(p.matrixPictos)}
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
                        <div style="display:flex; justify-content:center; align-items:center; gap:4px;">
                            ${getUnPictoHtml(rowP.matrixPictos)}
                        </div>
                    </div>
                </td>`;
            selected.forEach(colP => {
                // Diagonal (Mismo producto)
                if (rowP._id === colP._id) {
                    html += '<td style="background:#92d050; border:1px solid #000 !important; color:#000000; text-align:center;"><i class="fas fa-check"></i></td>';
                    return;
                }

                const rule = matrix[rowP.compClass]?.[colP.compClass] || 'G';
                if (rule === 'R') globalStatus = 'R';
                else if (rule === 'Y' && globalStatus !== 'R') globalStatus = 'Y';

                // Guardar nota de peligro si existe
                const key = `${rowP.compClass}-${colP.compClass}`;
                const revKey = `${colP.compClass}-${rowP.compClass}`;
                if (detailRules[key]) hazardsFound.add(detailRules[key]);
                else if (detailRules[revKey]) hazardsFound.add(detailRules[revKey]);

                const cellClass = rule === 'G' ? 'cell-green' : (rule === 'Y' ? 'cell-yellow' : 'cell-red');
                const icon = rule === 'G' ? 'fa-check' : (rule === 'Y' ? 'fa-exclamation' : 'fa-times');
                
                html += `<td class="cell-result ${cellClass}" title="${rowP.id_producto} vs ${colP.id_producto}" style="text-align:center;">
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
