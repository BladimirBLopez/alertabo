/**
 * buscador.js
 * Controla el buscador del hero: selector de tipo (WhatsApp/Facebook),
 * validación en cliente, y el envío hacia la página de resultados.
 */
(function () {
  const form = document.getElementById('formBuscador');
  const campoBusqueda = document.getElementById('campoBusqueda');
  const opciones = document.querySelectorAll('.buscador__opcion');
  const mensajeError = document.getElementById('errorBusqueda');

  let tipoActual = 'whatsapp';

  const PLACEHOLDERS = {
    whatsapp: 'Ej: 69356292',
    facebook: 'Ej: facebook.com/mitienda',
  };

  opciones.forEach((boton) => {
    boton.addEventListener('click', () => {
      opciones.forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-checked', 'false');
      });
      boton.setAttribute('aria-pressed', 'true');
      boton.setAttribute('aria-checked', 'true');

      tipoActual = boton.dataset.tipo;
      campoBusqueda.placeholder = PLACEHOLDERS[tipoActual];
      campoBusqueda.inputMode = tipoActual === 'whatsapp' ? 'tel' : 'url';
      ocultarError();
    });
  });

  function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.classList.add('visible');
  }

  function ocultarError() {
    mensajeError.classList.remove('visible');
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const valor = campoBusqueda.value.trim();

    if (!valor) {
      mostrarError('Ingresa un número o un enlace para buscar.');
      return;
    }

    if (tipoActual === 'whatsapp') {
      const numeroNormalizado = AlertaBoUtils.normalizarWhatsapp(valor);
      if (!numeroNormalizado) {
        mostrarError('Ingresa un número boliviano válido, 8 dígitos, empezando en 6 o 7.');
        return;
      }
      irAResultados('whatsapp', numeroNormalizado);
    } else {
      const urlNormalizada = AlertaBoUtils.normalizarFacebookUrl(valor);
      if (!urlNormalizada) {
        mostrarError('Ingresa un enlace válido de Facebook (facebook.com/...).');
        return;
      }
      irAResultados('facebook', urlNormalizada);
    }
  });

  function irAResultados(tipo, valor) {
    const params = new URLSearchParams({ tipo, valor });
    window.location.href = `resultado.html?${params.toString()}`;
  }

  // ---- Vista previa animada del hero: ciclo demostrativo con fundido ----
  const vistaPrevia = document.getElementById('vistaPrevia');
  const vpNumero = document.getElementById('vpNumero');
  const vpMeta = document.getElementById('vpMeta');
  const vpChip = document.getElementById('vpChip');

  const EJEMPLOS = [
    { numero: '+591 700 XX XXX', estado: 'sin_reportes', meta: 'Así se ve un resultado' },
    { numero: '+591 601 XX XXX', estado: 'con_reportes', meta: '1 reporte de la comunidad' },
    { numero: '+591 750 XX XXX', estado: 'multiples_reportes', meta: '3 reportes de la comunidad' },
  ];

  let indiceEjemplo = 0;

  function actualizarContenidoVistaPrevia() {
    const ejemplo = EJEMPLOS[indiceEjemplo];
    const etiqueta = AlertaBoUtils.ETIQUETAS_RIESGO[ejemplo.estado];

    vpNumero.textContent = ejemplo.numero;
    vpMeta.textContent = ejemplo.meta;
    vpChip.className = `chip-riesgo ${etiqueta.clase}`;
    vpChip.innerHTML = `<span class="chip-riesgo__punto"></span>${etiqueta.texto}`;

    indiceEjemplo = (indiceEjemplo + 1) % EJEMPLOS.length;
  }

  function ciclarVistaPrevia() {
    if (!vistaPrevia) return;
    vistaPrevia.classList.add('vista-previa--desvanecer');
    setTimeout(() => {
      actualizarContenidoVistaPrevia();
      vistaPrevia.classList.remove('vista-previa--desvanecer');
    }, 220);
  }

  if (vistaPrevia) {
    setInterval(ciclarVistaPrevia, 3400);
  }
})();
