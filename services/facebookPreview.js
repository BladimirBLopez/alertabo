/**
 * facebookPreview.js
 * Obtiene el título (og:title) e imagen (og:image) públicos de una
 * página de Facebook, tipo "vista previa al compartir un link".
 * Best-effort: si Facebook bloquea el acceso o no hay metadatos,
 * devuelve null sin romper nada.
 */

async function obtenerVistaPreviaFacebook(url) {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 4000);

    const respuesta = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: controlador.signal,
    });
    clearTimeout(temporizador);

    if (!respuesta.ok) return null;
    const html = await respuesta.text();

    const titulo = extraerMeta(html, 'og:title');
    const imagen = extraerMeta(html, 'og:image');

    if (!titulo && !imagen) return null;
    return { titulo: titulo || null, imagen: imagen || null };
  } catch {
    return null;
  }
}

function extraerMeta(html, propiedad) {
  const regex = new RegExp(`<meta[^>]+property=["']${propiedad}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

module.exports = { obtenerVistaPreviaFacebook };
