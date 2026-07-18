/**
 * GET /api/busqueda/recientes?limite=6
 * Devuelve los últimos reportes APROBADOS, para la sección de inicio.
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const limite = Math.min(parseInt(req.query.limite, 10) || 6, 12);
  const supabase = obtenerClienteSupabaseAdmin();

  const { data, error } = await supabase
    .from('reportes')
    .select('ciudad, motivo, descripcion, creado_en')
    .eq('estado', 'aprobado')
    .order('creado_en', { ascending: false })
    .limit(limite);

  if (error) {
    res.status(500).json({ error: 'Error al obtener reportes recientes' });
    return;
  }

  res.status(200).json({ reportes: data || [] });
};
