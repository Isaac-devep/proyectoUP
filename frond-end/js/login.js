document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.querySelector(".Formulario form");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.querySelector(".contraseña input").value;

      fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usu: username,
          contra: password,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.login && data.usuario) {
            localStorage.setItem("usuario", JSON.stringify(data.usuario));
            localStorage.setItem("rol", data.usuario.id_rol);

            switch (data.usuario.rol) {
              case "Super administrador":
                window.location.href = "/frond-end/html/super/superadmin.html";
                break;
              case "Administrador":
                window.location.href = "/frond-end/html/admin/admin.html";
                break;
              case "Empleado":
                window.location.href =
                  "/frond-end/html/empleados/empleado.html";
                break;
              default:
                showToast("Rol no reconocido: " + data.usuario.id_rol, "error");
                break;
            }
          } else {
            showToast(data.error || "Usuario o contraseña incorrectos", "error");
          }
        })
        .catch((err) => {
          console.log("Error: ", err);
          showToast("Error al iniciar sesión: " + err.message, "error");
        });
    });
  }

  function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return alert(msg);
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 400); }, 3000);
  }

  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="password"]'
  );
  inputs.forEach((input) => {
    input.addEventListener("focus", function () {
      if (this.nextElementSibling) {
        this.nextElementSibling.classList.add("active");
      }
    });

    input.addEventListener("blur", function () {
      if (this.value === "" && this.nextElementSibling) {
        this.nextElementSibling.classList.remove("active");
      }
    });
  });
});
