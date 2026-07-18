/**
 * authAdmin.js
 * Sesión de administrador basada en un token firmado (HMAC), guardado
 * en una cookie httpOnly. No usa librerías externas: es un JWT simple
 * hecho a mano para no agregar dependencias innecesarias.
 */
const crypto = require('crypto');

const NOMBRE_COOKIE = 'alertabo_admin_sesion';
const DURACION_SESION_HORAS = 12;

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function base64UrlDecode(str) {
  return JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
}

function firmar(datos) {
  const secreto = process.env.ADMIN_JWT_SECRET || 'cambiar_este_secreto_en_vercel';
  return crypto.createHmac('sha256', secreto).update(datos).digest('base64url');
}

function crearToken(payload) {
  const cuerpo = base64UrlEncode({
    ...payload,
    exp: Date.now() + DURACION_SESION_HORAS * 60 * 60 * 1000,
  });
  const firma = firmar(cuerpo);
  return `${cuerpo}.${firma}`;
}

function verificarToken(token) {
  if (!token || !token.includes('.')) return null;
  const [cuerpo, firma] = token.split('.');
  const firmaEsperada = firmar(cuerpo);

  // Comparación en tiempo constante para evitar timing attacks
  const bufA = Buffer.from(firma || '');
  const bufB = Buffer.from(firmaEsperada);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) return null;

  try {
    const payload = base64UrlDecode(cuerpo);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function obtenerCookie(req, nombre) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  const match = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/**
 * Devuelve el payload de sesión si el request trae una cookie válida,
 * o null si no está autenticado.
 */
function requiereAdmin(req) {
  const token = obtenerCookie(req, NOMBRE_COOKIE);
  return verificarToken(token);
}

module.exports = { crearToken, verificarToken, obtenerCookie, requiereAdmin, NOMBRE_COOKIE };
