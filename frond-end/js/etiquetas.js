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

  // --------- Cargar datos del dashboard
  async function cargarDashboard() {
    try {
      // Cargar Etiquetas
      const resEtiquetas = await fetch(`${API_URL}/etiquetas`);
      const dataEtiquetas = await resEtiquetas.json();
      const etiquetas = dataEtiquetas.etiquetas || [];
      
      const statEtiquetas = document.getElementById("stat-etiquetas");
      if (statEtiquetas) statEtiquetas.textContent = etiquetas.length.toLocaleString();
      
      const trendEtiquetas = document.getElementById("stat-etiquetas-trend");
      if (trendEtiquetas) trendEtiquetas.textContent = "Total generado";

      // Cargar Tabla de Etiquetas
      renderEtiquetasTable(etiquetas);

      // Cargar SDS
      const resSDS = await fetch(`${API_URL}/fds`);
      const dataSDS = await resSDS.json();
      const fds = dataSDS.fds || [];
      
      const statSDS = document.getElementById("stat-sds");
      if (statSDS) statSDS.textContent = fds.length.toLocaleString();
      
      const trendSDS = document.getElementById("stat-sds-trend");
      if (trendSDS) trendSDS.textContent = "Fichas registradas";

      // Cargar Productos
      const resProductos = await fetch(`${API_URL}/productos`);
      const dataProductos = await resProductos.json();
      const productos = dataProductos.productos || [];
      
      const statProductos = document.getElementById("stat-productos");
      if (statProductos) statProductos.textContent = productos.length.toLocaleString();
      
      const trendProductos = document.getElementById("stat-productos-trend");
      if (trendProductos) trendProductos.textContent = "Catálogo activo";

    } catch (err) {
      console.error("Error cargando dashboard:", err);
    }
  }

  function renderEtiquetasTable(etiquetas) {
    const tableBody = document.getElementById("etiquetasTableBody");
    if (!tableBody) return;

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
      // Lógica de búsqueda de PDF en assets (nombres conocidos)
      let pdfFile = "";
      const n = nombre.toLowerCase();
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
          <button class="btn btn-primary btn-sm" onclick="window.previewEtiquetaParaEditar('${eti._id}')" title="Ver Etiqueta">
            <i class="fas fa-eye"></i> Ver
          </button>
          ${pdfFile ? `
            <a href="${API_URL}/assets/${pdfFile}" target="_blank" class="btn btn-outline btn-sm" title="Descargar PDF Original">
              <i class="fas fa-file-pdf"></i> PDF
            </a>
          ` : `
            <button class="btn btn-outline btn-sm" disabled title="No hay PDF original asociado">
              <i class="fas fa-minus-circle"></i> PDF
            </button>
          `}
          <button class="btn btn-outline btn-sm" title="Eliminar de DB" 
                  style="color:#ef4444; border-color:#fee2e2;"
                  onclick="window.eliminarEtiqueta('${eti._id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
      `;
    }).join("");
  }

  // Inicializar carga
  cargarDashboard();

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
        
        // Cambiar a la sección de generador
        if (window.showSection) window.showSection('generar-etiquetas');
        
        // Renderizar
        renderEditableForm(formattedData);
        
        // Scroll suave arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const getText = (v) => (typeof v === "string" ? v : "");
      const getArr = (v) => (Array.isArray(v) ? v : []);
      const preview = document.getElementById("previewEtiqueta");
      if (!preview) return;
      
      let pictos = getArr(data.pictogramas);
      let pictosHtml = pictos.length > 0 
        ? pictos.map((pic) => {
            // 1. Limpieza básica
            let s = pic.toString().toLowerCase().trim().replace(/\s+/g, '-');
            
            // 2. Mapeo de sinónimos o nombres cortos a archivos reales
            const pictoSwap = {
               'gas': 'gas-presurizado',
               'cilindro': 'gas-presurizado',
               'llama': 'inflamable',
               'inflamable': 'inflamable',
               'liquido-inflamable': 'inflamable',
               'solido-inflamable': 'inflamable',
               'combustible-espontaneo': 'inflamable',
               'peligroso-humedo': 'explosivo',
               'oxidante': 'oxidante',
               'comburente': 'oxidante',
               'peroxido': 'oxidante',
               'toxico': 'toxico',
               'toxica': 'toxico',
               'veneno': 'toxico',
               'calavera': 'toxico',
               'corrosivo': 'corrosivo',
               'corrosiva': 'corrosivo',
               'ácida': 'corrosivo',
               'base': 'corrosivo',
               'salud': 'peligro-salud',
               'cancerigena': 'peligro-salud',
               'cancerígena': 'peligro-salud',
               'irritante': 'irritante',
               'irritación': 'irritante',
               'exclamacion': 'irritante',
               'exclamación': 'irritante',
               'ambiente': 'daño-ambiente',
               'acuatico': 'daño-ambiente',
               'acuático': 'daño-ambiente'
            };
            
            if (pictoSwap[s]) s = pictoSwap[s];

            return `
              <div class="ghs-picto-box">
                <img src="../../images/${s}.png" alt="${s}" title="${s}" 
                     onerror="this.src='../../images/default-pictogram.png';">
              </div>
            `;
          }).join("")
        : '<div style="color:#666;">No hay pictogramas</div>';

      const formId = "formEtiqueta-" + Date.now();

      preview.innerHTML = `
        <div class="card" style="padding:25px; background: #f8fafc; border: 1px dashed var(--primary);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h3 style="margin:0;">Vista Prévia Profesional SGA</h3>
            <button class="btn btn-primary btn-sm" onclick="window.imprimirEtiquetaIndependiente('printableLabel')">
               <i class="fas fa-print"></i> Imprimir Etiqueta
            </button>
          </div>

          <!-- LA ETIQUETA BONITA -->
          <div class="ghs-label" id="printableLabel">
            <div class="ghs-header">
              <h2 id="lbl-nombre">${escapeHtml(getText(data.nombre_producto)) || "NOMBRE DEL PRODUCTO"}</h2>
              <div class="ghs-signal-word" id="lbl-signal">${getText(data.palabra_advertencia) || "PELIGRO"}</div>
            </div>

            <div class="ghs-pictos" id="lbl-pictos">
              ${pictosHtml}
            </div>

            <div class="ghs-grid">
              <div class="ghs-section">
                <h4>Indicaciones de Peligro (H)</h4>
                <ul id="lbl-frasesH" style="padding-left:15px; margin:0;">
                  ${getArr(data.indicaciones_peligro).map(h => `<li>${escapeHtml(h)}</li>`).join("")}
                </ul>
              </div>
              <div class="ghs-section">
                <h4>Consejos de Prudencia (P)</h4>
                <ul id="lbl-frasesP" style="padding-left:15px; margin:0;">
                  ${getArr(data.consejos_prudencia).map(p => `<li>${escapeHtml(p)}</li>`).join("")}
                </ul>
              </div>
            </div>

            <div class="ghs-footer">
              <div id="lbl-cas">CAS: ${escapeHtml(getText(data.cas)) || "N/A"}</div>
              <div id="lbl-emer">EMERGENCIA: 123 (Bomberos)</div>
            </div>
          </div>

          <!-- FORMULARIO DE EDICIÓN (DEBAJO PARA AJUSTES) -->
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
          <h4 style="margin-bottom: 15px;">Ajustar Información</h4>
          <form id="${formId}" autocomplete="off">
            <div class="form-group">
              <label>Nombre del producto *</label>
              <input name="nombre_producto" value="${escapeHtml(getText(data.nombre_producto))}" class="form-control" 
                     oninput="document.getElementById('lbl-nombre').textContent = this.value">
            </div>
            <div class="form-group">
              <label>Palabra de Advertencia</label>
              <select name="palabra_advertencia" class="form-control" onchange="document.getElementById('lbl-signal').textContent = this.value; document.getElementById('lbl-signal').style.background = this.value === 'PELIGRO' ? '#ef4444' : '#eab308'">
                <option value="PELIGRO" ${data.palabra_advertencia === 'PELIGRO' ? 'selected' : ''}>PELIGRO</option>
                <option value="ATENCIÓN" ${data.palabra_advertencia === 'ATENCIÓN' ? 'selected' : ''}>ATENCIÓN</option>
              </select>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Peligros (H)</label>
                <textarea name="indicaciones_peligro" rows="3" class="form-control">${getArr(data.indicaciones_peligro).join("\n")}</textarea>
              </div>
              <div class="form-group">
                <label>Prudencia (P)</label>
                <textarea name="consejos_prudencia" rows="3" class="form-control">${getArr(data.consejos_prudencia).join("\n")}</textarea>
              </div>
            </div>
            <div style="display:flex; gap:15px; margin-top:25px;">
              <button type="button" class="btn btn-primary" id="btnGuardarEtiqueta">
                 <i class="fas fa-save"></i> Guardar en Base de Datos
              </button>
            </div>
          </form>
        </div>
      `;

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

  // Función de Impresión de Etiqueta Sola
  window.imprimirEtiquetaIndependiente = function(eleId) {
    const original = document.getElementById(eleId);
    if (!original) {
      showToast("❌ No se encontró la etiqueta para imprimir", "error");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Obtener los estilos críticos de la etiqueta para que salgan bien al imprimir
    const labelHtml = original.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Etiqueta SGA - Eticol</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; display:flex; justify-content:center; background: #fff; }
            
            .ghs-label {
              width: 100%;
              max-width: 600px;
              border: 3px solid #000;
              padding: 25px;
              background: #fff;
              color: #000;
              box-shadow: none;
            }

            .ghs-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }

            .ghs-header h2 { font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; color: #000; }

            .ghs-signal-word {
              background: #ef4444 !important; color: #fff !important;
              padding: 6px 18px; border-radius: 4px;
              font-weight: 800; text-transform: uppercase; font-size: 15px;
              -webkit-print-color-adjust: exact;
            }

            .ghs-pictos { display: flex; gap: 20px; justify-content: center; margin: 25px 0; }
            .ghs-picto-box { 
              width: 100px; height: 100px; 
              border: 2px solid #000; 
              padding: 5px; 
              display: flex; align-items: center; justify-content: center; 
              transform: rotate(45deg); 
              overflow: hidden; 
              background: #fff; 
            }
            .ghs-picto-box img { width: 100%; height: 100%; object-fit: contain; transform: rotate(-45deg); }

            .ghs-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 12px; margin-top: 20px; }
            .ghs-info-grid h4 { font-weight: 800; margin-bottom: 8px; text-transform: uppercase; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .ghs-info-grid ul { padding-left: 18px; margin: 0; list-style-type: square; }
            
            .ghs-footer {
              margin-top: 25px;
              padding-top: 12px;
              border-top: 1px solid #000;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #333;
            }

            @media print {
              body { padding: 0; }
              .ghs-label { border: 3px solid #000 !important; width: 100%; max-width: none; }
              * { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="ghs-label">
            ${labelHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };
});