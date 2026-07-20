/**
 * facebookPreview.js
 * Obtiene el título (og:title) e imagen (og:image) públicos de una
 * página de Facebook, y también resuelve la URL final después de
 * seguir redirecciones (importante para links "share/xxxxx", que son
 * temporales y cambian cada vez que alguien comparte la misma página).
 * Best-effort: si Facebook bloquea el acceso, devuelve null.
 */

async function obtenerVistaPreviaFacebook(url) {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 5000);

    const respuesta = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: controlador.signal,
      redirect: 'follow',
    });
    clearTimeout(temporizador);

    const urlFinal = normalizarUrlFinal(respuesta.url) || null;

    if (!respuesta.ok) return { titulo: null, imagen: null, urlFinal };

    const html = await respuesta.text();
    const titulo = extraerMeta(html, 'og:title');
    const imagen = extraerMeta(html, 'og:image');

    if (!titulo && !imagen && !urlFinal) return null;
    return { titulo: titulo || null, imagen: imagen || null, urlFinal };
  } catch {
    return null;
  }
}

/**
 * Resuelve SOLO la URL final (sin descargar el título/imagen). Se usa
 * al enviar un reporte, para guardar de una vez la URL permanente en
 * vez del link temporal de "share".
 */
async function resolverUrlCanonicaFacebook(url) {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 4000);

    const respuesta = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: controlador.signal,
      redirect: 'follow',
    });
    clearTimeout(temporizador);

    return normalizarUrlFinal(respuesta.url) || url;
  } catch {
    return url;
  }
}

function normalizarUrlFinal(urlFinal) {
  if (!urlFinal || !urlFinal.startsWith('http')) return null;
  try {
    const u = new URL(urlFinal);
    return (u.origin + u.pathname.replace(/\/+$/, '')).toLowerCase();
  } catch {
    return null;
  }
}

function extraerMeta(html, propiedad) {
  const regex = new RegExp(`<meta[^>]+property=["']${propiedad}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  if (!match) return null;
  return decodificarEntidadesHtml(match[1]);
}

function decodificarEntidadesHtml(texto) {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

module.exports = { obtenerVistaPreviaFacebook, resolverUrlCanonicaFacebook };
