document.addEventListener('DOMContentLoaded', function() {
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    const usersTableBody = document.getElementById('usersTableBody');

    // Función para cargar lista de usuarios
    window.loadUsersList = async function() {
        try {
            const response = await fetch('http://127.0.0.1:8000/usuarios');
            const data = await response.json();
            
            if (data.usuarios) {
                renderUsersTable(data.usuarios);
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

    // Manejar envío de formulario
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

            try {
                const response = await fetch('http://127.0.0.1:8000/usuarios/insertarusuarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                const res = await response.json();
                
                if (response.ok) {
                    showToast("✅ Usuario registrado con éxito", "success");
                    formNuevoUsuario.reset();
                    loadUsersList();
                } else {
                    showToast("❌ Error: " + res.error, "error");
                }
            } catch (error) {
                showToast("❌ Error de conexión", "error");
            }
        });
    }

    // Cargar al iniciar
    loadUsersList();
});
