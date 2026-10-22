/**
 * GET /api/busqueda/recientes?limite=6
 * Últimos reportes APROBADOS con datos del negocio, para el inicio.
 */
const { consultar } = require('../../services/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const limite = Math.min(parseInt(req.query.limite, 10) || 6, 12);

  try {
    const filas = await consultar(
      `SELECT r.ciudad, r.motivo, r.descripcion, r.creado_en,
              n.nombre, n.whatsapp, n.facebook_url, n.facebook_og_titulo, n.facebook_og_imagen
       FROM reportes r
       JOIN negocios n ON n.id = r.negocio_id
       WHERE r.estado = 'aprobado'
       ORDER BY r.creado_en DESC
       LIMIT $1`,
      [limite]
    );

    // Misma forma que antes (reporte.negocios) para no tocar el frontend
    const reportes = filas.map((f) => ({
      ciudad: f.ciudad,
      motivo: f.motivo,
      descripcion: f.descripcion,
      creado_en: f.creado_en,
      negocios: {
        nombre: f.nombre,
        whatsapp: f.whatsapp,
        facebook_url: f.facebook_url,
        facebook_og_titulo: f.facebook_og_titulo,
        facebook_og_imagen: f.facebook_og_imagen,
      },
    }));

    res.status(200).json({ reportes });
  } catch (error) {
    console.error('[AlertaBo] Error en recientes:', error);
    res.status(500).json({ error: 'Error al obtener reportes recientes' });
  }
};
