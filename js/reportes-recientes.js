/**
 * reportes-recientes.js
 * Consume /api/busqueda/recientes y renderiza las tarjetas de la sección
 * "Últimos reportes" en la página de inicio, incluyendo el nombre del
 * negocio y su miniatura de Facebook si está disponible.
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
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      console.error('[AlertaBo] No se pudieron cargar los reportes recientes:', error);
      contenedor.innerHTML = '<div class="estado-vacio">No se pudieron cargar los reportes en este momento.</div>';
    }
  }

  function renderizarTarjeta(reporte) {
    const negocio = reporte.negocios || {};
    const ciudad = AlertaBoUtils.sanitizarTexto(reporte.ciudad || 'Bolivia');
    const motivo = AlertaBoUtils.sanitizarTexto(reporte.motivo || 'Reporte de la comunidad');
    const descripcion = AlertaBoUtils.sanitizarTexto(reporte.descripcion || '');
    const fecha = AlertaBoUtils.formatearFecha(reporte.creado_en);

    const nombreNegocio = negocio.nombre || negocio.facebook_og_titulo || null;

    const avatarHtml = negocio.facebook_og_imagen
      ? `<img src="${AlertaBoUtils.sanitizarTexto(negocio.facebook_og_imagen)}" alt="" class="tarjeta-reporte__avatar" loading="lazy" onerror="this.remove()">`
      : `<div class="tarjeta-reporte__avatar tarjeta-reporte__avatar--icono"><i data-lucide="store" width="16" height="16"></i></div>`;

    let paramsBusqueda = null;
    if (negocio.whatsapp) paramsBusqueda = new URLSearchParams({ tipo: 'whatsapp', valor: negocio.whatsapp });
    else if (negocio.facebook_url) paramsBusqueda = new URLSearchParams({ tipo: 'facebook', valor: negocio.facebook_url });

    // Envoltura: <a> clicable si hay a dónde ir a buscar, o <article> si no.
    const nombreEtiqueta = paramsBusqueda ? 'a' : 'article';
    const atributoHref = paramsBusqueda ? ` href="resultado.html?${paramsBusqueda.toString()}"` : '';

    return `
      <${nombreEtiqueta} class="tarjeta-reporte"${atributoHref}>
        <div class="tarjeta-reporte__negocio">
          ${avatarHtml}
          <div>
            <div class="tarjeta-reporte__nombre-negocio">${nombreNegocio ? AlertaBoUtils.sanitizarTexto(nombreNegocio) : 'Negocio sin nombre registrado'}</div>
            <span class="tarjeta-reporte__ciudad">${ciudad}</span>
          </div>
        </div>
        <div class="tarjeta-reporte__motivo">${motivo}</div>
        <p class="tarjeta-reporte__desc">${descripcion}</p>
        <div class="tarjeta-reporte__fecha">${fecha}</div>
      </${nombreEtiqueta}>
    `;
  }

  cargarReportesRecientes();
})();
