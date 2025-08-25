document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-servicio');
  const lista = document.getElementById('lista-servicios');
  let cuentasLimite = [];

  cargarClientes();
  cargarEmpleados();
  cargarCuentas();
  cargarServicios();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const empleadosSelect = document.getElementById('empleados');
    const empleadosSeleccionados = Array.from(empleadosSelect.selectedOptions)
      .map(opt => parseInt(opt.value))
      .filter(id => !isNaN(id));

    if (empleadosSeleccionados.length === 0) {
      return alert('Debe seleccionar al menos un empleado.');
    }

    const data = {
      fecha: document.getElementById('fecha').value,
      cliente_id: document.getElementById('cliente_id').value,
      empleados_ids: empleadosSeleccionados,
      detalle: document.getElementById('detalle').value,
      nro_factura: document.getElementById('nro_factura').value,
      cuenta: document.getElementById('cuenta').value,
      metodo_pago: document.getElementById('metodo_pago').value,
      monto_facturado: parseFloat(document.getElementById('monto').value),
      gastos: parseFloat(document.getElementById('gastos').value) || 0,
      gastos_detalle: document.getElementById('gastos_detalle').value || ''
    };

    const editId = form.getAttribute('data-edit-id');
    const url = editId ? `/api/servicios/${editId}` : '/api/servicios';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert(editId ? 'Servicio editado correctamente' : 'Servicio registrado correctamente');
      form.reset();
      form.removeAttribute('data-edit-id');
      cargarServicios();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  });

  async function cargarClientes() {
    const res = await fetch('/api/clientes');
    const clientes = await res.json();

    const select = document.getElementById('cliente_id');
    select.innerHTML = '<option value="">Seleccionar cliente</option>';
    clientes.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.nombre;
      select.appendChild(option);
    });
  }

  async function cargarEmpleados() {
    const res = await fetch('/api/empleados');
    const empleados = await res.json();
    const select = document.getElementById('empleados');
    select.innerHTML = '';

    empleados.forEach(e => {
      const option = document.createElement('option');
      option.value = e.id;
      option.textContent = e.nombre;
      select.appendChild(option);
    });
  }

  async function cargarCuentas() {
    const res = await fetch('/api/cuentas');
    const cuentas = await res.json();
    cuentasLimite = cuentas;

    const cuentaSelect = document.getElementById('cuenta');
    cuentaSelect.innerHTML = '<option value="">Seleccionar cuenta</option>';
    cuentas.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nombre;
      opt.textContent = c.nombre;
      cuentaSelect.appendChild(opt);
    });

    const cuentaEdit = document.getElementById('edit_cuenta');
    if (cuentaEdit) {
      cuentaEdit.innerHTML = '<option value="">Seleccionar cuenta</option>';
      cuentas.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nombre;
        opt.textContent = c.nombre;
        cuentaEdit.appendChild(opt);
      });
    }

    // Listeners de alerta
    cuentaSelect.addEventListener('change', e => verificarLimiteCuenta(e.target.value));
    if (cuentaEdit) {
      cuentaEdit.addEventListener('change', e => verificarLimiteCuenta(e.target.value, true));
    }
  }

  function verificarLimiteCuenta(nombreCuenta, enModal = false) {
    const cuenta = cuentasLimite.find(c => c.nombre === nombreCuenta);
    if (!cuenta) return;

    const porcentaje = (parseFloat(cuenta.total_facturado) / parseFloat(cuenta.limite)) * 100;
    let mensaje = '';

    if (porcentaje >= 100) {
      mensaje = `⚠ La cuenta "${cuenta.nombre}" ya superó su límite de facturación ($${cuenta.limite}).`;
    } else if (porcentaje >= 90) {
      mensaje = `⚠ La cuenta "${cuenta.nombre}" está al ${Math.floor(porcentaje)}% de su límite ($${cuenta.limite}).`;
    } else if (porcentaje >= 75) {
      mensaje = `🟠 Atención: la cuenta "${cuenta.nombre}" lleva el ${Math.floor(porcentaje)}% del total permitido.`;
    }

    if (mensaje) {
      mostrarToast((enModal ? '[EDICIÓN] ' : '') + mensaje, 'warning');
    }
  }

  async function cargarServicios(filtroNombre = '') {
    const res = await fetch('/api/servicios');
    let servicios = await res.json();

    if (filtroNombre) {
      servicios = servicios.filter(s =>
        s.cliente_nombre?.toLowerCase().includes(filtroNombre)
      );
    }

    if (!servicios.length) {
      lista.innerHTML = '<p class="text-muted">No hay servicios registrados aún.</p>';
      return;
    }

    const tabla = `
      <table class="table table-bordered table-hover">
        <thead class="table-primary">
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Empleados</th>
            <th>Detalle</th>
            <th>Factura</th>
            <th>Cuenta</th>
            <th>Método</th>
            <th>Monto</th>
            <th>Ingresos Brutos</th>
            <th>Gastos</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${servicios.map(s => `
            <tr>
              <td>${new Date(s.fecha).toLocaleDateString('es-AR')}</td>
              <td>${s.cliente_nombre}</td>
              <td>${s.empleados_nombres}</td>
              <td>${s.detalle}</td>
              <td>${s.nro_factura}</td>
              <td>
                ${s.cuenta}
                ${(() => {
        const cuenta = cuentasLimite.find(c => c.nombre === s.cuenta);
        if (!cuenta) return '';
        const porcentaje = (cuenta.total_facturado / cuenta.limite) * 100;
        if (porcentaje >= 100) {
          return '<span class="badge bg-danger ms-1">⚠ Límite superado</span>';
        } else if (porcentaje >= 90) {
          return `<span class="badge bg-warning text-dark ms-1">⚠ ${Math.floor(porcentaje)}%</span>`;
        } else if (porcentaje >= 75) {
          return `<span class="badge bg-info text-dark ms-1">🟠 ${Math.floor(porcentaje)}%</span>`;
        }
        return '';
      })()}
              </td>
              <td>${s.metodo_pago}</td>
              <td>$${parseFloat(s.monto_facturado).toFixed(2)}</td>
              <td>$${parseFloat(s.ingresos_brutos).toFixed(2)}</td>
              <td>$${parseFloat(s.total_gastos).toFixed(2)}<br><small>${s.gastos_detalle || 'Sin detalles'}</small></td>
              <td><strong>$${parseFloat(s.total).toFixed(2)}</strong></td>
              <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editarServicio(${s.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="eliminarServicio(${s.id})">Eliminar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    lista.innerHTML = tabla;
  }

  window.eliminarServicio = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    const res = await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Servicio eliminado');
      cargarServicios();
    } else {
      alert('Error al eliminar');
    }
  };
  async function cargarClientesEnEdicion() {
    const res = await fetch('/api/clientes');
    const clientes = await res.json();
    const select = document.getElementById('edit_cliente_id');
    select.innerHTML = '<option value="">Seleccionar cliente</option>';
    clientes.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.nombre;
      select.appendChild(option);
    });
  }

  async function cargarEmpleadosEnEdicion() {
    const res = await fetch('/api/empleados');
    const empleados = await res.json();
    const select = document.getElementById('edit_empleados');
    select.innerHTML = '';
    empleados.forEach(e => {
      const option = document.createElement('option');
      option.value = e.id;
      option.textContent = e.nombre;
      select.appendChild(option);
    });
  }
  window.editarServicio = async (id) => {
    try {
      const res = await fetch(`/api/servicios/${id}`);
      const s = await res.json();

      if (!s) {
        alert('No se encontró el servicio.');
        return;
      }

      // Mostrar modal
      const modal = new bootstrap.Modal(document.getElementById('modalEditarServicio'));

      // Cargar clientes y empleados antes de llenar el modal
      await cargarClientesEnEdicion();
      await cargarEmpleadosEnEdicion();

      // Llenar campos
      document.getElementById('edit_id').value = s.id;
      document.getElementById('edit_fecha').value = s.fecha.split('T')[0];
      document.getElementById('edit_cliente_id').value = s.cliente_id;
      document.getElementById('edit_detalle').value = s.detalle;
      document.getElementById('edit_nro_factura').value = s.nro_factura;
      document.getElementById('edit_cuenta').value = s.cuenta;
      document.getElementById('edit_metodo_pago').value = s.metodo_pago.charAt(0).toUpperCase() + s.metodo_pago.slice(1).toLowerCase();
      document.getElementById('edit_monto').value = s.monto_facturado;

      // Empleados
      const selectEmpleados = document.getElementById('edit_empleados');
      const empleadosIds = typeof s.empleados === 'string' ? JSON.parse(s.empleados) : s.empleados;
      Array.from(selectEmpleados.options).forEach(opt => {
        opt.selected = empleadosIds.includes(parseInt(opt.value));
      });

      // Gastos
      try {
        const gastos = typeof s.gastos === 'string' ? JSON.parse(s.gastos) : s.gastos;
        document.getElementById('edit_gastos').value = gastos[0]?.monto || 0;
        document.getElementById('edit_gastos_detalle').value = gastos[0]?.descripcion || '';
      } catch {
        document.getElementById('edit_gastos').value = 0;
        document.getElementById('edit_gastos_detalle').value = '';
      }

      modal.show();
    } catch (err) {
      alert('Error al cargar datos para edición');
      console.error(err);
    }
  };


  document.getElementById('btnGuardarEdicion').addEventListener('click', async () => {
    const id = document.getElementById('edit_id').value;
    const empleadosSeleccionados = Array.from(document.getElementById('edit_empleados').selectedOptions)
      .map(opt => parseInt(opt.value));


    const data = {
      fecha: document.getElementById('edit_fecha').value,
      cliente_id: document.getElementById('edit_cliente_id').value,
      empleados_ids: empleadosSeleccionados,
      detalle: document.getElementById('edit_detalle').value,
      nro_factura: document.getElementById('edit_nro_factura').value,
      cuenta: document.getElementById('edit_cuenta').value,
      metodo_pago: document.getElementById('edit_metodo_pago').value,
      monto_facturado: parseFloat(document.getElementById('edit_monto').value),
      gastos: parseFloat(document.getElementById('edit_gastos').value) || 0,
      gastos_detalle: document.getElementById('edit_gastos_detalle').value || ''
    };


    const res = await fetch(`/api/servicios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });


    if (res.ok) {
      alert('Servicio actualizado correctamente');
      bootstrap.Modal.getInstance(document.getElementById('modalEditarServicio')).hide();
      cargarServicios();
    } else {
      const err = await res.json();
      alert('Error al actualizar: ' + err.error);
    }
  });
  const buscador = document.getElementById('buscador-cliente');
  buscador.addEventListener('input', () => {
    cargarServicios(buscador.value.trim().toLowerCase());
  });
  function mostrarToast(mensaje, tipo = 'warning') {
    const toast = document.getElementById('toast-alerta');
    const msg = document.getElementById('toast-msg');

    toast.className = `toast align-items-center text-bg-${tipo} border-0`;
    msg.innerText = mensaje;

    const toastBootstrap = new bootstrap.Toast(toast);
    toastBootstrap.show();
  }

});
