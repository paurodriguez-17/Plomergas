const contenedorClientes = document.getElementById('tabla-clientes');
const formNuevo = document.getElementById('form-cliente');
const selectClientes = document.getElementById('cliente_id');
const formPresupuesto = document.getElementById('form-presupuesto');
const modalEditar = document.getElementById('modalEditar');

document.addEventListener('DOMContentLoaded', () => {
  formNuevo.addEventListener('submit', onAddCliente);
  formPresupuesto.addEventListener('submit', onAddPresupuesto);
  cargarClientes();
  cargarClientesEnSelect();
});

// 📌 Agregar nuevo cliente
async function onAddCliente(e) {
  e.preventDefault();

  const data = {
    nombre: document.getElementById('nombre').value,
    direccion: document.getElementById('direccion').value,
    tipo: document.getElementById('tipo').value,
    cuit: document.getElementById('cuit').value,
    mail: document.getElementById('mail').value,
    telefono: document.getElementById('telefono').value
  };

  const res = await fetch('/api/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  if (json.id) {
    alert('Cliente guardado con éxito');
    formNuevo.reset();
    cargarClientes();
    cargarClientesEnSelect();
  } else {
    alert('Error: ' + json.error);
  }
}

// 📥 Cargar clientes en el select
async function cargarClientesEnSelect() {
  const res = await fetch('/api/clientes');
  const clientes = await res.json();
  selectClientes.innerHTML = '<option value="">Seleccionar cliente</option>';
  clientes.forEach(c => {
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.nombre} (${c.tipo})`;
    selectClientes.appendChild(option);
  });
}

let clientesData = [];

async function cargarClientes() {
  const res = await fetch('/api/clientes');
  clientesData = await res.json();
  renderClientes(clientesData);
}
function renderClientes(lista) {
  contenedorClientes.innerHTML = '';

  if (!lista.length) {
    contenedorClientes.innerHTML = '<p class="text-muted">No se encontraron clientes.</p>';
    return;
  }

  lista.forEach(c => {
    contenedorClientes.innerHTML += `
      <div class="fila-cliente">
        <div class="datos">
          <div><strong>Nombre:</strong> ${c.nombre}</div>
          <div><strong>Dirección:</strong> ${c.direccion}</div>
          <div><strong>Tipo:</strong> ${c.tipo}</div>
          <div><strong>CUIT:</strong> ${c.cuit}</div>
          <div><strong>Mail:</strong> ${c.mail}</div>
          <div><strong>Teléfono:</strong> ${c.telefono || '-'}</div>
        </div>

        <div class="acciones">
          <div class="mb-2">
            <input type="file" id="factura-${c.id}" accept="application/pdf">
            <button class="btn btn-sm btn-primary" onclick="subirArchivo(${c.id}, 'factura')">Subir Factura</button>
          </div>
          <div class="mb-2">
            <input type="file" id="conforme-${c.id}" accept="application/pdf">
            <button class="btn btn-sm btn-secondary" onclick="subirArchivo(${c.id}, 'conforme')">Subir Conforme</button>
          </div>

          <div class="botones">
            <button class="btn btn-outline-success btn-sm" onclick="verArchivos(${c.id}, 'facturas')">📄 Ver Facturas</button>
            <button class="btn btn-outline-info btn-sm" onclick="verArchivos(${c.id}, 'conformes')">✅ Ver Conformes</button>
            <button class="btn btn-outline-warning btn-sm" onclick="verPresupuestos(${c.id}, '${c.nombre}')">📋 Ver Presupuestos</button>
            <button class="btn btn-warning btn-sm" onclick="abrirModalEditar(${c.id})">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${c.id})">🗑️ Eliminar</button>
          </div>
        </div>
      </div>
    `;
  });
}
document.getElementById('buscador-clientes').addEventListener('input', (e) => {
  const filtro = e.target.value.toLowerCase();
  const filtrados = clientesData.filter(c =>
    c.nombre.toLowerCase().includes(filtro)
  );
  renderClientes(filtrados);
});


// 📄 Ver archivos (facturas o conformes)
async function verArchivos(idCliente, tipo) {
  const res = await fetch(`/api/clientes/${idCliente}/${tipo}`);
  const archivos = await res.json();

  if (!archivos.length) {
    alert(`No hay ${tipo} para este cliente.`);
    return;
  }

  const lista = archivos.map(a => {
    const ruta = `/uploads/${tipo}/${a.ruta_archivo}`;
    return `<li><a href="${ruta}" target="_blank">${a.nombre_archivo}</a></li>`;
  }).join('');

  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <html>
      <head><title>${tipo} del Cliente</title></head>
      <body>
        <h2>${tipo.charAt(0).toUpperCase() + tipo.slice(1)} del Cliente</h2>
        <ul>${lista}</ul>
      </body>
    </html>
  `);
  ventana.document.close();
}

// 📋 Ver presupuestos anteriores
async function verPresupuestos(idCliente, nombre) {
  const res = await fetch(`/api/presupuestos/${idCliente}`);
  const presupuestos = await res.json();

  if (!presupuestos.length) {
    alert(`No hay presupuestos para ${nombre}.`);
    return;
  }

  const lista = presupuestos.map(p => {
    const ruta = p.nombre_archivo
      ? `/api/presupuestos/descargar/${p.nombre_archivo}`
      : '#';

    return `
  <li>
    <strong>N°:</strong> ${p.numero || '-'}<br>
    <strong>Fecha:</strong> ${new Date(p.fecha).toLocaleDateString('es-AR')}<br>
    <strong>Detalle:</strong> ${p.detalle}<br>
    <strong>Monto total:</strong> $${p.precio}<br>
    ${p.nombre_archivo ? `<a href="${ruta}" target="_blank">⬇️ Descargar PDF</a>` : '<em>PDF no disponible</em>'}
  </li><hr>
`;
  }).join('');
  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <html>
      <head><title>Presupuestos de ${nombre}</title></head>
      <body>
        <h2>Presupuestos de ${nombre}</h2>
        <ul>${lista}</ul>
      </body>
    </html>
  `);
  ventana.document.close();
}
// ✅ Mostrar confirmación visual al crear presupuesto
async function onAddPresupuesto(e) {
  e.preventDefault();

  const cliente_id = document.getElementById('cliente_id').value;
  const detalle = document.getElementById('detalle').value;
  const duracion = document.getElementById('duracion').value;
  const nota = document.getElementById('nota').value;
  const precios = document.getElementById('precios').value;
  const forma_pago = document.getElementById('forma_pago').value;
  const firmantes = document.getElementById('firmantes').value;

  if (!cliente_id || !detalle || !precios || !duracion) {
    return alert('Completá todos los campos obligatorios.');
  }

  const response = await fetch('/api/presupuestos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente_id, detalle, precios, duracion, nota, forma_pago, firmantes })
  });

  if (!response.ok) {
    const error = await response.json();
    alert('Error: ' + error.error);
    return;
  }

  // Descargar el PDF generado automáticamente
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `presupuesto_${cliente_id}.pdf`;
  a.click();
  formPresupuesto.reset();

  alert('✅ Presupuesto generado correctamente.');
}

// ✏️ Abrir modal de edición
async function abrirModalEditar(id) {
  const res = await fetch(`/api/clientes`);
  const clientes = await res.json();
  const cliente = clientes.find(c => c.id === id);

  document.getElementById('edit-id').value = cliente.id;
  document.getElementById('edit-nombre').value = cliente.nombre;
  document.getElementById('edit-direccion').value = cliente.direccion;
  document.getElementById('edit-tipo').value = cliente.tipo;
  document.getElementById('edit-cuit').value = cliente.cuit;
  document.getElementById('edit-mail').value = cliente.mail;
  document.getElementById('edit-telefono').value = cliente.telefono || '';

  const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
  modal.show();
}

// 💾 Guardar edición de cliente
document.getElementById('form-editar').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const data = {
    nombre: document.getElementById('edit-nombre').value,
    direccion: document.getElementById('edit-direccion').value,
    tipo: document.getElementById('edit-tipo').value,
    cuit: document.getElementById('edit-cuit').value,
    mail: document.getElementById('edit-mail').value,
    telefono: document.getElementById('edit-telefono').value
  };

  const res = await fetch(`/api/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    alert('Cliente actualizado correctamente');
    bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
    cargarClientes();
    cargarClientesEnSelect();
  } else {
    const error = await res.json();
    alert('Error: ' + error.error);
  }
});

// 🗑️ Eliminar cliente
async function eliminarCliente(id) {
  if (!confirm('¿Estás segura de que querés eliminar este cliente?')) return;

  const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
  const json = await res.json();

  if (res.ok) {
    alert('Cliente eliminado correctamente');
    cargarClientes();
    cargarClientesEnSelect();
  } else {
    alert('Error: ' + json.error);
  }
}
async function subirArchivo(idCliente, tipo) {
  const input = document.getElementById(`${tipo}-${idCliente}`);
  const archivo = input.files[0];

  if (!archivo || archivo.type !== 'application/pdf') {
    alert('Por favor seleccioná un archivo PDF válido.');
    return;
  }

  const formData = new FormData();
  formData.append('archivo', archivo);

  const res = await fetch(`/api/clientes/${idCliente}/${tipo}`, {
    method: 'POST',
    body: formData
  });

  const result = await res.json();
  if (res.ok) {
    alert(result.message);
    input.value = ''; // limpiar input
  } else {
    alert('Error: ' + result.error);
  }
}
