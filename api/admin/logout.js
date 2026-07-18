/**
 * POST /api/admin/logout
 * Borra la cookie de sesión.
 */
const { NOMBRE_COOKIE } = require('../../utils/authAdmin');

module.exports = async (req, res) => {
  const cookie = `${NOMBRE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
};
