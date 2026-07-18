/**
 * reportar.js
 * Controla el formulario de reporte: prellenado desde la URL,
 * validación en cliente, compresión + previsualización de capturas,
 * y envío a /api/reportes/crear.
 *
 * IMPORTANTE: las imágenes se REDIMENSIONAN Y COMPRIMEN en el navegador
 * (canvas, salida JPEG) antes de convertirlas a base64. Vercel tiene un
 * límite duro de 4.5MB por request en sus funciones serverless — sin
 * esta compresión, una sola foto de celular sin editar ya rompe el envío.
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

  document.querySelectorAll('input[name="hubo_perdida"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      camposMonto.style.display = radio.value === 'si' && radio.checked ? 'block' : camposMonto.style.display;
      if (radio.value === 'no' && radio.checked) camposMonto.style.display = 'none';
    });
  });

  // ---- Capturas: máximo 2, comprimidas a ~1280px de lado mayor, JPEG 70% ----
  const MAX_CAPTURAS = 2;
  const DIMENSION_MAXIMA = 1280;
  const CALIDAD_JPEG = 0.7;
  const TAMANO_MAX_ORIGINAL_BYTES = 12 * 1024 * 1024; // descarta fotos absurdamente pesadas antes de procesarlas

  let capturasSeleccionadas = [];

  zonaCapturas.addEventListener('click', () => inputCapturas.click());

  inputCapturas.addEventListener('change', async (evento) => {
    const archivos = Array.from(evento.target.files || []);
    for (const archivo of archivos) {
      if (capturasSeleccionadas.length >= MAX_CAPTURAS) break;
      if (!archivo.type.startsWith('image/')) continue;
      if (archivo.size > TAMANO_MAX_ORIGINAL_BYTES) continue;

      try {
        const base64 = await comprimirImagen(archivo, DIMENSION_MAXIMA, CALIDAD_JPEG);
        capturasSeleccionadas.push({
          nombre: archivo.name.replace(/\.\w+$/, '.jpg'),
          tipo: 'image/jpeg',
          datos_base64: base64,
        });
      } catch (error) {
        console.error('[AlertaBo] No se pudo procesar la imagen:', error);
      }
    }
    inputCapturas.value = '';
    renderizarPreviasCapturas();
  });

  /**
   * Redimensiona una imagen al lado mayor indicado y la comprime como
   * JPEG usando <canvas>, devolviendo el base64 resultante (sin el
   * prefijo "data:image/jpeg;base64,").
   */
  function comprimirImagen(archivo, dimensionMaxima, calidad) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = (evento) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > dimensionMaxima || height > dimensionMaxima) {
            if (width > height) {
              height = Math.round(height * (dimensionMaxima / width));
              width = dimensionMaxima;
            } else {
              width = Math.round(width * (dimensionMaxima / height));
              height = dimensionMaxima;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', calidad);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.src = evento.target.result;
      };
      lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
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
