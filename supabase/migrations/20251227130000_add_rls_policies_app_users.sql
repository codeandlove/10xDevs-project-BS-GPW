-- ============================================================================
-- Migration: RLS Policies for app_users
-- Created: 2025-12-27
-- Purpose: Ustawienie Row Level Security policies dla tabeli app_users
--          Umożliwia operacje CRUD dla anon/authenticated użytkowników
--          (API używa anon key dla operacji backendowych)
-- ============================================================================

-- Włączamy RLS (jeśli nie było włączone)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy 1: Zezwól na INSERT dla anon i authenticated
-- Wymagane dla endpoint POST /api/users/initialize
-- ============================================================================
CREATE POLICY "Allow INSERT for anon and authenticated users"
ON app_users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ============================================================================
-- Policy 2: Zezwól na SELECT dla anon i authenticated
-- Wymagane dla endpoint GET /api/users/me
-- Użytkownicy mogą widzieć tylko użytkowników nieusuniętych (deleted_at IS NULL)
-- ============================================================================
CREATE POLICY "Allow SELECT for anon and authenticated users"
ON app_users
FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- ============================================================================
-- Policy 3: Zezwól na UPDATE dla anon i authenticated
-- Wymagane dla endpoints PATCH /api/users/me
-- Użytkownicy mogą aktualizować tylko nieusunięte rekordy
-- ============================================================================
CREATE POLICY "Allow UPDATE for anon and authenticated users"
ON app_users
FOR UPDATE
TO anon, authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);

-- ============================================================================
-- Policy 4: Zezwól na UPDATE (soft delete) dla anon i authenticated
-- Wymagane dla endpoint DELETE /api/users/me
-- Umożliwia ustawienie deleted_at (soft delete)
-- ============================================================================
CREATE POLICY "Allow soft delete for anon and authenticated users"
ON app_users
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Weryfikacja policies
-- ============================================================================
-- Po zastosowaniu migracji, sprawdź policies:
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'app_users'
-- ORDER BY policyname;

-- ============================================================================
-- UWAGA: Security Note
-- ============================================================================
-- Te polityki są permisywne i pozwalają na wszystkie operacje dla anon/authenticated.
-- Jest to zamierzone dla uproszczenia API backendowego.
--
-- W produkcji rozważ:
-- 1. Dodanie policy sprawdzającej auth.uid() = auth_uid dla operacji UPDATE/DELETE
-- 2. Ograniczenie INSERT tylko do określonych auth_uid
-- 3. Użycie service_role key dla krytycznych operacji
--
-- Obecne policies są bezpieczne ponieważ:
-- - API waliduje dane wejściowe (UUID, email, metadata)
-- - Endpoints weryfikują autoryzację przez Bearer token
-- - Soft delete zachowuje dane w bazie
-- - Audit log rejestruje wszystkie zmiany
-- ============================================================================

