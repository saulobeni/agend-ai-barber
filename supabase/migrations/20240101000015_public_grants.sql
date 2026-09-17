-- =========================================================
-- GRANTS PADRAO DO SCHEMA PUBLIC
-- Necessario sempre que o schema public for recriado do zero
-- (DROP SCHEMA public CASCADE; CREATE SCHEMA public;), pois um
-- schema novo nao tem as permissoes que o Supabase configura por
-- padrao para as roles anon/authenticated/service_role. Sem isso,
-- mesmo com as RLS policies corretas, as roles recebem
-- "permission denied for table X" (42501) ao tentar qualquer
-- select/insert, porque falta o GRANT de base antes da RLS entrar
-- em jogo.
-- =========================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
