/**
 * GET /api/admin/estadisticas
 * Contadores para las tarjetas del dashboard.
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');
const { requiereAdmin } = require('../../utils/authAdmin');

module.exports = async (req, res) => {
  if (!requiereAdmin(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }

  const supabase = obtenerClienteSupabaseAdmin();

  const [totalRes, pendientesRes, aprobadosRes, rechazadosRes] = await Promise.all([
    supabase.from('reportes').select('id', { count: 'exact', head: true }),
    supabase.from('reportes').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('reportes').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
    supabase.from('reportes').select('id', { count: 'exact', head: true }).eq('estado', 'rechazado'),
  ]);

  res.status(200).json({
    total: totalRes.count || 0,
    pendientes: pendientesRes.count || 0,
    aprobados: aprobadosRes.count || 0,
    rechazados: rechazadosRes.count || 0,
  });
};
