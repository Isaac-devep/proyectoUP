document.addEventListener('DOMContentLoaded', function() {
    const API_URL = (window.CONFIG ? window.CONFIG.API_BASE_URL : "http://127.0.0.1:8000");
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    const usersTableBody = document.getElementById('usersTableBody');

    let allUsers = [];
    let isEditing = false;
    let currentEditId = null;

    // Función para cargar lista de usuarios
    window.loadUsersList = async function() {
        try {
            const response = await fetch(`${API_URL}/usuarios`);
            const data = await response.json();
            
            if (data.usuarios) {
                allUsers = data.usuarios;
                renderUsersTable(allUsers);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Error de conexión con el servidor</td></tr>';
            }
        }
    };

    function renderUsersTable(usuarios) {
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = usuarios.map(u => {
            const estadoColor = u.estado === 'activo' ? '#22c55e' : '#64748b';
            const rolLabel = u.id_rol === 'Super administrador' ? 'warning' : (u.id_rol === 'Administrador' ? 'primary' : 'outline');

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:var(--primary-light); color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">
                                ${u.nombre.charAt(0)}${u.apellido.charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight:600;">${u.nombre} ${u.apellido}</div>
                                <div style="font-size:11px; color:#64748b;">${u.usu} | ${u.correo}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-${rolLabel}">${u.id_rol}</span>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:5px; font-size:12px; font-weight:500;">
                            <span style="width:8px; height:8px; border-radius:50%; background:${estadoColor};"></span>
                            ${u.estado}
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-outline btn-sm" title="Editar" onclick="window.editUser('${u.id_usuario}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm" style="color:#ef4444; border:1px solid #fee2e2; background:transparent;" title="Desactivar" onclick="window.toggleUserStatus('${u.id_usuario}', '${u.estado}')">
                                <i class="fas fa-power-off"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Manejar envío de formulario (CREAR O EDITAR)
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
                id_rol: document.getElementById('user-rol').value
            };

            const url = isEditing ? `${API_URL}/usuarios/${currentEditId}` : `${API_URL}/usuarios/insertarusuarios`;
            const method = isEditing ? 'PUT' : 'POST';

            try {
                console.log(`🚀 [FetchRequest] ${method} a: ${url}`);
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                const res = await response.json();
                
                if (response.ok) {
                    showToast(isEditing ? "✅ Usuario actualizado" : "✅ Usuario registrado", "success");
                    resetUserForm();
                    loadUsersList();
                } else {
                    console.error("❌ Server Error:", res);
                    showToast("❌ Error: " + (res.error || res.mensaje || "Fallo en el servidor"), "error");
                }
            } catch (error) {
                console.error("🔥 Connection Error:", error);
                showToast("❌ Error de conexión: " + error.message, "error");
            }
        });
    }

    // Cambiar estado (Activar/Desactivar)
    window.toggleUserStatus = async function(id, estadoActual) {
        const nuevoEstado = estadoActual === 'activo' ? 'inactivo' : 'activo';
        if (!confirm(`¿Deseas ${nuevoEstado === 'activo' ? 'activar' : 'desactivar'} a este usuario?`)) return;

        try {
            const response = await fetch(`${API_URL}/usuarios/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (response.ok) {
                showToast(`✅ Usuario ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`, "success");
                loadUsersList();
            }
        } catch (error) {
            showToast("❌ Error al cambiar estado", "error");
        }
    };

    // Función para editar (Cargar datos en el formulario)
    window.editUser = function(id) {
        const user = allUsers.find(u => u.id_usuario === id);
        if (!user) return;

        isEditing = true;
        currentEditId = id;

        // Llenar campos
        document.getElementById('user-id').value = user.id_usuario;
        document.getElementById('user-usu').value = user.usu;
        document.getElementById('user-nombre').value = user.nombre;
        document.getElementById('user-apellido').value = user.apellido;
        document.getElementById('user-correo').value = user.correo;
        document.getElementById('user-contra').value = ""; // No mostrar contra actual
        document.getElementById('user-rol').value = user.id_rol;

        // Cambiar UI
        document.getElementById('userFormTitle').textContent = "Editar Usuario";
        document.getElementById('userFormSubmitText').textContent = "GUARDAR CAMBIOS";
        document.getElementById('userFormSubmitBtn').classList.replace('btn-primary', 'btn-success');
        
        // El ID no debería editarse si es la llave primaria en el backend por ID
        document.getElementById('user-id').disabled = true;

        showToast("✏️ Editando usuario: " + user.usu, "info");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function resetUserForm() {
        if (formNuevoUsuario) formNuevoUsuario.reset();
        isEditing = false;
        currentEditId = null;

        document.getElementById('user-id').disabled = false;
        document.getElementById('userFormTitle').textContent = "Registrar Nuevo Usuario";
        document.getElementById('userFormSubmitText').textContent = "CREAR USUARIO";
        if (document.getElementById('userFormSubmitBtn')) {
            document.getElementById('userFormSubmitBtn').classList.remove('btn-success');
            document.getElementById('userFormSubmitBtn').classList.add('btn-primary');
        }
    }

    // Cargar al iniciar
    loadUsersList();
});
