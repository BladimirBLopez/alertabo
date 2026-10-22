/**
 * GET /api/admin/reportes?estado=&ciudad=&busqueda=&limite=
 * Lista reportes para el panel, con filtros y sus capturas.
 * Requiere sesión de admin.
 */
const { consultar } = require('../../services/db');
const { requiereAdmin } = require('../../utils/authAdmin');

function patron(texto) {
  return `%${String(texto).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = async (req, res) => {
  if (!requiereAdmin(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { estado, ciudad, busqueda, limite } = req.query;
  const condiciones = [];
  const params = [];

  if (estado && ['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
    params.push(estado);
    condiciones.push(`r.estado = $${params.length}`);
  }
  if (ciudad) {
    params.push(patron(ciudad));
    condiciones.push(`r.ciudad ILIKE $${params.length}`);
  }
  if (busqueda) {
    params.push(patron(busqueda));
    const n = params.length;
    condiciones.push(`(r.whatsapp ILIKE $${n} OR r.facebook_url ILIKE $${n} OR r.nombre_negocio ILIKE $${n})`);
  }

  params.push(Math.min(parseInt(limite, 10) || 50, 200));
  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const reportes = await consultar(
      `SELECT r.id, r.negocio_id, r.nombre_negocio, r.whatsapp, r.facebook_url, r.ciudad,
              r.descripcion, r.hubo_perdida_economica, r.monto_perdido, r.motivo, r.estado,
              r.motivo_rechazo, r.revisado_en, r.creado_en,
              COALESCE(
                json_agg(json_build_object('id', i.id, 'url', i.url))
                  FILTER (WHERE i.id IS NOT NULL),
                '[]'
              ) AS imagenes
       FROM reportes r
       LEFT JOIN imagenes i ON i.reporte_id = r.id
       ${donde}
       GROUP BY r.id
       ORDER BY r.creado_en DESC
       LIMIT $${params.length}`,
      params
    );
    res.status(200).json({ reportes });
  } catch (error) {
    console.error('[AlertaBo] Error al listar reportes:', error);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
};
