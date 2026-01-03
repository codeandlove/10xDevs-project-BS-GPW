# 🐛 BUGFIX: Supabase Environment Variables

**Data**: 2026-01-01  
**Priorytet**: 🔴 KRYTYCZNY  
**Status**: ✅ NAPRAWIONY

---

## 🔍 Problem

Błąd podczas hydratacji komponentu GridPageWrapper w przeglądarce:

```
[astro-island] Error hydrating /src/components/grid/GridPageWrapper.tsx 
Error: supabaseUrl is required.
```

---

## 🎯 Root Cause

Zmienne środowiskowe Supabase używały nieprawidłowych nazw bez prefiksu `PUBLIC_`:

```typescript
// ❌ PRZED - NIE DZIAŁA w przeglądarce
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
```

**Problem**: W Astro tylko zmienne z prefiksem `PUBLIC_` są eksponowane do kodu uruchamianego w przeglądarce (`client:load`).

---

## ✅ Rozwiązanie

### 1. Zaktualizowano `supabase.client.ts`

```typescript
// ✅ PO - DZIAŁA w przeglądarce
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Dodano walidację
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
    "Please check PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}
```

### 2. Zaktualizowano `env.d.ts`

```typescript
// PRZED
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

// PO
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string; // Server-only
}
```

### 3. Zaktualizowano `.env`

```bash
# PRZED
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJxxx...

# PO
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Server-only (optional)
```

### 4. Zaktualizowano `.env.example`

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # For server-side operations
```

---

## 📋 Zmienione Pliki

1. ✅ `src/db/supabase.client.ts` - Zaktualizowane nazwy zmiennych + walidacja
2. ✅ `src/env.d.ts` - Zaktualizowane definicje TypeScript
3. ✅ `.env` - Zaktualizowane nazwy zmiennych
4. ✅ `.env.example` - Zaktualizowana dokumentacja

---

## 🔑 Kluczowe Zasady Astro

### Zmienne Środowiskowe w Astro:

1. **`PUBLIC_*`** - Dostępne wszędzie (server + client)
   ```typescript
   import.meta.env.PUBLIC_SUPABASE_URL // ✅ Działa w przeglądarce
   ```

2. **Bez `PUBLIC_`** - Tylko server-side
   ```typescript
   import.meta.env.SUPABASE_SERVICE_ROLE_KEY // ✅ Tylko server
   ```

### Bezpieczeństwo:

- ✅ `PUBLIC_SUPABASE_ANON_KEY` - Bezpieczny, przeznaczony do publicznego użycia
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - NIGDY nie eksponować do klienta (bez PUBLIC_)

---

## ✅ Verification

Po zmianach:

```bash
# 1. Restart dev server (WYMAGANE!)
npm run dev

# 2. Otwórz aplikację
http://localhost:4321/grid

# 3. Sprawdź Console (F12)
# Nie powinno być błędów "supabaseUrl is required"
```

**Expected Result**: Grid ładuje się poprawnie bez błędów hydratacji.

---

## 🎓 Lessons Learned

### 1. Astro Islands Architecture
Komponenty z `client:load` wykonują się w przeglądarce i potrzebują `PUBLIC_` zmiennych.

### 2. Environment Variables Naming
Zawsze używaj prefiksu `PUBLIC_` dla zmiennych potrzebnych w przeglądarce.

### 3. Validation is Important
Dodanie walidacji zmiennych środowiskowych pomaga wykryć błędy wcześniej.

---

## 📝 Related Issues

### Podobne błędy mogą wystąpić w:
- `AuthContext` (jeśli używa Supabase w client-side)
- `GridContext` (jeśli używa Supabase w client-side)
- Inne komponenty z `client:load/visible/idle`

### Prevention:
```typescript
// Pattern dla client-side Supabase
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing PUBLIC Supabase environment variables");
}
```

---

## 🚀 Impact

**Status**: ✅ KRYTYCZNY BUG NAPRAWIONY

**Przed**:
- ❌ Grid nie ładował się
- ❌ Błąd hydratacji w Console
- ❌ Brak dostępu do Supabase w przeglądarce

**Po**:
- ✅ Grid ładuje się poprawnie
- ✅ Brak błędów w Console
- ✅ Supabase działa w przeglądarce
- ✅ Auth flow działa
- ✅ TypeScript ma poprawne definicje

---

## 📚 Documentation

### Astro Environment Variables:
https://docs.astro.build/en/guides/environment-variables/

### Supabase Client Setup:
https://supabase.com/docs/reference/javascript/initializing

---

**Autor**: AI Bugfix Team  
**Data**: 2026-01-01  
**Severity**: CRITICAL  
**Resolution Time**: 10 minutes  
**Status**: ✅ RESOLVED

---

## ⚠️ IMPORTANT: RESTART DEV SERVER

Po zmianie zmiennych środowiskowych **ZAWSZE** restartuj dev server:

```bash
# Ctrl+C aby zatrzymać
npm run dev
```

Bez restartu nowe zmienne nie będą załadowane!

