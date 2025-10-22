document.addEventListener('DOMContentLoaded', () => {
    // Estado (usa ?fecha=YYYY-MM-DD si viene desde el index)
    const params = new URLSearchParams(location.search);
    const fechaURL = params.get('fecha')?.split('T')[0] || null;
    const initialISO = (fechaURL && /^\d{4}-\d{2}-\d{2}$/.test(fechaURL)) ? fechaURL : toISO(new Date());

    let selectedDate = initialISO;
    let current = isoToLocalDate(initialISO); // evita desfase por timezone

    // DOM
    const calTitle = document.getElementById('calTitle');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const lista = document.getElementById('listaServicios');
    const tituloDia = document.getElementById('tituloDia');
    const resumenDia = document.getElementById('resumenDia');
    const proximosBox = document.getElementById('proximos');
    const btnNuevo = document.getElementById('btnNuevo');

    const modalEl = document.getElementById('modalServicio');
    const modal = new bootstrap.Modal(modalEl);
    const form = document.getElementById('formServicio');

    // Inputs modal
    const agenda_id = document.getElementById('agenda_id');
    const titulo = document.getElementById('titulo');
    const descripcion = document.getElementById('descripcion');
    const ubicacion = document.getElementById('ubicacion');
    const cliente_id = document.getElementById('cliente_id');
    const empleado_id = document.getElementById('empleado_id');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    const estado = document.getElementById('estado');

    // Init
    renderCalendar(current);
    setDay(selectedDate);
    cargarSelects();
    cargarProximos();

    // Navegación calendario
    prevMonth.addEventListener('click', () => {
        current.setMonth(current.getMonth() - 1);
        renderCalendar(current);
    });
    nextMonth.addEventListener('click', () => {
        current.setMonth(current.getMonth() + 1);
        renderCalendar(current);
    });

    btnNuevo.addEventListener('click', () => {
        limpiarForm();
        document.getElementById('modalTitle').innerText = 'Nuevo Servicio';
        fecha.value = selectedDate;
        modal.show();
    });

    document.getElementById('btnGuardar').addEventListener('click', async () => {
        const payload = {
            titulo: titulo.value.trim(),
            descripcion: descripcion.value.trim(),
            ubicacion: ubicacion.value.trim(),
            cliente_id: cliente_id.value || null,
            empleado_id: parseInt(empleado_id.value || 0, 10),
            fecha: fecha.value,
            hora: hora.value,
            estado: estado.value
        };
        if (!payload.titulo || !payload.fecha || !payload.hora || !payload.empleado_id) {
            return alert('Completá título, fecha, hora y empleado.');
        }

        const editId = agenda_id.value;
        const url = editId ? `/api/agenda/${editId}` : '/api/agenda';
        const method = editId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return alert('Error: ' + (err.error || res.statusText));
        }
        modal.hide();
        cargarDelDia(selectedDate);
        cargarProximos();
    });

    // ===== Calendar =====
    function renderCalendar(baseDate) {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const todayISO = toISO(new Date());

        calTitle.innerText = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(baseDate);

        const week = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
        let html = `<div class="d-grid" style="grid-template-columns: repeat(7, 1fr); gap:6px">`;
        html += week.map(d => `<div class="text-center text-muted small">${d}</div>`).join('');

        for (let i = 0; i < first.getDay(); i++) html += `<div></div>`;

        for (let d = 1; d <= last.getDate(); d++) {
            const dateISO = toISO(new Date(year, month, d));
            const active = dateISO === selectedDate ? 'active' : '';
            const isToday = dateISO === todayISO ? 'border border-primary' : '';
            html += `
        <div class="text-center">
          <div class="calendar-day ${active} ${isToday}" data-date="${dateISO}">${d}</div>
        </div>`;
        }
        html += `</div>`;
        calendarGrid.innerHTML = html;

        calendarGrid.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('click', () => {
                calendarGrid.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
                el.classList.add('active');
                setDay(el.dataset.date);
            });
        });
    }

    function setDay(dateISO) {
        selectedDate = dateISO;
        tituloDia.innerText = `Servicios para ${formatSpanishDate(dateISO)}`;
        cargarDelDia(dateISO);
    }

    // ===== Data loads =====
    async function cargarDelDia(dateISO) {
        const res = await fetch(`/api/agenda?fecha=${dateISO}`);
        const items = await res.json();
        resumenDia.innerText = items.length;

        if (!items.length) {
            lista.innerHTML = `<div class="text-muted">No hay servicios programados.</div>`;
            return;
        }

        lista.innerHTML = items.map(cardHTML).join('');
        wireCardActions();
    }

    async function cargarProximos() {
        const res = await fetch('/api/agenda/proximos?dias=7');
        const items = await res.json();

        if (!items.length) {
            proximosBox.innerHTML = `<small class="text-muted">Sin servicios próximos.</small>`;
            return;
        }

        proximosBox.innerHTML = items.map(i => {
            const fechaISO = i.fecha?.split('T')[0] || i.fecha || '';
            const fechaStr = fechaISO ? formatSpanishDate(fechaISO) : '';
            const horaStr = i.hora ? i.hora.slice(0, 5) : '';

            return `
        <div 
          class="d-flex justify-content-between align-items-center py-2 border-bottom pointer"
          style="cursor:pointer"
          data-fecha="${fechaISO}"
          data-id="${i.id}"
        >
          <div>
            <div class="fw-semibold">${escapeHTML(i.titulo || 'Sin título')}</div>
            <small class="text-muted d-block">
              📅 ${fechaStr} — 🕘 ${horaStr}
            </small>
            <small class="text-muted">👷 ${escapeHTML(i.empleado_nombre || '-')}</small>
          </div>
          ${statusBadge(i.estado)}
        </div>`;
        }).join('');

        proximosBox.querySelectorAll('[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const fechaSel = el.dataset.fecha;
                const idSel = el.dataset.id;
                selectedDate = fechaSel;
                renderCalendar(isoToLocalDate(fechaSel));
                setDay(fechaSel);

                setTimeout(() => {
                    const card = document.querySelector(`.dropdown-menu[data-id="${idSel}"]`);
                    if (card) {
                        card.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
                        card.closest('.card').classList.add('border', 'border-primary');
                        setTimeout(() => card.closest('.card').classList.remove('border', 'border-primary'), 2000);
                    }
                }, 500);
            });
        });
    }

    async function cargarSelects() {
        const r1 = await fetch('/api/clientes');
        const clientes = await r1.json();
        cliente_id.innerHTML = `<option value="">Selecciona un cliente</option>` +
            clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

        const r2 = await fetch('/api/empleados');
        const empleados = await r2.json();
        empleado_id.innerHTML = `<option value="">Selecciona un empleado</option>` +
            empleados.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    }

    // ===== Cards =====
    function cardHTML(i) {
        return `
      <div class="card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">${escapeHTML(i.titulo)}</h6>
            <div class="text-muted small mb-2">${escapeHTML(i.descripcion || '')}</div>
            <div class="d-flex flex-wrap gap-3 small text-muted">
              <span><i class="bi bi-geo-alt"></i> ${escapeHTML(i.ubicacion || '-')}</span>
              <span><i class="bi bi-person"></i> ${escapeHTML(i.empleado_nombre || '-')}</span>
              <span><i class="bi bi-clock"></i> ${i.hora?.slice(0, 5) || '-'}</span>
              <span><i class="bi bi-building"></i> ${escapeHTML(i.cliente_nombre || '-')}</span>
            </div>
          </div>
          <div class="d-flex align-items-start gap-2">
            ${statusBadge(i.estado)}
            <div class="dropdown">
              <button class="menu-btn" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
              <ul class="dropdown-menu dropdown-menu-end" data-id="${i.id}">
                <li><button class="dropdown-item act-editar"><i class="bi bi-pencil-square me-1"></i>Editar</button></li>
                <li><hr class="dropdown-divider"></li>
                <li class="px-3 text-muted small">Cambiar Estado</li>
                ${['En Progreso', 'Completado', 'Cancelado', 'Pendiente'].map(st => `
                  <li><button class="dropdown-item act-estado" data-estado="${st}">${st}</button></li>
                `).join('')}
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger act-eliminar"><i class="bi bi-trash3 me-1"></i>Eliminar</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>`;
    }

    function wireCardActions() {
        document.querySelectorAll('.act-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('.dropdown-menu').dataset.id;
                const res = await fetch(`/api/agenda/${id}`);
                const s = await res.json();

                limpiarForm();
                document.getElementById('modalTitle').innerText = 'Editar Servicio';
                agenda_id.value = s.id;
                titulo.value = s.titulo || '';
                descripcion.value = s.descripcion || '';
                ubicacion.value = s.ubicacion || '';
                cliente_id.value = s.cliente_id || '';
                empleado_id.value = s.empleado_id || '';
                fecha.value = s.fecha?.slice(0, 10);
                hora.value = s.hora?.slice(0, 5) || '09:00';
                estado.value = s.estado || 'Pendiente';
                modal.show();
            });
        });

        document.querySelectorAll('.act-estado').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('.dropdown-menu').dataset.id;
                const estado = btn.dataset.estado;
                const res = await fetch(`/api/agenda/${id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado })
                });
                if (!res.ok) return alert('No se pudo actualizar el estado');
                cargarDelDia(selectedDate);
                cargarProximos();
            });
        });

        document.querySelectorAll('.act-eliminar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.closest('.dropdown-menu').dataset.id;
                if (!confirm('¿Eliminar este servicio?')) return;
                const res = await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
                if (!res.ok) return alert('No se pudo eliminar');
                cargarDelDia(selectedDate);
                cargarProximos();
            });
        });
    }

    // ===== Utils =====
    function toISO(d) {
        const z = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
    }

    function isoToLocalDate(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function formatSpanishDate(iso) {
        if (!iso) return '';
        try {
            const [y, m, d] = iso.split('-').map(Number);
            if (!y || !m || !d) return '';
            const date = new Date(y, m - 1, d);
            return new Intl.DateTimeFormat('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch {
            return '';
        }
    }

    function statusBadge(estado) {
        const map = {
            'Pendiente': 'bg-secondary-subtle text-secondary',
            'En Progreso': 'bg-info text-dark',
            'Completado': 'bg-success',
            'Cancelado': 'bg-danger'
        };
        const cls = map[estado] || 'bg-secondary';
        return `<span class="status-badge badge ${cls}">${estado}</span>`;
    }

    function limpiarForm() {
        form.reset();
        agenda_id.value = '';
    }

    function escapeHTML(s = '') {
        return s.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }
});
