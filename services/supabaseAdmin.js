/**
 * supabaseAdmin.js
 * Cliente de Supabase para uso EXCLUSIVO del backend (/api).
 * Usa la SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
 * NUNCA importar este archivo desde código que corra en el navegador.
 */
const { createClient } = require('@supabase/supabase-js');

let cliente;

function obtenerClienteSupabaseAdmin() {
  if (!cliente) {
    cliente = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return cliente;
}

module.exports = { obtenerClienteSupabaseAdmin };
