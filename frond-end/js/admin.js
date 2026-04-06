document.addEventListener("DOMContentLoaded", function() {
  // Variables y referencias
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdfInput");
  const btnUpload = document.getElementById("btnUpload");
  let lastFile = null;

  // Manejo de drag and drop
  setupDragAndDrop();
  
  // Event listeners
  fileInput.addEventListener("change", handleFileSelect);
  btnUpload.addEventListener("click", handleUploadClick);

  function setupDragAndDrop() {
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

  async function handleFileSelect() {
    if (!fileInput.files.length) return;
    lastFile = fileInput.files[0];
    await procesarPDF(lastFile);
  }

  async function handleUploadClick() {
    if (!lastFile) return alert("Selecciona o arrastra un PDF primero.");
    await procesarPDF(lastFile);
  }

  // Nota: procesarPDF, renderEditableForm y las funciones de preview 
  // ahora se consumen directamente desde etiquetas.js para evitar duplicidad
  // y asegurar que se use siempre el motor de IA SAGA v2.5.


  // Nota: Todas las acciones de formularios, guardado e impresión 
  // ahora son gestionadas por el motor central de etiquetas.js.
  // Esto garantiza que se use siempre la lógica de IA y el formato SGA profesional.
});

// Previene submit de forms no deseados
window.addEventListener("submit", function(ev) {
  if (ev.target.tagName === "FORM" && ev.target.id && ev.target.id.startsWith("formEtiqueta-")) return;
  ev.preventDefault();
  console.log("🔥 Previniendo un submit global fantasma!");
}, true);