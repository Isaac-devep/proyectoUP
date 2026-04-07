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
  console.log("🚀 [SAGA] Version 2.5 LOADED - Motor Unificado Activo");
  // alert("🟢 SAGA v2.5 CARGADO: La lógica de pictogramas ha sido actualizada. Por favor, vuelve a subir tu PDF.");
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
    const isColaborador = user && user.rol && (user.rol.toLowerCase() === 'colaborador' || user.rol.toLowerCase() === 'empleado');

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
      const fds_file = eti.fds_file;

      return `
      <tr>
        <td style="font-weight: 600;">${nombre || "N/A"}</td>
        <td><code>${eti.inf_cas || eti.id_etiqueta || "---"}</code></td>
        <td>${eti.fecha ? new Date(eti.fecha).toLocaleDateString() : "---"}</td>
        <td>
          <button class="action-btn" onclick="window.previewEtiquetaParaEditar('${eti._id}')" title="Editar/Ver Etiqueta">
            <i class="fas fa-edit"></i>
          </button>
          
          ${fds_file ? `
            <a href="${API_URL}/assets/${fds_file}" target="_blank" class="action-btn" title="Ver FDS Original" style="color:var(--primary);">
              <i class="fas fa-file-pdf"></i>
            </a>
          ` : `
            <button class="action-btn" disabled style="opacity:0.3;" title="Sin FDS asociado">
              <i class="fas fa-file-pdf"></i>
            </button>
          `}

          ${!isColaborador ? `
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
          _id: eti._id,
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
           // Si es colaborador, el preview está al final de etiquetas-lista
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
      <div class="card" style="padding:40px;text-align:center;">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 8px 25px rgba(99,102,241,0.35);">
          <i class="fas fa-robot" style="font-size:28px;color:#fff;"></i>
        </div>
        <h3 style="margin:0 0 8px;font-size:1.2rem;">Analizando FDS con Inteligencia Artificial</h3>
        <p style="color:#64748b;font-size:0.9rem;margin-bottom:18px;">GPT-4o-mini está leyendo y estructurando los datos de seguridad del documento...</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;"><i class="fas fa-check"></i> Identificación de producto</span>
          <span style="background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;"><i class="fas fa-check"></i> Frases H y P</span>
          <span style="background:#fdf4ff;color:#9333ea;border:1px solid #e9d5ff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;"><i class="fas fa-check"></i> Pictogramas GHS</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;margin-top:20px;padding:8px 20px;background:#f8fafc;border-radius:8px;">
          <i class="fas fa-circle-notch fa-spin" style="color:#6366f1;"></i>
          <span style="font-size:0.8rem;color:#94a3b8;">Esto puede tomar unos segundos...</span>
        </div>
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
      const isColaborador = user && user.rol && (user.rol.toLowerCase() === 'colaborador' || user.rol.toLowerCase() === 'empleado');
      const getText = (v) => (typeof v === "string" ? v : "");
      const getArr = (v) => (Array.isArray(v) ? v : []);
      const preview = document.getElementById("previewEtiqueta");
      if (!preview) return;
      
      console.log("🛠️ [SAGA] Pictogramas recibidos del servidor:", data.pictogramas);

      // El servidor ya devuelve códigos ghsXX. Solo validamos y ordenamos.
      const pictoImageMap = {
        'ghs01': 'explosivo',      'ghs02': 'inflamable',   'ghs03': 'oxidante',
        'ghs04': 'gas-presurizado','ghs05': 'corrosivo',    'ghs06': 'toxico',
        'ghs07': 'irritante',      'ghs08': 'peligro-salud','ghs09': 'daño-ambiente'
      };

      const priorityMap = {
        'ghs01': 1, 'ghs03': 2, 'ghs02': 3, 'ghs04': 4,
        'ghs05': 5, 'ghs06': 6, 'ghs08': 7, 'ghs07': 8, 'ghs09': 9
      };

      let pictos = [...new Set(getArr(data.pictogramas).map(p => p.toString().toLowerCase().trim()))]
        .filter(p => pictoImageMap[p]);
      pictos.sort((a, b) => (priorityMap[a] || 99) - (priorityMap[b] || 99));

      console.log("✅ [SAGA] Pictogramas finales:", pictos);

      let pictosHtml = pictos.length > 0
        ? pictos.map(code =>
            `<div class="ghs-picto-box"><img src="../../images/${pictoImageMap[code]}.png" alt="${code}" onerror="this.src='../../images/default-pictogram.png';"></div>`
          ).join("")
        : '<div style="color:#666;">No hay pictogramas</div>';


      const formId = "formEtiqueta-" + Date.now();

      preview.innerHTML = `
        <div class="card" style="padding:25px; background: #f8fafc; border: 1px dashed var(--primary);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <h3 style="margin:0;">Vista Prévia Profesional SGA (CLP)</h3>
              ${data._meta ? (data._meta.metodo_analisis === 'openai'
                ? `<div style="display:flex; flex-direction:column; gap:5px;">
                      <span style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(99,102,241,0.4);">
                        <i class="fas fa-robot"></i> Analizado por IA
                      </span>
                      <span style="background:#10b981; color:#fff; font-size:9px; font-weight:900; padding:2px 8px; border-radius:4px; text-transform:uppercase; text-align:center;">
                        SAGA v2.5
                      </span>
                    </div>`
                : `<div style="display:flex; flex-direction:column; gap:5px;">
                      <span style="display:inline-flex;align-items:center;gap:5px;background:#f59e0b;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">
                        <i class="fas fa-code"></i> Modo regex (fallback)
                      </span>
                      <span style="background:#10b981; color:#fff; font-size:9px; font-weight:900; padding:2px 8px; border-radius:4px; text-transform:uppercase; text-align:center;">
                        SAGA v2.5
                      </span>
                    </div>`)
              : ''}
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
               <label style="font-size: 11px; font-weight:700; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:5px;">
                 <input type="checkbox" id="checkInternalUse" onchange="document.getElementById('printableLabel').classList.toggle('ghs-black-border', this.checked)">
               Borde Negro (Art. 12 / Uso Interno)
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
              <div id="lbl-meta" style="font-size: 8px; font-weight: 700; text-align: right; width: 45%; word-wrap: break-word;">
                ${(() => {
                  if (!data.cas || data.cas.toLowerCase() === 'sin identificar') return 'ID: <br> ---';
                  const hasUN = data.cas.toUpperCase().includes('UN');
                  const hasCAS = /\d{2,7}-\d{2}-\d/.test(data.cas);
                  let label = 'ID:';
                  if (hasUN && hasCAS) label = 'CAS / UN:';
                  else if (hasUN) label = 'UN:';
                  else if (hasCAS) label = 'CAS:';
                  return `${label} <br> ${escapeHtml(data.cas)}`;
                })()}
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
                       ${isColaborador ? 'readonly disabled' : ''}
                       oninput="document.getElementById('lbl-nombre').textContent = this.value">
              </div>
              <div class="form-group">
                <label>Identificación de Componentes (CAS / Otros)</label>
                <input name="cas" value="${escapeHtml(getText(data.cas))}" class="form-control" 
                       ${isColaborador ? 'readonly disabled' : ''}
                       oninput="(() => {
                         const val = this.value;
                         if (!val || val.toLowerCase() === 'sin identificar') {
                            document.getElementById('lbl-meta').innerHTML = 'ID: <br> ---';
                            return;
                         }
                         const hasUN = val.toUpperCase().includes('UN');
                         const hasCAS = /\\d{2,7}-\\d{2}-\\d/.test(val);
                         let label = 'ID:';
                         if (hasUN && hasCAS) label = 'CAS / UN:';
                         else if (hasUN) label = 'UN:';
                         else if (hasCAS) label = 'CAS:';
                         document.getElementById('lbl-meta').innerHTML = label + ' <br> ' + val;
                       })()">
              </div>
            </div>
            <div class="form-group">
              <label>Palabra de Advertencia</label>
              <select name="palabra_advertencia" class="form-control" 
                      ${isColaborador ? 'disabled' : ''}
                      onchange="const s = document.getElementById('lbl-signal'); s.textContent = this.value; s.className = 'ghs-signal-word ' + (this.value === 'ATENCIÓN' ? 'atencion' : '')">
                <option value="PELIGRO" ${data.palabra_advertencia === 'PELIGRO' ? 'selected' : ''}>PELIGRO</option>
                <option value="ATENCIÓN" ${data.palabra_advertencia === 'ATENCIÓN' ? 'selected' : ''}>ATENCIÓN</option>
              </select>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Indicaciones de Peligro (H)</label>
                <textarea name="indicaciones_peligro" rows="4" class="form-control" ${isColaborador ? 'readonly disabled' : ''}>${getArr(data.indicaciones_peligro).join("\n")}</textarea>
              </div>
              <div class="form-group">
                <label>Consejos de Prudencia</label>
                <textarea name="consejos_prudencia" rows="4" class="form-control" ${isColaborador ? 'readonly disabled' : ''}>${getArr(data.consejos_prudencia).join("\n")}</textarea>
              </div>
            </div>
            
            ${user && user.rol && !['colaborador', 'empleado'].includes(user.rol.toLowerCase()) ? `
              <div style="display:flex; gap:15px; margin-top:25px; align-items:center;">
                <button type="button" class="btn btn-primary" id="btnGuardarEtiqueta">
                   <i class="fas fa-save"></i> ${data._id ? 'Actualizar en Base de Datos' : 'Guardar en Base de Datos'}
                </button>
                ${data._id ? `
                <button type="button" class="btn btn-outline" style="color:#ef4444; border-color:#ef4444;" onclick="window.eliminarEtiqueta('${data._id}'); setTimeout(() => window.showSection && window.showSection('etiquetas-lista'), 800);">
                   <i class="fas fa-trash-alt"></i> Eliminar Etiqueta
                </button>
                ` : ''}
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
          // Usar FormData para enviar el PDF si existe
          const bodyPayload = new FormData();
          bodyPayload.append("id_etiqueta", datos.cas || datos.nombre_producto + "-" + Date.now());
          bodyPayload.append("p_advertencia", datos.palabra_advertencia);
          bodyPayload.append("inf_cas", datos.cas || "");
          bodyPayload.append("id_producto", datos.nombre_producto);
          bodyPayload.append("frases_h", JSON.stringify((datos.indicaciones_peligro || "").split("\n").filter(x => x.trim())));
          bodyPayload.append("frases_p", JSON.stringify((datos.consejos_prudencia || "").split("\n").filter(x => x.trim())));
          bodyPayload.append("pictogramas", JSON.stringify(pictos));
          bodyPayload.append("emergencia", "123 (Bomberos)");

          // Adjuntar el archivo original si existe
          if (lastFile) {
            bodyPayload.append("fds_pdf", lastFile);
          }

          const isUpdating = !!data._id;
          const method = isUpdating ? "PUT" : "POST";
          const endpoint = isUpdating ? `${API_URL}/etiquetas/${data._id}` : `${API_URL}/etiquetas`;

          const res = await fetch(endpoint, {
            method: method,
            body: bodyPayload, // Sin Content-Type header para que el navegador ponga el boundary
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Error al guardar");
          }

          showToast(`✅ Etiqueta ${isUpdating ? "actualizada" : "guardada"} con éxito en la base de datos.`, "success");
          lastFile = null; // Limpiar archivo tras guardado
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  EXPORTACIÓN GLOBAL (Para unificación con admin.js)
  // ═══════════════════════════════════════════════════════════════════════════
  window.procesarPDF = procesarPDF;
  window.renderEditableForm = renderEditableForm;
  window.mostrarPreviewLoading = mostrarPreviewLoading;
  window.mostrarPreviewError = mostrarPreviewError;
});