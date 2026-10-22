/**
 * POST /api/reportes/crear
 * Crea un nuevo reporte (siempre 'pendiente', nunca público hasta
 * que un moderador lo apruebe).
 */
const { consultar } = require('../../services/db');
const { subirImagen } = require('../../services/cloudinary');
const { resolverUrlCanonicaFacebook } = require('../../services/facebookPreview');
const { normalizarWhatsapp, normalizarFacebookUrl, hashIp } = require('../../utils/validacionServidor');
const {
  MOTIVOS_REPORTE,
  LIMITE_IMAGENES_POR_REPORTE,
  TAMANO_MAX_IMAGEN_BYTES,
  VENTANA_RATE_LIMIT_MINUTOS,
  MAX_REPORTES_POR_IP_EN_VENTANA,
} = require('../../config/constantes');

// Se guarda el texto sin escapar HTML: el frontend ya escapa al mostrar.
function limpiar(texto, max) {
  return String(texto || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

const esJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

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

  const ciudad = limpiar(cuerpo.ciudad, 80);
  const descripcion = limpiar(cuerpo.descripcion, 1500);
  const nombreNegocio = cuerpo.nombre_negocio ? limpiar(cuerpo.nombre_negocio, 120) || null : null;
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

  try {
    // ---- Rate limit por IP (hasheada) ----
    const desde = new Date(Date.now() - VENTANA_RATE_LIMIT_MINUTOS * 60 * 1000).toISOString();
    const conteo = await consultar(
      'SELECT count(*)::int AS total FROM reportes WHERE ip_hash = $1 AND creado_en >= $2',
      [ipHash, desde]
    );
    if (conteo[0].total >= MAX_REPORTES_POR_IP_EN_VENTANA) {
      res.status(429).json({ error: 'Has enviado demasiados reportes en poco tiempo. Intenta más tarde.' });
      return;
    }

    // ---- Buscar negocio existente (WhatsApp o Facebook) o crear uno ----
    let negocio = null;
    if (whatsapp) {
      const filas = await consultar('SELECT * FROM negocios WHERE whatsapp = $1 LIMIT 1', [whatsapp]);
      negocio = filas[0] || null;
    }
    if (!negocio && facebookUrl) {
      const filas = await consultar('SELECT * FROM negocios WHERE facebook_url = $1 LIMIT 1', [facebookUrl]);
      negocio = filas[0] || null;
    }

    if (!negocio) {
      try {
        const filas = await consultar(
          'INSERT INTO negocios (nombre, whatsapp, facebook_url, ciudad) VALUES ($1, $2, $3, $4) RETURNING *',
          [nombreNegocio, whatsapp, facebookUrl, ciudad]
        );
        negocio = filas[0];
      } catch (errorInsertar) {
        // Carrera: otro reporte creó el mismo negocio justo ahora
        const filas = await consultar(
          'SELECT * FROM negocios WHERE whatsapp = $1 OR facebook_url = $2 LIMIT 1',
          [whatsapp, facebookUrl]
        );
        negocio = filas[0];
        if (!negocio) throw errorInsertar;
      }
    } else {
      // Completar datos faltantes del negocio con lo nuevo de este reporte
      try {
        await consultar(
          `UPDATE negocios SET
             whatsapp = COALESCE(whatsapp, $2),
             facebook_url = COALESCE(facebook_url, $3),
             nombre = COALESCE(nombre, $4)
           WHERE id = $1`,
          [negocio.id, whatsapp, facebookUrl, nombreNegocio]
        );
      } catch (errorActualizar) {
        console.error('[AlertaBo] No se pudo completar el negocio:', errorActualizar.message);
      }
    }

    // ---- Crear el reporte (siempre pendiente) ----
    const filasReporte = await consultar(
      `INSERT INTO reportes
         (negocio_id, nombre_negocio, whatsapp, facebook_url, ciudad, descripcion,
          hubo_perdida_economica, monto_perdido, motivo, estado, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendiente', $10, $11)
       RETURNING id`,
      [
        negocio.id, nombreNegocio, whatsapp, facebookUrl, ciudad, descripcion,
        huboPerdida, montoPerdido, motivo, ipHash,
        String(req.headers['user-agent'] || '').slice(0, 300),
      ]
    );
    const reporteId = filasReporte[0].id;

    // ---- Capturas -> Cloudinary (si una falla, el reporte igual se guarda) ----
    for (const imagen of imagenes) {
      try {
        if (!imagen || !imagen.datos_base64 || !imagen.nombre) continue;
        const buffer = Buffer.from(imagen.datos_base64, 'base64');
        if (buffer.length > TAMANO_MAX_IMAGEN_BYTES || !esJpeg(buffer)) continue;

        const { url, publicId } = await subirImagen(imagen.datos_base64);
        await consultar(
          `INSERT INTO imagenes (reporte_id, url, public_id, nombre_original, tamano_bytes)
           VALUES ($1, $2, $3, $4, $5)`,
          [reporteId, url, publicId, limpiar(imagen.nombre, 150), buffer.length]
        );
      } catch (err) {
        console.error('[AlertaBo] Error subiendo captura:', err.message);
      }
    }

    res.status(201).json({ ok: true, mensaje: 'Reporte recibido. Será revisado por el equipo de moderación.' });
  } catch (error) {
    console.error('[AlertaBo] Error al crear reporte:', error);
    res.status(500).json({ error: 'Error al registrar el reporte' });
  }
};
