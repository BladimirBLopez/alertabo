/**
 * reportes-recientes.js
 * Consume /api/busqueda/recientes y renderiza las tarjetas de la sección
 * "Últimos reportes" en la página de inicio.
 */
(function () {
  const contenedor = document.getElementById('listaReportesRecientes');
  if (!contenedor) return;

  async function cargarReportesRecientes() {
    try {
      const respuesta = await fetch('/api/busqueda/recientes?limite=6');
      if (!respuesta.ok) throw new Error('Error al obtener reportes recientes');

      const { reportes } = await respuesta.json();

      if (!reportes || reportes.length === 0) {
        contenedor.innerHTML = '<div class="estado-vacio">Aún no hay reportes públicos. Sé el primero en compartir tu experiencia.</div>';
        return;
      }

      contenedor.innerHTML = reportes.map(renderizarTarjeta).join('');
    } catch (error) {
      console.error('[AlertaBo] No se pudieron cargar los reportes recientes:', error);
      contenedor.innerHTML = '<div class="estado-vacio">No se pudieron cargar los reportes en este momento.</div>';
    }
  }

  function renderizarTarjeta(reporte) {
    const ciudad = AlertaBoUtils.sanitizarTexto(reporte.ciudad || 'Bolivia');
    const motivo = AlertaBoUtils.sanitizarTexto(reporte.motivo || 'Reporte de la comunidad');
    const descripcion = AlertaBoUtils.sanitizarTexto(reporte.descripcion || '');
    const fecha = AlertaBoUtils.formatearFecha(reporte.creado_en);

    return `
      <article class="tarjeta-reporte">
        <div class="tarjeta-reporte__cabecera">
          <span class="tarjeta-reporte__ciudad">${ciudad}</span>
        </div>
        <div class="tarjeta-reporte__motivo">${motivo}</div>
        <p class="tarjeta-reporte__desc">${descripcion}</p>
        <div class="tarjeta-reporte__fecha">${fecha}</div>
      </article>
    `;
  }

  cargarReportesRecientes();
})();
