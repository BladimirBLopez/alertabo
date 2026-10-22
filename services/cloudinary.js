/**
 * cloudinary.js
 * Subida y borrado firmado de imágenes desde el backend.
 * Requiere CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Vercel.
 */
const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dkq95jus0';
const CARPETA = 'alertabo/capturas';

function firmar(params) {
  const base = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(base + process.env.CLOUDINARY_API_SECRET).digest('hex');
}

async function subirImagen(base64) {
  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.append('file', `data:image/jpeg;base64,${base64}`);
  form.append('api_key', process.env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', CARPETA);
  form.append('signature', firmar({ folder: CARPETA, timestamp }));

  const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!respuesta.ok) throw new Error(`Cloudinary respondió ${respuesta.status}`);
  const datos = await respuesta.json();
  return { url: datos.secure_url, publicId: datos.public_id };
}

async function eliminarImagen(publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', process.env.CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', firmar({ public_id: publicId, timestamp }));

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body: form,
  });
}

module.exports = { subirImagen, eliminarImagen };
