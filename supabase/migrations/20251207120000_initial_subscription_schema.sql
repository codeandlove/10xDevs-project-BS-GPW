-- ============================================================================
-- Migration: Initial Subscription Schema
-- Created: 2025-12-07 12:00:00 UTC
-- Purpose: Tworzy podstawowy schemat dla zarządzania użytkownikami,
--          subskrypcjami Stripe i audytem
-- Affected Tables: app_users, stripe_webhook_events, subscription_audit
-- Notes:
--   - Integracja z Supabase Auth (auth.users)
--   - Row Level Security włączone dla wszystkich tabel
--   - Implementacja soft-delete dla app_users
--   - Idempotencja webhooków Stripe przez unique constraint
-- ============================================================================

-- ============================================================================
-- 1. Tworzenie typów pomocniczych
-- ============================================================================

-- enum dla statusu subskrypcji użytkownika
-- wartości zgodne z lifecycle subskrypcji stripe
create type subscription_status as enum (
  'trial',      -- użytkownik w okresie próbnym
  'active',     -- aktywna płatna subskrypcja
  'past_due',   -- płatność zaległa
  'canceled',   -- subskrypcja anulowana
  'unpaid'      -- subskrypcja niezapłacona (grace period zakończony)
);

-- ============================================================================
-- 2. Tabela app_users - metadane użytkowników i subskrypcji
-- ============================================================================

-- tabela przechowuje metadane aplikacyjne użytkowników
-- źródło prawdy dla tożsamości: auth.users (supabase auth)
-- app_users przechowuje wyłącznie: role, stan subskrypcji, stripe ids, metadata
create table app_users (
  -- klucz główny i foreign key do auth.users (1:1 relation)
  auth_uid uuid primary key not null references auth.users(id) on delete cascade,

  -- rola użytkownika w aplikacji
  -- 'user' - zwykły użytkownik, 'admin' - administrator (przydzielane ręcznie)
  role text not null default 'user',

  -- identyfikatory stripe (nullable - wypełniane przy pierwszej płatności)
  stripe_customer_id text unique,
  stripe_subscription_id text unique,

  -- stan subskrypcji
  subscription_status subscription_status not null default 'trial',

  -- daty związane z subskrypcją
  trial_expires_at timestamptz,  -- koniec okresu próbnego
  current_period_end timestamptz, -- koniec bieżącego okresu rozliczeniowego

  -- plan subskrypcji (stripe price id lub identyfikator planu)
  plan_id text,

  -- elastyczne pole na dodatkowe metadane (preferencje, ustawienia itp.)
  metadata jsonb not null default '{}'::jsonb,

  -- soft-delete dla zachowania zgodności z gdpr i możliwości przywracania
  deleted_at timestamptz,

  -- timestampy audytowe
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- włączenie row level security
-- polityki zdefiniowane poniżej zapewnią bezpieczeństwo na poziomie bazy
alter table app_users enable row level security;

-- ============================================================================
-- 3. Tabela stripe_webhook_events - logi webhooków stripe
-- ============================================================================

-- przechowuje wszystkie webhooки otrzymane od stripe
-- cel: idempotencja, debugging, audyt integracji
create table stripe_webhook_events (
  -- uuid jako primary key
  id uuid primary key default gen_random_uuid(),

  -- identyfikator eventu od stripe (evt_xxx)
  -- unique constraint zapewnia idempotencję - ten sam event nie zostanie przetworzony dwukrotnie
  event_id text not null unique,

  -- surowy payload webhooka (całe zdarzenie od stripe)
  payload jsonb not null,

  -- timestampy przetwarzania
  received_at timestamptz not null default now(),
  processed_at timestamptz, -- wypełniane po zakończeniu przetwarzania

  -- status przetwarzania eventu
  -- wartości: 'received', 'processing', 'processed', 'failed'
  status text,

  -- komunikat błędu jeśli przetwarzanie nie powiodło się
  error text,

  -- opcjonalne powiązanie z użytkownikiem (wypełniane podczas parsowania)
  -- on delete set null - zachowujemy logi nawet po usunięciu użytkownika
  user_id uuid references app_users(auth_uid) on delete set null
);

-- włączenie row level security
alter table stripe_webhook_events enable row level security;

-- ============================================================================
-- 4. Tabela subscription_audit - audyt zmian subskrypcji
-- ============================================================================

-- przechowuje historię wszystkich zmian stanu subskrypcji użytkownika
-- cel: compliance, debugging, analiza customer journey
create table subscription_audit (
  -- uuid jako primary key
  id uuid primary key default gen_random_uuid(),

  -- powiązanie z użytkownikiem
  -- on delete set null - zachowujemy audyt nawet po usunięciu użytkownika
  user_id uuid references app_users(auth_uid) on delete set null,

  -- typ zmiany (np. 'subscription_updated', 'trial_started', 'subscription_canceled')
  change_type text not null,

  -- poprzedni i aktualny stan (snapshot istotnych pól)
  previous jsonb,
  current jsonb,

  -- timestamp zdarzenia
  created_at timestamptz not null default now()
);

-- włączenie row level security
alter table subscription_audit enable row level security;

-- ============================================================================
-- 5. Indeksy
-- ============================================================================

-- app_users indeksy
create index idx_app_users_subscription_status on app_users(subscription_status);
create index idx_app_users_current_period_end on app_users(current_period_end);
create index idx_app_users_stripe_customer_id on app_users(stripe_customer_id);
create index idx_app_users_stripe_subscription_id on app_users(stripe_subscription_id);

-- stripe_webhook_events indeksy
-- unique index na event_id dla idempotencji
create unique index ux_stripe_webhook_event_id on stripe_webhook_events(event_id);
create index idx_stripe_webhook_user_id on stripe_webhook_events(user_id);
create index idx_stripe_webhook_status on stripe_webhook_events(status);

-- subscription_audit indeksy
create index idx_subscription_audit_user_id on subscription_audit(user_id);
create index idx_subscription_audit_created_at on subscription_audit(created_at);

-- ============================================================================
-- 6. Funkcje pomocnicze
-- ============================================================================

-- funkcja automatycznej aktualizacji pola updated_at
-- wywołana przed update rekordu
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 7. Triggery
-- ============================================================================

-- trigger automatycznej aktualizacji updated_at dla app_users
create trigger update_app_users_updated_at
  before update on app_users
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- 8. Row Level Security Policies - app_users
-- ============================================================================

-- polityka select dla app_users
-- użytkownik authenticated może czytać swój własny rekord
create policy "authenticated users can view own record"
  on app_users
  for select
  to authenticated
  using (auth.uid() = auth_uid);

-- admin może czytać wszystkie rekordy
create policy "admins can view all records"
  on app_users
  for select
  to authenticated
  using (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  );

-- polityka insert dla app_users
-- service role może tworzyć rekordy (synchronizacja po rejestracji)
create policy "service role can insert users"
  on app_users
  for insert
  to service_role
  with check (true);

-- użytkownik authenticated może utworzyć swój własny rekord
create policy "authenticated users can insert own record"
  on app_users
  for insert
  to authenticated
  with check (auth.uid() = auth_uid);

-- polityka update dla app_users
-- użytkownik może aktualizować swój własny rekord
create policy "authenticated users can update own record"
  on app_users
  for update
  to authenticated
  using (auth.uid() = auth_uid)
  with check (auth.uid() = auth_uid);

-- service role może aktualizować wszystkie rekordy (webhooки stripe)
create policy "service role can update all records"
  on app_users
  for update
  to service_role
  using (true)
  with check (true);

-- admin może aktualizować wszystkie rekordy
create policy "admins can update all records"
  on app_users
  for update
  to authenticated
  using (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  );

-- polityka delete dla app_users
-- tylko service role może usuwać rekordy (preferować soft-delete)
-- uwaga: to jest fizyczne usunięcie - używać ostrożnie
create policy "service role can delete users"
  on app_users
  for delete
  to service_role
  using (true);

-- ============================================================================
-- 9. Row Level Security Policies - stripe_webhook_events
-- ============================================================================

-- polityka select dla stripe_webhook_events
-- tylko service role może czytać logi webhooków
create policy "service role can view webhook events"
  on stripe_webhook_events
  for select
  to service_role
  using (true);

-- admin może czytać logi webhooków
create policy "admins can view webhook events"
  on stripe_webhook_events
  for select
  to authenticated
  using (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  );

-- polityka insert dla stripe_webhook_events
-- tylko service role może zapisywać webhooки (endpoint backendowy)
create policy "service role can insert webhook events"
  on stripe_webhook_events
  for insert
  to service_role
  with check (true);

-- polityka update dla stripe_webhook_events
-- service role może aktualizować status przetwarzania
create policy "service role can update webhook events"
  on stripe_webhook_events
  for update
  to service_role
  using (true)
  with check (true);

-- polityka delete dla stripe_webhook_events
-- service role może usuwać stare logi (retencja 90 dni)
create policy "service role can delete webhook events"
  on stripe_webhook_events
  for delete
  to service_role
  using (true);

-- ============================================================================
-- 10. Row Level Security Policies - subscription_audit
-- ============================================================================

-- polityka select dla subscription_audit
-- service role może czytać audyt
create policy "service role can view audit"
  on subscription_audit
  for select
  to service_role
  using (true);

-- admin może czytać audyt
create policy "admins can view audit"
  on subscription_audit
  for select
  to authenticated
  using (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  );

-- użytkownik może czytać swój własny audyt
create policy "users can view own audit"
  on subscription_audit
  for select
  to authenticated
  using (auth.uid() = user_id);

-- polityka insert dla subscription_audit
-- tylko service role może zapisywać do audytu
create policy "service role can insert audit"
  on subscription_audit
  for insert
  to service_role
  with check (true);

-- admin może zapisywać do audytu
create policy "admins can insert audit"
  on subscription_audit
  for insert
  to authenticated
  with check (
    exists (
      select 1 from app_users au
      where au.auth_uid = auth.uid()
      and au.role = 'admin'
    )
  );

-- polityka delete dla subscription_audit
-- tylko service role może usuwać audyt (ostrożnie - tylko dla celów maintenance)
create policy "service role can delete audit"
  on subscription_audit
  for delete
  to service_role
  using (true);

-- ============================================================================
-- Koniec migracji
-- ============================================================================

-- podsumowanie:
-- ✓ utworzono enum subscription_status
-- ✓ utworzono tabele: app_users, stripe_webhook_events, subscription_audit
-- ✓ dodano wszystkie wymagane indeksy
-- ✓ włączono rls dla wszystkich tabel
-- ✓ utworzono granularne polityki rls (osobne dla select, insert, update, delete)
-- ✓ utworzono trigger dla automatycznej aktualizacji updated_at
-- ✓ dodano obszerne komentarze wyjaśniające logikę biznesową

-- następne kroki:
-- 1. uruchomić migrację: supabase db push
-- 2. utworzyć seed data dla konta admin (ręcznie lub przez seed script)
-- 3. zaimplementować middleware synchronizujący auth.users -> app_users
-- 4. zaimplementować webhook handler dla stripe events

