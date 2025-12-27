# API Endpoint Implementation Plan: User Management

## Analiza

### 1. Podsumowanie kluczowych punktów specyfikacji API

Sekcja 2.1 User Management z api-plan.md definiuje 4 endpointy REST API do zarządzania użytkownikami:

1. **POST /api/users/initialize** - Inicjalizacja rekordu użytkownika po rejestracji w Supabase Auth
2. **GET /api/users/me** - Pobranie profilu i statusu subskrypcji aktualnie zalogowanego użytkownika
3. **PUT /api/users/me** - Aktualizacja metadanych i preferencji użytkownika
4. **DELETE /api/users/me** - Soft-delete konta użytkownika (zgodność z GDPR)

Wszystkie endpointy operują na tabeli `app_users` w bazie Supabase PostgreSQL i są zabezpieczone przez Supabase Auth oraz Row Level Security (RLS).

### 2. Wymagane i opcjonalne parametry

**POST /api/users/initialize:**

- Wymagane: `auth_uid` (UUID)
- Opcjonalne: `email` (string, dla celów logowania)

**GET /api/users/me:**

- Brak parametrów żądania
- Wymagana autentykacja: Supabase session token

**PUT /api/users/me:**

- Opcjonalne: `metadata` (Record<string, unknown>)
- Wymagana autentykacja: Supabase session token

**DELETE /api/users/me:**

- Brak parametrów żądania
- Wymagana autentykacja: Supabase session token

### 3. Niezbędne typy DTO i Command Models

Z pliku `src/types/types.ts`:

- `InitializeUserDTO` - input dla POST /api/users/initialize
- `InitializeUserResponseDTO` - response dla POST /api/users/initialize
- `UserProfileDTO` - response dla GET /api/users/me
- `UpdateUserMetadataDTO` - input dla PUT /api/users/me
- `UpdateUserMetadataResponseDTO` - response dla PUT /api/users/me
- `SoftDeleteUserCommand` - command model dla DELETE /api/users/me

### 4. Wyodrębnienie logiki do serwisów

Zalecana struktura:

**Nowy serwis: `src/services/user.service.ts`**

- `initializeUser(auth_uid: string, email?: string)` - logika tworzenia użytkownika z 7-dniowym trialem
- `getUserProfile(auth_uid: string)` - pobranie profilu użytkownika
- `updateUserMetadata(auth_uid: string, metadata: Record<string, unknown>)` - aktualizacja metadanych
- `softDeleteUser(auth_uid: string)` - soft-delete użytkownika

**Nowy serwis: `src/services/audit.service.ts`**

- `createAuditEntry(userId: string, changeType: string, previous: any, current: any)` - logowanie zmian do `subscription_audit`

### 5. Walidacja danych wejściowych

**POST /api/users/initialize:**

- Walidacja UUID dla `auth_uid` (regex: `/^[0-9a-fA-F-]{36}$/`)
- Walidacja opcjonalnego email (format email)
- Sprawdzenie duplikatów (constraint na PK `auth_uid`)

**GET /api/users/me:**

- Walidacja tokenu sesji Supabase
- Weryfikacja istnienia użytkownika w tabeli `app_users`

**PUT /api/users/me:**

- Walidacja struktury `metadata` (musi być obiektem JSON)
- Walidacja tokenu sesji Supabase

**DELETE /api/users/me:**

- Walidacja tokenu sesji Supabase
- Sprawdzenie czy użytkownik nie został już usunięty (`deleted_at IS NULL`)

### 6. Rejestrowanie błędów w tabeli błędów

Dla MVP błędy będą logowane przez:

- Console.error po stronie serwera (tymczasowo)
- W przyszłości: integracja z systemem monitoringu (np. Sentry)
- Błędy webhooków Stripe zapisywane w `stripe_webhook_events.error`

### 7. Potencjalne zagrożenia bezpieczeństwa

1. **Injection attacks**: Używamy Supabase client z parametryzowanymi zapytaniami
2. **Authorization bypass**: RLS policies + middleware sprawdzające `auth.uid()`
3. **Mass assignment**: Ograniczenie aktualizacji tylko do pola `metadata` w PUT
4. **IDOR (Insecure Direct Object Reference)**: Wszystkie endpointy /me używają `auth.uid()` z sesji
5. **Rate limiting**: Należy dodać rate limiting na poziomie middleware (60 req/min)
6. **CORS**: Konfiguracja tylko dla dozwolonych origin
7. **Payload size**: Limit na wielkość `metadata` (np. 10KB)

### 8. Potencjalne scenariusze błędów

**POST /api/users/initialize:**

- 400: Nieprawidłowy format UUID
- 400: Nieprawidłowy format email
- 409: Użytkownik już istnieje (duplicate key)
- 500: Błąd bazy danych, błąd podczas tworzenia audytu

**GET /api/users/me:**

- 401: Brak lub nieprawidłowy token sesji
- 404: Użytkownik nie znaleziony w `app_users`
- 500: Błąd bazy danych

**PUT /api/users/me:**

- 400: Nieprawidłowy format JSON
- 400: Nieprawidłowa struktura metadata
- 401: Brak lub nieprawidłowy token sesji
- 500: Błąd bazy danych

**DELETE /api/users/me:**

- 401: Brak lub nieprawidłowy token sesji
- 500: Błąd bazy danych, błąd anulowania subskrypcji Stripe

---

## 1. Przegląd punktów końcowych

Implementacja 4 endpointów REST API do zarządzania cyklem życia użytkownika w systemie Black Swan Grid:

1. **POST /api/users/initialize** - Tworzy rekord użytkownika po rejestracji w Supabase Auth, przyznając 7-dniowy trial
2. **GET /api/users/me** - Zwraca profil i status subskrypcji zalogowanego użytkownika (wykorzystywane przez middleware do autoryzacji)
3. **PUT /api/users/me** - Umożliwia użytkownikowi aktualizację swoich preferencji (metadata)
4. **DELETE /api/users/me** - Soft-delete konta zgodnie z wymaganiami GDPR

Wszystkie endpointy operują na tabeli `app_users` i są zabezpieczone przez Supabase Auth + RLS policies.

---

## 2. Szczegóły żądań

### 2.1. POST /api/users/initialize

**Metoda HTTP:** POST

**Struktura URL:** `/api/users/initialize`

**Parametry:**

- Wymagane (Body):
  - `auth_uid` (string, UUID) - Identyfikator użytkownika z Supabase Auth
- Opcjonalne (Body):
  - `email` (string, email format) - Email użytkownika dla celów logowania

**Request Body:**

```json
{
  "auth_uid": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

**Autentykacja:** Service role key lub authenticated user (self-initialization)

**Content-Type:** `application/json`

---

### 2.2. GET /api/users/me

**Metoda HTTP:** GET

**Struktura URL:** `/api/users/me`

**Parametry:** Brak

**Query Parameters:** Brak

**Request Headers:**

- `Authorization: Bearer <supabase_session_token>` (wymagane)

**Autentykacja:** Wymagana - Supabase session token

---

### 2.3. PUT /api/users/me

**Metoda HTTP:** PUT

**Struktura URL:** `/api/users/me`

**Parametry:**

- Opcjonalne (Body):
  - `metadata` (object) - Metadane użytkownika (np. preferencje UI)

**Request Body:**

```json
{
  "metadata": {
    "preferences": {
      "symbols": ["CPD", "PKN", "ALR"],
      "defaultRange": "week"
    }
  }
}
```

**Request Headers:**

- `Authorization: Bearer <supabase_session_token>` (wymagane)
- `Content-Type: application/json`

**Autentykacja:** Wymagana - Supabase session token

---

### 2.4. DELETE /api/users/me

**Metoda HTTP:** DELETE

**Struktura URL:** `/api/users/me`

**Parametry:** Brak

**Request Body:** Brak

**Request Headers:**

- `Authorization: Bearer <supabase_session_token>` (wymagane)

**Autentykacja:** Wymagana - Supabase session token

---

## 3. Wykorzystywane typy

### 3.1. DTOs (Data Transfer Objects)

```typescript
// Input dla POST /api/users/initialize
export interface InitializeUserDTO {
  auth_uid: string; // UUID
  email?: string; // Opcjonalny email dla logowania
}

// Response dla POST /api/users/initialize
export interface InitializeUserResponseDTO {
  success: boolean;
  user: {
    auth_uid: string;
    role: string;
    subscription_status: Database["public"]["Enums"]["subscription_status"];
    trial_expires_at: string | null;
    created_at: string;
  };
}

// Response dla GET /api/users/me
export interface UserProfileDTO {
  auth_uid: string;
  role: string;
  subscription_status: Database["public"]["Enums"]["subscription_status"];
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Input dla PUT /api/users/me
export interface UpdateUserMetadataDTO {
  metadata?: Record<string, unknown>;
}

// Response dla PUT /api/users/me
export interface UpdateUserMetadataResponseDTO {
  success: boolean;
  user: {
    auth_uid: string;
    metadata: Record<string, unknown>;
    updated_at: string;
  };
}

// Command model dla DELETE /api/users/me
export interface SoftDeleteUserCommand {
  auth_uid: string;
}
```

### 3.2. Database Types

Typy pochodzące z `database.types.ts` (wygenerowane przez Supabase CLI):

```typescript
Database["public"]["Enums"]["subscription_status"]; // 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid'
Database["public"]["Tables"]["app_users"]["Row"];
```

---

## 4. Szczegóły odpowiedzi

### 4.1. POST /api/users/initialize

**Success Response (201 Created):**

```json
{
  "success": true,
  "user": {
    "auth_uid": "550e8400-e29b-41d4-a716-446655440000",
    "role": "user",
    "subscription_status": "trial",
    "trial_expires_at": "2025-12-22T12:00:00Z",
    "created_at": "2025-12-15T12:00:00Z"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Nieprawidłowy UUID
{
  "error": "Validation failed",
  "details": ["auth_uid must be a valid UUID"]
}

// 409 Conflict - Użytkownik już istnieje
{
  "error": "User already initialized"
}

// 500 Internal Server Error
{
  "error": "Failed to initialize user"
}
```

---

### 4.2. GET /api/users/me

**Success Response (200 OK):**

```json
{
  "auth_uid": "550e8400-e29b-41d4-a716-446655440000",
  "role": "user",
  "subscription_status": "active",
  "trial_expires_at": null,
  "current_period_end": "2025-12-31T23:59:59Z",
  "plan_id": "pro_monthly",
  "stripe_customer_id": "cus_xxx",
  "metadata": {
    "preferences": {
      "symbols": ["CPD", "PKN"]
    }
  },
  "created_at": "2025-12-01T12:00:00Z"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Valid session required"
}

// 404 Not Found
{
  "error": "User not found",
  "message": "Please complete registration"
}
```

---

### 4.3. PUT /api/users/me

**Success Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "auth_uid": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "preferences": {
        "symbols": ["CPD", "PKN", "ALR"],
        "defaultRange": "week"
      }
    },
    "updated_at": "2025-12-15T12:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Nieprawidłowy JSON
{
  "error": "Invalid JSON"
}

// 400 Bad Request - Nieprawidłowy format metadata
{
  "error": "Invalid metadata format"
}

// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 500 Internal Server Error
{
  "error": "Failed to update user"
}
```

---

### 4.4. DELETE /api/users/me

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Account marked for deletion",
  "deleted_at": "2025-12-15T12:45:00Z"
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 500 Internal Server Error
{
  "error": "Failed to delete account"
}
```

---

## 5. Przepływ danych

### 5.1. POST /api/users/initialize

```
1. Client → POST /api/users/initialize {auth_uid, email?}
2. Endpoint → Walidacja auth_uid (UUID format)
3. Endpoint → Walidacja email (jeśli podany)
4. Endpoint → UserService.initializeUser()
5. UserService → Supabase: INSERT INTO app_users
   - auth_uid (PK)
   - role = 'user'
   - subscription_status = 'trial'
   - trial_expires_at = now() + interval '7 days'
   - metadata = {}
   - created_at = now()
   - updated_at = now()
6. UserService → AuditService.createAuditEntry()
7. AuditService → Supabase: INSERT INTO subscription_audit
   - user_id = auth_uid
   - change_type = 'trial_started'
   - previous = null
   - current = {auth_uid, role, subscription_status, trial_expires_at}
   - created_at = now()
8. UserService → Response 201 Created {success, user}
9. W przypadku błędu (duplicate, DB error) → Response 400/409/500
```

**Transakcja:** Kroki 5-7 powinny być wykonane w jednej transakcji DB dla zachowania spójności audytu.

---

### 5.2. GET /api/users/me

```
1. Client → GET /api/users/me (Authorization: Bearer token)
2. Middleware → Supabase.auth.getUser(token)
3. Middleware → Weryfikacja sessji, ekstrakcja auth_uid
4. Endpoint → UserService.getUserProfile(auth_uid)
5. UserService → Supabase: SELECT * FROM app_users WHERE auth_uid = $1
6. RLS Policy → Sprawdzenie: auth.uid() = auth_uid
7. UserService → Response 200 OK {user profile}
8. W przypadku błędu (unauthorized, not found) → Response 401/404
```

---

### 5.3. PUT /api/users/me

```
1. Client → PUT /api/users/me {metadata} (Authorization: Bearer token)
2. Middleware → Supabase.auth.getUser(token)
3. Middleware → Weryfikacja sessji, ekstrakcja auth_uid
4. Endpoint → Walidacja JSON body
5. Endpoint → Walidacja metadata (musi być obiektem)
6. Endpoint → UserService.updateUserMetadata(auth_uid, metadata)
7. UserService → Supabase: UPDATE app_users SET metadata = $1, updated_at = now() WHERE auth_uid = $2
8. RLS Policy → Sprawdzenie: auth.uid() = auth_uid
9. UserService → Response 200 OK {success, user}
10. W przypadku błędu → Response 400/401/500
```

**Uwaga:** `updated_at` jest automatycznie aktualizowany przez trigger `update_updated_at_column()`.

---

### 5.4. DELETE /api/users/me

```
1. Client → DELETE /api/users/me (Authorization: Bearer token)
2. Middleware → Supabase.auth.getUser(token)
3. Middleware → Weryfikacja sessji, ekstrakcja auth_uid
4. Endpoint → UserService.softDeleteUser(auth_uid)
5. UserService → Supabase: UPDATE app_users SET deleted_at = now() WHERE auth_uid = $1
6. RLS Policy → Sprawdzenie: auth.uid() = auth_uid
7. UserService → Enqueue async job: cancelStripeSubscription(auth_uid) [TODO: implementacja w przyszłości]
8. UserService → Response 200 OK {success, message, deleted_at}
9. W przypadku błędu → Response 401/500
```

**Uwaga:** Fizyczne usunięcie danych (GDPR) będzie wykonywane przez osobny proces po okresie retencji.

---

## 6. Względy bezpieczeństwa

### 6.1. Autentykacja i Autoryzacja

**Supabase Auth:**

- Wszystkie endpointy (oprócz POST /initialize) wymagają Supabase session token
- Token przekazywany w header `Authorization: Bearer <token>`
- Middleware sprawdza token przez `supabase.auth.getUser()`

**Row Level Security (RLS):**

- Wszystkie tabele mają włączone RLS
- Polityka SELECT dla `app_users`: `auth.uid() = auth_uid OR role = 'admin'`
- Polityka UPDATE dla `app_users`: `auth.uid() = auth_uid OR auth.role() = 'service_role'`
- Polityka INSERT dla `app_users`: `auth.uid() = auth_uid OR auth.role() = 'service_role'`

**Service Role Key:**

- Używany tylko po stronie serwera dla POST /initialize
- Nigdy nie eksponowany do klienta
- Przechowywany w zmiennych środowiskowych (`SUPABASE_SERVICE_KEY`)

### 6.2. Walidacja danych wejściowych

**POST /api/users/initialize:**

- UUID validation: regex `/^[0-9a-fA-F-]{36}$/`
- Email validation: format email (opcjonalny)
- Sanityzacja przed INSERT

**PUT /api/users/me:**

- Sprawdzenie czy `metadata` jest obiektem
- Limit wielkości payload: 10KB (middleware)
- Nie pozwalamy na aktualizację innych pól niż `metadata`

### 6.3. Ochrona przed atakami

**SQL Injection:**

- Używamy Supabase client z parametryzowanymi zapytaniami
- Wszystkie wartości są escapowane przez bibliotekę

**IDOR (Insecure Direct Object Reference):**

- Wszystkie endpointy /me używają `auth.uid()` z sesji
- Użytkownik nie może modyfikować danych innych użytkowników
- RLS policies wymuszają to na poziomie DB

**Mass Assignment:**

- PUT /api/users/me pozwala tylko na aktualizację pola `metadata`
- Inne pola (role, subscription*status, stripe*\*) są chronione

**Rate Limiting:**

- Implementacja rate limiting middleware: 60 req/min per IP
- Osobne limity dla autentykowanych użytkowników: 120 req/min

**CORS:**

- Konfiguracja tylko dla dozwolonych origin
- W produkcji: tylko domena aplikacji

### 6.4. Payload Size Limits

- Request body limit: 10KB dla wszystkich endpointów
- Szczególnie ważne dla `metadata` w PUT /api/users/me

---

## 7. Obsługa błędów

### 7.1. Standardowe kody HTTP

| Kod | Znaczenie             | Przypadek użycia                           |
| --- | --------------------- | ------------------------------------------ |
| 200 | OK                    | Sukces dla GET, PUT, DELETE                |
| 201 | Created               | Sukces dla POST /initialize                |
| 400 | Bad Request           | Nieprawidłowa walidacja danych wejściowych |
| 401 | Unauthorized          | Brak lub nieprawidłowy token sesji         |
| 404 | Not Found             | Użytkownik nie znaleziony                  |
| 409 | Conflict              | Próba utworzenia istniejącego użytkownika  |
| 500 | Internal Server Error | Błąd bazy danych lub serwera               |

### 7.2. Format odpowiedzi błędów

**Standardowy format:**

```json
{
  "error": "Error message",
  "details": ["Optional array of detailed errors"],
  "message": "Optional user-friendly message"
}
```

### 7.3. Szczegółowa obsługa błędów

**POST /api/users/initialize:**

```typescript
try {
  // Walidacja
  if (!isUUID(auth_uid)) {
    return Response 400 {error: "Validation failed", details: ["auth_uid must be a valid UUID"]}
  }

  // INSERT
  const { data, error } = await supabase.from('app_users').insert({...})

  if (error) {
    // Duplicate key
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return Response 409 {error: "User already initialized"}
    }

    // Inne błędy DB
    console.error('DB error inserting app_users:', error)
    return Response 500 {error: "Failed to initialize user"}
  }

  // Audit insert
  const { error: auditError } = await supabase.from('subscription_audit').insert({...})
  if (auditError) {
    console.error('Failed to insert subscription_audit:', auditError)
    // Nie jest krytyczne - kontynuujemy
  }

  return Response 201 {success: true, user: data}

} catch (err) {
  console.error('Unexpected error in initialize:', err)
  return Response 500 {error: "Failed to initialize user"}
}
```

**GET /api/users/me:**

```typescript
// Middleware sprawdza autentykację
const authUid = await getAuthUid(request, locals)
if (!authUid) {
  return Response 401 {error: "Unauthorized", message: "Valid session required"}
}

const { data, error } = await supabase
  .from('app_users')
  .select('*')
  .eq('auth_uid', authUid)
  .single()

if (error) {
  return Response 404 {error: "User not found", message: "Please complete registration"}
}

return Response 200 data
```

**PUT /api/users/me:**

```typescript
// Parse body
let body
try {
  body = await request.json()
} catch {
  return Response 400 {error: "Invalid JSON"}
}

// Walidacja metadata
if (body.metadata !== undefined && typeof body.metadata !== 'object') {
  return Response 400 {error: "Invalid metadata format"}
}

// UPDATE
const { data, error } = await supabase
  .from('app_users')
  .update({metadata: body.metadata, updated_at: new Date().toISOString()})
  .eq('auth_uid', authUid)
  .select()
  .single()

if (error) {
  return Response 500 {error: "Failed to update user"}
}

return Response 200 {success: true, user: data}
```

**DELETE /api/users/me:**

```typescript
const deletedAt = new Date().toISOString()

const { error } = await supabase
  .from('app_users')
  .update({deleted_at: deletedAt})
  .eq('auth_uid', authUid)

if (error) {
  return Response 500 {error: "Failed to delete account"}
}

// TODO: Enqueue async job to cancel Stripe subscription

return Response 200 {success: true, message: "Account marked for deletion", deleted_at: deletedAt}
```

### 7.4. Logowanie błędów

**Development:**

- `console.error()` dla wszystkich błędów DB
- Stack traces widoczne

**Production:**

- Integracja z Sentry lub podobnym narzędziem (TODO)
- Redakcja wrażliwych danych w logach
- Nie eksponowanie szczegółów błędów DB do klienta

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

**Database Queries:**

- GET /api/users/me jest często wywoływany przez middleware
- Może generować dużo zapytań DB

**Strategie optymalizacji:**

- Cache session/user data po stronie serwera (Redis lub in-memory cache)
- TTL: 5 minut
- Invalidacja cache przy PUT/DELETE

**Indeksy DB:**

- Primary key na `auth_uid` (już istnieje)
- Index na `subscription_status` dla szybkich filtrów w middleware
- Index na `current_period_end` dla sprawdzania wygasłych subskrypcji

### 8.2. Rate Limiting

**Implementacja:**

```typescript
// src/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 60, // 60 requestów
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 120 dla zalogowanych użytkowników
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 8.3. Payload Size

- Limit request body: 10KB (express.json({limit: '10kb'}))
- Szczególnie dla `metadata` w PUT endpoint

### 8.4. Connection Pooling

- Supabase client używa wbudowanego connection pooling
- Konfiguracja w `supabase.client.ts`:
  ```typescript
  export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: "public",
    },
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    global: {
      headers: { "x-application-name": "black-swan-grid" },
    },
  });
  ```

### 8.5. Monitoring

**Metryki do śledzenia:**

- Request latency per endpoint
- Error rate per endpoint
- DB query performance
- Cache hit/miss ratio

**Narzędzia:**

- Supabase Dashboard (built-in monitoring)
- DigitalOcean monitoring
- Custom APM (TODO: Sentry, DataDog)

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska

**1.1. Weryfikacja schematu bazy danych**

- Sprawdzenie czy tabela `app_users` istnieje z poprawnymi kolumnami
- Sprawdzenie czy tabela `subscription_audit` istnieje
- Weryfikacja RLS policies na tabelach
- Sprawdzenie triggerów (updated_at trigger)

**1.2. Konfiguracja zmiennych środowiskowych**

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx (tylko backend)
```

---

### Krok 2: Implementacja warstwy serwisowej

**2.1. Utworzenie `src/services/user.service.ts`**

```typescript
import type { SupabaseClient } from "../db/supabase.client";
import type { InitializeUserDTO, UserProfileDTO, UpdateUserMetadataDTO } from "../types/types";

export class UserService {
  constructor(private supabase: SupabaseClient) {}

  async initializeUser(dto: InitializeUserDTO) {
    const now = new Date().toISOString();
    const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("app_users")
      .insert({
        auth_uid: dto.auth_uid,
        role: "user",
        subscription_status: "trial",
        trial_expires_at: trialExpires,
        metadata: {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    return { data, error };
  }

  async getUserProfile(authUid: string): Promise<UserProfileDTO | null> {
    const { data, error } = await this.supabase.from("app_users").select("*").eq("auth_uid", authUid).single();

    if (error) return null;
    return data;
  }

  async updateUserMetadata(authUid: string, metadata: Record<string, unknown>) {
    const { data, error } = await this.supabase
      .from("app_users")
      .update({
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_uid", authUid)
      .select()
      .single();

    return { data, error };
  }

  async softDeleteUser(authUid: string) {
    const deletedAt = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("app_users")
      .update({ deleted_at: deletedAt })
      .eq("auth_uid", authUid)
      .select()
      .single();

    return { data, error, deletedAt };
  }
}
```

**2.2. Utworzenie `src/services/audit.service.ts`**

```typescript
import type { SupabaseClient } from "../db/supabase.client";

export class AuditService {
  constructor(private supabase: SupabaseClient) {}

  async createAuditEntry(userId: string, changeType: string, previous: unknown, current: unknown) {
    const { data, error } = await this.supabase.from("subscription_audit").insert({
      user_id: userId,
      change_type: changeType,
      previous,
      current,
      created_at: new Date().toISOString(),
    });

    return { data, error };
  }
}
```

---

### Krok 3: Implementacja helpera walidacji

**3.1. Utworzenie `src/lib/validation.ts`**

```typescript
export function isUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(value);
}

export function isEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

---

### Krok 4: Implementacja helpera auth

**4.1. Utworzenie `src/lib/auth.ts`**

```typescript
import type { SupabaseClient } from "../db/supabase.client";

interface Locals {
  supabase?: SupabaseClient;
}

export async function getAuthUid(request: Request, locals: Locals): Promise<string | null> {
  try {
    const supabase = locals?.supabase;
    if (!supabase) return null;

    // W produkcji: użyj supabase.auth.getUser() z bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}
```

---

### Krok 5: Implementacja endpointów

**5.1. Aktualizacja `src/pages/api/users/initialize.ts`**

Plik już istnieje - wystarczy go dostosować do struktury serwisu:

```typescript
import type { APIRoute } from "astro";
import type { SupabaseClient } from "../../../db/supabase.client";
import { UserService } from "../../../services/user.service";
import { AuditService } from "../../../services/audit.service";
import { isUUID } from "../../../lib/validation";

interface Locals {
  supabase: SupabaseClient;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals as Locals;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = (body as Record<string, unknown>) ?? {};
  const auth_uid = parsed["auth_uid"];

  // Walidacja
  if (!isUUID(auth_uid)) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: ["auth_uid must be a valid UUID"],
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Inicjalizacja serwisów
  const userService = new UserService(supabase);
  const auditService = new AuditService(supabase);

  // Utworzenie użytkownika
  const { data, error } = await userService.initializeUser({ auth_uid });

  if (error) {
    // Duplicate key
    const errorMsg = String(error.message ?? error);
    if (/duplicate|unique/i.test(errorMsg)) {
      return new Response(JSON.stringify({ error: "User already initialized" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Inne błędy DB
    console.error("DB error inserting app_users:", error);
    return new Response(JSON.stringify({ error: "Failed to initialize user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Audit entry
  await auditService.createAuditEntry(auth_uid, "trial_started", null, {
    auth_uid,
    role: "user",
    subscription_status: "trial",
    trial_expires_at: data.trial_expires_at,
  });

  return new Response(JSON.stringify({ success: true, user: data }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
```

**5.2. Aktualizacja `src/pages/api/users/me.ts`**

Plik już istnieje - dostosowanie do struktury serwisu i poprawne typy:

```typescript
import type { APIRoute } from "astro";
import type { SupabaseClient } from "../../../db/supabase.client";
import { UserService } from "../../../services/user.service";
import { getAuthUid } from "../../../lib/auth";
import { isValidMetadata } from "../../../lib/validation";

interface Locals {
  supabase?: SupabaseClient;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals as Locals;
  const authUid = await getAuthUid(request, locals);

  if (!authUid || !supabase) {
    return new Response(JSON.stringify({ error: "Unauthorized", message: "Valid session required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userService = new UserService(supabase);
  const profile = await userService.getUserProfile(authUid);

  if (!profile) {
    return new Response(JSON.stringify({ error: "User not found", message: "Please complete registration" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals as Locals;
  const authUid = await getAuthUid(request, locals);

  if (!authUid || !supabase) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = (body as Record<string, unknown>) ?? {};
  const metadata = parsed["metadata"];

  // Walidacja
  if (metadata !== undefined && !isValidMetadata(metadata)) {
    return new Response(JSON.stringify({ error: "Invalid metadata format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update
  const userService = new UserService(supabase);
  const { data, error } = await userService.updateUserMetadata(authUid, metadata as Record<string, unknown>);

  if (error) {
    return new Response(JSON.stringify({ error: "Failed to update user" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, user: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals as Locals;
  const authUid = await getAuthUid(request, locals);

  if (!authUid || !supabase) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userService = new UserService(supabase);
  const { error, deletedAt } = await userService.softDeleteUser(authUid);

  if (error) {
    return new Response(JSON.stringify({ error: "Failed to delete account" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: Enqueue async job to cancel Stripe subscription

  return new Response(
    JSON.stringify({
      success: true,
      message: "Account marked for deletion",
      deleted_at: deletedAt,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
```

---

### Krok 6: Testowanie

**6.1. Testy jednostkowe (opcjonalne dla MVP)**

Utworzenie testów dla serwisów:

- `src/services/__tests__/user.service.test.ts`
- `src/services/__tests__/audit.service.test.ts`

**6.2. Testy integracyjne**

Użycie Playwright do testowania API:

```typescript
// tests/api/users.spec.ts
import { test, expect } from "@playwright/test";

test.describe("User Management API", () => {
  test("POST /api/users/initialize creates user with trial", async ({ request }) => {
    const response = await request.post("/api/users/initialize", {
      data: {
        auth_uid: crypto.randomUUID(),
        email: "test@example.com",
      },
    });

    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.user.subscription_status).toBe("trial");
  });

  test("GET /api/users/me returns user profile", async ({ request }) => {
    // Najpierw zarejestruj użytkownika i uzyskaj token
    // ...

    const response = await request.get("/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.auth_uid).toBeTruthy();
  });

  // Więcej testów...
});
```

**6.3. Testy manualne**

Użycie narzędzi:

- Postman/Insomnia do testowania API
- curl z terminala
- Supabase Dashboard do weryfikacji danych w DB

**Przykładowe zapytania curl:**

```bash
# POST /api/users/initialize
curl -X POST http://localhost:4321/api/users/initialize \
  -H "Content-Type: application/json" \
  -d '{"auth_uid":"550e8400-e29b-41d4-a716-446655440000","email":"test@example.com"}'

# GET /api/users/me
curl http://localhost:4321/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# PUT /api/users/me
curl -X PUT http://localhost:4321/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"preferences":{"symbols":["CPD","PKN"]}}}'

# DELETE /api/users/me
curl -X DELETE http://localhost:4321/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Krok 7: Deployment

**7.1. Przygotowanie środowiska produkcyjnego**

- Konfiguracja zmiennych środowiskowych w DigitalOcean
- Weryfikacja połączenia z Supabase production
- Sprawdzenie RLS policies w production DB

**7.2. Deploy przez GitHub Actions**

Pipeline CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run build
      - run: npm run test
      # Deploy do DigitalOcean...
```

**7.3. Monitoring po wdrożeniu**

- Sprawdzenie logów aplikacji
- Monitoring Supabase Dashboard
- Weryfikacja metryk (latency, error rate)

---

### Krok 8: Dokumentacja

**8.1. Dokumentacja API**

Utworzenie `docs/api/user-management.md`:

- Opis każdego endpointu
- Przykłady requestów i responsów
- Kody błędów
- Wymagania autentykacji

**8.2. Dokumentacja dla programistów**

Komentarze w kodzie:

- JSDoc dla funkcji serwisowych
- Komentarze wyjaśniające logikę biznesową
- TODO dla przyszłych ulepszeń

**8.3. Changelog**

Wpis w `CHANGELOG.md`:

```markdown
## [1.0.0] - 2025-12-15

### Added

- User Management API endpoints
  - POST /api/users/initialize
  - GET /api/users/me
  - PUT /api/users/me
  - DELETE /api/users/me
- UserService for business logic
- AuditService for subscription audit trail
- RLS policies for app_users table
```

---

## Podsumowanie

Plan implementacji definiuje:

1. ✅ 4 endpointy REST API dla zarządzania użytkownikami
2. ✅ Warstwy serwisową (UserService, AuditService)
3. ✅ Helpery walidacji i autentykacji
4. ✅ Zabezpieczenia (RLS, walidacja, rate limiting)
5. ✅ Obsługę błędów z odpowiednimi kodami HTTP
6. ✅ Optymalizacje wydajnościowe (caching, indexing)
7. ✅ Szczegółowe kroki implementacji
8. ✅ Plan testowania i deployment

**Następne kroki:**

1. Implementacja serwisów (Krok 2)
2. Implementacja helperów (Kroki 3-4)
3. Aktualizacja endpointów (Krok 5)
4. Testowanie (Krok 6)
5. Deployment (Krok 7)
6. Dokumentacja (Krok 8)

**Szacowany czas implementacji:** 2-3 dni robocze dla doświadczonego developera.
