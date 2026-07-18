/**
 * reportar.js
 * Controla el formulario de reporte: prellenado desde la URL,
 * validación en cliente, previsualización de capturas (convertidas
 * a base64), y envío a /api/reportes/crear.
 */
(function () {
  const form = document.getElementById('formReporte');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const tipoPrellenado = params.get('tipo');
  const valorPrellenado = params.get('valor');

  const campoWhatsapp = document.getElementById('campoWhatsapp');
  const campoFacebook = document.getElementById('campoFacebook');
  const campoCiudad = document.getElementById('campoCiudad');
  const campoDescripcion = document.getElementById('campoDescripcion');
  const campoMotivo = document.getElementById('campoMotivo');
  const camposMonto = document.getElementById('grupoMontoPerdido');
  const campoMonto = document.getElementById('campoMonto');
  const inputCapturas = document.getElementById('inputCapturas');
  const zonaCapturas = document.getElementById('zonaCapturas');
  const previaCapturas = document.getElementById('previaCapturas');
  const botonEnviar = document.getElementById('botonEnviarReporte');
  const mensajeErrorGeneral = document.getElementById('errorGeneralForm');

  if (tipoPrellenado === 'whatsapp' && valorPrellenado) {
    campoWhatsapp.value = valorPrellenado;
  } else if (tipoPrellenado === 'facebook' && valorPrellenado) {
    campoFacebook.value = valorPrellenado;
  }

  // ---- Mostrar/ocultar campo de monto según radio Sí/No ----
  document.querySelectorAll('input[name="hubo_perdida"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      camposMonto.style.display = radio.value === 'si' && radio.checked ? 'block' : camposMonto.style.display;
      if (radio.value === 'no' && radio.checked) camposMonto.style.display = 'none';
    });
  });

  // ---- Capturas: selección y previsualización ----
  const MAX_CAPTURAS = 3;
  let capturasSeleccionadas = [];

  zonaCapturas.addEventListener('click', () => inputCapturas.click());

  inputCapturas.addEventListener('change', async (evento) => {
    const archivos = Array.from(evento.target.files || []);
    for (const archivo of archivos) {
      if (capturasSeleccionadas.length >= MAX_CAPTURAS) break;
      if (!archivo.type.startsWith('image/')) continue;
      if (archivo.size > 4 * 1024 * 1024) continue;

      const base64 = await leerComoBase64(archivo);
      capturasSeleccionadas.push({ nombre: archivo.name, tipo: archivo.type, datos_base64: base64 });
    }
    inputCapturas.value = '';
    renderizarPreviasCapturas();
  });

  function leerComoBase64(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result.split(',')[1]);
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  function renderizarPreviasCapturas() {
    previaCapturas.innerHTML = capturasSeleccionadas.map((cap, indice) => `
      <div class="previa-captura">
        <img src="data:${cap.tipo};base64,${cap.datos_base64}" alt="Captura ${indice + 1}">
        <button type="button" class="previa-captura__quitar" data-indice="${indice}" aria-label="Quitar captura">✕</button>
      </div>
    `).join('');

    previaCapturas.querySelectorAll('.previa-captura__quitar').forEach((boton) => {
      boton.addEventListener('click', () => {
        capturasSeleccionadas.splice(Number(boton.dataset.indice), 1);
        renderizarPreviasCapturas();
      });
    });
  }

  // ---- Envío del formulario ----
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarErrorGeneral();

    const whatsapp = campoWhatsapp.value.trim();
    const facebookUrl = campoFacebook.value.trim();

    if (whatsapp && !AlertaBoUtils.normalizarWhatsapp(whatsapp)) {
      mostrarErrorGeneral('El número de WhatsApp no es válido. Usa formato boliviano (+591), 8 dígitos.');
      return;
    }
    if (facebookUrl && !AlertaBoUtils.normalizarFacebookUrl(facebookUrl)) {
      mostrarErrorGeneral('El enlace de Facebook no es válido.');
      return;
    }
    if (!whatsapp && !facebookUrl) {
      mostrarErrorGeneral('Ingresa al menos un número de WhatsApp o una página de Facebook.');
      return;
    }
    if (!campoCiudad.value.trim() || !campoDescripcion.value.trim()) {
      mostrarErrorGeneral('Ciudad y descripción son obligatorias.');
      return;
    }
    if (!document.getElementById('campoTerminos').checked) {
      mostrarErrorGeneral('Debes aceptar los términos para continuar.');
      return;
    }

    const huboPerdidaInput = document.querySelector('input[name="hubo_perdida"]:checked');

    const payload = {
      nombre_negocio: document.getElementById('campoNombreNegocio').value.trim() || null,
      whatsapp: whatsapp || null,
      facebook_url: facebookUrl || null,
      ciudad: campoCiudad.value.trim(),
      descripcion: campoDescripcion.value.trim(),
      motivo: campoMotivo.value,
      hubo_perdida_economica: huboPerdidaInput ? huboPerdidaInput.value === 'si' : false,
      monto_perdido: campoMonto.value ? Number(campoMonto.value) : null,
      capturas: capturasSeleccionadas,
      acepta_terminos: true,
      sitio_web: document.getElementById('campoTrampa').value, // honeypot, debe quedar vacío
    };

    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Enviando…';

    try {
      const respuesta = await fetch('/api/reportes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        mostrarErrorGeneral(datos.error || 'No se pudo enviar el reporte.');
        botonEnviar.disabled = false;
        botonEnviar.textContent = 'Enviar reporte';
        return;
      }

      mostrarConfirmacion();
    } catch (error) {
      console.error('[AlertaBo] Error al enviar reporte:', error);
      mostrarErrorGeneral('No se pudo conectar con el servidor. Intenta más tarde.');
      botonEnviar.disabled = false;
      botonEnviar.textContent = 'Enviar reporte';
    }
  });

  function mostrarErrorGeneral(texto) {
    mensajeErrorGeneral.textContent = texto;
    mensajeErrorGeneral.classList.add('visible');
    mensajeErrorGeneral.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function ocultarErrorGeneral() {
    mensajeErrorGeneral.classList.remove('visible');
  }

  function mostrarConfirmacion() {
    document.getElementById('contenedorFormulario').innerHTML = `
      <div class="confirmacion-envio">
        <div class="confirmacion-envio__icono">
          <i data-lucide="check" width="26" height="26"></i>
        </div>
        <h2>Reporte recibido</h2>
        <p>Gracias por ayudar a la comunidad. Tu reporte será revisado por el equipo de moderación antes de publicarse.</p>
        <a href="index.html" class="boton boton--primario">Volver al inicio</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
})();
