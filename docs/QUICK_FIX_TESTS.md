# Quick Fix Guide - Testy Jednostkowe

Szybki przewodnik rozwiązywania typowych problemów z testami jednostkowymi.

---

## 🔍 Diagnozowanie problemów

### Krok 1: Uruchom testy

```bash
npm run test:unit
```

### Krok 2: Sprawdź logi błędów

Szukaj wzorców:

- ❌ `Cannot destructure property` → Problem z mockami
- ❌ `environment variable is required` → Brak env variables
- ❌ `TypeError: X is not a function` → Mock zwraca zły typ
- ❌ `expected X to be Y` → Assertion failure

---

## 🛠️ Typowe problemy i rozwiązania

### Problem 1: Mock Supabase - "Cannot destructure property 'data'"

**Błąd:**

```
TypeError: Cannot destructure property 'data' of '(intermediate value)' as it is undefined.
```

**Rozwiązanie:**

```typescript
vi.mock("@/db/supabase.client", () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token",
            user: { id: "mock-user-id" },
          },
        },
        error: null, // ← WAŻNE!
      }),
    },
  },
}));
```

---

### Problem 2: NocoDB - "NOCODB_API_URL environment variable is required"

**Błąd:**

```
Error: NOCODB_API_URL environment variable is required
```

**Rozwiązanie:**

```typescript
import { beforeAll } from "vitest";

// PRZED importem serwisu
beforeAll(() => {
  vi.stubEnv("NOCODB_API_URL", "http://localhost:8080");
  vi.stubEnv("NOCODB_API_TOKEN", "mock-token");
});

// Mock całego modułu
vi.mock("@/lib/nocodb-client", () => ({
  NocoDBClient: vi.fn().mockImplementation(() => ({
    queryRecords: vi.fn().mockResolvedValue({ list: [], pageInfo: { totalRows: 0 } }),
    getRecord: vi.fn().mockResolvedValue({}),
  })),
  NocoDBQueryBuilder: vi.fn().mockImplementation(() => ({
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
  NOCODB_TABLES: {
    /* ... */
  },
}));

// TERAZ import serwisu
import { NocoDBService } from "@/services/nocodb.service";
```

---

### Problem 3: vi.mock hoisting error

**Błąd:**

```
Error: [vitest] There was an error when mocking a module.
If you are using "vi.mock" factory, make sure there are no top level variables inside
```

**Rozwiązanie:**
❌ **ŹLE:**

```typescript
vi.mock("@/lib/module", async () => {
  const actual = await vi.importActual("@/lib/module");
  return { ...actual };
});
```

✅ **DOBRZE:**

```typescript
vi.mock("@/lib/module", () => ({
  someFunction: vi.fn(),
  SomeClass: vi.fn().mockImplementation(() => ({
    method: vi.fn().mockResolvedValue({}),
  })),
}));
```

---

### Problem 4: -0 vs 0 w testach dat

**Błąd:**

```
expected -0 to be +0 // Object.is equality
```

**Rozwiązanie:**

```typescript
// ❌ ŹLE
expect(result).toBe(0);

// ✅ DOBRZE
expect(Math.abs(result ?? 0)).toBe(0);
```

---

### Problem 5: Testy przechodzą lokalnie, ale failują w CI

**Możliwe przyczyny:**

1. Różne timezone
2. Brak zmiennych środowiskowych
3. Brak dependencies (`node_modules`)

**Rozwiązanie:**

```typescript
// Mockuj Date w testach
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-15"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

---

### Problem 6: Test timeout

**Błąd:**

```
Test timeout of 5000ms exceeded
```

**Rozwiązanie:**

```typescript
// Zwiększ timeout dla wolnych testów
test("slow test", async () => {
  // ...
}, 10000); // 10 sekund

// LUB w vitest.config.ts:
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

---

### Problem 7: Mock nie działa (funkcja wywołuje prawdziwy kod)

**Rozwiązanie:**

```typescript
// vi.mock MUSI być na top-level (nie w describe/beforeEach)
vi.mock("@/lib/module", () => ({ ... }));

describe("Test suite", () => {
  // ❌ NIE tutaj!
});
```

---

## 🎯 Checklist przed commitowaniem testów

- [ ] Wszystkie testy przechodzą lokalnie: `npm run test:unit`
- [ ] Brak ostrzeżeń w konsoli
- [ ] Mock są prawidłowo ustawione (top-level)
- [ ] Env variables są mockowane przed importami
- [ ] Cleanup wykonuje się poprawnie (`afterEach`)
- [ ] TypeScript errors = 0: `npx tsc --noEmit`

---

## 🚨 Emergency: Wszystkie testy failują

### Szybka diagnoza:

```bash
# 1. Sprawdź czy dependencies są zainstalowane
npm ci

# 2. Uruchom pojedynczy test
npm run test:unit src/lib/validation.test.ts

# 3. Sprawdź setup file
cat src/test/setup.ts

# 4. Wyczyść cache
rm -rf node_modules/.vitest
npm run test:unit
```

---

## 📚 Przydatne zasoby

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Docs](https://mswjs.io/)
- Nasz test plan: `.agents/test-plan.md`

---

**Ostatnia aktualizacja:** 2026-01-07
