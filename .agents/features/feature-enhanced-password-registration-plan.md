# Plan Implementacji Feature - Enhanced Password Registration

Data utworzenia: 2026-02-06
Tytuł feature: Rozszerzona Walidacja Hasła przy Rejestracji
Typ: UI/UX + Validation Feature
Priorytet: MEDIUM

## 1. Podsumowanie wykonawcze

### 1.1. Opis funkcjonalności

Rozbudowa formularza rejestracji w Black Swan Grid o następujące elementy bezpieczeństwa hasła:

1. Pole potwierdzenia hasła z walidacją zgodności
2. System wymagań haseł (minimum 3 klasy znaków: wielkie litery, małe litery, cyfry)
3. Wskaźnik siły hasła (password strength indicator) z 3 poziomami: słabe/średnie/mocne

### 1.2. Value proposition

Użytkownicy zyskują:

- Eliminację literówek przy tworzeniu hasła (pole confirm password)
- Jasne komunikaty o wymaganiach hasła jeszcze przed submit
- Real-time feedback o sile tworzonego hasła
- Zwiększone bezpieczeństwo konta poprzez wymuszenie mocniejszych haseł

Biznes zyskuje:

- Redukcja support tickets związanych z resetem hasła (-20% expected)
- Zwiększone bezpieczeństwo kont użytkowników
- Compliance z best practices security (OWASP guidelines)
- Redukcja ryzyka account takeover attacks

### 1.3. Zakres wpływu

**Nowe komponenty/moduły:**

- `src/components/auth/PasswordStrengthIndicator.tsx` - komponent paska siły hasła
- `src/components/auth/PasswordRequirements.tsx` - lista wymagań z checkmarkami

**Modyfikowane komponenty/moduły:**

- `src/components/auth/AuthForm.tsx` - główna logika formularza rejestracji
  - Dodanie pola confirmPassword
  - Rozszerzenie Zod schema o walidację klas znaków
  - Integracja z nowymi komponentami
  - Real-time calculation password strength

**Grupa docelowa użytkowników:** Nowi użytkownicy rejestrujący konta
**Dotknięte środowiska:** development, staging, production
**Dodatkowe zależności:** brak (używamy istniejącego Zod, React)

### 1.4. Priorytet i MVP scope

**MEDIUM** - Feature zwiększa bezpieczeństwo i UX, ale nie blokuje core functionality

**MVP (must-have):**

- Pole potwierdzenia hasła z walidacją zgodności ✓
- Wymagania hasła: min 6 znaków + min 3 klasy (wielkie/małe/cyfry) ✓
- Lista wymagań pokazująca w real-time które są spełnione ✓
- Password strength indicator (słabe/średnie/mocne) ✓
- Komunikaty błędów pod polami przy niezgodności/niespełnieniu wymagań ✓
- Konfiguracja wymagań w osobnym config object (rozszerzalne z kodu) ✓

**Nice-to-have (może być dodane później):**

- Toggle "show password" dla obu pól hasła
- Password generator z przyciskiem "Wygeneruj mocne hasło"
- Integracja z Have I Been Pwned API (sprawdzanie czy hasło wyciekło)
- Password strength scoring algorithm (zxcvbn library)
- Tooltip z przykładami mocnych haseł
- Animacje przy spełnianiu kolejnych wymagań

## 2. Szczegółowa analiza wymagań

### 2.1. Wymagania funkcjonalne

1. System musi dodać pole "Potwierdź hasło" w trybie register (nie w login) - MUST
2. Walidacja musi sprawdzać czy confirmPassword === password przed submit - MUST
3. Komunikat błędu "Hasła nie są identyczne" musi pojawić się pod polem confirmPassword - MUST
4. System musi walidować minimum 3 klasy znaków: wielkie litery, małe litery, cyfry - MUST
5. System musi pokazywać listę wymagań z checkmarkami (✓/○) reagującymi na wpisywane znaki - MUST
6. Password strength indicator musi pokazywać 3 poziomy: słabe/średnie/mocne - MUST
7. Logika siły hasła:
   - Słabe: 6-7 znaków + min 3 klasy
   - Średnie: 8-11 znaków + 3-4 klasy
   - Mocne: 12+ znaków + wszystkie 4 klasy (włącznie ze znakami specjalnymi)
8. Konfiguracja wymagań musi być w osobnym obiekcie PASSWORD_CONFIG na początku pliku - MUST
9. Password strength musi być obliczany w real-time (useMemo, <50ms) - MUST
10. Lista wymagań i strength indicator nie mogą być pokazane w trybie login - MUST
11. Walidacja Zod musi blokować submit jeśli wymagania nie są spełnione - MUST
12. Accessibility: pola muszą mieć aria-invalid, aria-describedby dla screen readers - MUST

### 2.2. Wymagania niefunkcjonalne

**Performance:**

- Password strength calculation < 50ms (real-time)
- Lista wymagań update < 16ms (60 FPS)
- Brak re-renderów niepotrzebnych komponentów (useCallback, useMemo)
- Virtual DOM updates optymalizowane przez React.memo (jeśli potrzebne)

**Security:**

- Hasło minimum 6 znaków (aktualna wartość)
- Wymagane 3 z 4 klas znaków: wielkie/małe/cyfry/znaki specjalne
- Walidacja po stronie klienta + dodatkowo po stronie serwera (Supabase Auth)
- Brak logowania hasła w console/logs
- Proper autocomplete attributes (new-password)

**Accessibility (WCAG 2.1 AA):**

- aria-invalid dla invalid inputs
- aria-describedby łączące pole z error messages
- aria-label dla password strength progressbar
- role="progressbar" dla strength indicator
- Keyboard navigation działa bez zmian
- Focus indicators widoczne
- Color contrast 4.5:1 dla tekstu komunikatów

**UX:**

- Lista wymagań widoczna od razu (nie po błędzie)
- Checkmarki zmieniają kolor green/gray w real-time
- Password strength bar animowany (transition-all duration-300)
- Komunikaty błędów pod odpowiednimi polami (nie na górze formy)
- Pola disabled podczas loading state

**Compatibility:**

- React 19+ (używamy hooks: useState, useMemo)
- Zod validation schema (aktualna zależność)
- Tailwind CSS dla stylowania (aktualna zależność)
- Brak dodatkowych zewnętrznych dependencies

## 3. Architektura techniczna

### 3.1. Przepływ danych (data flow)

```
User types in password field
    ↓
onChange handler updates password state
    ↓
useMemo recalculates passwordStrength (calculatePasswordStrength)
    ↓
useMemo recalculates passwordRequirements array (checkPasswordClasses)
    ↓
PasswordRequirements component re-renders with new requirements[]
    ↓
PasswordStrengthIndicator re-renders with new strength value
    ↓
User types in confirmPassword field
    ↓
onChange updates confirmPassword state
    ↓
User submits form
    ↓
Zod validation:
  - checks password length >= 6
  - checks password has >= 3 character classes (refine)
  - checks confirmPassword === password (refine)
    ↓
If invalid: setValidationErrors, show error messages
If valid: proceed to Supabase signUp
```

### 3.2. Struktura komponentów

```
AuthPageWrapper (client:load)
  └── AuthForm (mode="register")
      ├── Email field
      ├── Password field
      │   ├── PasswordRequirements (if mode="register" && password.length > 0)
      │   └── PasswordStrengthIndicator (if mode="register" && password.length > 0)
      ├── Confirm Password field (if mode="register")
      ├── Error messages (conditional)
      └── Submit button
```

### 3.3. Konfiguracja PASSWORD_CONFIG

```typescript
const PASSWORD_CONFIG = {
  minLength: 6, // Minimum znaków
  requireUppercase: true, // Wymaga wielkich liter A-Z
  requireLowercase: true, // Wymaga małych liter a-z
  requireNumbers: true, // Wymaga cyfr 0-9
  requireSpecialChars: false, // Opcjonalne: znaki specjalne (4ta klasa)
  minClassesRequired: 3, // Min liczba spełnionych klas (3 z 4)
};
```

Rozszerzalność: Developer może zmienić wartości w obiekcie. Przykład:

- Zwiększenie minLength do 8
- Włączenie requireSpecialChars: true + minClassesRequired: 4
- System automatycznie dostosuje listę wymagań i walidację

### 3.4. Logika Password Strength

```typescript
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return null;

  const { classesCount } = checkPasswordClasses(password);
  const length = password.length;

  // Strong: 12+ chars + all 4 classes
  if (length >= 12 && classesCount === 4) return "strong";

  // Medium: 8-11 chars + 3-4 classes
  if (length >= 8 && classesCount >= 3) return "medium";

  // Weak: meets minimum (6+ chars + 3+ classes)
  if (length >= PASSWORD_CONFIG.minLength && classesCount >= PASSWORD_CONFIG.minClassesRequired) {
    return "weak";
  }

  // Below minimum
  return null;
}
```

### 3.5. Zod Schema z Character Classes

```typescript
const createAuthSchema = (mode: "login" | "register") => {
  const baseSchema = {
    email: z.string().email("Nieprawidłowy adres email"),
    password: z.string().min(PASSWORD_CONFIG.minLength, `Hasło musi mieć minimum ${PASSWORD_CONFIG.minLength} znaków`),
  };

  if (mode === "register") {
    return z
      .object({
        ...baseSchema,
        confirmPassword: z.string().min(1, "Potwierdź hasło"),
      })
      .refine(
        (data) => {
          const { classesCount, hasUppercase, hasLowercase, hasNumbers, hasSpecialChars } = checkPasswordClasses(
            data.password
          );

          const meetsClassRequirements =
            classesCount >= PASSWORD_CONFIG.minClassesRequired &&
            (!PASSWORD_CONFIG.requireUppercase || hasUppercase) &&
            (!PASSWORD_CONFIG.requireLowercase || hasLowercase) &&
            (!PASSWORD_CONFIG.requireNumbers || hasNumbers) &&
            (!PASSWORD_CONFIG.requireSpecialChars || hasSpecialChars);

          return meetsClassRequirements;
        },
        {
          message: `Hasło musi zawierać co najmniej ${PASSWORD_CONFIG.minClassesRequired} z następujących: wielkie litery, małe litery, cyfry${PASSWORD_CONFIG.requireSpecialChars ? ", znaki specjalne" : ""}`,
          path: ["password"],
        }
      )
      .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
      });
  }

  return z.object(baseSchema);
};
```

## 4. Plan implementacji krok po kroku

### KROK 1: Utworzenie komponentu PasswordStrengthIndicator.tsx

**Czas szacowany:** 20 min  
**Plik:** `src/components/auth/PasswordStrengthIndicator.tsx`

**Zadania:**

- [ ] Utworzyć nowy plik komponentu
- [ ] Zdefiniować type PasswordStrength = "weak" | "medium" | "strong" | null
- [ ] Zaimplementować komponent z useMemo dla config (label, width, color)
- [ ] Dodać progress bar z aria-\* attributes
- [ ] Styled z Tailwind: bg-red-500 (weak), bg-yellow-500 (medium), bg-green-500 (strong)
- [ ] Dodać transition-all duration-300 dla smooth animation
- [ ] Export komponentu i typu

**Kryteria akceptacji:**

- Komponent renderuje progress bar z odpowiednim kolorem
- Aria attributes są poprawne dla screen readers
- Animacja działa płynnie (300ms transition)
- Type PasswordStrength jest exportowany dla użycia w AuthForm

**Kod do implementacji:**

```typescript
import { useMemo } from "react";

export type PasswordStrength = "weak" | "medium" | "strong" | null;

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
}

export function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  const config = useMemo(() => {
    switch (strength) {
      case "weak":
        return {
          label: "Słabe",
          width: "33.333%",
          color: "bg-red-500",
          textColor: "text-red-700",
        };
      case "medium":
        return {
          label: "Średnie",
          width: "66.666%",
          color: "bg-yellow-500",
          textColor: "text-yellow-700",
        };
      case "strong":
        return {
          label: "Mocne",
          width: "100%",
          color: "bg-green-500",
          textColor: "text-green-700",
        };
      default:
        return null;
    }
  }, [strength]);

  if (!config) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${config.textColor}`}>
          Siła hasła: {config.label}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${config.color}`}
          style={{ width: config.width }}
          role="progressbar"
          aria-valuenow={strength === "weak" ? 33 : strength === "medium" ? 66 : 100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Siła hasła: ${config.label}`}
        />
      </div>
    </div>
  );
}
```

---

### KROK 2: Utworzenie komponentu PasswordRequirements.tsx

**Czas szacowany:** 25 min  
**Plik:** `src/components/auth/PasswordRequirements.tsx`

**Zadania:**

- [ ] Utworzyć nowy plik komponentu
- [ ] Zdefiniować interface PasswordRequirement { label: string; met: boolean }
- [ ] Zaimplementować komponent z mapowaniem requirements array
- [ ] Dodać checkmarki: ✓ (green) dla met=true, ○ (gray) dla met=false
- [ ] Styled z Tailwind: conditional colors green-700/gray-600
- [ ] Dodać aria-label dla każdego checkmark (Spełnione/Niespełnione)
- [ ] Export komponentu

**Kryteria akceptacji:**

- Lista wymagań renderuje się poprawnie
- Checkmarki zmieniają kolor dynamicznie
- Text color reaguje na stan met (green/gray)
- Accessibility attributes są poprawne

**Kod do implementacji:**

```typescript
interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  requirements: PasswordRequirement[];
}

export function PasswordRequirements({ requirements }: PasswordRequirementsProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-700">Wymagania hasła:</p>
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                req.met ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
              }`}
              aria-label={req.met ? "Spełnione" : "Niespełnione"}
            >
              {req.met ? "✓" : "○"}
            </span>
            <span className={req.met ? "text-green-700" : "text-gray-600"}>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### KROK 3: Dodanie helper functions do AuthForm.tsx

**Czas szacowany:** 30 min  
**Plik:** `src/components/auth/AuthForm.tsx`

**Zadania:**

- [ ] Dodać obiekt PASSWORD_CONFIG na początku pliku (po NEEDS_CONFIRM_EMAIL)
- [ ] Zaimplementować funkcję checkPasswordClasses(password: string)
- [ ] Zaimplementować funkcję calculatePasswordStrength(password: string)
- [ ] Zaimplementować funkcję createAuthSchema(mode: "login" | "register")
- [ ] Import nowych komponentów: PasswordStrengthIndicator, PasswordRequirements

**Kryteria akceptacji:**

- checkPasswordClasses zwraca poprawne wartości dla różnych haseł
- calculatePasswordStrength zwraca poprawny poziom siły
- createAuthSchema generuje różne schematy dla login/register
- Refines w Zod działają: sprawdzają klasy znaków i zgodność haseł

**Lokalizacja zmian w pliku:**

```typescript
// Po linii z NEEDS_CONFIRM_EMAIL (linia ~18)

/**
 * Configuration: Password Requirements
 * Customize password character class requirements here
 */
const PASSWORD_CONFIG = {
  minLength: 6,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  minClassesRequired: 3,
};

// Przed interface AuthFormProps (przed linią ~20)

/**
 * Helper: Check if password meets character class requirements
 */
function checkPasswordClasses(password: string): {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  classesCount: number;
} {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~;]/.test(password);

  const classesCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  return {
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
    classesCount,
  };
}

/**
 * Helper: Calculate password strength
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return null;

  const { classesCount } = checkPasswordClasses(password);
  const length = password.length;

  if (length >= 12 && classesCount === 4) return "strong";
  if (length >= 8 && classesCount >= 3) return "medium";
  if (length >= PASSWORD_CONFIG.minLength && classesCount >= PASSWORD_CONFIG.minClassesRequired) {
    return "weak";
  }

  return null;
}

// Zastąpić stary authSchema tym:

const createAuthSchema = (mode: "login" | "register") => {
  const baseSchema = {
    email: z.string().email("Nieprawidłowy adres email"),
    password: z.string().min(PASSWORD_CONFIG.minLength, `Hasło musi mieć minimum ${PASSWORD_CONFIG.minLength} znaków`),
  };

  if (mode === "register") {
    return z
      .object({
        ...baseSchema,
        confirmPassword: z.string().min(1, "Potwierdź hasło"),
      })
      .refine(
        (data) => {
          const { classesCount, hasUppercase, hasLowercase, hasNumbers, hasSpecialChars } = checkPasswordClasses(
            data.password
          );

          return (
            classesCount >= PASSWORD_CONFIG.minClassesRequired &&
            (!PASSWORD_CONFIG.requireUppercase || hasUppercase) &&
            (!PASSWORD_CONFIG.requireLowercase || hasLowercase) &&
            (!PASSWORD_CONFIG.requireNumbers || hasNumbers) &&
            (!PASSWORD_CONFIG.requireSpecialChars || hasSpecialChars)
          );
        },
        {
          message: `Hasło musi zawierać co najmniej ${PASSWORD_CONFIG.minClassesRequired} z następujących: wielkie litery, małe litery, cyfry${PASSWORD_CONFIG.requireSpecialChars ? ", znaki specjalne" : ""}`,
          path: ["password"],
        }
      )
      .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
      });
  }

  return z.object(baseSchema);
};
```

**Dodać importy na górze pliku:**

```typescript
import { useState, useMemo } from "react"; // dodać useMemo
import { PasswordStrengthIndicator, type PasswordStrength } from "./PasswordStrengthIndicator";
import { PasswordRequirements } from "./PasswordRequirements";
```

---

### KROK 4: Rozszerzenie state i useMemo w AuthForm.tsx

**Czas szacowany:** 20 min  
**Plik:** `src/components/auth/AuthForm.tsx`

**Zadania:**

- [ ] Dodać state: confirmPassword
- [ ] Rozszerzyć validationErrors type o confirmPassword
- [ ] Dodać useMemo dla passwordStrength
- [ ] Dodać useMemo dla passwordRequirements array

**Kryteria akceptacji:**

- confirmPassword state działa poprawnie
- passwordStrength oblicza się w real-time (< 50ms)
- passwordRequirements array aktualizuje się dynamicznie
- useMemo nie re-renderuje gdy niepotrzebne

**Lokalizacja zmian:**

W funkcji AuthForm (po useState dla password, ~line 30):

```typescript
const [confirmPassword, setConfirmPassword] = useState("");

// Rozszerzyć type w useState dla validationErrors:
const [validationErrors, setValidationErrors] = useState<{
  email?: string;
  password?: string;
  confirmPassword?: string;
}>({});

// Dodać po useToast() (~line 35):

const passwordStrength = useMemo(() => {
  if (mode !== "register") return null;
  return calculatePasswordStrength(password);
}, [password, mode]);

const passwordRequirements = useMemo(() => {
  if (mode !== "register") return [];

  const { hasUppercase, hasLowercase, hasNumbers, hasSpecialChars } = checkPasswordClasses(password);
  const meetsLength = password.length >= PASSWORD_CONFIG.minLength;

  const requirements = [
    {
      label: `Co najmniej ${PASSWORD_CONFIG.minLength} znaków`,
      met: meetsLength,
    },
  ];

  if (PASSWORD_CONFIG.requireUppercase) {
    requirements.push({
      label: "Wielkie litery (A-Z)",
      met: hasUppercase,
    });
  }

  if (PASSWORD_CONFIG.requireLowercase) {
    requirements.push({
      label: "Małe litery (a-z)",
      met: hasLowercase,
    });
  }

  if (PASSWORD_CONFIG.requireNumbers) {
    requirements.push({
      label: "Cyfry (0-9)",
      met: hasNumbers,
    });
  }

  if (PASSWORD_CONFIG.requireSpecialChars) {
    requirements.push({
      label: "Znaki specjalne (!@#$%...)",
      met: hasSpecialChars,
    });
  }

  return requirements;
}, [password, mode]);
```

---

### KROK 5: Aktualizacja handleSubmit - walidacja z createAuthSchema

**Czas szacowany:** 15 min  
**Plik:** `src/components/auth/AuthForm.tsx`

**Zadania:**

- [ ] Zamienić authSchema.safeParse na createAuthSchema(mode).safeParse
- [ ] Przekazać confirmPassword w dataToValidate dla register mode
- [ ] Obsłużyć errors.confirmPassword w error mapping

**Kryteria akceptacji:**

- Walidacja blokuje submit jeśli hasło nie spełnia wymagań
- Walidacja blokuje submit jeśli hasła się nie zgadzają
- Error messages pokazują się pod odpowiednimi polami

**Lokalizacja zmian:**

W handleSubmit (~line 40-50), zastąpić:

```typescript
// STARE:
const result = authSchema.safeParse({ email, password });

// NOWE:
const schema = createAuthSchema(mode);
const dataToValidate = mode === "register" ? { email, password, confirmPassword } : { email, password };

const result = schema.safeParse(dataToValidate);

// W error mapping dodać:
if (err.path[0] === "confirmPassword") errors.confirmPassword = err.message;
```

---

### KROK 6: Modyfikacja JSX - dodanie PasswordRequirements i PasswordStrengthIndicator

**Czas szacowany:** 20 min  
**Plik:** `src/components/auth/AuthForm.tsx`

**Zadania:**

- [ ] Dodać PasswordRequirements pod polem password (conditional: register mode)
- [ ] Dodać PasswordStrengthIndicator pod PasswordRequirements (conditional: register mode)
- [ ] Zaktualizować aria-describedby dla password input

**Kryteria akceptacji:**

- Oba komponenty pokazują się tylko w trybie register
- Komponenty aktualizują się w real-time przy wpisywaniu hasła
- aria-describedby łączy input z requirements

**Lokalizacja zmian:**

W JSX, po </input> dla password field i przed closing </div> (~line 175):

```typescript
{validationErrors.password && (
  <p id="password-error" className="mt-1 text-xs text-red-600">
    {validationErrors.password}
  </p>
)}

{/* DODAĆ TU: */}
{mode === "register" && password && (
  <div id="password-requirements">
    <PasswordRequirements requirements={passwordRequirements} />
    <PasswordStrengthIndicator strength={passwordStrength} />
  </div>
)}
```

Zaktualizować aria-describedby w password input:

```typescript
aria-describedby={
  mode === "register"
    ? validationErrors.password
      ? "password-error password-requirements"
      : "password-requirements"
    : validationErrors.password
      ? "password-error"
      : undefined
}
```

---

### KROK 7: Modyfikacja JSX - dodanie pola Confirm Password

**Czas szacowany:** 25 min  
**Plik:** `src/components/auth/AuthForm.tsx`

**Zadania:**

- [ ] Dodać pole confirmPassword po polu password (conditional: mode="register")
- [ ] Proper styling, validation errors, accessibility attributes

**Kryteria akceptacji:**

- Pole confirmPassword pokazuje się tylko w trybie register
- Styling reaguje na błędy walidacji
- Error message pojawia się pod polem
- Accessibility attributes są poprawne

**Lokalizacja zmian:**

Po closing </div> password field, przed Error message div (~line 185):

```typescript
{/* Confirm Password field - register mode only */}
{mode === "register" && (
  <div>
    <label htmlFor="confirmPassword" className="block text-sm font-medium">
      Potwierdź hasło
    </label>
    <input
      id="confirmPassword"
      name="confirmPassword"
      type="password"
      value={confirmPassword}
      onChange={(e) => setConfirmPassword(e.target.value)}
      className={`mt-1 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
        validationErrors.confirmPassword ? "border-red-500" : "border-gray-300"
      }`}
      placeholder="••••••••"
      autoComplete="new-password"
      required
      disabled={isLoading}
      aria-invalid={!!validationErrors.confirmPassword}
      aria-describedby={validationErrors.confirmPassword ? "confirmPassword-error" : undefined}
    />
    {validationErrors.confirmPassword && (
      <p id="confirmPassword-error" className="mt-1 text-xs text-red-600">
        {validationErrors.confirmPassword}
      </p>
    )}
  </div>
)}
```

---

### KROK 8: Testy manualne - happy path i edge cases

**Czas szacowany:** 30 min

**Scenariusze testowe:**

**TC1: Happy path - mocne hasło**

- [ ] Otwórz /auth/register
- [ ] Wpisz email: test@example.com
- [ ] Wpisz hasło: Test123!@# (12 znaków, 4 klasy)
- [ ] Sprawdź: wszystkie wymagania ✓, strength: Mocne (green bar 100%)
- [ ] Wpisz confirm: Test123!@#
- [ ] Submit → sukces, redirect do /auth/confirmation

**TC2: Średnie hasło**

- [ ] Wpisz hasło: Test1234 (8 znaków, 3 klasy)
- [ ] Sprawdź: wszystkie wymagania ✓, strength: Średnie (yellow bar ~66%)
- [ ] Potwierdź i submit → sukces

**TC3: Słabe hasło (ale valid)**

- [ ] Wpisz hasło: Test12 (6 znaków, 3 klasy)
- [ ] Sprawdź: wszystkie wymagania ✓, strength: Słabe (red bar ~33%)
- [ ] Potwierdź i submit → sukces

**TC4: Hasło za krótkie**

- [ ] Wpisz hasło: Test1 (5 znaków)
- [ ] Sprawdź: checkmark "Co najmniej 6 znaków" = ○ (gray)
- [ ] Submit → error "Hasło musi mieć minimum 6 znaków"

**TC5: Hasło bez wymaganych klas**

- [ ] Wpisz hasło: testtest (8 znaków, tylko małe litery)
- [ ] Sprawdź: checkmarki "Wielkie litery", "Cyfry" = ○ (gray)
- [ ] Submit → error "Hasło musi zawierać co najmniej 3 z następujących..."

**TC6: Hasła się nie zgadzają**

- [ ] Wpisz hasło: Test123456
- [ ] Wpisz confirm: Test123457 (różne)
- [ ] Submit → error "Hasła nie są identyczne" pod polem confirm

**TC7: Login mode - brak nowych elementów**

- [ ] Otwórz /auth/login
- [ ] Sprawdź: brak pola confirmPassword
- [ ] Sprawdź: brak PasswordRequirements
- [ ] Sprawdź: brak PasswordStrengthIndicator
- [ ] Login działa bez zmian

**TC8: Real-time updates**

- [ ] Wpisz hasło powoli: t → sprawdź updates
- [ ] Dodaj: T → checkmark "Wielkie litery" ✓
- [ ] Dodaj: 1 → checkmark "Cyfry" ✓
- [ ] Dodaj kolejne znaki → bar rośnie (weak → medium → strong)

**TC9: Accessibility - keyboard navigation**

- [ ] Tab przez wszystkie pola (email → password → confirm)
- [ ] Focus indicators widoczne
- [ ] Enter na submit działa

**TC10: Accessibility - screen reader**

- [ ] Użyj screen reader (NVDA/VoiceOver)
- [ ] Sprawdź: aria-invalid odczytywane przy błędach
- [ ] Sprawdź: aria-describedby łączy input z error messages
- [ ] Sprawdź: password strength progressbar odczytywany

---

### KROK 9: Code review i refactoring

**Czas szacowany:** 20 min

**Checklist:**

- [ ] Usuń nieużywany stary authSchema (jeśli pozostał)
- [ ] Sprawdź czy wszystkie useMemo mają poprawne dependencies
- [ ] Sprawdź czy brak console.log() z hasłami
- [ ] Sprawdź TypeScript errors (0 errors)
- [ ] Sprawdź ESLint warnings i popraw krytyczne
- [ ] Sprawdź formatting (Prettier)
- [ ] Dodaj JSDoc comments dla helper functions
- [ ] Sprawdź czy PASSWORD_CONFIG jest łatwo rozszerzalny

---

### KROK 10: Dokumentacja

**Czas szacowany:** 15 min

**Zadania:**

- [ ] Dodać komentarze w PASSWORD_CONFIG jak rozszerzać wymagania
- [ ] Zaktualizować README.md (jeśli istnieje sekcja o rejestracji)
- [ ] Przygotować migration notes (brak zmian w DB/API)

---

## 5. Estymacja czasu i resources

### 5.1. Breakdown czasu

| Krok      | Zadanie                       | Czas (min)          |
| --------- | ----------------------------- | ------------------- |
| 1         | PasswordStrengthIndicator     | 20                  |
| 2         | PasswordRequirements          | 25                  |
| 3         | Helper functions              | 30                  |
| 4         | State & useMemo               | 20                  |
| 5         | handleSubmit update           | 15                  |
| 6         | JSX - Requirements & Strength | 20                  |
| 7         | JSX - Confirm Password        | 25                  |
| 8         | Testy manualne                | 30                  |
| 9         | Code review                   | 20                  |
| 10        | Dokumentacja                  | 15                  |
| **TOTAL** |                               | **220 min (~3.5h)** |

Buffer dla nieprzewidzianych problemów: +30 min  
**Total z bufferem: 4 godziny**

### 5.2. Resources

**Developer:** 1x Frontend Developer (React + TypeScript)  
**Reviewer:** 1x Senior Developer (code review)  
**Tester:** Developer (self-testing + UAT)

**Zależności zewnętrzne:** brak  
**Dodatkowe libraries:** brak (używamy: React, Zod, Tailwind)

## 6. Potencjalne ryzyka i mitigation

### 6.1. Ryzyka techniczne

**Ryzyko 1: Performance degradation przy wpisywaniu hasła**  
**Prawdopodobieństwo:** LOW  
**Impact:** MEDIUM  
**Mitigation:** useMemo dla expensive calculations, profiling z React DevTools

**Ryzyko 2: Zod refines mogą nie działać poprawnie**  
**Prawdopodobieństwo:** LOW  
**Impact:** HIGH  
**Mitigation:** Testy wszystkich edge cases walidacji, fallback: custom validator

**Ryzyko 3: Breaking change dla istniejących userów**  
**Prawdopodobieństwo:** NONE  
**Impact:** NONE  
**Mitigation:** Feature dotyczy tylko nowej rejestracji, istniejące hasła OK

### 6.2. Ryzyka UX

**Ryzyko 4: Użytkownicy frustrują się strictnymi wymaganiami**  
**Prawdopodobieństwo:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:**

- Min 6 znaków to industry standard
- 3 z 4 klas to balance security/UX
- Real-time feedback redukuje frustrację

**Ryzyko 5: Password strength logic zbyt simplistic**  
**Prawdopodobieństwo:** LOW  
**Impact:** LOW  
**Mitigation:** Dla MVP wystarczające, future: zxcvbn library

## 7. Sukces metryki

### 7.1. Krytyczne metryki

**M1: Support tickets - resetowanie hasła**  
**Target:** Redukcja o 20% w ciągu 3 miesięcy  
**Measurement:** Support ticket system

**M2: Registration completion rate**  
**Target:** Brak degradacji (>= baseline)  
**Measurement:** Google Analytics funnel

**M3: Password strength distribution**  
**Target:**

- Weak < 30%
- Medium 40-50%
- Strong > 20%  
  **Measurement:** Custom event tracking (anonymous)

## 8. Rollout strategy

### 8.1. Deployment plan

**Etap 1: Development (dzień 1)**

- Implementacja kroków 1-7
- Local testing
- Commit do feature branch: `feature/enhanced-password-registration`

**Etap 2: Code Review (dzień 1)**

- Pull Request creation
- Code review przez Senior Developer
- Fixes jeśli potrzebne

**Etap 3: Staging deployment (dzień 2)**

- Merge do `develop` branch
- Auto-deploy do staging
- QA testing (kroki 8-10)
- UAT (internal team)

**Etap 4: Production deployment (dzień 3)**

- Merge do `main` branch
- Deploy do production (off-peak hours)
- Monitoring przez pierwsze 24h

### 8.2. Rollback plan

**Trigger conditions:**

- Registration completion rate drops > 10%
- Critical bug (form unusable)
- Performance issues (page load > 3s)

**Rollback procedure:**

1. Revert merge commit w `main`
2. Redeploy previous version (< 5 min)
3. Post-mortem analysis

### 8.3. Monitoring

**Day 1-7:**

- Hourly checks: registration completion rate
- Error tracking: Sentry/LogRocket
- Performance: Web Vitals
- User feedback: support tickets

**Week 2-4:**

- Weekly analytics review
- Password strength distribution
- A/B testing consideration

## 9. Future enhancements

**Enhancement 1: Password generator**  
**Priority:** MEDIUM | **Effort:** 2h  
**Value:** Ułatwia tworzenie mocnych haseł

**Enhancement 2: Show/hide password toggle**  
**Priority:** HIGH | **Effort:** 1h  
**Value:** Standard UX feature

**Enhancement 3: zxcvbn integration**  
**Priority:** LOW | **Effort:** 3h  
**Value:** Sophisticated strength analysis

**Enhancement 4: Have I Been Pwned API**  
**Priority:** LOW | **Effort:** 4h  
**Value:** Warning jeśli hasło wyciekło

## 10. Notatki końcowe

### 10.1. Decyzje architektoniczne

**Decision 1: Osobne komponenty vs inline logic**  
**Wybrano:** Osobne komponenty  
**Rationale:** Reusability, separation of concerns, testability

**Decision 2: useMemo vs useCallback**  
**Wybrano:** useMemo dla calculations  
**Rationale:** Calculations są synchroniczne, brak prop drilling

**Decision 3: Zod refines vs custom validator**  
**Wybrano:** Zod refines  
**Rationale:** Consistency z istniejącym kodem, deklaratywny style

### 10.2. Pytania do stakeholderów

**Q1:** Czy chcemy A/B testować strictness wymagań (3 vs 4 klasy)?  
**Q2:** Czy warto dodać analytics tracking dla password strength?  
**Q3:** Czy planujemy komunikację do użytkowników (email, banner)?  
**Q4:** Czy nice-to-have features są w roadmapie Q1/Q2 2026?

### 10.3. Dependencies i assumptions

**Assumptions:**

- Supabase Auth pozostaje jako auth provider
- Brak migracji do innego auth systemu w Q1 2026
- Current registration flow nie zmienia się
- Tailwind classes są zdefiniowane

**External dependencies:**

- Zod library (sprawdź package.json)
- React 19+ (useMemo)
- Tailwind CSS v4.x

---

## SUMMARY: Ready to Implement

Plan feature zawiera:

- ✅ Szczegółową analizę wymagań funkcjonalnych i niefunkcjonalnych
- ✅ Architekturę techniczną z data flow i component structure
- ✅ 10 kroków implementacji z criteria akceptacji
- ✅ Estymację czasu: 4h total (z bufferem)
- ✅ Risk mitigation strategies
- ✅ Success metrics i rollout plan
- ✅ Future enhancements roadmap

**Next steps:**

1. Review planu przez Product Owner / Tech Lead
2. Approve plan lub feedback/adjustments
3. Create ticket w project management tool
4. Assign do Frontend Developer
5. Start implementation zgodnie z krokami 1-10
