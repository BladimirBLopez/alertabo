/**
 * POST /api/admin/reportes-actualizar
 * body: { id, accion: 'aprobar'|'rechazar'|'eliminar'|'editar', motivo_rechazo?, cambios? }
 * Requiere sesión de admin.
 */
const { consultar } = require('../../services/db');
const { eliminarImagen } = require('../../services/cloudinary');
const { requiereAdmin } = require('../../utils/authAdmin');
const { MOTIVOS_REPORTE } = require('../../config/constantes');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function limpiar(texto, max) {
  return String(texto || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

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
  if (!id || !accion || !UUID.test(String(id))) {
    res.status(400).json({ error: 'Faltan parámetros' });
    return;
  }

  try {
    let filas;

    if (accion === 'aprobar') {
      filas = await consultar(
        `UPDATE reportes SET estado = 'aprobado', motivo_rechazo = NULL, revisado_en = now()
         WHERE id = $1 RETURNING id`,
        [id]
      );

    } else if (accion === 'rechazar') {
      filas = await consultar(
        `UPDATE reportes SET estado = 'rechazado', motivo_rechazo = $2, revisado_en = now()
         WHERE id = $1 RETURNING id`,
        [id, limpiar(motivo_rechazo, 300)]
      );

    } else if (accion === 'eliminar') {
      const imagenes = await consultar('SELECT public_id FROM imagenes WHERE reporte_id = $1', [id]);
      filas = await consultar('DELETE FROM reportes WHERE id = $1 RETURNING id', [id]);
      for (const img of imagenes) {
        if (!img.public_id) continue;
        try { await eliminarImagen(img.public_id); } catch (e) { console.error('[AlertaBo] No se borró imagen:', e.message); }
      }

    } else if (accion === 'editar') {
      const c = cambios || {};
      const ciudad = limpiar(c.ciudad, 80) || null;
      const descripcion = limpiar(c.descripcion, 1500) || null;
      const motivo = MOTIVOS_REPORTE.includes(c.motivo) ? c.motivo : null;
      const cambiaNombre = c.nombre_negocio !== undefined;
      const nombre = cambiaNombre ? (limpiar(c.nombre_negocio, 120) || null) : null;

      filas = await consultar(
        `UPDATE reportes SET
           ciudad = COALESCE($2, ciudad),
           descripcion = COALESCE($3, descripcion),
           motivo = COALESCE($4, motivo),
           nombre_negocio = CASE WHEN $5::boolean THEN $6::text ELSE nombre_negocio END
         WHERE id = $1 RETURNING id`,
        [id, ciudad, descripcion, motivo, cambiaNombre, nombre]
      );

    } else {
      res.status(400).json({ error: 'Acción inválida' });
      return;
    }

    if (!filas || filas.length === 0) {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[AlertaBo] Error en reportes-actualizar:', error);
    res.status(500).json({ error: 'Error al procesar la acción' });
  }
};
