/**
 * GET /api/busqueda/consultar?tipo=whatsapp|facebook&valor=...
 * Endpoint público de solo lectura. Solo revela datos del negocio
 * (nombre, contacto, vista previa de Facebook) si tiene AL MENOS un
 * reporte aprobado vigente. Si el negocio existe pero no tiene reportes
 * aprobados, se comporta igual que "no encontrado".
 */
const { consultar } = require('../../services/db');
const { normalizarWhatsapp, normalizarFacebookUrl } = require('../../utils/validacionServidor');
const { obtenerVistaPreviaFacebook, resolverUrlCanonicaFacebook } = require('../../services/facebookPreview');

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { tipo, valor } = req.query;

  if (!tipo || !valor || !['whatsapp', 'facebook'].includes(tipo)) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  const valorNormalizado = tipo === 'whatsapp'
    ? normalizarWhatsapp(valor)
    : normalizarFacebookUrl(valor);

  if (!valorNormalizado) {
    res.status(400).json({ error: 'Valor de búsqueda inválido' });
    return;
  }

  // columna sale de una lista fija, nunca del usuario
  const columna = tipo === 'whatsapp' ? 'whatsapp' : 'facebook_url';

  try {
    const candidatos = [valorNormalizado];
    if (tipo === 'facebook' && valorNormalizado.includes('/share/')) {
      const resuelto = await resolverUrlCanonicaFacebook(valorNormalizado);
      if (resuelto && resuelto !== valorNormalizado) candidatos.unshift(resuelto);
    }

    const filasNegocio = await consultar(
      `SELECT * FROM negocios WHERE ${columna} = ANY($1) LIMIT 1`,
      [candidatos]
    );
    const negocio = filasNegocio[0];

    if (!negocio) {
      res.status(200).json({ encontrado: false });
      return;
    }

    const reportes = await consultar(
      `SELECT id, ciudad, descripcion, motivo, creado_en, hubo_perdida_economica
       FROM reportes
       WHERE negocio_id = $1 AND estado = 'aprobado'
       ORDER BY creado_en DESC`,
      [negocio.id]
    );

    // Sin reportes aprobados: se comporta como "no encontrado"
    if (reportes.length === 0) {
      res.status(200).json({ encontrado: false });
      return;
    }

    // ---- Vista previa de Facebook (cacheada 7 días) ----
    let vistaPrevia = null;
    if (negocio.facebook_url) {
      const cacheVencido = !negocio.facebook_og_actualizado_en
        || (Date.now() - new Date(negocio.facebook_og_actualizado_en).getTime()) > SIETE_DIAS_MS;

      if (!cacheVencido) {
        vistaPrevia = { titulo: negocio.facebook_og_titulo, imagen: negocio.facebook_og_imagen };
      } else {
        const resultado = await obtenerVistaPreviaFacebook(negocio.facebook_url);
        if (resultado) {
          vistaPrevia = { titulo: resultado.titulo, imagen: resultado.imagen };
          await consultar(
            `UPDATE negocios
             SET facebook_og_titulo = $2, facebook_og_imagen = $3, facebook_og_actualizado_en = now()
             WHERE id = $1`,
            [negocio.id, resultado.titulo, resultado.imagen]
          );

          // Autocorrección de links "share" temporales (puede chocar con
          // otro negocio que ya tenga esa URL: en ese caso se ignora)
          if (resultado.urlFinal && negocio.facebook_url.includes('/share/')) {
            try {
              await consultar('UPDATE negocios SET facebook_url = $2 WHERE id = $1', [negocio.id, resultado.urlFinal]);
            } catch (errorUrl) {
              console.error('[AlertaBo] No se pudo corregir facebook_url:', errorUrl.message);
            }
          }
        }
      }
    }

    const conteoMotivos = {};
    reportes.forEach((r) => {
      if (r.motivo) conteoMotivos[r.motivo] = (conteoMotivos[r.motivo] || 0) + 1;
    });
    const motivosFrecuentes = Object.entries(conteoMotivos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([motivo]) => motivo);

    res.status(200).json({
      encontrado: true,
      negocio: {
        nombre: negocio.nombre,
        whatsapp: negocio.whatsapp,
        facebook_url: negocio.facebook_url,
        ciudad: negocio.ciudad,
        total_reportes: negocio.total_reportes,
        nivel_riesgo: negocio.nivel_riesgo,
        ultimo_reporte_en: negocio.ultimo_reporte_en,
      },
      vista_previa_facebook: vistaPrevia,
      motivos_frecuentes: motivosFrecuentes,
      reportes,
    });
  } catch (error) {
    console.error('[AlertaBo] Error al consultar:', error);
    res.status(500).json({ error: 'Error al consultar' });
  }
};
