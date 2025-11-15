const token = localStorage.getItem("token");
const rol = localStorage.getItem("rol");

if (!token || rol !== "administrador") {
  window.location.href = "/login";
}

document.addEventListener("DOMContentLoaded", cargarPendientes);

async function cargarPendientes() {
  const res = await fetch("/api/auth/pendientes", {
    headers: { "Authorization": "Bearer " + token }
  });

  const lista = document.getElementById("listaPendientes");
  const data = await res.json();

  if (!data.length) {
    lista.innerHTML = `<div class="text-muted">No hay usuarios pendientes.</div>`;
    return;
  }

  lista.innerHTML = data.map(u => `
    <div class="card p-3 mb-3 shadow-sm">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">${u.nombre}</h6>
          <small class="text-muted">${u.email}</small>
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" onclick="aprobar(${u.id})">
            Aprobar
          </button>
          <button class="btn btn-danger btn-sm" onclick="eliminar(${u.id})">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

async function aprobar(id) {
  if (!confirm("¿Aprobar este usuario?")) return;

  const res = await fetch(`/api/auth/aprobar/${id}`, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token }
  });

  await res.json();
  cargarPendientes();
}

async function eliminar(id) {
  if (!confirm("¿Eliminar usuario?")) return;

  const res = await fetch(`/api/auth/${id}`, {
    method: "DELETE",
    headers: { "Authorization": "Bearer " + token }
  });

  await res.json();
  cargarPendientes();
}
