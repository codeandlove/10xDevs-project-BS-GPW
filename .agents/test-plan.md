# Plan Testów - Black Swan Grid (GPW)

## Spis treści

1. [Wprowadzenie i cele testowania](#1-wprowadzenie-i-cele-testowania)
2. [Zakres testów](#2-zakres-testów)
3. [Typy testów do przeprowadzenia](#3-typy-testów-do-przeprowadzenia)
4. [Scenariusze testowe dla kluczowych funkcjonalności](#4-scenariusze-testowe-dla-kluczowych-funkcjonalności)
5. [Środowisko testowe](#5-środowisko-testowe)
6. [Narzędzia do testowania](#6-narzędzia-do-testowania)
7. [Harmonogram testów](#7-harmonogram-testów)
8. [Kryteria akceptacji testów](#8-kryteria-akceptacji-testów)
9. [Role i odpowiedzialności](#9-role-i-odpowiedzialności)
10. [Procedury raportowania błędów](#10-procedury-raportowania-błędów)

---

## 1. Wprowadzenie i cele testowania

### 1.1. Cel dokumentu

Niniejszy dokument definiuje kompleksową strategię testowania aplikacji Black Swan Grid (GPW) - webowej platformy do identyfikowania i analizowania historycznych anomalii cenowych spółek notowanych na GPW.

### 1.2. Cele testowania

- **Weryfikacja funkcjonalna**: Potwierdzenie, że wszystkie funkcjonalności aplikacji działają zgodnie z wymaganiami określonymi w PRD
- **Zapewnienie jakości**: Identyfikacja i eliminacja defektów przed wdrożeniem produkcyjnym
- **Bezpieczeństwo**: Weryfikacja mechanizmów autoryzacji, autentykacji i ochrony danych użytkowników
- **Wydajność**: Zapewnienie, że grid renderuje się w < 1.5s dla zakresu 1 tygodnia (zgodnie z PRD)
- **Dostępność**: Weryfikacja podstawowych praktyk dostępności (aria-labels, nawigacja klawiaturą)
- **Cache i rewalidacja**: Potwierdzenie prawidłowego działania mechanizmu stale-while-revalidate

### 1.3. Kluczowe metryki sukcesu

- Czas pierwszego renderu grida (zakres 1 tydzień): < 1.5s
- Sidebar success rate: > 99% kliknięć w kafelek otwiera sidebar bez błędów
- Cache hit rate: > 80% dla powtarzających się sesji
- Error rate przy pobieraniu z NocoDB: < 1%
- Dostępność podstawowa: 100% elementów interaktywnych z aria-label

---

## 2. Zakres testów

### 2.1. W zakresie testów (In Scope)

#### Funkcjonalności do przetestowania:

1. **Grid View**
   - Renderowanie gridu z wirtualizacją (@tanstack/react-virtual)
   - Zmiana zakresów czasowych (tydzień/miesiąc/kwartał)
   - Filtrowanie tickerów
   - Sortowanie wydarzeń
   - Kolorowanie kafelków według typu zdarzenia
   - Nawigacja klawiaturą (strzałki/Enter/Escape)
   - Cache i stale-while-revalidate
   - Puste kafelki gdy brak zdarzeń

2. **Summary View (Sidebar/Drawer)**
   - Otwieranie sidebaru po kliknięciu w kafelek
   - Wyświetlanie szczegółów wydarzenia
   - Responsywność (desktop: sidebar 33%, mobile: bottom drawer 70%)
   - Focus management (focus trap, initial focus)
   - Zamykanie (ESC, overlay click, X button)
   - History API (pushState, popstate, history.back())
   - Cache dla event details
   - Retry button w error state

3. **Event Detail View**
   - Pełna strona z wszystkimi AI summaries
   - Timeline z chronologicznym wyświetleniem
   - Price chart (historic data)
   - Przycisk "Powrót" z history.back()

4. **Autoryzacja i subskrypcje**
   - Middleware auth guard (/grid, /summary, /event)
   - Weryfikacja session + subscription status
   - 7-dniowy trial
   - Redirect do login/403 bez dostępu
   - Stripe webhooks (subscription created/updated/deleted)

5. **API Endpoints**
   - GET /api/nocodb/grid
   - GET /api/nocodb/events/:id
   - GET /api/nocodb/summaries
   - GET /api/users/me
   - POST /api/users/initialize
   - POST /api/webhooks/stripe

6. **Cache i rewalidacja**
   - Format cache key: gpw:cache:v1:\*
   - LRU eviction (maxEntries = 200)
   - Stale-while-revalidate
   - Czyszczenie cache przy logout (zachowanie preferencji)
   - Retry logic z exponential backoff (3 próby)

7. **Bezpieczeństwo**
   - Auth guard middleware
   - RLS policies w Supabase
   - Weryfikacja JWT token
   - 401 handling → clear cache + redirect
   - GDPR compliance (cache cleanup on logout)

### 2.2. Poza zakresem testów (Out of Scope)

- Testy jednostkowe workflow n8n (zewnętrzny system)
- Penetration testing (zaplanowane na późniejszy etap)
- Load testing > 1000 concurrent users (MVP focus)
- Mobile native apps (tylko responsive web)
- Testy lokalizacji (tylko język polski w MVP)
- Browser compatibility testing poza Chrome/Firefox/Safari latest

---

## 3. Typy testów do przeprowadzenia

### 3.1. Testy jednostkowe (Unit Tests)

**Narzędzie**: Vitest  
**Pokrycie**: ~70% kodu

**Komponenty do przetestowania**:

1. **Utility Functions**
   - `src/lib/ui-utils.ts`: formatDate, formatPercentChange, getEventTypeColor
   - `src/lib/validation.ts`: GridQuerySchema, EventIdSchema, SummariesQuerySchema
   - `src/lib/nocodb-client.ts`: NocoDBQueryBuilder, buildQueryString

2. **Service Layer**
   - `src/services/nocodb.service.ts`: getGridEvents, getEventDetails, getSummaries
   - `src/services/webhook.service.ts`: processEvent, validateSignature, handleEventType
   - `src/services/user.service.ts`: getUserProfile, updateUserMetadata

3. **Hooks**
   - `src/hooks/useClientCache.ts`: getFromCache, setInCache, evictIfNeeded, clearGridCache
   - Custom hooks z retry logic i exponential backoff

**Przykładowe testy**:

```typescript
// Test LRU eviction
test("clearGridCache preserves preferences", () => {
  localStorage.setItem("gpw:cache:v1:grid|range=week", "data");
  localStorage.setItem("gpw:preferences:symbols", "CPD,PKN");

  clearGridCache();

  expect(localStorage.getItem("gpw:cache:v1:grid|range=week")).toBeNull();
  expect(localStorage.getItem("gpw:preferences:symbols")).toBe("CPD,PKN");
});
```

### 3.2. Testy integracyjne (Integration Tests)

**Narzędzie**: Vitest + MSW (Mock Service Worker)

**Scenariusze**:

1. **API Integration**
   - Fetching grid data z NocoDB API
   - Retry logic z exponential backoff
   - Error handling (401, 403, 429, 500)
   - Rate limiting (60 req/min)

2. **Database Integration**
   - Supabase queries z RLS policies
   - User profile creation/update
   - Subscription status checks
   - Audit log entries

3. **Cache Integration**
   - Cache hit/miss scenarios
   - Stale-while-revalidate flow
   - Memory + localStorage synchronization
   - LRU eviction przy maxEntries

**Przykład**:

```typescript
test("Grid data fetched with cache and revalidation", async () => {
  const { result } = renderHook(() => useClientCache("cache-key", fetchGridData));

  // First render: fetch from API
  await waitFor(() => expect(result.current.data).toBeDefined());

  // Second render: serve from cache
  const cachedData = result.current.data;
  rerender();
  expect(result.current.data).toBe(cachedData);
});
```

### 3.3. Testy End-to-End (E2E Tests)

**Narzędzie**: Playwright (zgodnie z PRD sekcja 10)

**Pokrycie**: Kluczowe user journeys

**Scenariusze**:

1. **User Journey: Nowy użytkownik (Rejestracja i Trial)**
   - Rejestracja → automatyczny trial → dostęp do grid
   - US-001, US-004, US-007

2. **User Journey: Istniejący użytkownik**
   - Login → grid z cache → rewalidacja → przeglądanie → logout
   - US-001, US-002, US-003, US-016

3. **User Journey: Permalink sharing**
   - Zalogowany user kopiuje URL → niezalogowany otwiera → login → dostęp
   - US-006, US-008, US-015

4. **User Journey: Wygasła subskrypcja**
   - Trial wygasa → redirect do 403 → checkout → dostęp przywrócony
   - US-017

**Przykładowy test**:

```typescript
test("Grid renders and allows opening sidebar", async ({ page }) => {
  await page.goto("/grid");

  // Wait for grid to load
  await expect(page.locator('[role="grid"]')).toBeVisible();

  // Click on event cell
  await page.locator('[data-testid="event-cell"]').first().click();

  // Verify sidebar opens
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#sidebar-title")).toContainText("Szczegóły wydarzenia");
});
```

### 3.4. Testy wydajnościowe (Performance Tests)

**Narzędzie**: Lighthouse CI, Playwright Performance API

**Metryki**:

1. **First Contentful Paint (FCP)**: < 1.0s
2. **Largest Contentful Paint (LCP)**: < 1.5s (grid render dla 1 tygodnia)
3. **Time to Interactive (TTI)**: < 2.5s
4. **Cumulative Layout Shift (CLS)**: < 0.1

**Scenariusze**:

1. Grid render dla różnych zakresów:
   - Tydzień: < 1.5s (US-001)
   - Miesiąc: < 2.5s
   - Kwartał: < 4.0s

2. Virtualization performance:
   - 450 tickerów: scroll płynny (US-020)
   - Tylko widoczne wiersze renderowane

3. Cache performance:
   - Cache hit rate > 80%
   - In-memory access < 10ms
   - localStorage access < 50ms

**Przykład**:

```typescript
test("Grid renders within performance budget", async ({ page }) => {
  await page.goto("/grid");

  const performance = await page.evaluate(() => JSON.parse(JSON.stringify(window.performance.timing)));

  const loadTime = performance.loadEventEnd - performance.navigationStart;
  expect(loadTime).toBeLessThan(1500); // < 1.5s
});
```

### 3.5. Testy dostępności (Accessibility Tests)

**Narzędzie**: axe-core, Playwright axe

**Zakres**:

1. **Keyboard Navigation**
   - Tab order logiczny
   - Arrow keys w grid (US-012)
   - Enter otwiera sidebar
   - Escape zamyka sidebar
   - Focus trap w sidebar

2. **ARIA Labels**
   - aria-label dla komórek gridu
   - aria-expanded dla dropdown
   - role="dialog" dla sidebar
   - aria-modal="true"
   - aria-labelledby dla modali

3. **Podstawowa dostępność**
   - Kontrast kolorów (min 4.5:1 dla tekstu)
   - Focus indicators widoczne
   - Wszystkie interaktywne elementy dostępne z klawiatury

**Przykład**:

```typescript
test("Grid has proper accessibility attributes", async ({ page }) => {
  await page.goto("/grid");

  const results = await injectAxe(page);
  expect(results.violations).toHaveLength(0);

  // Verify aria-labels
  const cells = await page.locator('[role="gridcell"]').all();
  for (const cell of cells) {
    await expect(cell).toHaveAttribute("aria-label");
  }
});
```

### 3.6. Testy bezpieczeństwa (Security Tests)

**Zakres**:

1. **Authentication & Authorization**
   - Middleware guard chroni /grid, /summary, /event
   - Redirect do login bez session
   - Redirect do 403 bez subscription
   - JWT token validation

2. **Data Protection**
   - Cache czyszczony przy logout (GDPR)
   - Preferencje zachowane (non-PII)
   - RLS policies w Supabase
   - 401 → auto cache clear + redirect

3. **API Security**
   - Rate limiting (60 req/min)
   - Stripe webhook signature verification
   - SQL injection prevention (parametrized queries)
   - XSS prevention (React auto-escaping)

**Przykład**:

```typescript
test("Unauthorized user redirected from /grid", async ({ page }) => {
  // Clear auth cookies
  await page.context().clearCookies();

  await page.goto("/grid");

  // Should redirect to login
  await expect(page).toHaveURL(/\/auth\/login\?returnUrl=/);
});
```

### 3.7. Testy regresyjne (Regression Tests)

**Narzędzie**: Playwright + Visual Regression (Percy/Chromatic)

**Zakres**:

- Visual regression testing dla kluczowych widoków
- Snapshot testing dla komponentów UI
- Automatyczne uruchamianie po każdym PR

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Grid View

#### TC-GRID-001: Renderowanie gridu z domyślnym zakresem

**Priorytet**: Krytyczny  
**US**: US-001

**Prekondycje**:

- Użytkownik zalogowany
- Aktywna subskrypcja/trial

**Kroki**:

1. Otwórz `/grid`
2. Poczekaj na załadowanie

**Oczekiwany rezultat**:

- Grid renderuje się w < 1.5s
- Wyświetlony zakres: ostatni tydzień
- Kafelki z kolorowaniem wg typu zdarzenia
- Skeleton loaders podczas ładowania

**Weryfikacja**:

```typescript
await page.goto("/grid");
await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 1500 });
await expect(page.locator('[data-range="week"]')).toHaveClass(/active/);
```

---

#### TC-GRID-002: Zmiana zakresu czasowego

**Priorytet**: Wysoki  
**US**: US-002

**Prekondycje**:

- Użytkownik na /grid
- Grid załadowany

**Kroki**:

1. Kliknij selector zakresu
2. Wybierz "Miesiąc"
3. Poczekaj na reload

**Oczekiwany rezultat**:

- Grid odświeża widok
- Zakres zmieniony na miesiąc
- URL zaktualizowany: `?range=month`
- Cache użyty jeśli dostępny

**Weryfikacja**:

```typescript
await page.click('[data-testid="range-selector"]');
await page.click('[data-range="month"]');
await expect(page).toHaveURL(/range=month/);
await expect(page.locator('[role="grid"]')).toBeVisible();
```

---

#### TC-GRID-003: Filtrowanie tickerów

**Priorytet**: Wysoki  
**US**: US-003

**Prekondycje**:

- Użytkownik na /grid

**Kroki**:

1. Kliknij TickerFilter
2. Wybierz CPD, PKN
3. Kliknij "Zastosuj"

**Oczekiwany rezultat**:

- Grid pokazuje tylko CPD i PKN
- Filtry zapisane w localStorage: `gpw:preferences:symbols`
- URL zaktualizowany: `?symbols=CPD,PKN`

**Weryfikacja**:

```typescript
await page.click('[data-testid="ticker-filter"]');
await page.click('[data-ticker="CPD"]');
await page.click('[data-ticker="PKN"]');
await page.click('[data-testid="apply-filters"]');

await expect(page).toHaveURL(/symbols=CPD,PKN/);
expect(localStorage.getItem("gpw:preferences:symbols")).toBe("CPD,PKN");
```

---

#### TC-GRID-004: Nawigacja klawiaturą

**Priorytet**: Średni  
**US**: US-012

**Prekondycje**:

- Użytkownik na /grid
- Grid załadowany

**Kroki**:

1. Focus na pierwszej komórce (Tab)
2. Naciśnij Arrow Down
3. Naciśnij Arrow Right
4. Naciśnij Enter

**Oczekiwany rezultat**:

- Focus przesuwa się po komórkach
- Focus indicator widoczny (niebieska ramka)
- Enter otwiera sidebar dla zaznaczonej komórki

**Weryfikacja**:

```typescript
await page.keyboard.press("Tab"); // Focus on grid
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Enter");

await expect(page.locator('[role="dialog"]')).toBeVisible();
```

---

### 4.2. Summary View (Sidebar/Drawer)

#### TC-SIDEBAR-001: Otwieranie sidebaru

**Priorytet**: Krytyczny  
**US**: US-004

**Prekondycje**:

- Grid załadowany z wydarzeniami

**Kroki**:

1. Kliknij w kafelek z wydarzeniem

**Oczekiwany rezultat**:

- Sidebar otwiera się z prawej (desktop)
- Szerokość: 33%
- Overlay dim 20% opacity
- Focus na close button
- URL zaktualizowany: `?eventId=rec_123`

**Weryfikacja**:

```typescript
await page.click('[data-testid="event-cell"][data-has-event="true"]');

await expect(page.locator('[role="dialog"]')).toBeVisible();
await expect(page.locator("#sidebar-title")).toContainText("Szczegóły wydarzenia");
await expect(page).toHaveURL(/eventId=/);

// Verify focus
const closeButton = page.locator('[aria-label="Zamknij"]');
await expect(closeButton).toBeFocused();
```

---

#### TC-SIDEBAR-002: Zamykanie sidebaru

**Priorytet**: Wysoki  
**US**: US-004

**Prekondycje**:

- Sidebar otwarty

**Kroki testowe**:

1. Naciśnij ESC

**Oczekiwany rezultat**:

- Sidebar zamyka się natychmiast (< 1ms)
- URL czysty (bez ?eventId=)
- Focus wraca do grid

**Alternatywne kroki**:

- Kliknij X button → sidebar zamyka się
- Kliknij overlay → sidebar zamyka się

**Weryfikacja**:

```typescript
await page.keyboard.press("Escape");

await expect(page.locator('[role="dialog"]')).not.toBeVisible();
await expect(page).toHaveURL(/^(?!.*eventId)/);
```

---

#### TC-SIDEBAR-003: Focus trap

**Priorytet**: Średni  
**US**: US-004 (dostępność)

**Prekondycje**:

- Sidebar otwarty

**Kroki**:

1. Naciśnij Tab wielokrotnie
2. Obserwuj focus

**Oczekiwany rezultat**:

- Focus krąży tylko wewnątrz sidebaru
- Po ostatnim elemencie wraca do pierwszego
- Shift+Tab działa w odwrotnym kierunku

**Weryfikacja**:

```typescript
const focusableElements = await page.locator('[role="dialog"] button, [role="dialog"] a').all();
const firstElement = focusableElements[0];
const lastElement = focusableElements[focusableElements.length - 1];

await lastElement.focus();
await page.keyboard.press("Tab");
await expect(firstElement).toBeFocused();
```

---

#### TC-SIDEBAR-004: Cache dla event details

**Priorytet**: Wysoki  
**US**: US-009

**Prekondycje**:

- Użytkownik na /grid

**Kroki**:

1. Otwórz sidebar dla wydarzenia A
2. Zamknij sidebar
3. Otwórz sidebar dla wydarzenia A ponownie

**Oczekiwany rezultat**:

- Pierwsze otwarcie: fetch z API
- Drugie otwarcie: dane z cache (instant render)
- Rewalidacja w tle
- Cache key: `gpw:cache:v1:black_swans|id=rec_123`

**Weryfikacja**:

```typescript
// First open
await page.click('[data-event-id="rec_123"]');
await expect(page.locator('[role="dialog"]')).toBeVisible();

// Check cache
const cacheKey = "gpw:cache:v1:black_swans|id=rec_123";
const cached = await page.evaluate((key) => localStorage.getItem(key), cacheKey);
expect(cached).toBeTruthy();

// Close and reopen
await page.keyboard.press("Escape");
await page.click('[data-event-id="rec_123"]');

// Should render instantly from cache
await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 100 });
```

---

### 4.3. Autoryzacja i subskrypcje

#### TC-AUTH-001: Middleware guard - brak sesji

**Priorytet**: Krytyczny  
**US**: US-008

**Prekondycje**:

- Brak zalogowanego użytkownika

**Kroki**:

1. Otwórz `/grid` bezpośrednio

**Oczekiwany rezultat**:

- Redirect do `/auth/login?returnUrl=/grid`
- Grid nie renderuje się
- Brak dostępu do danych

**Weryfikacja**:

```typescript
await page.context().clearCookies();
await page.goto("/grid");

await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fgrid/);
```

---

#### TC-AUTH-002: Middleware guard - wygasła subskrypcja

**Priorytet**: Krytyczny  
**US**: US-017

**Prekondycje**:

- Użytkownik zalogowany
- Subskrypcja wygasła (`subscription_status = 'canceled'`, `trial_expires_at` < now)

**Kroki**:

1. Otwórz `/grid`

**Oczekiwany rezultat**:

- Redirect do `/403?reason=subscription_required`
- Komunikat: "Brak dostępu - wymagana aktywna subskrypcja"
- CTA "Kup plan"

**Weryfikacja**:

```typescript
await page.goto("/grid");

await expect(page).toHaveURL(/\/403\?reason=subscription_required/);
await expect(page.locator("h1")).toContainText("Brak dostępu");
```

---

#### TC-AUTH-003: 7-dniowy trial

**Priorytet**: Wysoki  
**US**: US-007

**Prekondycje**:

- Użytkownik niezarejestrowany

**Kroki**:

1. Rejestracja: POST /api/users/initialize
2. Sprawdź `trial_expires_at` w DB

**Oczekiwany rezultat**:

- `trial_expires_at` = now + 7 dni
- `subscription_status` = 'trial'
- Dostęp do grid ✅

**Weryfikacja**:

```typescript
const response = await apiClient.post("/api/users/initialize", {
  auth_uid: "uuid",
  email: "test@test.com",
});

expect(response.user.subscription_status).toBe("trial");
const trialExpires = new Date(response.user.trial_expires_at);
const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
expect(trialExpires).toBeCloseTo(expectedExpiry, 60000); // Within 1 minute
```

---

### 4.4. Cache i wylogowanie

#### TC-CACHE-001: Czyszczenie cache przy logout

**Priorytet**: Krytyczny  
**Security**: GDPR compliance

**Prekondycje**:

- Użytkownik zalogowany
- Cache zawiera dane grid

**Kroki**:

1. Przeglądaj grid (dane w cache)
2. Kliknij "Wyloguj"

**Oczekiwany rezultat**:

- Cache danych usunięty: `gpw:cache:v1:*`
- Preferencje zachowane: `gpw:preferences:*`
- Redirect do `/`

**Weryfikacja**:

```typescript
// Setup cache
await page.goto("/grid");
await page.waitForTimeout(1000); // Let cache populate

// Verify cache exists
let cacheKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("gpw:cache:v1:")));
expect(cacheKeys.length).toBeGreaterThan(0);

// Logout
await page.click('[aria-label="User menu"]');
await page.click("text=Wyloguj się");

// Verify cache cleared
cacheKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("gpw:cache:v1:")));
expect(cacheKeys.length).toBe(0);

// Verify preferences preserved
const preferences = await page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith("gpw:preferences:"))
);
expect(preferences.length).toBeGreaterThan(0);
```

---

#### TC-CACHE-002: LRU eviction

**Priorytet**: Średni  
**PRD**: Sekcja 8.2 - maxEntries = 200

**Prekondycje**:

- Aplikacja uruchomiona

**Kroki**:

1. Dodaj 200 wpisów do cache
2. Dodaj 201-szy wpis

**Oczekiwany rezultat**:

- Najstarszy wpis (wg lastAccessed) usunięty
- Rozmiar cache = 200

**Weryfikacja**:

```typescript
// Populate cache with 200 entries
for (let i = 0; i < 200; i++) {
  setInCache(`key-${i}`, `data-${i}`, 5 * 60 * 1000);
}

expect(memoryCache.size).toBe(200);

// Add 201st entry
setInCache("key-200", "data-200", 5 * 60 * 1000);

expect(memoryCache.size).toBe(200);
expect(memoryCache.has("key-0")).toBe(false); // Oldest evicted
```

---

### 4.5. API Endpoints

#### TC-API-001: GET /api/nocodb/grid - Validacja parametrów

**Priorytet**: Wysoki  
**Endpoint**: GET /api/nocodb/grid

**Prekondycje**:

- Użytkownik zalogowany z aktywną subskrypcją

**Test Cases**:

**TC-API-001a: Valid request**

```http
GET /api/nocodb/grid?range=week&symbols=CPD,PKN
```

**Oczekiwany rezultat**:

- Status: 200
- Response: GridResponse z events[]
- Headers: rate limit headers

**TC-API-001b: Invalid range**

```http
GET /api/nocodb/grid?range=invalid
```

**Oczekiwany rezultat**:

- Status: 400
- Error: "range must be one of: week, month, quarter"

**TC-API-001c: Rate limiting**

```http
# Send 61 requests within 1 minute
```

**Oczekiwany rezultat**:

- Request 1-60: 200 OK
- Request 61: 429 Too Many Requests
- Header: `Retry-After: 60`

**Weryfikacja**:

```typescript
test("Grid API returns data with valid params", async () => {
  const response = await apiClient.get("/api/nocodb/grid?range=week&symbols=CPD");

  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty("events");
  expect(response.data).toHaveProperty("range", "week");
  expect(response.data).toHaveProperty("symbols", ["CPD"]);
});

test("Grid API rejects invalid range", async () => {
  await expect(apiClient.get("/api/nocodb/grid?range=invalid")).rejects.toThrow(/range must be one of/);
});
```

---

#### TC-API-002: Rate limiting enforcement

**Priorytet**: Wysoki  
**PRD**: 60 req/min per user

**Prekondycje**:

- Użytkownik zalogowany

**Kroki**:

1. Wyślij 60 requestów w ciągu < 1 min
2. Wyślij 61-szy request

**Oczekiwany rezultat**:

- Request 1-60: 200 OK
- Request 61: 429 Too Many Requests
- Header: `X-RateLimit-Remaining: 0`
- Header: `Retry-After: <seconds>`

**Weryfikacja**:

```typescript
test("Rate limiting enforced at 60 req/min", async () => {
  const requests = Array(61)
    .fill(null)
    .map(() => apiClient.get("/api/nocodb/grid?range=week"));

  const results = await Promise.allSettled(requests);

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const ratelimited = results.filter((r) => r.status === "rejected" && r.reason.status === 429).length;

  expect(successful).toBe(60);
  expect(ratelimited).toBe(1);
});
```

---

### 4.6. Stripe Webhooks

#### TC-WEBHOOK-001: subscription.created

**Priorytet**: Krytyczny  
**Event**: customer.subscription.created

**Prekondycje**:

- User w bazie z `subscription_status = 'trial'`

**Payload**:

```json
{
  "type": "customer.subscription.created",
  "data": {
    "object": {
      "id": "sub_123",
      "customer": "cus_123",
      "status": "active",
      "current_period_end": 1735689600
    }
  }
}
```

**Oczekiwany rezultat**:

- User w DB: `subscription_status = 'active'`
- User w DB: `stripe_subscription_id = 'sub_123'`
- Audit log entry created

**Weryfikacja**:

```typescript
test("Webhook subscription.created updates user", async () => {
  const event = createStripeEvent("customer.subscription.created", {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
  });

  const response = await webhookService.processEvent(event);

  expect(response.success).toBe(true);
  expect(response.changes_applied).toBe(true);

  const user = await getUserByCustomerId("cus_123");
  expect(user.subscription_status).toBe("active");
  expect(user.stripe_subscription_id).toBe("sub_123");
});
```

---

## 5. Środowisko testowe

### 5.1. Środowiska

#### **Development**

- URL: http://localhost:4321
- Cel: Testy deweloperskie, debugging
- Dane: Mock data, test users
- Supabase: Local instance (docker)
- NocoDB: Staging instance

#### **Staging**

- URL: https://staging.blackswangrid.com
- Cel: Pre-production testing, E2E tests
- Dane: Production-like data (anonymized)
- Supabase: Staging project
- NocoDB: Staging instance
- Stripe: Test mode

#### **Production**

- URL: https://blackswangrid.com
- Cel: Smoke tests, monitoring
- Dane: Real data
- Supabase: Production project
- NocoDB: Production instance
- Stripe: Live mode

### 5.2. Konfiguracja środowiska testowego

**Wymagane zmienne środowiskowe** (`.env.test`):

```env
# Supabase (test project)
PUBLIC_SUPABASE_URL=https://test.supabase.co
PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key

# NocoDB (staging)
NOCODB_API_URL=https://staging-nocodb.com
NOCODB_API_TOKEN=test_token

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# Test configuration
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123!@#
```

### 5.3. Dane testowe

**Test Users**:

```javascript
{
  trial_user: {
    email: 'trial@test.com',
    subscription_status: 'trial',
    trial_expires_at: now + 7 days
  },
  active_user: {
    email: 'active@test.com',
    subscription_status: 'active',
    current_period_end: now + 30 days
  },
  expired_user: {
    email: 'expired@test.com',
    subscription_status: 'canceled',
    trial_expires_at: now - 1 day
  }
}
```

**Test Events** (NocoDB):

- Minimum 50 wydarzeń Black Swan
- Różne typy: BLACK_SWAN_UP, BLACK_SWAN_DOWN, VOLATILITY_UP, VOLATILITY_DOWN
- Zakres dat: ostatnie 3 miesiące
- Tickery: CPD, PKN, PKO, PZU, KGH

---

## 6. Narzędzia do testowania

### 6.1. Framework testowy

| Narzędzie           | Wersja  | Zastosowanie                     |
| ------------------- | ------- | -------------------------------- |
| **Vitest**          | ^2.0.0  | Testy jednostkowe i integracyjne |
| **Playwright**      | ^1.40.0 | Testy E2E                        |
| **Testing Library** | ^14.0.0 | Testy komponentów React          |
| **MSW**             | ^2.0.0  | API mocking w testach            |

### 6.2. Narzędzia pomocnicze

| Narzędzie         | Zastosowanie                 |
| ----------------- | ---------------------------- |
| **Axe-core**      | Testy dostępności            |
| **Lighthouse CI** | Performance testing          |
| **Faker.js**      | Generowanie danych testowych |
| **Stripe CLI**    | Testowanie webhooks lokalnie |
| **Docker**        | Supabase local testing       |

### 6.3. CI/CD Integration

**GitHub Actions** workflow (`.github/workflows/test.yml`):

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://staging.blackswangrid.com
          uploadArtifacts: true
```

---

## 7. Harmonogram testów

### 7.1. Faza 1: Setup (Tydzień 1)

- [ ] Konfiguracja Vitest
- [ ] Konfiguracja Playwright
- [ ] Setup CI/CD pipeline
- [ ] Przygotowanie środowiska staging
- [ ] Utworzenie danych testowych

### 7.2. Faza 2: Testy jednostkowe (Tydzień 2-3)

- [ ] Utility functions (2 dni)
- [ ] Service layer (3 dni)
- [ ] Hooks (2 dni)
- [ ] Validation schemas (1 dzień)
- [ ] Coverage report (1 dzień)

### 7.3. Faza 3: Testy integracyjne (Tydzień 4)

- [ ] API integration tests (2 dni)
- [ ] Database integration (2 dni)
- [ ] Cache integration (2 dni)
- [ ] Webhook integration (1 dzień)

### 7.4. Faza 4: Testy E2E (Tydzień 5-6)

- [ ] User Journey: Rejestracja i trial (2 dni)
- [ ] User Journey: Grid browsing (2 dni)
- [ ] User Journey: Sidebar interaction (2 dni)
- [ ] User Journey: Subscription flow (2 dni)
- [ ] Edge cases i error scenarios (2 dni)

### 7.5. Faza 5: Testy wydajnościowe (Tydzień 7)

- [ ] Lighthouse audits (1 dzień)
- [ ] Load time testing (2 dni)
- [ ] Virtualization performance (2 dni)
- [ ] Cache performance (1 dzień)
- [ ] Optimization (1 dzień)

### 7.6. Faza 6: Testy dostępności (Tydzień 8)

- [ ] Axe-core audits (2 dni)
- [ ] Keyboard navigation (2 dni)
- [ ] ARIA labels verification (1 dzień)
- [ ] Screen reader testing (2 dni)

### 7.7. Faza 7: Regression i smoke tests (Tydzień 9)

- [ ] Visual regression setup (2 dni)
- [ ] Smoke test suite (2 dni)
- [ ] Critical path tests (2 dni)
- [ ] Documentation (1 dzień)

**Total: 9 tygodni (45 dni roboczych)**

---

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia do testowania

- [ ] Kod zaimplementowany i zamergowany do branch `develop`
- [ ] Middleware auth guard działający
- [ ] API endpoints zaimplementowane
- [ ] Cache mechanism działający
- [ ] Środowisko staging dostępne
- [ ] Dane testowe załadowane

### 8.2. Kryteria wyjścia z testowania

**Obowiązkowe (Must-Have)**:

- [ ] **Pokrycie kodu testami jednostkowymi ≥ 70%**
- [ ] **Wszystkie testy krytyczne (priorytet: Krytyczny) przechodzą - 100%**
- [ ] **Zero Critical/Blocker defektów otwartych**
- [ ] **Performance: Grid render < 1.5s dla 1 tygodnia**
- [ ] **Sidebar success rate > 99%**
- [ ] **Cache hit rate > 80%**
- [ ] **Middleware guard działa poprawnie (100% testów)**
- [ ] **Stripe webhooks idempotentne (100% testów)**

**Pożądane (Should-Have)**:

- [ ] Testy wysokiego priorytetu przechodzą - 100%
- [ ] Testy średniego priorytetu przechodzą - ≥ 95%
- [ ] Zero Major defektów otwartych
- [ ] Lighthouse score ≥ 90 (Performance, Accessibility)
- [ ] Axe-core violations = 0
- [ ] Visual regression tests passing

**Opcjonalne (Nice-to-Have)**:

- [ ] Testy niskiego priorytetu przechodzą - ≥ 90%
- [ ] Load testing przeprowadzony (100 concurrent users)
- [ ] Security audit wykonany

### 8.3. Definicja "Done" dla testów

Test uznawany jest za zakończony gdy:

1. Kod testu napisany i zreviewowany
2. Test przechodzi lokalnie i na CI
3. Test dokumentację aktualna
4. Edge cases pokryte
5. Test stabilny (brak flaky tests)

---

## 9. Role i odpowiedzialności

### 9.1. Test Manager (1 osoba)

**Odpowiedzialności**:

- Zarządzanie planem testów
- Koordynacja zespołu QA
- Raportowanie statusu testów
- Priorytetyzacja błędów
- Communication z PM i Dev Team

### 9.2. QA Engineers (2-3 osoby)

**Odpowiedzialności**:

- Pisanie test cases
- Wykonywanie testów manualnych
- Automatyzacja testów (Playwright)
- Raportowanie błędów
- Regression testing

### 9.3. Automation Engineer (1 osoba)

**Odpowiedzialności**:

- Setup test framework (Vitest, Playwright)
- CI/CD pipeline configuration
- Test infrastructure maintenance
- Performance testing automation
- Visual regression setup

### 9.4. Developers

**Odpowiedzialności**:

- Pisanie testów jednostkowych (70% coverage)
- Fixing bugs zgłoszonych przez QA
- Code review test code
- Support QA w setup środowiska
- Pair testing dla complex features

### 9.5. Product Owner

**Odpowiedzialności**:

- Approval test plan
- Priorytetyzacja critical bugs
- Sign-off na release
- Weryfikacja acceptance criteria

---

## 10. Procedury raportowania błędów

### 10.1. Narzędzie do śledzenia błędów

**GitHub Issues** z labels:

| Label                | Opis                               |
| -------------------- | ---------------------------------- |
| `bug`                | Defekt w kodzie                    |
| `priority: critical` | Blokuje produkcję                  |
| `priority: high`     | Ważny bug, wymaga quick fix        |
| `priority: medium`   | Standardowy bug                    |
| `priority: low`      | Minor issue                        |
| `area: grid`         | Dotyczy Grid View                  |
| `area: sidebar`      | Dotyczy Summary Sidebar            |
| `area: auth`         | Dotyczy autoryzacji                |
| `area: api`          | Dotyczy API endpoints              |
| `area: cache`        | Dotyczy cache mechanism            |
| `test: e2e`          | Znaleziony w testach E2E           |
| `test: unit`         | Znaleziony w testach jednostkowych |

### 10.2. Template zgłoszenia błędu

```markdown
## 🐛 Bug Report

### Priorytet

- [ ] Critical (blocker)
- [ ] High
- [ ] Medium
- [ ] Low

### Środowisko

- **URL**: https://staging.blackswangrid.com
- **Browser**: Chrome 120
- **OS**: macOS 14.1
- **User**: test@example.com (trial)

### Opis błędu

[Jasny opis problemu]

### Kroki do reprodukcji

1. Otwórz /grid
2. Kliknij w kafelek wydarzenia
3. Naciśnij ESC

### Oczekiwane zachowanie

Sidebar powinien zamknąć się natychmiast

### Rzeczywiste zachowanie

Sidebar pozostaje otwarty przez ~500ms

### Screenshots/Wideo

[Załącz jeśli możliwe]

### Console errors
```

Error: ...

```

### Dodatkowy kontekst
- Test case: TC-SIDEBAR-002
- Related US: US-004
- Regression?: No

### Proposed solution
[Opcjonalnie: sugestia fix]
```

### 10.3. Severity Definitions

| Severity     | Definicja                                    | Przykład                                               | SLA                    |
| ------------ | -------------------------------------------- | ------------------------------------------------------ | ---------------------- |
| **Critical** | Aplikacja nie działa, brak workaround        | Middleware nie chroni /grid, wylogowany user ma dostęp | Fix w 24h              |
| **High**     | Major funkcjonalność broken, jest workaround | Sidebar nie zamyka się przez ESC, ale X button działa  | Fix w 3 dni            |
| **Medium**   | Funkcjonalność działa z issues, minor impact | Cache nie używa LRU, ale eviction działa               | Fix w 1 tydzień        |
| **Low**      | Cosmetic issue, nie wpływa na funkcjonalność | Tooltip ma typo                                        | Fix w następnym sprint |

### 10.4. Bug Triage Process

**Daily Triage Meeting** (15 min):

1. Review nowych bugs (< 24h)
2. Assign severity i priority
3. Assign owner (Dev)
4. Determine fix timeline
5. Update stakeholders

**Workflow**:

```
[New] → [Triaged] → [In Progress] → [Fixed] → [Ready for Test] → [Verified] → [Closed]
```

**Reopen criteria**:

- Bug nadal występuje w tej samej formie
- Fix wprowadził regression
- Incomplete fix

### 10.5. Metrics tracking

**Weekly Bug Report**:

- Total bugs: Open / Closed
- By severity: Critical / High / Medium / Low
- By area: Grid / Sidebar / Auth / API / Cache
- Average time to fix (by severity)
- Reopen rate
- Test coverage impact

**Dashboard URL**: https://github.com/org/repo/projects/qa-dashboard

---

## Załączniki

### A. Test Data Seeds

```sql
-- Test users
INSERT INTO app_users (auth_uid, email, subscription_status, trial_expires_at)
VALUES
  ('uuid-trial', 'trial@test.com', 'trial', NOW() + INTERVAL '7 days'),
  ('uuid-active', 'active@test.com', 'active', NULL),
  ('uuid-expired', 'expired@test.com', 'canceled', NOW() - INTERVAL '1 day');
```

### B. Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

### C. Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
});
```

---

## Changelog

| Data       | Wersja | Autor   | Zmiany                     |
| ---------- | ------ | ------- | -------------------------- |
| 2026-01-06 | 1.0    | QA Team | Initial test plan creation |

---

**Dokument zatwierdzony przez:**

- [ ] QA Manager
- [ ] Product Owner
- [ ] Tech Lead
- [ ] Dev Team Lead

**Data zatwierdzenia:** **\*\***\_\_\_**\*\***
