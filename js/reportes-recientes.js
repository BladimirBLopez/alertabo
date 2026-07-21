/**
 * reportes-recientes.js
 * Consume /api/busqueda/recientes y renderiza las tarjetas de la sección
 * "Últimos reportes": imagen grande arriba (foto de Facebook si existe,
 * o un placeholder), nombre del negocio, descripción, etiquetas tipo
 * pill (ciudad/motivo), y enlace "Ver detalles".
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

    const nombreNegocio = negocio.nombre || negocio.facebook_og_titulo || 'Negocio sin nombre registrado';

    const imagenHtml = negocio.facebook_og_imagen
      ? `<img src="${AlertaBoUtils.sanitizarTexto(negocio.facebook_og_imagen)}" alt="" class="tarjeta-reporte__imagen" loading="lazy" onerror="this.outerHTML='<div class=&quot;tarjeta-reporte__imagen-placeholder&quot;><i data-lucide=&quot;store&quot; width=&quot;28&quot; height=&quot;28&quot;></i></div>'">`
      : `<div class="tarjeta-reporte__imagen-placeholder"><i data-lucide="store" width="28" height="28"></i></div>`;

    let paramsBusqueda = null;
    if (negocio.whatsapp) paramsBusqueda = new URLSearchParams({ tipo: 'whatsapp', valor: negocio.whatsapp });
    else if (negocio.facebook_url) paramsBusqueda = new URLSearchParams({ tipo: 'facebook', valor: negocio.facebook_url });

    const nombreEtiqueta = paramsBusqueda ? 'a' : 'article';
    const atributoHref = paramsBusqueda ? ` href="resultado.html?${paramsBusqueda.toString()}"` : '';

    return `
      <${nombreEtiqueta} class="tarjeta-reporte"${atributoHref}>
        ${imagenHtml}
        <div class="tarjeta-reporte__cuerpo">
          <div class="tarjeta-reporte__meta-superior">${ciudad} · ${fecha}</div>
          <div class="tarjeta-reporte__nombre-negocio">${AlertaBoUtils.sanitizarTexto(nombreNegocio)}</div>
          <p class="tarjeta-reporte__desc">${descripcion}</p>
          <div class="tarjeta-reporte__pills">
            <span class="tarjeta-reporte__pill tarjeta-reporte__pill--motivo">${motivo}</span>
          </div>
          <div class="tarjeta-reporte__pie">
            <span class="tarjeta-reporte__ver-mas">Ver detalles <i data-lucide="arrow-right" width="14" height="14"></i></span>
          </div>
        </div>
      </${nombreEtiqueta}>
    `;
  }

  cargarReportesRecientes();
})();
