# Schemat bazy danych PostgreSQL — Black Swan Grid (MVP)

Poniżej znajduje się finalny schemat bazy danych zaprojektowany dla MVP zgodnie z PRD, notatkami ze sesji planistycznej i wybranym stackiem technologicznym (Supabase/Postgres).

---

## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### 1.1. Typy pomocnicze

- `subscription_status` ENUM: ('trial', 'active', 'past_due', 'canceled', 'unpaid')

---

### 1.2. `app_users` (meta informacje o użytkownikach i subskrypcjach)

- `auth_uid` uuid PRIMARY KEY NOT NULL — FK -> `auth.users(id)` (ON DELETE CASCADE)
- `role` text NOT NULL DEFAULT 'user' -- wartości: 'user', 'admin'
- `stripe_customer_id` text NULL UNIQUE
- `stripe_subscription_id` text NULL UNIQUE
- `subscription_status` subscription_status NOT NULL DEFAULT 'trial'
- `trial_expires_at` timestamptz NULL
- `current_period_end` timestamptz NULL
- `plan_id` text NULL
- `metadata` jsonb NOT NULL DEFAULT '{}'::jsonb
- `deleted_at` timestamptz NULL -- soft-delete
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

Ograniczenia i uwagi:

- `auth.users` (Supabase Auth) jest źródłem prawdy dla tożsamości i danych logowania; `app_users` przechowuje wyłącznie metadane aplikacyjne (stan trial/subskrypcji, role, Stripe IDs, metadata) i nie duplikuje profili użytkowników.
- `auth_uid` jest kluczem głównym i jednocześnie powiązaniem 1:1 z Supabase Auth. Rekordy w `app_users` są tworzone/synchronizowane przy rejestracji użytkownika (preferowane) lub fallbackem przez webhook `auth.user.created`/job synchronizujący.
- Unikalność pól `stripe_customer_id` i `stripe_subscription_id` ułatwia wyszukiwanie po Stripe.
- Preferowane użycie soft-delete (`deleted_at`) dla GDPR i możliwości przywracania.
- Pole `role = 'admin'` przydzielane ręcznie przez dewelopera (seed/INSERT) dla MVP.

---

### 1.3. `stripe_webhook_events` (log webhooków Stripe, idempotencja)

- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `event_id` text NOT NULL UNIQUE -- identyfikator webhooka od Stripe
- `payload` jsonb NOT NULL -- surowy payload webhooka
- `received_at` timestamptz NOT NULL DEFAULT now()
- `processed_at` timestamptz NULL
- `status` text NULL -- np. 'received', 'processing', 'processed', 'failed'
- `error` text NULL
- `user_id` uuid NULL -- opcjonalne FK -> `app_users(auth_uid)` jeśli event zostanie zmapowany

Ograniczenia i uwagi:

- Unikalny constraint na `event_id` zapewnia idempotencję (INSERT ... ON CONFLICT DO NOTHING).
- `user_id` jest opcjonalne i może zostać wypełnione podczas przetwarzania webhooka (ułatwia audyt powiązań).

---

### 1.4. `subscription_audit` (audyt zmian stanu subskrypcji)

- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid NULL REFERENCES `app_users(auth_uid)` ON DELETE SET NULL
- `change_type` text NOT NULL -- np. 'subscription_updated', 'trial_started', 'subscription_canceled'
- `previous` jsonb NULL
- `current` jsonb NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

Ograniczenia i uwagi:

- Zapisy do `subscription_audit` powinny być wykonywane w tej samej transakcji co aktualizacja stanu użytkownika dla spójności audytu.

---

### 1.5. (Opcjonalnie) `subscriptions` — lekka historia subskrypcji (można dodać później)

- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL REFERENCES `app_users(auth_uid)` ON DELETE CASCADE
- `stripe_subscription_id` text UNIQUE
- `status` subscription_status NOT NULL
- `current_period_start` timestamptz NULL
- `current_period_end` timestamptz NULL
- `trial_start` timestamptz NULL
- `trial_end` timestamptz NULL
- `metadata` jsonb DEFAULT '{}'::jsonb
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

Uwaga: dla MVP przechowujemy kluczowy stan w `app_users`; tabelę `subscriptions` dodać gdy będzie potrzebna historia/analiza.

---

## 2. Relacje między tabelami

1. `auth.users (Supabase Auth)` 1:1 -> `app_users` (`auth.users.id` = `app_users.auth_uid`).
   - Uwaga: `auth.users` jest źródłem prawdy; `app_users` jest tabelą meta (synchronizowaną), nie zastępuje Auth.
2. `app_users` 1:0..\* -> `subscription_audit` (jedno konto -> wiele wpisów audytu).
3. `app_users` 1:0..\* -> `stripe_webhook_events` (opcjonalne mapowanie eventów do użytkownika jeśli parsowane).
4. (Opcjonalnie) `app_users` 1:0..\* -> `subscriptions` (jeśli dodane później: historia subskrypcji użytkownika).

Kardynalności:

- `app_users` ↔ `auth.users`: 1 do 1
- `app_users` ↔ `subscription_audit`: 1 do wielu
- `app_users` ↔ `stripe_webhook_events`: 1 do wielu (opcjonalne powiązanie po parsowaniu)

---

## 3. Indeksy

Minimalne i rekomendowane indeksy dla MVP:

- `app_users`:
  - `CREATE INDEX idx_app_users_auth_uid ON app_users(auth_uid);` -- szybkie lookupy po auth uid (choć to PK)
  - `CREATE INDEX idx_app_users_subscription_status ON app_users(subscription_status);`
  - `CREATE INDEX idx_app_users_current_period_end ON app_users(current_period_end);`
  - `CREATE INDEX idx_app_users_stripe_customer_id ON app_users(stripe_customer_id);` -- jeśli używane w integracjach
  - `CREATE INDEX idx_app_users_stripe_subscription_id ON app_users(stripe_subscription_id);`

- `stripe_webhook_events`:
  - `CREATE UNIQUE INDEX ux_stripe_webhook_event_id ON stripe_webhook_events(event_id);`
  - `CREATE INDEX idx_stripe_webhook_user_id ON stripe_webhook_events(user_id);` -- przydatne do audytu

- `subscription_audit`:
  - `CREATE INDEX idx_subscription_audit_user_id ON subscription_audit(user_id);`

Uwagi dotyczące wydajności:

- Indeksy powyższe są minimalistyczne i umożliwiają szybkie walidacje w middleware oraz szybkie wyszukiwanie po kluczowych polach Stripe.
- Możliwość dodania composite index (`auth_uid, subscription_status`) jeśli middleware często sprawdza oba pola jednocześnie.

---

## 4. Zasady PostgreSQL / RLS (Row Level Security)

Wskazane polityki RLS zgodne z wymaganiami (Supabase):

### 4.1. `app_users` RLS

- Włączyć RLS: `ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;`
- SELECT policy: pozwól gdy
  - `auth.uid() = auth_uid`
  - OR `role = 'admin'`
  - OR `subscription_status = 'active'`
  - OR `(trial_expires_at IS NOT NULL AND trial_expires_at > now())`
- INSERT policy (WITH CHECK): dozwolone gdy
  - `auth.uid() = auth_uid` OR `auth.role() = 'service_role'` (service role może tworzyć/seed'ować)
- UPDATE policy: dozwolone gdy
  - `auth.uid() = auth_uid` OR `auth.role() = 'service_role'` OR EXISTS (SELECT 1 FROM app_users au WHERE au.auth_uid = auth.uid() AND au.role = 'admin')
  - WITH CHECK analogiczny (zachować warunki zabezpieczające)
- DELETE policy: tylko `auth.role() = 'service_role'` (przez serwis) — preferować soft-delete zamiast fizycznego usuwania przez UI.

### 4.2. `stripe_webhook_events` RLS

- Włączyć RLS.
- INSERT policy: tylko `auth.role() = 'service_role'` (service backend inserty webhooków)
- SELECT policy: `auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM app_users au WHERE au.auth_uid = auth.uid() AND au.role = 'admin')` — admin może przeglądać logi.
- DELETE policy: tylko `service_role` (opcjonalnie).

### 4.3. `subscription_audit` RLS

- Włączyć RLS.
- SELECT policy: `auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM app_users au WHERE au.auth_uid = auth.uid() AND au.role = 'admin')` — tylko admin i service role.
- INSERT policy: tylko `service_role` lub admin (w zależności od implementacji audytu).

Uwagi:

- Zasady powyższe należy zaimplementować dokładnie jako polityki Supabase/RLS — middleware wykona wstępną walidację, a RLS zapewni bezpieczeństwo na poziomie DB.

---

## 5. Dodatkowe uwagi i decyzje projektowe

1. Przechowywanie danych Black Swan
   - Wszystkie dane Black Swan (GPW_black_swans, GPW_AI_summary itd.) pozostają wyłącznie w NocoDB — nie będą duplikowane w Supabase dla MVP. Schemat Supabase ogranicza się do zarządzania użytkownikami i subskrypcjami.

2. Mechanizm idempotencji webhooków
   - `stripe_webhook_events.event_id` jako unikalne pole; proces insercji: `INSERT ... ON CONFLICT DO NOTHING`. Jeśli wstawiono nowy wiersz — w tej samej transakcji wykonać aktualizację `app_users` (jeśli dotyczy) i wstawić rekord do `subscription_audit`.

3. Retencja logów
   - Retencja webhooków: 90 dni (job CRON lub manualny admin job do czyszczenia starych wierszy).

4. Soft-delete i GDPR
   - `deleted_at` w `app_users` i proces purge/anonimizacji PII uruchamiany manualnie po weryfikacji; przed trwałym usunięciem anulować subskrypcję w Stripe.

5. Upgrade path (skalowalność)
   - Jeżeli pojawi się potrzeba historii subskrypcji lub audytu na większą skalę, dodać tabelę `subscriptions` (opisana powyżej) oraz rozważyć partycjonowanie (RANGE na `current_period_end`) i dodatkowe indeksy.

6. Triggery i aktualizacja timestampów
   - Rekomendowane dodanie prostego triggera `update_updated_at_column()` ustawiającego `NEW.updated_at = now()` przed UPDATE dla tabel `app_users` i (opcjonalnie) `subscriptions`.

7. Klucze serwisowe i proxy
   - `service_role` key musi być przechowywany wyłącznie po stronie serwera. Jeśli implementowany proxy do NocoDB — stosować walidację Zod + rate limiting (60 req/min domyślnie).

8. Implementacja w Supabase
   - Przy tworzeniu migracji: najpierw utworzyć typ ENUM `subscription_status`, następnie tabele, indeksy i polityki RLS.
   - Źródło prawdy: `auth.users` zarządza tożsamością; `app_users` przechowuje metadane i stan subskrypcji.
   - Synchronizacja (preferowana i fallback):
     - A) Preferowane: middleware / handler po rejestracji (wywoływany przez flow rejestracji aplikacji) tworzy rekord `app_users` natychmiast po utworzeniu konta w Supabase Auth. Ustawia domyślny trial (np. `trial_expires_at = now() + interval '7 days'`) i inne pola meta.
     - B) Fallback: webhook na zdarzenie `auth.user.created` (lub cykliczny job) w przypadku pominiętych/niekompletnych rekordów, który dogeneruje brakujące `app_users`.
   - Seed/admin: konta z `role = 'admin'` przydziela się ręcznie w DB przy seedzie lub przez admin endpoint (MVP: ręcznie).
   - Webhook processing: `service_role` używany tylko po stronie backendu; webhooki Stripe inserty do `stripe_webhook_events` i w tej samej transakcji aktualizacja `app_users` + insert do `subscription_audit`.

---

## 6. Podsumowanie (krótkie)

- Schemat Supabase ogranicza się do zarządzania użytkownikami, subskrypcjami (stan) i webhookami Stripe.
- Wszystkie dane domenowe (Black Swan) pozostają w NocoDB i są pobierane on-demand.
- Projekt jest minimalistyczny (MVP), bez historii subskrypcji — ale z jasną ścieżką rozszerzeń (tabela `subscriptions`, partycjonowanie, dodatkowe indeksy) gdy zajdzie potrzeba.
- RLS + middleware zapewniają podwójną ochronę; service role przeprowadza webhook processing i seed danych.

---

_Koniec schematu — plik gotowy do użycia jako podstawa migracji dla Supabase/Postgres._
