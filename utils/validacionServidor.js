/**
 * validacionServidor.js
 * Validación y sanitización server-side. Espejo de utilidades.js del
 * frontend, pero sin depender del DOM (corre en Node/Vercel Functions).
 */
const crypto = require('crypto');

function normalizarWhatsapp(valorCrudo) {
  if (!valorCrudo) return null;
  let soloNumeros = String(valorCrudo).replace(/[^\d]/g, '');

  if (soloNumeros.startsWith('591') && soloNumeros.length === 11) {
    soloNumeros = soloNumeros.slice(3);
  }

  const esValido = /^[67]\d{7}$/.test(soloNumeros);
  if (!esValido) return null;

  return `+591${soloNumeros}`;
}

function normalizarFacebookUrl(valorCrudo) {
  if (!valorCrudo) return null;
  let url = String(valorCrudo).trim();

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const urlObj = new URL(url);
    const dominioValido = /(^|\.)facebook\.com$|(^|\.)fb\.com$/i.test(urlObj.hostname);
    if (!dominioValido) return null;
    return urlObj.origin + urlObj.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Escapa caracteres HTML peligrosos. Defensa en profundidad: el frontend
 * también sanitiza al renderizar, pero el backend nunca debe confiar
 * solo en eso.
 */
function sanitizarTexto(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Genera un hash de la IP para poder aplicar rate-limit y detectar spam
 * sin guardar la IP real en la base de datos.
 */
function hashIp(ip) {
  const sal = process.env.IP_HASH_SALT || 'alertabo_sal_default_cambiar';
  return crypto.createHash('sha256').update(String(ip) + sal).digest('hex');
}

module.exports = {
  normalizarWhatsapp,
  normalizarFacebookUrl,
  sanitizarTexto,
  hashIp,
};
