/**
 * resultado.js
 * Lee ?tipo=&valor= de la URL, consulta /api/busqueda/consultar y
 * renderiza el resultado: tarjeta de negocio con reportes, o el
 * estado de "sin reportes".
 */
(function () {
  const contenedor = document.getElementById('contenidoResultado');
  if (!contenedor) return;

  const params = new URLSearchParams(window.location.search);
  const tipo = params.get('tipo');
  const valor = params.get('valor');

  if (!tipo || !valor) {
    contenedor.innerHTML = renderizarError('Búsqueda inválida. Vuelve al inicio e intenta de nuevo.');
    return;
  }

  async function cargarResultado() {
    try {
      const respuesta = await fetch(`/api/busqueda/consultar?tipo=${encodeURIComponent(tipo)}&valor=${encodeURIComponent(valor)}`);
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        contenedor.innerHTML = renderizarError(datos.error || 'No se pudo completar la búsqueda.');
        return;
      }

      if (!datos.encontrado) {
        contenedor.innerHTML = renderizarSinReportes(tipo, valor);
        return;
      }

      contenedor.innerHTML = renderizarNegocio(datos);
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      console.error('[AlertaBo] Error al consultar resultado:', error);
      contenedor.innerHTML = renderizarError('No se pudo conectar con el servidor. Intenta más tarde.');
    }
  }

  function renderizarError(mensaje) {
    return `<div class="sin-reportes"><p>${AlertaBoUtils.sanitizarTexto(mensaje)}</p></div>`;
  }

  function renderizarSinReportes(tipo, valor) {
    const valorVisible = tipo === 'whatsapp' ? AlertaBoUtils.formatearWhatsappVisible(valor) : valor;
    const params = new URLSearchParams({ tipo, valor });
    return `
      <div class="sin-reportes">
        <div class="sin-reportes__icono">
          <i data-lucide="shield-check" width="26" height="26"></i>
        </div>
        <h2>No existen reportes registrados</h2>
        <p>No encontramos reportes de la comunidad para <strong>${AlertaBoUtils.sanitizarTexto(valorVisible)}</strong>. Esto no garantiza que sea seguro, solo que nadie ha reportado un problema todavía.</p>
        <a href="reportar.html?${params.toString()}" class="boton boton--primario">Reportar experiencia</a>
      </div>
    `;
  }

  function renderizarNegocio(datos) {
    const { negocio, reportes, motivos_frecuentes } = datos;
    const etiqueta = AlertaBoUtils.ETIQUETAS_RIESGO[negocio.nivel_riesgo] || AlertaBoUtils.ETIQUETAS_RIESGO.sin_reportes;

    const filasDatos = [];
    if (negocio.whatsapp) filasDatos.push(['WhatsApp', AlertaBoUtils.formatearWhatsappVisible(negocio.whatsapp)]);
    if (negocio.facebook_url) filasDatos.push(['Facebook', negocio.facebook_url]);
    if (negocio.ciudad) filasDatos.push(['Ciudad', negocio.ciudad]);
    filasDatos.push(['Cantidad de reportes', String(negocio.total_reportes)]);
    filasDatos.push(['Último reporte', AlertaBoUtils.formatearFecha(negocio.ultimo_reporte_en)]);

    const filasHtml = filasDatos.map(([label, valor]) => `
      <div>
        <div class="tarjeta-negocio__dato-label">${label}</div>
        <div class="tarjeta-negocio__dato-valor">${AlertaBoUtils.sanitizarTexto(valor)}</div>
      </div>
    `).join('');

    const motivosHtml = (motivos_frecuentes || []).map((m) =>
      `<span class="etiqueta-motivo">${AlertaBoUtils.sanitizarTexto(m)}</span>`
    ).join('');

    const reportesHtml = (reportes || []).map((r) => `
      <div class="reporte-detalle">
        <div class="reporte-detalle__cabecera">
          <span>${AlertaBoUtils.sanitizarTexto(r.ciudad)}</span>
          <span>${AlertaBoUtils.formatearFecha(r.creado_en)}</span>
        </div>
        <p class="reporte-detalle__descripcion">${AlertaBoUtils.sanitizarTexto(r.descripcion)}</p>
        ${r.hubo_perdida_economica ? '<div class="reporte-detalle__perdida"><i data-lucide="alert-triangle" width="13" height="13"></i> Reportó pérdida económica</div>' : ''}
      </div>
    `).join('');

    const params = new URLSearchParams({
      tipo: negocio.whatsapp ? 'whatsapp' : 'facebook',
      valor: negocio.whatsapp || negocio.facebook_url,
    });

    return `
      <div class="tarjeta-negocio">
        <div class="tarjeta-negocio__cabecera">
          <div>
            <h1 class="tarjeta-negocio__nombre">${AlertaBoUtils.sanitizarTexto(negocio.nombre || 'Negocio sin nombre registrado')}</h1>
            <div class="tarjeta-negocio__meta">Reportes realizados por la comunidad</div>
          </div>
          <span class="chip-riesgo ${etiqueta.clase}">
            <span class="chip-riesgo__punto"></span>${etiqueta.texto}
          </span>
        </div>
        <div class="tarjeta-negocio__datos">${filasHtml}</div>
        ${motivosHtml ? `<div class="tarjeta-negocio__motivos">${motivosHtml}</div>` : ''}
        <a href="reportar.html?${params.toString()}" class="boton boton--secundario">Reportar experiencia</a>
      </div>

      <div class="lista-reportes">
        <h3>Todos los reportes (${reportes.length})</h3>
        ${reportesHtml}
      </div>
    `;
  }

  cargarResultado();
})();
