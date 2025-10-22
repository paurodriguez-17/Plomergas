function mostrarLoader() {
  const loader = document.getElementById('loader-empleados');
  if (loader) loader.style.display = 'block';
}

function ocultarLoader() {
  const loader = document.getElementById('loader-empleados');
  if (loader) loader.style.display = 'none';
}

async function cargarEmpleados() {
  mostrarLoader();
  const res = await fetch('/api/empleados');
  const empleados = await res.json();
  const lista = document.getElementById('lista-empleados');
  lista.innerHTML = '';

  empleados.forEach(emp => {
    const totalEstimado = emp.trabaja_porcentaje
      ? `$${Number(emp.total_porcentaje || 0).toFixed(2)}`
      : `$${emp.dias_trabajados * emp.sueldo_diario - emp.adelanto_semanal}`;
    lista.innerHTML += `
      <div class="col-md-6">
        <div class="card p-4 shadow-sm border-0 animate__animated animate__fadeIn">
          <h5 class="card-title text-primary">👷 ${emp.nombre}</h5>
          <p class="mb-1 text-muted">📞 ${emp.telefono || 'Sin teléfono'}</p>
          <p class="mb-1">💰 <strong>$${emp.sueldo_diario}</strong> por día</p>
          <p class="mb-1">📅 Días trabajados: <strong>${emp.dias_trabajados}</strong></p>
          <p class="mb-1">💸 Adelantos: <strong>$${emp.adelanto_semanal}</strong></p>
          <p class="mb-2">🧾 A pagar: <span class="badge bg-success">${totalEstimado}</span></p>
          <p class="mb-1">⚖ Tipo: <strong>${emp.trabaja_porcentaje ? 'Porcentaje (50%)' : 'Sueldo diario'}</strong></p>
          ${emp.trabaja_porcentaje ? '<p class="text-warning fw-bold">🧮 Cobra 50% por servicio</p>' : ''}
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-success btn-sm" onclick="registrarAsistencia(${emp.id})">✔ Asistencia</button>
            <button class="btn btn-warning btn-sm" onclick="cargarAdelanto(${emp.id})">➕ Adelanto</button>
            <button class="btn btn-primary btn-sm" onclick="cerrarSemana(${emp.id})">📦 Cerrar semana</button>
            <button class="btn btn-outline-dark btn-sm" onclick="verHistorial(${emp.id})">📚 Ver historial</button>
            <button class="btn btn-outline-primary btn-sm" onclick="editarEmpleado(${emp.id})">✏ Editar</button>
            <button class="btn btn-outline-danger btn-sm" onclick="eliminarEmpleado(${emp.id})">🗑 Eliminar</button>
          </div>
        </div>
      </div>
    `;
  });
  ocultarLoader();
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-empleado');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const sueldo = document.getElementById('sueldo').value;
    const porcentaje = document.getElementById('porcentaje').checked;
    const res = await fetch('/api/empleados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        telefono,
        sueldo_diario: sueldo,
        trabaja_porcentaje: porcentaje
      })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Empleado registrado con éxito');
      form.reset();
      cargarEmpleados();
    } else {
      alert('Error: ' + data.error);
    }
  });

  cargarEmpleados();
});

window.registrarAsistencia = async function (id) {
  const res = await fetch(`/api/empleados/${id}/asistencia`, { method: 'PUT' });
  const json = await res.json();
  alert(json.message);
  cargarEmpleados();
};

window.cargarAdelanto = async function (id) {
  const monto = prompt('Ingresá el monto del adelanto:');
  if (!monto || isNaN(monto)) return alert('Monto inválido');

  const res = await fetch(`/api/empleados/${id}/adelanto`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monto })
  });

  const json = await res.json();
  alert(json.message);
  cargarEmpleados();
};

window.cerrarSemana = async function (id) {
  if (!confirm('¿Confirmás cerrar la semana de este empleado?')) return;

  const res = await fetch(`/api/empleados/${id}/cierre`, { method: 'POST' });
  const json = await res.json();

  if (res.ok) {
    alert(`Semana cerrada. Total pagado: $${json.total_pagado}`);
  } else {
    alert('Error al cerrar la semana: ' + json.error);
  }

  cargarEmpleados();
};

window.verHistorial = async function (id) {
  const res = await fetch('/api/empleados');
  const empleados = await res.json();
  const emp = empleados.find(e => e.id === id);

  if (!emp || !emp.historial) return alert('No hay historial disponible.');

  let historial = [];
  try {
    historial = JSON.parse(emp.historial);
  } catch (err) {
    return alert('Historial dañado.');
  }

  if (!historial.length) return alert('Este empleado aún no tiene semanas cerradas.');

  historial.sort((a, b) => {
    const fechaA = new Date(a.semana.split(' al ')[0].split('/').reverse().join('-'));
    const fechaB = new Date(b.semana.split(' al ')[0].split('/').reverse().join('-'));
    return fechaB - fechaA;
  });

  const html = historial.map(item => `
    <div class="border rounded p-3 mb-2 shadow-sm bg-light animate__animated animate__fadeInUp">
      <strong>Semana:</strong> ${item.semana}<br>
      <strong>Días:</strong> ${item.dias}<br>
      <strong>Adelantos:</strong> $${Number(item.adelantos || 0).toFixed(2)}<br>
      <strong>Total:</strong> <span class="text-success fw-bold">$${Number(item.total_pagado || 0).toFixed(2)}</span>
    </div>
  `).join('');

  const modalContent = `
    <div class="modal fade" id="historialModal" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Historial de ${emp.nombre}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            ${html}
          </div>
        </div>
      </div>
    </div>
  `;

  const contenedor = document.createElement('div');
  contenedor.innerHTML = modalContent;
  document.body.appendChild(contenedor);

  const modal = new bootstrap.Modal(document.getElementById('historialModal'));
  modal.show();

  document.getElementById('historialModal').addEventListener('hidden.bs.modal', () => {
    contenedor.remove();
  });
};
window.editarEmpleado = async function (id) {
  const res = await fetch(`/api/empleados`);
  const empleados = await res.json();
  const emp = empleados.find(e => e.id === id);

  if (!emp) return alert('Empleado no encontrado');

  document.getElementById('edit_empleado_id').value = emp.id;
  document.getElementById('edit_nombre').value = emp.nombre;
  document.getElementById('edit_telefono').value = emp.telefono;
  document.getElementById('edit_sueldo').value = emp.sueldo_diario;

  const modal = new bootstrap.Modal(document.getElementById('modalEditarEmpleado'));
  modal.show();
};

document.getElementById('btnGuardarEdicionEmpleado').addEventListener('click', async () => {
  const id = document.getElementById('edit_empleado_id').value;
  const nombre = document.getElementById('edit_nombre').value;
  const telefono = document.getElementById('edit_telefono').value;
  const sueldo_diario = document.getElementById('edit_sueldo').value;
  const trabaja_porcentaje = document.getElementById('edit_porcentaje').checked;

  const res = await fetch(`/api/empleados/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, telefono, sueldo_diario, trabaja_porcentaje })
  });

  const data = await res.json();
  if (res.ok) {
    alert('Empleado actualizado correctamente');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarEmpleado')).hide();
    cargarEmpleados();
  } else {
    alert('Error: ' + data.error);
  }
});
window.eliminarEmpleado = async function (id) {
  if (!confirm('¿Eliminar este empleado?')) return;
  const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (res.ok) {
    alert(data.message);
    cargarEmpleados();
  } else {
    alert('Error: ' + data.error);
  }
};
