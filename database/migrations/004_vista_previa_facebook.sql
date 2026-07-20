-- =====================================================================
-- ALERTABO — Vista previa de página de Facebook (cache de Open Graph)
-- =====================================================================
alter table negocios add column if not exists facebook_og_titulo text;
alter table negocios add column if not exists facebook_og_imagen text;
alter table negocios add column if not exists facebook_og_actualizado_en timestamptz;
