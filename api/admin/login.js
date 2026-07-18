/**
 * POST /api/admin/login
 * Verifica la contraseña de administrador y crea la sesión (cookie).
 */
const { crearToken, NOMBRE_COOKIE } = require('../../utils/authAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { password } = req.body || {};
  const passwordCorrecta = process.env.ADMIN_PASSWORD;

  if (!passwordCorrecta) {
    res.status(500).json({ error: 'El panel no está configurado (falta ADMIN_PASSWORD en Vercel)' });
    return;
  }

  if (!password || password !== passwordCorrecta) {
    // Pequeño delay para dificultar ataques de fuerza bruta
    await new Promise((r) => setTimeout(r, 500));
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return;
  }

  const token = crearToken({ rol: 'admin' });
  const cookie = `${NOMBRE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${12 * 60 * 60}`;

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ ok: true });
};
