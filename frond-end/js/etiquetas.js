// Solo previene submit de forms invisibles o ajenos (¡NUNCA el generado!)
window.addEventListener(
  "submit",
  function (ev) {
    if (
      (ev.target.tagName === "FORM" &&
      ev.target.id &&
      ev.target.id.startsWith("formEtiqueta-")) ||
      ev.target.id === "formNuevoUsuario"
    )
      return;
    ev.preventDefault();
    console.log("🔥 Previniendo un submit global fantasma!");
  },
  true
);

document.addEventListener("DOMContentLoaded", function () {
  // --------- Variables y referencias
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdfInput");
  const btnUpload = document.getElementById("btnUpload");
  let lastFile = null;

  const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");

  // REMOVIDO: cargarDashboard ahora es centralizado en script.js
  
  window.renderEtiquetasLoader = function() {
    const tableBody = document.getElementById("etiquetasTableBody");
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 60px;">
          <div class="spinner-sm" style="width:40px; height:40px; border-width:4px; border-top-color:var(--primary); margin:0 auto 15px;"></div>
          <p style="color:var(--text-muted); font-size:14px; font-weight:600;">Consultando base de datos...</p>
        </td>
      </tr>
    `;
  };

  window.renderEtiquetasTable = function(etiquetas) {
    const tableBody = document.getElementById("etiquetasTableBody");
    if (!tableBody) return;

    const user = JSON.parse(localStorage.getItem('usuario'));
    const isEmployee = user && user.rol && user.rol.toLowerCase() === 'empleado';

    if (etiquetas.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No hay etiquetas creadas aún.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = etiquetas.map(eti => {
      const nombre = eti.id_producto || "";
      let pdfFile = "";
      const n = nombre.toLowerCase();
      // ... (lógica de mapeo de PDF omitida por brevedad en el diff si es posible, pero debo incluirla para no borrarla)
      if (n.includes("propano")) pdfFile = "aoc-hds-proveedores-propano.pdf";
      else if (n.includes("glp")) pdfFile = "FDS-GAS-LICUADO-DE-PETROLEO.pdf";
      else if (n.includes("butano")) pdfFile = "FICHAS-DE-DATOS-DE-SEGURIDAD-BUTANO.pdf";
      else if (n.includes("freon-22") || n.includes("r-22")) pdfFile = "CH_HS_Refrigerante-FREON-22-R-22.pdf";
      else if (n.includes("410a")) pdfFile = "GAS REFRIGERNATE 410A.pdf";
      else if (n.includes("thinner")) pdfFile = "THINNER 70-spain-Spanish-1_4_pdf-BDS001377BU.pdf";
      else if (n.includes("soldadura")) pdfFile = "2507_FDS_Soldadura.pdf";
      else if (n.includes("clean pipe")) pdfFile = "FDS_03_-_SOLDAMAX_PAVCO_LOW_VOC (3).pdf";
      else if (n.includes("desengrasante industrial no. 1")) pdfFile = "FDS-10227588-DESENGRASANTE-IND.-No.-1-CRC-IND_Nal-SGA-2024.pdf";
      else if (n.includes("pintura epoxica")) pdfFile = "fds-epoxica-base-solvente.pdf";
      else if (n.includes("gasolina")) pdfFile = "Gasolina Regular.pdf";
      else if (n.includes("esmante") || n.includes("esmalte")) pdfFile = "HDS_Esmalte_Sintetico_rev.2022_2_d8cfe131-91b3-4262-9f2a-5ab15b7328bd.pdf";
      else if (n.includes("anticorrosivo")) pdfFile = "Hoja_De_Seguridad_Anticorrosivo.pdf";
      else if (n.includes("hipoclorito")) pdfFile = "ficha-datos-seguridad-hipoclorito-sodio.pdf";
      else if (n.includes("diablo rojo")) pdfFile = "7._DIABLO_ROJO-9334222.pdf";
      else if (n.includes("soda caustica")) pdfFile = "a1-lo-01-hoja-de-seguridad-soda-ca-ustica.pdf";
      else if (n.includes("evap clean")) pdfFile = "SDS_ES_10136.pdf";
      else if (n.includes("neutral disinfectant")) pdfFile = "MX-1X-901158-03-20 NEUTRAL DISINFECTANT CLEANER (LA).pdf";

      return `
      <tr>
        <td style="font-weight: 600;">${nombre || "N/A"}</td>
        <td><code>${eti.inf_cas || eti.id_etiqueta || "---"}</code></td>
        <td>${eti.fecha ? new Date(eti.fecha).toLocaleDateString() : "---"}</td>
        <td>
          <button class="action-btn" onclick="window.previewEtiquetaParaEditar('${eti._id}')" title="Editar/Ver Etiqueta">
            <i class="fas fa-edit"></i>
          </button>
          
          ${pdfFile ? `
            <a href="${API_URL}/assets/${pdfFile}" target="_blank" class="action-btn" title="Descargar PDF Original" style="color:var(--primary);">
              <i class="fas fa-file-pdf"></i>
            </a>
          ` : `
            <button class="action-btn" disabled style="opacity:0.3;" title="Sin PDF">
              <i class="fas fa-file-pdf"></i>
            </button>
          `}

          ${!isEmployee ? `
            <button class="action-btn" style="color:#ef4444;" title="Eliminar" onclick="window.eliminarEtiqueta('${eti._id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          ` : ''}
        </td>
      </tr>
      `;
    }).join("");
  }

  // El inicio ahora lo maneja script.js centralmente

  // Función para ELIMINAR etiqueta
  window.eliminarEtiqueta = async function(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta etiqueta de la base de datos?")) return;
    
    try {
      const res = await fetch(`${API_URL}/etiquetas/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showToast("✅ Etiqueta eliminada con éxito.", "success");
        cargarDashboard(); // Recargar tabla
      } else {
        const err = await res.json();
        throw new Error(err.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Error eliminando:", error);
      showToast("❌ Error al eliminar: " + error.message, "error");
    }
  };

  // Exponer función de preview real
  window.previewEtiquetaParaEditar = async function(id) {
    try {
      const res = await fetch(`${API_URL}/etiquetas`);
      const data = await res.json();
      const eti = (data.etiquetas || []).find(e => e._id === id);
      
      if (eti) {
        // Mapear campos de BD a formato esperado por renderEditableForm
        const formattedData = {
          nombre_producto: eti.id_producto,
          palabra_advertencia: eti.p_advertencia,
          cas: eti.inf_cas,
          indicaciones_peligro: eti.frases_h,
          consejos_prudencia: eti.frases_p,
          pictogramas: eti.pictogramas
        };
        
        // Cambiar a la sección de generador (Solo si existe, sino stay here)
        const hasGenerator = document.getElementById('generar-etiquetas');
        if (hasGenerator && window.showSection) {
           window.showSection('generar-etiquetas');
        } else {
           // Si es empleado, el preview está al final de etiquetas-lista
           const previewTop = document.getElementById('previewEtiqueta');
           if (previewTop) previewTop.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Renderizar
        renderEditableForm(formattedData);
      }
    } catch (err) {
      console.error("Error cargando etiqueta para editar:", err);
    }
  };

  // --------- Drag & Drop área
  if (dropArea) {
    dropArea.addEventListener("click", () => fileInput.click());
    dropArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropArea.classList.add("dragover");
    });
    dropArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropArea.classList.remove("dragover");
    });
    dropArea.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropArea.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        lastFile = fileInput.files[0];
        await procesarPDF(lastFile);
      }
    });
  }

  // --------- Input tradicional
  if (fileInput) {
    fileInput.addEventListener("change", async function () {
      if (!fileInput.files.length) return;
      lastFile = fileInput.files[0];
      await procesarPDF(lastFile);
    });
  }

  // --------- Botón subir
  if (btnUpload) {
    btnUpload.addEventListener("click", async function () {
      if (!lastFile) return showToast("Selecciona o arrastra un PDF primero.", "error");
      await procesarPDF(lastFile);
    });
  }

  // --------- Procesar PDF
  async function procesarPDF(file) {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;

    mostrarPreviewLoading();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_URL}/extract_pdf_data`, {
        method: "POST",
        body: formData,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Error al procesar el PDF (Código: " + resp.status + ")");
      }
      
      const data = await resp.json();
      renderEditableForm(data);
    } catch (e) {
      console.error("Error procesando PDF:", e);
      mostrarPreviewError(`
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
          <i class="fas fa-exclamation-triangle" style="font-size:24px;color:#d32f2f;"></i>
          <h3 style="margin:0;color:#d32f2f;">Error al procesar el PDF</h3>
        </div>
        <p><strong>Detalles:</strong> ${e.message}</p>
        <button onclick="document.getElementById('previewEtiqueta').innerHTML=''" class="btn btn-outline" style="margin-top:15px;">
          <i class="fas fa-arrow-left"></i> Volver a intentar
        </button>
      `);
    }
  }

  function mostrarPreviewLoading() {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;
    preview.innerHTML = `
      <div class="card" style="padding:30px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:15px;">
          <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
          <h3 style="margin:0;">Procesando PDF...</h3>
        </div>
        <p>Extrayendo datos de seguridad del documento</p>
      </div>
    `;
  }

  function mostrarPreviewError(msg) {
    const preview = document.getElementById("previewEtiqueta");
    if (!preview) return;
    preview.innerHTML = `
      <div class="card" style="padding:25px;border-left:4px solid #d32f2f;">
        ${msg}
      </div>
    `;
  }

  function renderEditableForm(data) {
    try {
      const user = JSON.parse(localStorage.getItem('usuario'));
      const getText = (v) => (typeof v === "string" ? v : "");
      const getArr = (v) => (Array.isArray(v) ? v : []);
      const preview = document.getElementById("previewEtiqueta");
      if (!preview) return;
      
      let pictos = getArr(data.pictogramas);
      let pictosHtml = pictos.length > 0 
        ? pictos.map((pic) => {
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
            return `<div class="ghs-picto-box"><img src="../../images/${s}.png" alt="${s}" onerror="this.src='../../images/default-pictogram.png';"></div>`;
          }).join("")
        : '<div style="color:#666;">No hay pictogramas</div>';

      const formId = "formEtiqueta-" + Date.now();

      preview.innerHTML = `
        <div class="card" style="padding:25px; background: #f8fafc; border: 1px dashed var(--primary);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h3 style="margin:0;">Vista Prévia Profesional SGA (CLP)</h3>
            <div style="display:flex; gap:10px; align-items:center;">
               <label style="font-size: 11px; font-weight:700; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:5px;">
                 <input type="checkbox" id="checkInternalUse" onchange="document.getElementById('printableLabel').classList.toggle('ghs-black-border', this.checked)">
                 USO INTERNO (Art. 12)
               </label>
                <div class="size-selector-pills" id="labelSizeGroup">
                  <button type="button" class="size-pill" data-size="ghs-size-mini" title="Articulo 13: Envases < 30ml">MINI</button>
                  <button type="button" class="size-pill" data-size="ghs-size-s" title="Envases hasta 3 Litros">S</button>
                  <button type="button" class="size-pill active" data-size="ghs-size-m" title="Envases 3 a 50 Litros">M</button>
                  <button type="button" class="size-pill" data-size="ghs-size-l" title="Envases 50 a 500 Litros">L</button>
                  <button type="button" class="size-pill" data-size="ghs-size-xl" title="Envases más de 500 Litros">XL</button>
                </div>
               <button class="btn btn-primary btn-sm" onclick="window.imprimirEtiquetaIndependiente('printableLabel')">
                 <i class="fas fa-print"></i> Imprimir
               </button>
            </div>
          </div>

          <!-- LA ETIQUETA BONITA (NUEVO LAYOUT 2 COLUMNAS) -->
          <div class="ghs-label ghs-size-m" id="printableLabel">
            <div class="ghs-header">
              <h2 id="lbl-nombre">${escapeHtml(getText(data.nombre_producto)) || "NOMBRE DEL PRODUCTO"}</h2>
              <div class="ghs-components" id="lbl-meta">
                ${data.cas ? `Identificación: <br> ${escapeHtml(data.cas)}` : 'Componentes / CAS: <br> ---'}
              </div>
            </div>

            <div class="ghs-body">
              <div class="ghs-col-left">
                <div class="ghs-section">
                  <h4>INDICACIONES DE PELIGRO</h4>
                  <ul id="lbl-frasesH">
                    ${getArr(data.indicaciones_peligro).map(h => `<li>${escapeHtml(h)}</li>`).join("")}
                  </ul>
                </div>
                <div class="ghs-section">
                  <h4>CONSEJOS DE PRUDENCIA</h4>
                  <ul id="lbl-frasesP">
                    ${getArr(data.consejos_prudencia).map(p => `<li>${escapeHtml(p)}</li>`).join("")}
                  </ul>
                </div>
              </div>

              <div class="ghs-col-right">
                <div class="ghs-signal-word ${data.palabra_advertencia === 'ATENCIÓN' ? 'atencion' : ''}" id="lbl-signal">
                   ${getText(data.palabra_advertencia) || "PELIGRO"}
                </div>
                <div class="ghs-pictos" id="lbl-pictos">
                  ${pictosHtml}
                </div>
              </div>
            </div>

            <div class="ghs-footer">
              <div>
                Consultar la Guía de Respuesta en caso de Emergencia <strong>GRE 127</strong> <br>
                <strong>CONTACTO DE EMERGENCIA:</strong> 123 (Bomberos)
              </div>
              <div style="text-align: right;">
                Para mayor información, revisar la Ficha de Datos de Seguridad (FDS) antes de utilizar el producto.
              </div>
            </div>
          </div>

          <!-- FORMULARIO DE EDICIÓN -->
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
          <h4 style="margin-bottom: 15px;">Ajustar Información</h4>
          <form id="${formId}" autocomplete="off">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Nombre del producto *</label>
                <input name="nombre_producto" value="${escapeHtml(getText(data.nombre_producto))}" class="form-control" 
                       ${user && user.rol && user.rol.toLowerCase() === 'empleado' ? 'readonly disabled' : ''}
                       oninput="document.getElementById('lbl-nombre').textContent = this.value">
              </div>
              <div class="form-group">
                <label>Identificación de Componentes (CAS / Otros)</label>
                <input name="cas" value="${escapeHtml(getText(data.cas))}" class="form-control" 
                       ${user && user.rol && user.rol.toLowerCase() === 'empleado' ? 'readonly disabled' : ''}
                       oninput="document.getElementById('lbl-meta').innerHTML = 'Identificación: <br> ' + this.value">
              </div>
            </div>
            <div class="form-group">
              <label>Palabra de Advertencia</label>
              <select name="palabra_advertencia" class="form-control" 
                      ${user && user.rol && user.rol.toLowerCase() === 'empleado' ? 'disabled' : ''}
                      onchange="const s = document.getElementById('lbl-signal'); s.textContent = this.value; s.className = 'ghs-signal-word ' + (this.value === 'ATENCIÓN' ? 'atencion' : '')">
                <option value="PELIGRO" ${data.palabra_advertencia === 'PELIGRO' ? 'selected' : ''}>PELIGRO</option>
                <option value="ATENCIÓN" ${data.palabra_advertencia === 'ATENCIÓN' ? 'selected' : ''}>ATENCIÓN</option>
              </select>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Indicaciones de Peligro (H)</label>
                <textarea name="indicaciones_peligro" rows="4" class="form-control" ${user && user.rol && user.rol.toLowerCase() === 'empleado' ? 'readonly disabled' : ''}>${getArr(data.indicaciones_peligro).join("\n")}</textarea>
              </div>
              <div class="form-group">
                <label>Consejos de Prudencia (P)</label>
                <textarea name="consejos_prudencia" rows="4" class="form-control" ${user && user.rol && user.rol.toLowerCase() === 'empleado' ? 'readonly disabled' : ''}>${getArr(data.consejos_prudencia).join("\n")}</textarea>
              </div>
            </div>
            
            ${user && user.rol && user.rol.toLowerCase() !== 'empleado' ? `
              <div style="display:flex; gap:15px; margin-top:25px;">
                <button type="button" class="btn btn-primary" id="btnGuardarEtiqueta">
                   <i class="fas fa-save"></i> Guardar en Base de Datos
                </button>
              </div>
            ` : `
              <div class="badge badge-warning" style="width:100%; justify-content:center; padding:15px; margin-top:15px;">
                <i class="fas fa-lock"></i> Solo personal administrativo puede guardar o emitir etiquetas.
              </div>
            `}
          </form>
        </div>
      `;

      // Logic for size pills (NUEVO)
      const pills = preview.querySelectorAll('.size-pill');
      pills.forEach(pill => {
        pill.onclick = function() {
          pills.forEach(p => p.classList.remove('active'));
          this.classList.add('active');
          
          const sizeClass = this.dataset.size;
          const lbl = document.getElementById('printableLabel');
          const isInternal = document.getElementById('checkInternalUse').checked;
          
          lbl.className = 'ghs-label ' + sizeClass + (isInternal ? ' ghs-black-border' : '');
          lbl.classList.toggle('ghs-mini-layout', sizeClass === 'ghs-size-mini');
        };
      });

      function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      }

      const btnGuardar = document.getElementById("btnGuardarEtiqueta");
      btnGuardar.addEventListener("click", async function () {
        const form = document.getElementById(formId);
        const fb = new FormData(form);
        const datos = Object.fromEntries(fb.entries());
        
        try {
          const body = {
            id_etiqueta: datos.cas || datos.nombre_producto + "-" + Date.now(),
            p_advertencia: datos.palabra_advertencia,
            inf_cas: datos.cas || "",
            id_producto: datos.nombre_producto,
            frases_h: (datos.indicaciones_peligro || "").split("\n").filter(x => x.trim()),
            frases_p: (datos.consejos_prudencia || "").split("\n").filter(x => x.trim()),
            pictogramas: pictos,
            emergencia: "123 (Bomberos)"
          };

          const res = await fetch(`${API_URL}/etiquetas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Error al guardar");
          }

          showToast("✅ Etiqueta guardada con éxito en la base de datos.", "success");
          cargarDashboard(); // Refresh stats
        } catch (error) {
          console.error("Error guardando:", error);
          showToast("❌ Error al guardar: " + error.message, "error");
        }
      });

    } catch (err) {
      console.error("Error en renderEditableForm:", err);
    }
  }

  window.imprimirEtiquetaIndependiente = function(eleId) {
    const original = document.getElementById(eleId);
    if (!original) return showToast("❌ Error al imprimir", "error");

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    const labelHtml = original.outerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir SGA - SAGA</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; background: #fff; display: flex; justify-content: center; padding: 20px; }
            
            /* RELLENO DE ESTILOS PARA IMPRESIÓN SOLA */
            .ghs-label { --ghs-picto-size: 50px; --ghs-col-right-width: 240px; --ghs-signal-font: 24px; --ghs-title-font: 20px; border: 4px solid #cc0000; color:#000; padding:10px; display:flex; flex-direction:column; gap:4px; background:#fff; overflow:visible; }
            .ghs-header { border-bottom: 2px solid #000; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: flex-start; }
            .ghs-header h2 { font-size: var(--ghs-title-font); font-weight: 900; line-height: 1.1; margin: 0; text-transform: uppercase; flex: 1; }
            .ghs-components { text-align: right; font-size: 10px; font-weight: 600; }
            .ghs-body { display: grid; grid-template-columns: 1fr var(--ghs-col-right-width); gap: 15px; }
            .ghs-col-left { display: flex; flex-direction: column; gap: 8px; }
            .ghs-col-right { display: flex; flex-direction: column; align-items: center; gap: 8px; border-left: 1px solid #eee; padding-left: 12px; }
            .ghs-signal-word { font-weight: 900; font-size: var(--ghs-signal-font); text-transform: uppercase; color: #cc0000; margin-top: 5px; }
            .ghs-signal-word.atencion { color: #f97316; }
            .ghs-pictos { display: grid; grid-template-columns: repeat(2, calc(var(--ghs-picto-size) * 1.42)); gap: 6px; }
            .ghs-picto-box { width: var(--ghs-picto-size); height: var(--ghs-picto-size); display: flex; align-items: center; justify-content: center; background: transparent; overflow: visible; }
            .ghs-picto-box img { width: 100%; height: 100%; object-fit: contain; }
            .ghs-section h4 { color: #cc0000; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
            .ghs-section ul { padding-left: 15px; font-size: 10px; list-style-type: disc; line-height: 1.15; margin: 0; }
            .ghs-footer { margin-top: 10px; border-top: 2px solid #000; padding-top: 8px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; font-size: 9px; }
            
            /* TAMAÑOS CLP DYNAMICS AGGRESSIVE */
            .ghs-size-s  { width: 74mm;  min-height: 52mm;  --ghs-picto-size: 32px; --ghs-col-right-width: 130px; --ghs-signal-font: 14px; --ghs-title-font: 16px; }
            .ghs-size-m  { width: 105mm; min-height: 74mm;  --ghs-picto-size: 45px; --ghs-col-right-width: 180px; --ghs-signal-font: 18px; --ghs-title-font: 18px; }
            .ghs-size-l  { width: 148mm; min-height: 105mm; --ghs-picto-size: 65px; --ghs-col-right-width: 260px; --ghs-signal-font: 26px; --ghs-title-font: 24px; }
            .ghs-size-xl { width: 210mm; min-height: 148mm; --ghs-picto-size: 85px; --ghs-col-right-width: 360px; --ghs-signal-font: 34px; --ghs-title-font: 32px; }
            .ghs-size-mini { width: 52mm; min-height: 35mm; --ghs-picto-size: 28px; --ghs-signal-font: 12px; --ghs-title-font: 13px; }
            
            /* MODOS REGULATORIOS */
            .ghs-black-border .ghs-picto-box img { filter: grayscale(1) contrast(1.5); }
            .ghs-mini-layout .ghs-body { display: block !important; }
            .ghs-mini-layout .ghs-col-left { display: none !important; }
            .ghs-mini-layout .ghs-col-right { border: none !important; padding: 0 !important; width: 100% !important; }
            .ghs-mini-layout .ghs-signal-word { text-align: center; margin: 1px 0 !important; }
            .ghs-mini-layout .ghs-pictos { grid-template-columns: repeat(auto-fit, calc(var(--ghs-picto-size) * 1.42)) !important; gap: 4px !important; }
            .ghs-mini-layout .ghs-footer { display: none !important; }
            
            @media print {
              body { padding: 0; }
              .ghs-label { -webkit-print-color-adjust: exact; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${labelHtml}
          <script>
            window.onload = function() {
              setTimeout(() => { window.print(); window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
});