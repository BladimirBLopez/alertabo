/**
 * dashboard.js
 * Lógica del panel: verifica sesión, carga estadísticas y reportes,
 * y ejecuta las acciones de moderación (aprobar/rechazar/eliminar/editar).
 */
(function () {
  const listaAdmin = document.getElementById('listaAdmin');
  const tarjetasStats = document.getElementById('tarjetasStats');
  const filtroEstado = document.getElementById('filtroEstado');
  const filtroBusqueda = document.getElementById('filtroBusqueda');
  const botonLogout = document.getElementById('botonLogout');

  const modalEditar = document.getElementById('modalEditar');
  const editarId = document.getElementById('editarId');
  const editarNombreNegocio = document.getElementById('editarNombreNegocio');
  const editarCiudad = document.getElementById('editarCiudad');
  const editarMotivo = document.getElementById('editarMotivo');
  const editarDescripcion = document.getElementById('editarDescripcion');

  const ETIQUETAS_ESTADO = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };

  async function verificarSesion() {
    const respuesta = await fetch('/api/admin/verificar');
    const datos = await respuesta.json();
    if (!datos.autenticado) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  async function cargarEstadisticas() {
    const respuesta = await fetch('/api/admin/estadisticas');
    if (!respuesta.ok) return;
    const datos = await respuesta.json();

    const tarjetas = tarjetasStats.querySelectorAll('.tarjeta-stat__valor');
    tarjetas[0].textContent = datos.total;
    tarjetas[1].textContent = datos.pendientes;
    tarjetas[2].textContent = datos.aprobados;
    tarjetas[3].textContent = datos.rechazados;
  }

  async function cargarReportes() {
    listaAdmin.innerHTML = '<div class="estado-vacio-admin">Cargando reportes…</div>';

    const params = new URLSearchParams();
    if (filtroEstado.value) params.set('estado', filtroEstado.value);
    if (filtroBusqueda.value.trim()) params.set('busqueda', filtroBusqueda.value.trim());

    try {
      const respuesta = await fetch(`/api/admin/reportes?${params.toString()}`);
      if (respuesta.status === 401) { window.location.href = 'index.html'; return; }
      const datos = await respuesta.json();

      if (!datos.reportes || datos.reportes.length === 0) {
        listaAdmin.innerHTML = '<div class="estado-vacio-admin">No hay reportes con estos filtros.</div>';
        return;
      }

      listaAdmin.innerHTML = datos.reportes.map(renderizarReporte).join('');
      adjuntarEventosAcciones();
    } catch (error) {
      listaAdmin.innerHTML = '<div class="estado-vacio-admin">Error al cargar reportes.</div>';
    }
  }

  function renderizarReporte(r) {
    const fecha = new Date(r.creado_en).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
    const contacto = r.whatsapp || r.facebook_url || '—';

    return `
      <div class="reporte-admin" data-id="${r.id}">
        <div class="reporte-admin__cabecera">
          <div>
            <div class="reporte-admin__titulo">${escapar(r.nombre_negocio || 'Sin nombre')} — ${escapar(contacto)}</div>
            <div class="reporte-admin__meta">${escapar(r.ciudad)} · ${fecha} · ${escapar(r.motivo || 'Sin motivo')}</div>
          </div>
          <span class="badge-estado badge-estado--${r.estado}">${ETIQUETAS_ESTADO[r.estado]}</span>
        </div>
        <p class="reporte-admin__descripcion">${escapar(r.descripcion)}</p>
        <div class="reporte-admin__acciones">
          ${r.estado !== 'aprobado' ? `<button class="boton-mini boton-mini--aprobar" data-accion="aprobar" data-id="${r.id}">Aprobar</button>` : ''}
          ${r.estado !== 'rechazado' ? `<button class="boton-mini boton-mini--rechazar" data-accion="rechazar" data-id="${r.id}">Rechazar</button>` : ''}
          <button class="boton-mini" data-accion="editar" data-id="${r.id}"
            data-nombre="${escapar(r.nombre_negocio || '')}" data-ciudad="${escapar(r.ciudad || '')}"
            data-motivo="${escapar(r.motivo || '')}" data-descripcion="${escapar(r.descripcion || '')}">Editar</button>
          <button class="boton-mini boton-mini--eliminar" data-accion="eliminar" data-id="${r.id}">Eliminar</button>
        </div>
      </div>
    `;
  }

  function escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML;
  }

  function adjuntarEventosAcciones() {
    listaAdmin.querySelectorAll('[data-accion]').forEach((boton) => {
      boton.addEventListener('click', () => manejarAccion(boton));
    });
  }

  async function manejarAccion(boton) {
    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    if (accion === 'editar') {
      editarId.value = id;
      editarNombreNegocio.value = boton.dataset.nombre;
      editarCiudad.value = boton.dataset.ciudad;
      editarMotivo.value = boton.dataset.motivo;
      editarDescripcion.value = boton.dataset.descripcion;
      modalEditar.classList.add('visible');
      return;
    }

    if (accion === 'eliminar') {
      if (!confirm('¿Eliminar este reporte permanentemente? Esta acción no se puede deshacer.')) return;
      await enviarAccion(id, 'eliminar');
      return;
    }

    if (accion === 'rechazar') {
      const motivo = prompt('Motivo del rechazo (opcional):') || '';
      await enviarAccion(id, 'rechazar', { motivo_rechazo: motivo });
      return;
    }

    if (accion === 'aprobar') {
      await enviarAccion(id, 'aprobar');
      return;
    }
  }

  async function enviarAccion(id, accion, extra = {}) {
    try {
      const respuesta = await fetch('/api/admin/reportes-actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, accion, ...extra }),
      });
      if (respuesta.status === 401) { window.location.href = 'index.html'; return; }
      if (!respuesta.ok) { alert('No se pudo completar la acción.'); return; }

      await Promise.all([cargarReportes(), cargarEstadisticas()]);
    } catch {
      alert('Error de conexión.');
    }
  }

  document.getElementById('botonCancelarEditar').addEventListener('click', () => {
    modalEditar.classList.remove('visible');
  });

  document.getElementById('botonGuardarEditar').addEventListener('click', async () => {
    await enviarAccion(editarId.value, 'editar', {
      cambios: {
        nombre_negocio: editarNombreNegocio.value,
        ciudad: editarCiudad.value,
        motivo: editarMotivo.value,
        descripcion: editarDescripcion.value,
      },
    });
    modalEditar.classList.remove('visible');
  });

  filtroEstado.addEventListener('change', cargarReportes);
  filtroBusqueda.addEventListener('input', AlertaBoDebounce(cargarReportes, 400));

  function AlertaBoDebounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  botonLogout.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = 'index.html';
  });

  (async function iniciar() {
    const autenticado = await verificarSesion();
    if (!autenticado) return;
    await Promise.all([cargarEstadisticas(), cargarReportes()]);
  })();
})();
