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
    let storageLocations = JSON.parse(localStorage.getItem('eticol_locations')) || [];

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
            dbProductos = (data.etiquetas || []).map(p => {
                // Auto-inferir clase si no existe (Basado en lógica previa)
                let clase = '9';
                const n = (p.id_producto || "").toLowerCase();
                if (n.includes('propano') || n.includes('glp')) clase = '2.1';
                else if (n.includes('nitrogeno') || n.includes('gas')) clase = '2.2';
                else if (n.includes('thinner') || n.includes('solvente')) clase = '3';
                else if (n.includes('acido')) clase = '8A';
                else if (n.includes('soda') || n.includes('limpia')) clase = '8B';
                return { ...p, compClass: clase };
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
                   'gas': 'gas-presurizado', 'ghs04': 'gas-presurizado', 'cilindro': 'gas-presurizado',
                   'llama': 'inflamable', 'ghs02': 'inflamable', 'inflamable': 'inflamable',
                   'oxidante': 'ghs03', 'ghs03': 'oxidante', 'oxidante-orig': 'oxidante',
                   'toxico': 'toxico', 'ghs06': 'toxico', 'calavera': 'toxico',
                   'corrosivo': 'corrosivo', 'ghs05': 'corrosivo',
                   'salud': 'peligro-salud', 'ghs08': 'peligro-salud',
                   'irritante': 'irritante', 'ghs07': 'irritante',
                   'ambiente': 'daño-ambiente', 'ghs09': 'daño-ambiente'
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

        let html = '<table class="storage-dynamic-table"><thead><tr><th class="cell-name">Producto</th>';
        // Headers (X)
        selected.forEach(p => html += `<th title="${p.id_producto}">${p.id_producto.substring(0,6)}...</th>`);
        html += '</tr></thead><tbody>';

        selected.forEach(rowP => {
            html += `<tr><td class="cell-name">${rowP.id_producto}</td>`;
            selected.forEach(colP => {
                // Diagonal (Mismo producto)
                if (rowP._id === colP._id) {
                    html += '<td style="background:#f1f5f9; color:#cbd5e1;"><i class="fas fa-slash"></i></td>';
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
                
                html += `<td class="cell-result ${cellClass}" title="${rowP.id_producto} vs ${colP.id_producto}">
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
            desc.innerText = "Existen productos que requieren medidas preventivas o segregación parcial.";
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
        localStorage.setItem('eticol_locations', JSON.stringify(storageLocations));
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

    // 6. Matriz Referencial (Guía Original)
    const refMatrixBody = document.getElementById('matrixGridBody');
    if (refMatrixBody) {
        let html = '<tr><th style="font-size:10px;">GHS</th>' + ghsClasses.map(c => `<th title="${c.name}">${c.id}</th>`).join('') + '</tr>';
        ghsClasses.forEach(row => {
            html += `<tr><td style="font-weight:800; font-size:11px; background:var(--bg-main);" title="${row.name}">${row.id}</td>`;
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
