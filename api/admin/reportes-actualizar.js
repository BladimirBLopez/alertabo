/**
 * POST /api/admin/reportes-actualizar
 * body: { id, accion: 'aprobar'|'rechazar'|'eliminar'|'editar', motivo_rechazo?, cambios? }
 * Requiere sesión de admin.
 */
const { obtenerClienteSupabaseAdmin } = require('../../services/supabaseAdmin');
const { requiereAdmin } = require('../../utils/authAdmin');
const { sanitizarTexto } = require('../../utils/validacionServidor');

module.exports = async (req, res) => {
  if (!requiereAdmin(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { id, accion, motivo_rechazo, cambios } = req.body || {};
  if (!id || !accion) {
    res.status(400).json({ error: 'Faltan parámetros' });
    return;
  }

  const supabase = obtenerClienteSupabaseAdmin();

  if (accion === 'aprobar') {
    const { error } = await supabase
      .from('reportes')
      .update({ estado: 'aprobado', revisado_en: new Date().toISOString() })
      .eq('id', id);
    if (error) { res.status(500).json({ error: 'Error al aprobar' }); return; }

  } else if (accion === 'rechazar') {
    const { error } = await supabase
      .from('reportes')
      .update({
        estado: 'rechazado',
        motivo_rechazo: sanitizarTexto(String(motivo_rechazo || '')).slice(0, 300),
        revisado_en: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) { res.status(500).json({ error: 'Error al rechazar' }); return; }

  } else if (accion === 'eliminar') {
    const { error } = await supabase.from('reportes').delete().eq('id', id);
    if (error) { res.status(500).json({ error: 'Error al eliminar' }); return; }

  } else if (accion === 'editar') {
    const permitido = {};
    if (cambios?.ciudad) permitido.ciudad = sanitizarTexto(String(cambios.ciudad)).slice(0, 80);
    if (cambios?.descripcion) permitido.descripcion = sanitizarTexto(String(cambios.descripcion)).slice(0, 1500);
    if (cambios?.motivo) permitido.motivo = sanitizarTexto(String(cambios.motivo)).slice(0, 80);
    if (cambios?.nombre_negocio !== undefined) {
      permitido.nombre_negocio = sanitizarTexto(String(cambios.nombre_negocio || '')).slice(0, 120);
    }
    const { error } = await supabase.from('reportes').update(permitido).eq('id', id);
    if (error) { res.status(500).json({ error: 'Error al editar' }); return; }

  } else {
    res.status(400).json({ error: 'Acción inválida' });
    return;
  }

  res.status(200).json({ ok: true });
};
