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
    const isEmployee = role.toLowerCase() === 'empleado';
    
    console.log(`🛡️ [RBAC] Aplicando restricciones para rol: ${role}`);

    // Si es empleado, ocultar elementos de gestión
    if (isEmployee) {
      // Sidebar Links
      const navGenerar = document.getElementById('nav-generar-etiquetas');
      const navUsuarios = document.getElementById('nav-usuarios-gestion');
      if (navGenerar) navGenerar.style.display = 'none';
      if (navUsuarios) {
         navUsuarios.style.display = 'none';
         // También ocultar el título de la categoría si es posible
         const parentCat = navUsuarios.closest('.menu-category');
         if (parentCat) {
            // Si solo queda ese link o queremos ocultar la categoría "CONSULTAS" (o parte de ella)
            // Por ahora solo ocultamos el link específico.
         }
      }

      // Dashboard Quick Access
      const quickNueva = document.getElementById('quick-nueva-etiqueta');
      const quickGestion = document.getElementById('quick-gestionar-usuarios');
      if (quickNueva) quickNueva.style.display = 'none';
      if (quickGestion) quickGestion.style.display = 'none';

      // Bloquear acceso por hash si intenta navegar manualmente
      window.addEventListener('hashchange', () => {
         const restrictedHashes = ['#generar-etiquetas', '#usuarios-gestion'];
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

  // 6. Lógica de Secciones y Navegación
  const menuItems = document.querySelectorAll('.menu-item');
  const sections = document.querySelectorAll('.content-section');

  const sectionTitles = {
    'dashboard': 'Panel de Administrador',
    'generar-etiquetas': 'Generador de Etiquetas SGA',
    'compatibilidad': 'Matriz de Compatibilidad',
    'etiquetas-lista': 'Consulta de Etiquetas',
    'sds-archivo': 'Archivo de Seguridad SDS',
    'usuarios-gestion': 'Gestión de Personal del Sistema'
  };

  function showSection(sectionId) {
    let id = sectionId.startsWith('#') ? sectionId.slice(1) : sectionId;
    
    // Redirección para compatibilidad con links viejos
    if (id === 'etiquetas') id = 'generar-etiquetas';

    // LIMPIEZA TOTAL (Asegurarse de ocultar todos los que tengan la clase)
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      
      // Actualizar hash de la URL sin recargar para sincronía
      if (window.location.hash !== '#' + id) {
        history.pushState(null, null, '#' + id);
      }
      
      // Actualizar título dinámicamente
      const mainTitle = document.getElementById('mainHeaderTitle');
      if (mainTitle && sectionTitles[id]) {
        mainTitle.textContent = sectionTitles[id];
      }

      // Sincronizar el menú lateral (hacerlo "active")
      menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === '#' + id) {
          menuItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    }
  }

  // Hacerla global para otros archivos
  window.showSection = showSection;

  // Carga inicial
  if (window.location.hash) {
    showSection(window.location.hash);
    menuItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('href') === window.location.hash);
    });
  } else {
    showSection('dashboard');
  }

  const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");

  // Función para cargar estadísticas y actividad del dashboard
  async function cargarDashboard() {
    try {
      // 1. Cargar conteo de etiquetas y actividad reciente
      const respEtiquetas = await fetch(`${API_URL}/etiquetas`);
      const dataLabel = await respEtiquetas.json();
      if (dataLabel.etiquetas) {
         document.getElementById('stat-labels').textContent = dataLabel.etiquetas.length;
         
         // Renderizar actividad reciente (últimas 5)
         const recent = dataLabel.etiquetas.slice(0, 5);
         const recentBody = document.getElementById('recentActivityBody');
         if (recentBody) {
            recentBody.innerHTML = recent.length > 0 ? recent.map(et => `
               <tr>
                 <td style="font-weight:600;">${et.id_producto || "Etiqueta sin nombre"}</td>
                 <td style="color:#64748b;">${new Date(et.createdAt || et.fecha || Date.now()).toLocaleDateString()}</td>
                 <td><span class="badge badge-success" style="font-size:10px; padding:2px 8px;">Generada</span></td>
               </tr>
            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:15px;">No hay actividad reciente</td></tr>';
         }
      }

      // 2. Cargar conteo de FDS (Archivo SDS)
      const respFds = await fetch(`${API_URL}/fds/list-files`);
      const dataFds = await respFds.json();
      if (dataFds.files) {
         document.getElementById('stat-fds').textContent = dataFds.files.length;
      }

      // 3. Cargar conteo de Productos
      const respProd = await fetch(`${API_URL}/productos`);
      const dataProd = await respProd.json();
      if (dataProd.productos) {
         document.getElementById('stat-products').textContent = dataProd.productos.length;
      }

      // 4. Cargar conteo de Usuarios
      const respUsers = await fetch(`${API_URL}/usuarios`);
      const dataUsers = await respUsers.json();
      if (dataUsers.usuarios) {
         document.getElementById('stat-users').textContent = dataUsers.usuarios.length;
      }

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }
  }

  // Hacerla global
  window.cargarDashboard = cargarDashboard;

  // Eventos de clic en menú
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        menuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        showSection(href);
        
        // Recargar datos si es el dashboard
        if (href === '#dashboard') cargarDashboard();
      }
    });
  });

  // Carga inicial
  if (window.location.hash) {
    showSection(window.location.hash);
    if (window.location.hash === '#dashboard') cargarDashboard();
  } else {
    showSection('dashboard');
    cargarDashboard();
  }
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
