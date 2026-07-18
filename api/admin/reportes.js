/**
 * GET /api/admin/reportes?estado=&ciudad=&busqueda=&limite=
 * Lista reportes para el panel, con filtros. Requiere sesión de admin.
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');
const { requiereAdmin } = require('../../utils/authAdmin');

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
  const supabase = obtenerClienteSupabaseAdmin();

  let consulta = supabase
    .from('reportes')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(Math.min(parseInt(limite, 10) || 50, 200));

  if (estado && ['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
    consulta = consulta.eq('estado', estado);
  }
  if (ciudad) {
    consulta = consulta.ilike('ciudad', `%${ciudad}%`);
  }
  if (busqueda) {
    const b = busqueda.replace(/[%,]/g, '');
    consulta = consulta.or(`whatsapp.ilike.%${b}%,facebook_url.ilike.%${b}%,nombre_negocio.ilike.%${b}%`);
  }

  const { data, error } = await consulta;

  if (error) {
    res.status(500).json({ error: 'Error al obtener reportes' });
    return;
  }

  res.status(200).json({ reportes: data || [] });
};
