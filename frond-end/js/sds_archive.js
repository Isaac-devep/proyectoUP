document.addEventListener('DOMContentLoaded', function() {
  const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");
  const sdsTableBody = document.getElementById('sdsTableBody');
  const sdsSearchInput = document.getElementById('sdsSearchInput');
  const sdsStats = document.getElementById('sdsStats');
  
  let allFiles = [];

  // Función para cargar los archivos del servidor
  async function cargarArchivosFDS() {
    try {
      const response = await fetch(`${API_URL}/fds/list-files`);
      const data = await response.json();
      
      if (data.files) {
        allFiles = data.files;
        renderSDSFiles(allFiles); // Keep internal function name or change both
        
        if (sdsStats) {
            sdsStats.textContent = `${allFiles.length} documentos encontrados`;
        }
      }
    } catch (error) {
      console.error('Error loading FDS files:', error);
      if (sdsTableBody) {
          sdsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #ef4444;">Error al cargar el archivo de seguridad. Asegúrate de que el servidor backend esté corriendo.</td></tr>';
      }
    }
  }

  function renderSDSFiles(files) {
    if (!sdsTableBody) return;
    
    if (files.length === 0) {
      sdsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #6b7280;">No se encontraron documentos PDFs en el servidor.</td></tr>';
      return;
    }

    sdsTableBody.innerHTML = files.map(file => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const date = new Date(file.mtime).toLocaleDateString();
      
      // Intentar obtener un nombre más amigable (sin extensiones, guiones por espacios)
      let displayName = file.name.replace('.pdf', '').replace('.PDF', '');
      displayName = displayName.replace(/[_-]/g, ' ');

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap: 12px;">
                <div style="background: #fee2e2; color: #ef4444; width: 36px; height: 36px; border-radius: 8px; display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${displayName}</div>
                    <div style="font-size: 0.75rem; color: #6b7280;">${file.name}</div>
                </div>
            </div>
          </td>
          <td style="color: #6b7280;">${sizeMB} MB</td>
          <td style="color: #6b7280;">${date}</td>
          <td>
            <div style="display:flex; gap: 8px;">
                <label class="btn btn-outline btn-sm" style="color:#6366f1; border-color:#6366f1; cursor:pointer;" title="Actualizar/Reemplazar Archivo">
                    <i class="fas fa-upload"></i>
                    <input type="file" hidden accept=".pdf" onchange="window.updateFDSArchiveFile('${file.name}', this)">
                </label>
                <button class="btn btn-outline btn-sm" style="color:#ef4444; border-color:#ef4444;" title="Eliminar Archivo Físico" onclick="window.deleteFDSArchiveFile('${file.name}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <a href="${API_URL}/assets/${file.name}" target="_blank" class="btn btn-primary btn-sm" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </a>
                <a href="${API_URL}/assets/${file.name}" download="${file.name}" class="btn btn-outline btn-sm" title="Descargar">
                    <i class="fas fa-download"></i>
                </a>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Búsqueda en tiempo real
  if (sdsSearchInput) {
    sdsSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = allFiles.filter(f => f.name.toLowerCase().includes(term));
      renderSDSFiles(filtered);
    });
  }

  // Cargar al iniciar
  cargarArchivosFDS(); 
  
  // Exponer para recarga manual si es necesario
  window.refreshFDSArchive = cargarArchivosFDS;

  window.updateFDSArchiveFile = async function(filename, inputEle) {
    if (!inputEle.files.length) return;
    const file = inputEle.files[0];
    const formData = new FormData();
    formData.append("fds_pdf", file);
    try {
      const resp = await fetch(`${API_URL}/fds/assets/${filename}`, {
        method: "PUT",
        body: formData,
      });
      if (!resp.ok) throw new Error("Error al actualizar");
      if (typeof showToast !== 'undefined') showToast("✅ Archivo reemplazado correctamente", "success");
      cargarArchivosFDS();
    } catch(err) {
      console.error(err);
      if (typeof showToast !== 'undefined') showToast("❌ Error al actualizar archivo", "error");
    }
  };

  window.deleteFDSArchiveFile = async function(filename) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el archivo:\n${filename}\n\nOJO: Si hay etiquetas vinculadas a este archivo, el link de descarga se romperá.`)) return;
    try {
      const resp = await fetch(`${API_URL}/fds/assets/${filename}`, {
        method: "DELETE"
      });
      if (!resp.ok) throw new Error("Error al eliminar");
      if (typeof showToast !== 'undefined') showToast("✅ Archivo eliminado correctamente", "success");
      cargarArchivosFDS();
    } catch(err) {
      console.error(err);
      if (typeof showToast !== 'undefined') showToast("❌ Error al eliminar archivo", "error");
    }
  };
});
