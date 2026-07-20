/**
 * GET /api/busqueda/consultar?tipo=whatsapp|facebook&valor=...
 * Endpoint público de solo lectura. Devuelve el negocio (si existe),
 * sus reportes APROBADOS, y una vista previa de la página de Facebook
 * si aplica (cacheada por 7 días).
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');
const { normalizarWhatsapp, normalizarFacebookUrl } = require('../../utils/validacionServidor');
const { obtenerVistaPreviaFacebook } = require('../../services/facebookPreview');

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

  const supabase = obtenerClienteSupabaseAdmin();
  const columna = tipo === 'whatsapp' ? 'whatsapp' : 'facebook_url';

  const { data: negocio, error: errorNegocio } = await supabase
    .from('negocios')
    .select('*')
    .eq(columna, valorNormalizado)
    .maybeSingle();

  if (errorNegocio) {
    res.status(500).json({ error: 'Error al consultar' });
    return;
  }

  if (!negocio) {
    res.status(200).json({ encontrado: false });
    return;
  }

  let vistaPrevia = null;
  if (negocio.facebook_url) {
    const cacheVencido = !negocio.facebook_og_actualizado_en
      || (Date.now() - new Date(negocio.facebook_og_actualizado_en).getTime()) > SIETE_DIAS_MS;

    if (!cacheVencido) {
      vistaPrevia = { titulo: negocio.facebook_og_titulo, imagen: negocio.facebook_og_imagen };
    } else {
      const resultado = await obtenerVistaPreviaFacebook(negocio.facebook_url);
      if (resultado) {
        vistaPrevia = resultado;
        await supabase.from('negocios').update({
          facebook_og_titulo: resultado.titulo,
          facebook_og_imagen: resultado.imagen,
          facebook_og_actualizado_en: new Date().toISOString(),
        }).eq('id', negocio.id);
      }
    }
  }

  const { data: reportes, error: errorReportes } = await supabase
    .from('reportes')
    .select('id, ciudad, descripcion, motivo, creado_en, hubo_perdida_economica')
    .eq('negocio_id', negocio.id)
    .eq('estado', 'aprobado')
    .order('creado_en', { ascending: false });

  if (errorReportes) {
    res.status(500).json({ error: 'Error al consultar reportes' });
    return;
  }

  const conteoMotivos = {};
  (reportes || []).forEach((r) => {
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
    reportes: reportes || [],
  });
};
