document.addEventListener("DOMContentLoaded", function () {
    const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    const usersTableBody = document.getElementById('usersTableBody');
    
    let allUsers = [];
    let isEditing = false;
    let currentEditId = null;

    // 1. Cargar Usuarios y Estadísticas
    window.loadUsersList = async function() {
        try {
            // 1. Cargar Usuarios
            const response = await fetch(`${API_URL}/usuarios`);
            const data = await response.json();
            
            if (data.usuarios) {
                allUsers = data.usuarios;
                renderUsersTable(allUsers);
                updateStats(allUsers);
            }

            // 2. Cargar Etiquetas (para el contador)
            const respEtiquetas = await fetch(`${API_URL}/etiquetas`);
            const dataEt = await respEtiquetas.json();
            if (dataEt.etiquetas) {
                const countEl = document.getElementById('stat-labels-count');
                if (countEl) countEl.textContent = dataEt.etiquetas.length.toLocaleString();
            }

            // 3. Cargar Archivos SDS (para el contador)
            const respSds = await fetch(`${API_URL}/fds/list-files`);
            const dataSds = await respSds.json();
            if (dataSds.files) {
                const countSds = document.getElementById('stat-sds-count');
                if (countSds) countSds.textContent = dataSds.files.length.toLocaleString();
            }

        } catch (error) {
            console.error('Error al cargar datos maestro:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;">Error de sincronización</td></tr>';
            }
        }
    };

    function updateStats(usuarios) {
        const total = usuarios.length;
        const activos = usuarios.filter(u => u.estado === 'activo' || u.estado === 'active').length;
        
        document.getElementById("totalUsersCount").textContent = total;
        const tagline = document.getElementById("activeUsersTagline");
        if (tagline) tagline.textContent = `${activos} activos en el sistema`;
    }

    function renderUsersTable(usuarios) {
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = usuarios.map(u => {
            const isActivo = u.estado === 'activo' || u.estado === 'active';
            const estadoColor = isActivo ? '#10b981' : '#ef4444';
            const rolClass = u.id_rol === 'Super administrador' ? 'badge-warning' : (u.id_rol === 'Administrador' ? 'badge-primary' : 'badge-outline');

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div class="user-avatar" style="width:36px; height:36px; font-size:13px; margin-bottom:0; box-shadow:none;">
                                ${u.nombre.charAt(0)}${u.apellido.charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight:700; font-size:14px;">${u.nombre} ${u.apellido}</div>
                                <div style="font-size:11px; color:var(--text-muted);">${u.usu}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${rolClass}">${u.id_rol}</span>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:${estadoColor}; text-transform:uppercase;">
                            <span style="width:8px; height:8px; border-radius:50%; background:${estadoColor}; box-shadow: 0 0 8px ${estadoColor}80;"></span>
                            ${u.estado}
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; gap:8px;">
                            <button class="action-btn" style="width:32px; height:32px; font-size:14px;" title="Editar" onclick="window.editUser('${u.id_usuario}')">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="action-btn" style="width:32px; height:32px; font-size:14px; color:#ef4444;" title="Cambiar Estado" onclick="window.toggleUserStatus('${u.id_usuario}', '${u.estado}')">
                                <i class="fas fa-power-off"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 2. Manejar Formulario (Crear/Editar)
    if (formNuevoUsuario) {
        formNuevoUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                id_usuario: document.getElementById('user-id').value,
                usu: document.getElementById('user-usu').value,
                nombre: document.getElementById('user-nombre').value,
                apellido: document.getElementById('user-apellido').value,
                correo: document.getElementById('user-correo').value,
                contra: document.getElementById('user-contra').value,
                id_rol: document.getElementById('user-rol').value,
                estado: "activo"
            };

            const url = isEditing ? `${API_URL}/usuarios/${currentEditId}` : `${API_URL}/usuarios/insertarusuarios`;
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    showToast(isEditing ? "✨ Perfil actualizado" : "👤 Usuario creado", "success");
                    resetUserForm();
                    loadUsersList();
                } else {
                    const res = await response.json();
                    showToast("❌ Error: " + (res.error || "Fallo en el servidor"), "error");
                }
            } catch (error) {
                showToast("❌ Error de conexión", "error");
            }
        });
    }

    window.editUser = function(id) {
        const user = allUsers.find(u => u.id_usuario === id);
        if (!user) return;

        isEditing = true;
        currentEditId = id;

        document.getElementById('user-id').value = user.id_usuario;
        document.getElementById('user-usu').value = user.usu;
        document.getElementById('user-nombre').value = user.nombre;
        document.getElementById('user-apellido').value = user.apellido;
        document.getElementById('user-correo').value = user.correo;
        document.getElementById('user-contra').value = ""; 
        document.getElementById('user-rol').value = user.id_rol;

        document.getElementById('userFormTitle').textContent = "✏️ Editando: " + user.usu;
        document.getElementById('userFormSubmitText').textContent = "GUARDAR CAMBIOS";
        document.getElementById('userFormSubmitBtn').classList.replace('btn-primary', 'btn-success');
        document.getElementById('btnCancelEdit').style.display = "flex";
        
        document.getElementById('user-id').disabled = true;
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    window.toggleUserStatus = async function(id, estadoActual) {
        const nuevoEstado = (estadoActual === 'activo' || estadoActual === 'active') ? 'inactivo' : 'activo';
        try {
            const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (response.ok) {
                showToast(`✅ Usuario ${nuevoEstado}`, "success");
                loadUsersList();
            }
        } catch (error) {
            showToast("❌ Error de comunicación", "error");
        }
    };

    window.resetUserForm = function() {
        formNuevoUsuario.reset();
        isEditing = false;
        currentEditId = null;
        document.getElementById('user-id').disabled = false;
        document.getElementById('userFormTitle').textContent = "Registrar Nuevo Usuario";
        document.getElementById('userFormSubmitText').textContent = "CREAR USUARIO";
        const btn = document.getElementById('userFormSubmitBtn');
        if (btn) btn.classList.remove('btn-success'), btn.classList.add('btn-primary');
        document.getElementById('btnCancelEdit').style.display = "none";
    };

    window.showToast = function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `stat-card toast toast-${type}`;
        toast.style.cssText = `margin-bottom:10px; padding:15px 25px; min-width:250px; background:var(--card-bg); border-left:4px solid ${type === 'success' ? '#10b981' : '#f59e0b'}; box-shadow:var(--shadow-lg); animation: slideIn 0.3s ease;`;
        toast.innerHTML = `<span style="font-weight:600;">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    loadUsersList();
});
