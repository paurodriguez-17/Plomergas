document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-cuenta');
  const lista = document.getElementById('lista-cuentas');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      nombre: document.getElementById('nombre_cuenta').value,
      limite: parseFloat(document.getElementById('limite').value),
      cuit: document.getElementById('cuit').value,
      clave_fiscal: document.getElementById('clave_fiscal').value
    };

    const res = await fetch('/api/cuentas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Cuenta registrada');
      form.reset();
      cargarCuentas();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  });

  async function cargarCuentas() {
    const res = await fetch('/api/cuentas');
    const cuentas = await res.json();

    const tabla = `
      <table class="table table-bordered table-hover">
        <thead class="table-secondary">
  <tr>
    <th>Cuenta</th>
    <th>CUIT</th>
    <th>Clave Fiscal</th>
    <th>Límite</th>
    <th>Facturado</th>
    <th>Usado</th>
    <th>Acciones</th>
  </tr>
        </thead>
        <tbody>
          ${cuentas.map(c => {
      const porcentaje = (c.total_facturado / c.limite * 100).toFixed(1);
      const alertClass = porcentaje >= 100 ? 'bg-danger' : porcentaje >= 80 ? 'bg-warning' : 'bg-success';
      return `
  <tr>
    <td>${c.nombre}</td>
    <td>${c.cuit || '-'}</td>
    <td>${c.clave_fiscal || '-'}</td>
    <td>$${parseFloat(c.limite).toFixed(2)}</td>
    <td>$${parseFloat(c.total_facturado).toFixed(2)}</td>
    <td>
      <div class="progress">
        <div class="progress-bar ${alertClass}" role="progressbar" style="width: ${porcentaje}%">
          ${porcentaje}%
        </div>
      </div>
    </td>
    <td>
      <button class="btn btn-sm btn-warning me-1" onclick="editarCuenta(${c.id}, '${c.nombre}', ${c.limite}, '${c.cuit || ''}', '${c.clave_fiscal || ''}')">Editar</button>
      <button class="btn btn-sm btn-danger" onclick="eliminarCuenta(${c.id})">Eliminar</button>
    </td>
  </tr>
`;
    }).join('')}
        </tbody>
      </table>
    `;

    lista.innerHTML = tabla;
  }

  cargarCuentas();

  window.editarCuenta = (id, nombre, limite, cuit = '', clave_fiscal = '') => {
    const modalHTML = `
    <div class="modal fade" id="modalEditarCuenta" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Cuenta</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="form-editar-cuenta">
              <input type="hidden" id="edit_id_cuenta" value="${id}" />
              <div class="mb-3">
                <label>Nombre</label>
                <input type="text" id="edit_nombre_cuenta" class="form-control" value="${nombre}" required />
              </div>
              <div class="mb-3">
                <label>Límite</label>
                <input type="number" id="edit_limite" class="form-control" value="${limite}" required />
              </div>
              <div class="mb-3">
                <label>CUIT</label>
                <input type="text" id="edit_cuit" class="form-control" value="${cuit}" />
              </div>
              <div class="mb-3">
                <label>Clave fiscal</label>
                <input type="text" id="edit_clave_fiscal" class="form-control" value="${clave_fiscal}" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary" onclick="guardarEdicionCuenta()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

    const contenedor = document.createElement('div');
    contenedor.innerHTML = modalHTML;
    document.body.appendChild(contenedor);

    const modal = new bootstrap.Modal(document.getElementById('modalEditarCuenta'));
    modal.show();

    document.getElementById('modalEditarCuenta').addEventListener('hidden.bs.modal', () => {
      contenedor.remove();
    });
  };

  window.guardarEdicionCuenta = async () => {
    const id = document.getElementById('edit_id_cuenta').value;
    const nombre = document.getElementById('edit_nombre_cuenta').value;
    const limite = parseFloat(document.getElementById('edit_limite').value);

    const res = await fetch(`/api/cuentas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        limite,
        cuit: document.getElementById('edit_cuit').value,
        clave_fiscal: document.getElementById('edit_clave_fiscal').value
      })

    });

    if (res.ok) {
      alert('Cuenta actualizada');
      bootstrap.Modal.getInstance(document.getElementById('modalEditarCuenta')).hide();
      cargarCuentas();
    } else {
      const err = await res.json();
      alert('Error al actualizar: ' + err.error);
    }
  };

  window.eliminarCuenta = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;

    const res = await fetch(`/api/cuentas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Cuenta eliminada');
      cargarCuentas();
    } else {
      const err = await res.json();
      alert('Error al eliminar: ' + err.error);
    }
  };
});
