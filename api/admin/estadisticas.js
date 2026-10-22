/**
 * GET /api/admin/estadisticas
 * Contadores para las tarjetas del dashboard.
 */
const { consultar } = require('../../services/db');
const { requiereAdmin } = require('../../utils/authAdmin');

module.exports = async (req, res) => {
  if (!requiereAdmin(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  try {
    const filas = await consultar(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
         count(*) FILTER (WHERE estado = 'aprobado')::int AS aprobados,
         count(*) FILTER (WHERE estado = 'rechazado')::int AS rechazados
       FROM reportes`
    );
    res.status(200).json(filas[0]);
  } catch (error) {
    console.error('[AlertaBo] Error en estadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
