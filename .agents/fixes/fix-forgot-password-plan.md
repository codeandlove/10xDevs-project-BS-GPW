# Plan Naprawy Bledu - Brak funkcjonalnosci resetowania hasla

Data utworzenia: 2026-01-15
Tytul bledu: Link "Odzyskaj haslo" w panelu logowania nie ma implementacji
Severity: HIGH
Typ bledu: Business Logic - Brakujaca funkcjonalnosc

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Link "Zapomniales hasla?" w formularzu logowania (AuthForm.tsx, linia 184) przekierowuje do `/auth/reset-password`, ale strona ta nie istnieje. Brak rowniez strony `/auth/forgot-password` do wysylania emaili resetujacych haslo. Funkcjonalnosc jest wymagana przez PRD (section 5.1.1: "Password reset via email") oraz ui-plan.md (section 2.2: "Link do odzyskiwania hasla, PasswordReset.tsx component").

### 1.2. Root cause

Brak implementacji dwoch stron: forgot-password (formularz email) oraz reset-password (ustawienie nowego hasla). Supabase Auth dostarcza API do resetowania hasla, ale nie zostalo zintegrowane z UI.

### 1.3. Zakres wplywu

- Dotknięci uzytkownicy: Wszyscy zarejestrowani uzytkownicy, ktorzy zapomnieli hasla - brak mozliwosci odzyskania dostepu
- Dotknięte komponenty: Auth flow, Supabase Auth integration
- Dotknięte srodowiska: Production, staging, development

### 1.4. Priorytet naprawy

HIGH - Blokuje podstawowy user flow odzyskiwania konta. Wymagane przez PRD dla MVP.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Przejdz do `/auth/login`
2. Kliknij link "Zapomniales hasla?"
3. Przegladarka probuje zaladowac `/auth/reset-password`
4. Blad 404 - strona nie istnieje

### 2.2. Oczekiwane zachowanie

1. Klikniecie "Zapomniales hasla?" powinno przekierowac do `/auth/forgot-password`
2. Formularz pozwala wprowadzic email i wyslac link resetujacy
3. Email zawiera link do `/auth/reset-password?token=xxx`
4. Strona reset-password pozwala ustawic nowe haslo
5. Po zmianie przekierowanie do login z komunikatem sukcesu

### 2.3. Rzeczywiste zachowanie

404 - brak implementacji stron forgot-password i reset-password

### 2.4. Root cause analysis

- Lokalizacja bledu: src/components/auth/AuthForm.tsx linia 184
- Przyczyna techniczna: Link wskazuje na nieistniejaca strone `/auth/reset-password`
- Brakujace komponenty:
  - src/pages/auth/forgot-password.astro - strona z formularzem email
  - src/pages/auth/reset-password.astro - strona ustawiania nowego hasla
  - Integracja Supabase: supabase.auth.resetPasswordForEmail() i supabase.auth.updateUser()

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- src/components/auth/AuthForm.tsx - aktualizacja linku (linia 184)
- src/pages/auth/forgot-password.astro - NOWY - formularz email
- src/pages/auth/reset-password.astro - NOWY - formularz nowego hasla
- src/pages/auth/login.astro - opcjonalnie: komunikat sukcesu po resecie

#### Konfiguracja zewnetrzna:

- Supabase Dashboard: URL Configuration (redirect URLs)
- Supabase Email Templates: Reset Password template (weryfikacja)

#### Testy:

- e2e/auth.spec.ts - dodac test case TC-AUTH-004: Password reset flow

## 3. Rekomendowane rozwiazanie

### 3.1. Opis

Implementacja password reset flow wykorzystujac Supabase Auth built-in funkcjonalnosc. Zero custom backend - wykorzystujemy supabase.auth.resetPasswordForEmail() i supabase.auth.updateUser().

### 3.2. Zakres zmian

- Frontend: 2 nowe strony Astro + 1 aktualizacja linku
- Backend: Brak zmian (Supabase Auth API)
- Database: Brak zmian (Supabase Auth tables)
- Testy: 1 nowy test E2E

### 3.3. Zalety

- Wykorzystuje proven Supabase features (bezpieczenstwo, tokens, expiry)
- Zero custom backend code
- Email delivery przez Supabase SMTP
- Szybka implementacja (2-3h)
- Zgodne z best practices Supabase Auth

### 3.4. Wady

- Zaleznosc od konfiguracji Supabase Dashboard
- Brak pelnej kontroli nad wygldem emaili (ograniczone templates)

### 3.5. Effort

S (2-3 godziny)

### 3.6. Ryzyko regresji

LOW - Nowe, izolowane funkcje. Nie dotyka istniejacego auth flow.

### 3.7. Zgodnosc ze standardami

- Copilot-instructions.md: ✅ - React functional components, Astro pages, accessibility
- Tech-stack.md: ✅ - Supabase Auth, Astro 5, React 19, TypeScript 5
- Best practices: ✅ - Input validation (Zod), error handling, WCAG basic

## 4. Szczegolowy plan implementacji

### 4.1. Faza 0: Konfiguracja Supabase Dashboard

- [ ] Supabase Dashboard → Authentication → URL Configuration
- [ ] Site URL: http://localhost:4321 (dev) + production URL
- [ ] Redirect URLs: Dodac http://localhost:4321/auth/reset-password
- [ ] Email Templates → Reset Password: Weryfikacja ze template zawiera {{.ConfirmationURL}}

### 4.2. Faza 1: Aktualizacja linku w AuthForm

Plik: `src/components/auth/AuthForm.tsx`

Linia 184: Zmienic `/auth/reset-password` na `/auth/forgot-password`

```typescript
{mode === "login" && (
  <div className="text-center">
    <a href="/auth/forgot-password" className="text-xs text-muted-foreground hover:underline">
      Zapomniales hasla?
    </a>
  </div>
)}
```

### 4.3. Faza 2: Utworzenie strony forgot-password

Plik: `src/pages/auth/forgot-password.astro` (NOWY)

Struktura:

- Layout z naglowkiem "Odzyskaj haslo"
- Formularz z polem email
- Client-side script z supabase.auth.resetPasswordForEmail()
- Success state: "Email wyslany - sprawdz skrzynke"
- Error handling z retry button
- Link "Powrot do logowania"

Kluczowe elementy:

- Walidacja email client-side
- Redirect URL: `${window.location.origin}/auth/reset-password`
- Toast notification przy sukcesie/bledzie
- Loading state podczas wysylania
- ARIA labels dla accessibility

### 4.4. Faza 3: Utworzenie strony reset-password

Plik: `src/pages/auth/reset-password.astro` (NOWY)

Struktura:

- Layout z naglowkiem "Ustaw nowe haslo"
- Formularz z polami: password, password-confirm
- Client-side script z supabase.auth.updateUser({ password })
- Walidacja: min 8 znakow, hasla identyczne
- Po sukcesie: przekierowanie do /auth/login?password_reset=success
- Error handling dla expired token
- ARIA labels, keyboard navigation

Kluczowe elementy:

- Sprawdzenie error w URL params (Supabase przekazuje error jesli token invalid)
- Walidacja: password.length >= 8, password === confirmPassword
- Success message przed przekierowaniem
- Link "Wyslij nowy link" przy expired token

### 4.5. Faza 4: Komunikat sukcesu w login

Plik: `src/pages/auth/login.astro`

Dodac sprawdzenie URL param `password_reset=success` i wyswietlic banner:
"Haslo zostalo pomyslnie zmienione. Mozesz sie teraz zalogowac."

### 4.6. Faza 5: E2E test

Plik: `e2e/auth.spec.ts`

Dodac test case:

```typescript
test.describe("Password Reset Flow", () => {
  test("TC-AUTH-004: Forgot password - send reset email", async ({ page }) => {
    await page.goto("/auth/login");
    await page.click('a:has-text("Zapomniales hasla?")');
    await expect(page).toHaveURL("/auth/forgot-password");

    await page.fill('input[type="email"]', "test@example.com");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Email wyslany")).toBeVisible();
  });

  test("TC-AUTH-005: Reset password with valid token", async ({ page }) => {
    // Symulacja valid token w URL
    await page.goto("/auth/reset-password?token=valid_test_token");

    await page.fill('input[name="password"]', "NewPass123!@#");
    await page.fill('input[name="password-confirm"]', "NewPass123!@#");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/auth\/login\?password_reset=success/);
  });
});
```

## 5. Plan weryfikacji i testowania

### 5.1. Unit tests

Brak - strony Astro z client-side scripts, testowane przez E2E

### 5.2. E2E tests

- [ ] TC-AUTH-004: Wyslanie emaila reset hasla
- [ ] TC-AUTH-005: Reset hasla z valid token
- [ ] TC-AUTH-006: Expired token - error handling
- [ ] TC-AUTH-007: Invalid email - walidacja

### 5.3. Manual testing checklist

- [ ] Forgot password: wyslanie emaila dla istniejacego usera
- [ ] Forgot password: walidacja email (nieprawidlowy format)
- [ ] Email delivery: sprawdzenie czy email dotarl (inbox lub Supabase Dashboard)
- [ ] Reset password: klikniecie linku w emailu
- [ ] Reset password: ustawienie nowego hasla (min 8 znakow)
- [ ] Reset password: hasla nie pasuja - error
- [ ] Reset password: expired token - komunikat error + link "Wyslij nowy"
- [ ] Login: logowanie z nowym haslem
- [ ] Login: komunikat sukcesu po resecie
- [ ] Keyboard navigation: Tab order, Enter to submit
- [ ] Screen reader: aria-labels, error messages

### 5.4. Regression testing

- [ ] Login existing user - bez zmian
- [ ] Register new user - bez zmian
- [ ] Trial activation - bez zmian
- [ ] Middleware auth - bez zmian

## 6. Analiza ryzyka i mitigation

### 6.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Email nie dociera do usera

- Severity: MEDIUM
- Prawdopodobienstwo: LOW (Supabase SMTP proven)
- Wplyw: User nie moze zresetowac hasla
- Mitigation: Dokumentacja troubleshooting, sprawdzenie spam folder, weryfikacja Supabase email settings

#### Ryzyko 2: Token wygasa zbyt szybko

- Severity: LOW
- Prawdopodobienstwo: LOW (Supabase default: 1h)
- Wplyw: User musi wyslac nowy link
- Mitigation: Clear error message + link "Wyslij nowy link resetujacy"

#### Ryzyko 3: Redirect URL misconfiguration

- Severity: HIGH
- Prawdopodobienstwo: MEDIUM (wymaga manual config)
- Wplyw: User nie moze dokonczyc reset flow
- Mitigation: Dokładne sprawdzenie Supabase Dashboard config przed deployment, testing na staging

### 6.2. Rollback plan

1. Usunac link z AuthForm.tsx (przywrocic `/auth/reset-password`)
2. Usunac pliki forgot-password.astro i reset-password.astro
3. Deployment reverse commit

### 6.3. Monitoring post-deployment

- Supabase Dashboard → Authentication → Logs: monitorowanie reset password events
- Error tracking: 404 na /auth/forgot-password, /auth/reset-password
- User feedback: zglosienia problemow z resetem hasla
- Conversion rate: % userow, ktorzy zakoncza reset flow

## 7. Zgodnosc ze standardami

### 7.1. Copilot-instructions.md compliance

- React patterns: ✅ - Functional components, hooks (useState)
- Astro patterns: ✅ - .astro pages z client:load scripts
- Accessibility: ✅ - ARIA labels, keyboard navigation, semantic HTML
- TypeScript: ✅ - Type-safe forms, Zod validation
- Error handling: ✅ - Try-catch, clear error messages

### 7.2. Tech-stack.md compliance

- Supabase Auth: ✅ - Wykorzystanie built-in API
- Astro 5: ✅ - Static pages z React islands
- TypeScript 5: ✅ - Type-safe implementation
- Tailwind 4: ✅ - Styling zgodny z istniejacym UI

### 7.3. Security checklist

- [ ] Input validation - email format (client-side Zod)
- [ ] Password strength - minimum 8 znakow
- [ ] Token expiry - Supabase default (1h)
- [ ] HTTPS only - enforced przez Supabase
- [ ] Rate limiting - Supabase Auth built-in
- [ ] No hardcoded secrets - env variables

### 7.4. Performance checklist

- [ ] Page load < 2s - statyczne strony Astro
- [ ] Form submission feedback - loading states
- [ ] Error recovery - retry buttons
- [ ] Client-side validation - instant feedback

### 7.5. Accessibility checklist

- [ ] ARIA labels - wszystkie inputy
- [ ] Keyboard navigation - Tab, Enter, Escape
- [ ] Focus management - auto-focus na first input
- [ ] Error announcements - role="alert"
- [ ] Color contrast - WCAG AA (4.5:1)
- [ ] Semantic HTML - form, label, input, button

## 8. Dokumentacja zmian

### 8.1. Changelog entry

```markdown
### Added

- Funkcjonalnosc resetowania hasla (forgot password flow)
- Strona /auth/forgot-password - wysylanie emaila resetujacego
- Strona /auth/reset-password - ustawienie nowego hasla
- E2E testy dla password reset flow (TC-AUTH-004, TC-AUTH-005)

### Changed

- Link "Zapomniales hasla?" w AuthForm.tsx przekierowuje do /auth/forgot-password
```

### 8.2. Aktualizacja README

Brak - funkcjonalnosc user-facing, nie wymaga dokumentacji developerskiej

### 8.3. Release notes

```markdown
## Password Reset Feature

Uzytkownicy moga teraz zresetowac haslo w przypadku jego zapomnienia:

1. Kliknij "Zapomniales hasla?" na stronie logowania
2. Wprowadz email uzywany przy rejestracji
3. Sprawdz skrzynke email i kliknij link resetujacy
4. Ustaw nowe haslo
5. Zaloguj sie z nowym haslem
```

## 9. Timeline i effort estimation

### 9.1. Estymacja czasu

- Konfiguracja Supabase Dashboard: 15 min
- Implementacja forgot-password.astro: 45 min
- Implementacja reset-password.astro: 45 min
- Aktualizacja AuthForm + login: 15 min
- E2E testy: 30 min
- Manual testing: 30 min
- Code review: 30 min

Łącznie: 3.5 godziny

### 9.2. Zaleznosci

- Blokujace: Dostep do Supabase Dashboard (config redirect URLs)
- Blokowane: Brak

### 9.3. Sugerowany timeline

- Start: 2026-01-15 14:00
- Code complete: 2026-01-15 16:30
- Testing complete: 2026-01-15 17:00
- Code review: 2026-01-15 17:30
- Deployment to staging: 2026-01-15 18:00
- Deployment to production: 2026-01-16 10:00

## 10. Zalączniki

### 10.1. Dotknięte pliki

```
src/components/auth/AuthForm.tsx (modyfikacja - 1 linia)
src/pages/auth/forgot-password.astro (nowy)
src/pages/auth/reset-password.astro (nowy)
src/pages/auth/login.astro (opcjonalna modyfikacja - success banner)
e2e/auth.spec.ts (dodanie testow)
```

### 10.2. Referencje

- PRD section 5.1.1: "Password reset via email" - wymagane w MVP
- ui-plan.md section 2.2: "Link do odzyskiwania hasla, PasswordReset.tsx component"
- Supabase Docs: https://supabase.com/docs/guides/auth/auth-password-reset
- Issue: Brak funkcjonalnosci reset hasla

### 10.3. Supabase API Methods

```typescript
// Wyslanie emaila resetujacego
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
});

// Ustawienie nowego hasla
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

---

## Podsumowanie

Implementacja password reset flow dla MVP Black Swan Grid wykorzystujac Supabase Auth built-in funkcjonalnosc. Rozwiazanie minimalistyczne, bezpieczne i zgodne z best practices. Effort: 3.5h, ryzyko: LOW, priorytet: HIGH.

Nastepne kroki:

1. Konfiguracja Supabase Dashboard (redirect URLs)
2. Implementacja forgot-password.astro
3. Implementacja reset-password.astro
4. Aktualizacja linku w AuthForm
5. E2E testy
6. Manual testing
7. Deployment

Plan gotowy do implementacji.
