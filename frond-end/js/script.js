document.addEventListener('DOMContentLoaded', function() {
  const usuario = JSON.parse(localStorage.getItem('usuario'));

  // 1. Redirigir si no hay sesión
  if (!usuario) {
    window.location.href = "../../index.html";
    return;
  }

  // 2. Mostrar información del usuario
  const nombreUsuario = document.getElementById('nombreUsuario');
  const rolUsuario = document.getElementById('rolUsuario');
  const avatarDiv = document.getElementById('userAvatar');

  if (nombreUsuario) nombreUsuario.textContent = `${usuario.nombre} ${usuario.apellido}`;
  if (rolUsuario) rolUsuario.textContent = usuario.rol;
  if (avatarDiv) {
    const iniciales = (usuario.nombre?.[0] || "") + (usuario.apellido?.[0] || "");
    avatarDiv.textContent = iniciales.toUpperCase();
  }

  // 2.5 Aplicar RBAC (Control de Acceso por Roles)
  function applyRBAC() {
    if (!usuario) return;
    
    const role = usuario.rol || "";
    const isColaborador = role.toLowerCase() === 'colaborador' || role.toLowerCase() === 'empleado';
    
    console.log(`🛡️ [RBAC] Aplicando restricciones para rol: ${role}`);

    // Si es colaborador, ocultar SOLO gestión de usuarios y restringir botones maestros
    if (isColaborador) {
      // Sidebar Links
      const navUsuarios = document.getElementById('nav-usuarios-gestion');
      const navGenerar = document.getElementById('nav-generar-etiquetas');
      
      // AHORA PERMITIMOS nav-generar-etiquetas para Colaboradores
      if (navGenerar) navGenerar.style.display = 'block'; 
      
      if (navUsuarios) navUsuarios.style.display = 'none';

      // Dashboard Quick Access
      const quickGestion = document.getElementById('quick-gestionar-usuarios');
      if (quickGestion) quickGestion.style.display = 'none';

      // Bloquear acceso por hash solo a gestión de usuarios
      window.addEventListener('hashchange', () => {
         const restrictedHashes = ['#usuarios-gestion'];
         if (restrictedHashes.includes(window.location.hash)) {
            window.location.hash = '#dashboard';
            showToast("Acceso restringido para su nivel de usuario.", "error");
         }
      });

      // Restricciones visuales generales
      document.body.classList.add('role-restricted');
    }
  }
  
  applyRBAC();
  window.applyRBAC = applyRBAC; // Hacerla global

  // 3. Cerrar Sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('usuario');
      window.location.href = "../../index.html";
    });
  }

  // 4. Modo Oscuro (Theme Toggle)
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const applyTheme = (theme) => {
      if (theme === 'dark') {
        document.body.classList.add('modo-oscuro');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        document.body.classList.remove('modo-oscuro');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      }
    };

    // Cargar preferido
    applyTheme(localStorage.getItem('theme') || 'light');

    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('modo-oscuro');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }

  // 5. Menú Móvil (Sidebar Toggle)
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024 && 
          sidebar.classList.contains('active') && 
          !sidebar.contains(e.target) && 
          !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });

    // Cerrar al navegar en móvil
    const menuLinks = document.querySelectorAll('.menu-item');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('active');
        }
      });
    });
  }

  // 6. Lógica de Secciones y Navegación (SPA Reactor)
  const menuItems = document.querySelectorAll('.menu-item');
  const navPills = document.querySelectorAll('.nav-pill');

  const sectionTitles = {
    'dashboard': 'Panel de Administrador',
    'generar-etiquetas': 'Generador de Etiquetas SGA',
    'compatibilidad': 'Matriz de Compatibilidad',
    'etiquetas-lista': 'Consulta de Etiquetas',
    'sds-archivo': 'Archivo de Seguridad FDS',
    'usuarios-gestion': 'Gestión de Personal del Sistema'
  };

  function showSection(sectionId) {
    if (!sectionId) return;
    let id = sectionId.startsWith('#') ? sectionId.slice(1) : sectionId;
    
    // Redirección para compatibilidad con links viejos
    if (id === 'etiquetas') id = 'generar-etiquetas';

    // 1. Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    // 2. Mostrar la sección destino
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      
      // 3. Actualizar título dinámicamente
      const mainTitle = document.getElementById('mainHeaderTitle');
      if (mainTitle && sectionTitles[id]) {
        mainTitle.textContent = sectionTitles[id];
      }

      // 4. Sincronizar estado "active" en todos los menús
      const allLinks = document.querySelectorAll('.menu-item, .nav-pill');
      allLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === '#' + id);
      });

      // 5. Scroll al inicio si es necesario
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;

      // 6. Carga automática de datos especiales
      if ((id === 'dashboard' || id === 'etiquetas-lista') && typeof window.cargarDashboard === 'function') {
        window.cargarDashboard();
      }
    }
  }

  // Hacerla global para otros archivos
  window.showSection = showSection;

  // --- ESCUCHADOR GLOBAL DE NAVEGACIÓN (SPA Core) ---
  window.addEventListener('hashchange', () => {
    const id = window.location.hash || '#dashboard';
    showSection(id);
  });

  const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");

  // Función para cargar estadísticas y actividad del dashboard (HARDENED)
  async function cargarDashboard() {
    try {
      console.log("🔄 [Dashboard] Cargando datos vivos...");
      // 0. Mostrar loader en la tabla de etiquetas si procede
      if (typeof window.renderEtiquetasLoader === 'function') {
         window.renderEtiquetasLoader();
      }

      // 1. Cargar conteo de etiquetas y actividad reciente
      const respEtiquetas = await fetch(`${API_URL}/etiquetas`);
      const dataLabel = await respEtiquetas.json();
      const etiquetas = dataLabel.etiquetas || [];

      // Actualizar stats de etiquetas (Sincronizar IDs)
      const labelStats = [document.getElementById('stat-labels'), document.getElementById('stat-etiquetas')];
      labelStats.forEach(el => { if (el) el.textContent = etiquetas.length; });
      
      // Renderizar tabla global si existe el body
      if (typeof window.renderEtiquetasTable === 'function') {
         window.renderEtiquetasTable(etiquetas);
      }
      
      // Actividad Reciente (Dashboard)
      const recentBody = document.getElementById('recentActivityBody');
      if (recentBody) {
         const recent = etiquetas.slice(0, 5);
         recentBody.innerHTML = recent.length > 0 ? recent.map(et => `
            <tr>
              <td style="font-weight:600;">${et.id_producto || "Etiqueta sin nombre"}</td>
              <td style="color:#64748b;">${new Date(et.createdAt || et.fecha || Date.now()).toLocaleDateString()}</td>
              <td><span class="badge badge-success" style="font-size:10px; padding:2px 8px;">Generada</span></td>
            </tr>
         `).join('') : '<tr><td colspan="3" style="text-align:center; padding:15px;">No hay actividad reciente</td></tr>';
      }

      // 2. Cargar conteo de FDS (Archivo SDS)
      const respFds = await fetch(`${API_URL}/fds/list-files`);
      const dataFds = await respFds.json();
      const files = dataFds.files || [];
      const sdsStats = [document.getElementById('stat-fds'), document.getElementById('stat-sds')];
      sdsStats.forEach(el => { if (el) el.textContent = files.length; });

      // 3. Cargar conteo de Productos
      const respProd = await fetch(`${API_URL}/productos`);
      const dataProd = await respProd.json();
      const prods = dataProd.productos || [];
      const prodStats = [document.getElementById('stat-products'), document.getElementById('stat-productos')];
      prodStats.forEach(el => { if (el) el.textContent = prods.length; });

      // 4. Cargar conteo de Usuarios (Solo si existe el elemento)
      const statUsers = document.getElementById('stat-users');
      if (statUsers) {
         const respUsers = await fetch(`${API_URL}/usuarios`);
         const dataUsers = await respUsers.json();
         statUsers.textContent = (dataUsers.usuarios || []).length;
      }

    } catch (error) {
      console.error("❌ [Dashboard] Error fatal:", error);
    }
  }

  // Hacerla global
  window.cargarDashboard = cargarDashboard;

  // Carga inicial al entrar a la página
  const initialHash = window.location.hash || '#dashboard';
  showSection(initialHash);
});

/**
 * Muestra una notificación premium (Toast)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success' o 'error'
 */
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        // Fallback si el contenedor no existe aún
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span style="flex:1;">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }, 4500);
};
