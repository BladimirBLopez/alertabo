/**
 * GET /api/admin/verificar
 * Confirma si la sesión actual (cookie) sigue siendo válida.
 * Usado por dashboard.html al cargar, para redirigir a login si no.
 */
const { requiereAdmin } = require('../../utils/authAdmin');

module.exports = async (req, res) => {
  const sesion = requiereAdmin(req);
  res.status(200).json({ autenticado: Boolean(sesion) });
};
