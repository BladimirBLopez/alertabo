/**
 * POST /api/reportes/crear
 * Crea un nuevo reporte (siempre en estado 'pendiente', nunca público
 * hasta que un moderador lo apruebe).
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');
const { resolverUrlCanonicaFacebook } = require('../../services/facebookPreview');
const {
  normalizarWhatsapp,
  normalizarFacebookUrl,
  sanitizarTexto,
  hashIp,
} = require('../../utils/validacionServidor');
const {
  MOTIVOS_REPORTE,
  LIMITE_IMAGENES_POR_REPORTE,
  TAMANO_MAX_IMAGEN_BYTES,
  VENTANA_RATE_LIMIT_MINUTOS,
  MAX_REPORTES_POR_IP_EN_VENTANA,
} = require('../../config/constantes');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const cuerpo = req.body || {};

  if (cuerpo.sitio_web) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!cuerpo.acepta_terminos) {
    res.status(400).json({ error: 'Debes aceptar los términos para enviar el reporte' });
    return;
  }

  const whatsapp = cuerpo.whatsapp ? normalizarWhatsapp(cuerpo.whatsapp) : null;
  let facebookUrl = cuerpo.facebook_url ? normalizarFacebookUrl(cuerpo.facebook_url) : null;
  if (facebookUrl && facebookUrl.includes('/share/')) {
    facebookUrl = await resolverUrlCanonicaFacebook(facebookUrl);
  }

  if (!whatsapp && !facebookUrl) {
    res.status(400).json({ error: 'Debes ingresar al menos un número de WhatsApp o una página de Facebook' });
    return;
  }
  if (cuerpo.whatsapp && !whatsapp) {
    res.status(400).json({ error: 'El número de WhatsApp no es válido (formato boliviano +591)' });
    return;
  }
  if (cuerpo.facebook_url && !facebookUrl) {
    res.status(400).json({ error: 'El enlace de Facebook no es válido' });
    return;
  }

  const ciudad = sanitizarTexto(String(cuerpo.ciudad || '').slice(0, 80));
  const descripcion = sanitizarTexto(String(cuerpo.descripcion || '').slice(0, 1500));
  const nombreNegocio = cuerpo.nombre_negocio
    ? sanitizarTexto(String(cuerpo.nombre_negocio).slice(0, 120))
    : null;
  const motivo = MOTIVOS_REPORTE.includes(cuerpo.motivo) ? cuerpo.motivo : 'Otro';
  const huboPerdida = Boolean(cuerpo.hubo_perdida_economica);
  const montoPerdido = huboPerdida && cuerpo.monto_perdido ? Number(cuerpo.monto_perdido) : null;

  if (!ciudad || !descripcion) {
    res.status(400).json({ error: 'Ciudad y descripción son obligatorias' });
    return;
  }
  if (montoPerdido !== null && (isNaN(montoPerdido) || montoPerdido < 0 || montoPerdido > 1000000)) {
    res.status(400).json({ error: 'Monto perdido inválido' });
    return;
  }

  const imagenes = Array.isArray(cuerpo.capturas)
    ? cuerpo.capturas.slice(0, LIMITE_IMAGENES_POR_REPORTE)
    : [];

  const ipCruda = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconocida')
    .split(',')[0].trim();
  const ipHash = hashIp(ipCruda);

  const supabase = obtenerClienteSupabaseAdmin();

  const desde = new Date(Date.now() - VENTANA_RATE_LIMIT_MINUTOS * 60 * 1000).toISOString();
  const { count: conteoReciente, error: errorConteo } = await supabase
    .from('reportes')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('creado_en', desde);

  if (!errorConteo && conteoReciente !== null && conteoReciente >= MAX_REPORTES_POR_IP_EN_VENTANA) {
    res.status(429).json({ error: 'Has enviado demasiados reportes en poco tiempo. Intenta más tarde.' });
    return;
  }

  // ---- Buscar negocio existente (por WhatsApp o Facebook) o crear uno nuevo ----
  let negocio = null;
  if (whatsapp) {
    const { data } = await supabase.from('negocios').select('*').eq('whatsapp', whatsapp).maybeSingle();
    negocio = data;
  }
  if (!negocio && facebookUrl) {
    const { data } = await supabase.from('negocios').select('*').eq('facebook_url', facebookUrl).maybeSingle();
    negocio = data;
  }

  if (!negocio) {
    const { data: nuevoNegocio, error: errorCrearNegocio } = await supabase
      .from('negocios')
      .insert({ nombre: nombreNegocio, whatsapp, facebook_url: facebookUrl, ciudad })
      .select()
      .single();

    if (errorCrearNegocio) {
      res.status(500).json({ error: 'Error al registrar el negocio' });
      return;
    }
    negocio = nuevoNegocio;
  } else {
    // ---- El negocio ya existía: completar datos que le falten con lo
    // nuevo que llegó en este reporte (ej: ya tenía WhatsApp, ahora
    // también se reporta su Facebook) ----
    const actualizaciones = {};
    if (whatsapp && !negocio.whatsapp) actualizaciones.whatsapp = whatsapp;
    if (facebookUrl && !negocio.facebook_url) actualizaciones.facebook_url = facebookUrl;
    if (nombreNegocio && !negocio.nombre) actualizaciones.nombre = nombreNegocio;

    if (Object.keys(actualizaciones).length > 0) {
      const { data: negocioActualizado, error: errorActualizar } = await supabase
        .from('negocios')
        .update(actualizaciones)
        .eq('id', negocio.id)
        .select()
        .single();

      if (!errorActualizar && negocioActualizado) {
        negocio = negocioActualizado;
      }
    }
  }

  // ---- Crear el reporte (siempre pendiente) ----
  const { data: reporte, error: errorReporte } = await supabase
    .from('reportes')
    .insert({
      negocio_id: negocio.id,
      nombre_negocio: nombreNegocio,
      whatsapp,
      facebook_url: facebookUrl,
      ciudad,
      descripcion,
      hubo_perdida_economica: huboPerdida,
      monto_perdido: montoPerdido,
      motivo,
      estado: 'pendiente',
      ip_hash: ipHash,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    })
    .select()
    .single();

  if (errorReporte) {
    res.status(500).json({ error: 'Error al registrar el reporte' });
    return;
  }

  for (const imagen of imagenes) {
    try {
      if (!imagen.datos_base64 || !imagen.nombre) continue;
      const buffer = Buffer.from(imagen.datos_base64, 'base64');
      if (buffer.length > TAMANO_MAX_IMAGEN_BYTES) continue;

      const extension = (imagen.nombre.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
      const rutaStorage = `${reporte.id}/${Date.now()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from('capturas-reportes')
        .upload(rutaStorage, buffer, { contentType: imagen.tipo || 'image/jpeg' });

      if (!errorSubida) {
        await supabase.from('imagenes').insert({
          reporte_id: reporte.id,
          storage_path: rutaStorage,
          nombre_original: String(imagen.nombre).slice(0, 150),
          tamano_bytes: buffer.length,
        });
      }
    } catch (err) {
      console.error('[AlertaBo] Error subiendo captura:', err);
    }
  }

  res.status(201).json({ ok: true, mensaje: 'Reporte recibido. Será revisado por el equipo de moderación.' });
};
