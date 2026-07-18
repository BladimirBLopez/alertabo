/**
 * constantes.js
 * Valores compartidos por las funciones del backend.
 */
module.exports = {
  MOTIVOS_REPORTE: [
    'No entrega el producto',
    'Cobro duplicado',
    'Producto distinto al ofrecido',
    'No responde tras el pago',
    'Precios engañosos',
    'Otro',
  ],
  LIMITE_IMAGENES_POR_REPORTE: 3,
  TAMANO_MAX_IMAGEN_BYTES: 4 * 1024 * 1024, // 4MB por imagen
  VENTANA_RATE_LIMIT_MINUTOS: 10,
  MAX_REPORTES_POR_IP_EN_VENTANA: 3,
};
