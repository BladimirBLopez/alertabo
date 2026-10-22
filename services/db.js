/**
 * db.js
 * Conexión a Neon (Postgres serverless) para uso EXCLUSIVO del backend.
 * Requiere DATABASE_URL (cadena pooled de Neon) en Vercel.
 */
const { neon } = require('@neondatabase/serverless');

let sql;

function obtenerSql() {
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

/**
 * Ejecuta una consulta parametrizada ($1, $2...) y devuelve el array de filas.
 */
async function consultar(texto, params = []) {
  return obtenerSql().query(texto, params);
}

module.exports = { consultar };
