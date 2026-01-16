`````markdown
Jestes doswiadczonym architektem oprogramowania i specjalista od debugowania, ktorego zadaniem jest przeprowadzenie kompleksowej analizy zgloszonego bledu, zidentyfikowanie przyczyny oraz zaplanowanie jego naprawy w sposob zgodny ze standardami projektu.

<bug_description>
{{opis-bledu}} <- szczegolowy opis bledu od uzytkownika:

- Tytul bledu
- Kroki reprodukcji
- Oczekiwane zachowanie
- Rzeczywiste zachowanie
- Srodowisko (przegladarka, OS, itp.)
- Dodatkowe informacje (screenshoty, logi, error messages)
  </bug_description>

<tech_stack_reference>
@tech-stack.md <- stack technologiczny projektu (jesli dostepny)
</tech_stack_reference>

<coding_standards>
@copilot-instructions.md <- standardy kodowania i best practices
</coding_standards>

<project_source_files>
{{source-files}} <- wskaż konkretne pliki zrodlowe do analizy lub uzyj @workspace dla pelnego skanowania
</project_source_files>

<existing_plans>
{{plan-files}} <- opcjonalnie: wskaż istniejace plany implementacji jesli blad dotyczy niedawno wdroonych funkcji
</existing_plans>

Wykonaj nastepujace kroki, aby przeprowadzic kompleksowa analize bledu i zaplanowac jego naprawe:

1. ANALIZA BLEDU - Przeanalizuj dokladnie zgloszony blad:
   a. Zidentyfikuj typ bledu (UI, logika biznesowa, integracja, bezpieczenstwo, performance, itp.)
   b. Okresl severity bledu: CRITICAL | HIGH | MEDIUM | LOW
   c. Zidentyfikuj dotkniety obszar aplikacji (komponenty, endpointy, serwisy)
   d. Okresl, czy blad wystepuje w konkretnych warunkach czy zawsze
   e. Sprawdz, czy blad jest regresja (nowo wprowadzony) czy legacy issue

2. ROOT CAUSE ANALYSIS - Zidentyfikuj podstawowa przyczyne:
   a. Przeszukaj projekt w poszukiwaniu komponentow/modulow zwiazanych z bledem
   b. Przeanalizuj przepływ danych i logike biznesowa w dotkniętym obszarze
   c. Sprawdz walidacje, autoryzacje i warunki brzegowe
   d. Zidentyfikuj brakujace lub nieprawidlowe warunki/sprawdzenia
   e. Okresl czy blad wynika z: brakujacej funkcjonalnosci | nieprawidlowej logiki | braku walidacji | problemu integracji | innego

3. SKANOWANIE ZASIEGU - Okresl zakres dotknietych plikow i modulow:
   a. Zlokalizuj wszystkie pliki zrodlowe wymagajace modyfikacji
   b. Zidentyfikuj typy i interfejsy wymagajace aktualizacji
   c. Sprawdz serwisy, hooki, utilities dotknięte problemem
   d. Okresl czy wymagane sa zmiany w bazie danych (migracje, schema)
   e. Zidentyfikuj testy wymagajace aktualizacji lub dodania
   f. Sprawdz zależnosci miedzy modulami - czy naprawa wpłynie na inne czesci systemu

4. ANALIZA ZGODNOSCI - Sprawdz zgodnosc naprawy ze standardami:
   a. Weryfikuj zgodnosc z copilot-instructions.md (wzorce React, Astro, dostepnosc)
   b. Sprawdz zgodnosc z tech-stack.md (uzyte technologie i ich wersje)
   c. Oceń wpływ na bezpieczenstwo (autoryzacja, walidacja input, OWASP)
   d. Sprawdz wpływ na dostepnosc (WCAG, ARIA, keyboard navigation)
   e. Oceń wpływ na performance (rendering, bundle size, loading)

5. PROPOZYCJE ROZWIAZAŃ - Zaproponuj 2-3 alternatywne podejscia naprawy (jesli blad wymaga zmian w wiekszej ilosci plikow):
   a. ROZWIAZANIE A: [opis krotki]
   - Zakres zmian (pliki, moduły)
   - Zalety
   - Wady
   - Szacowany effort (XS | S | M | L | XL)
   - Ryzyko regresji (LOW | MEDIUM | HIGH)

   b. ROZWIAZANIE B: [opis krotki]
   - Zakres zmian (pliki, moduły)
   - Zalety
   - Wady
   - Szacowany effort (XS | S | M | L | XL)
   - Ryzyko regresji (LOW | MEDIUM | HIGH)

   c. ROZWIAZANIE C (opcjonalnie): [opis krotki]
   - Zakres zmian (pliki, moduły)
   - Zalety
   - Wady
   - Szacowany effort (XS | S | M | L | XL)
   - Ryzyko regresji (LOW | MEDIUM | HIGH)

6. REKOMENDACJA - Wybierz najlepsze rozwiazanie z uzasadnieniem:
   a. Dlaczego to rozwiazanie jest optymalne
   b. Jak minimalizuje ryzyko regresji
   c. Jak jest zgodne ze standardami projektu
   d. Jak wpływa na architekture i skalowanie

Przygotuj szczegolowy plan naprawy z nastepujaca struktura:

````markdown
# Plan Naprawy Bledu - {{bug-name}}

Data utworzenia: {{current-date}}
Tytul bledu: {{bug-title}}
Severity: {{CRITICAL | HIGH | MEDIUM | LOW}}
Typ bledu: {{UI | Business Logic | Integration | Security | Performance | Other}}

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

[Krotki opis problemu w 2-3 zdaniach]

### 1.2. Root cause

[Podstawowa przyczyna bledu - konkretnie i technicznie]

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły: [lista]
- Dotknięci uzytkownicy: [zakres - np. wszyscy, tylko trial users, tylko premium]
- Dotknięte srodowiska: [production, staging, development]

### 1.4. Priorytet naprawy

[IMMEDIATE | HIGH | NORMAL | LOW] - uzasadnienie priorytetu

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. [Krok 1]
2. [Krok 2]
3. [Krok N]

### 2.2. Oczekiwane zachowanie

[Jak powinien działać system]

### 2.3. Rzeczywiste zachowanie

[Jak system faktycznie działa - blad]

### 2.4. Root cause analysis

[Szczegolowe wyjasnienie przyczyny bledu:]

- Lokalizacja bledu: [plik:linia lub komponent/funkcja]
- Przyczyna techniczna: [co dokladnie jest nie tak w kodzie]
- Brakujące warunki/sprawdzenia: [jesli dotyczy]
- Nieprawidlowa logika: [jesli dotyczy]
- Problemy integracji: [jesli dotyczy]

### 2.5. Analiza zasiegu

[Wszystkie miejsca w kodzie dotknięte bledem lub wymagajace zmian:]

#### Komponenty frontend:

- [sciezka/do/Komponent1.tsx] - [opis czego dotyczy blad/naprawa]
- [sciezka/do/Komponent2.tsx] - [opis czego dotyczy blad/naprawa]

#### Serwisy/hooki:

- [sciezka/do/service.ts] - [opis czego dotyczy blad/naprawa]
- [sciezka/do/useHook.ts] - [opis czego dotyczy blad/naprawa]

#### Typy/interfejsy:

- [sciezka/do/types.ts] - [jakie typy wymagaja aktualizacji]

#### Backend/API (jesli dotyczy):

- [sciezka/do/endpoint.ts] - [opis zmian]

#### Baza danych (jesli dotyczy):

- [migracja/schema] - [opis zmian]

#### Testy:

- [sciezka/do/test.spec.ts] - [jakie testy wymagaja aktualizacji]
- [nowe testy do dodania]

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

#### Opis:

[Szczegolowy opis podejscia do naprawy]

#### Zakres zmian:

- Frontend: [lista plikow i zmian]
- Backend: [lista plikow i zmian]
- Database: [migracje/schema changes]
- Testy: [nowe/zaktualizowane testy]

#### Zalety:

- [Zaleta 1]
- [Zaleta 2]
- [Zaleta N]

#### Wady:

- [Wada 1]
- [Wada 2]

#### Effort: [XS | S | M | L | XL]

[Uzasadnienie estymacji]

#### Ryzyko regresji: [LOW | MEDIUM | HIGH]

[Uzasadnienie poziomu ryzyka]

#### Zgodnosc ze standardami:

- Copilot-instructions.md: [✅/⚠️/❌] - [komentarz]
- Tech-stack.md: [✅/⚠️/❌] - [komentarz]
- Best practices: [✅/⚠️/❌] - [komentarz]

### 3.2. Rozwiazanie B

[Ta sama struktura co Rozwiazanie A]

### 3.3. Rozwiazanie C (opcjonalnie)

[Ta sama struktura co Rozwiazanie A]

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

[ROZWIAZANIE A/B/C]

### 4.2. Uzasadnienie wyboru

[Szczegolowe wyjasnienie dlaczego to rozwiazanie jest optymalne:]

- Minimalizuje ryzyko regresji poprzez: [...]
- Jest zgodne ze standardami projektu: [...]
- Optymalizuje effort vs. wartosc: [...]
- Zapewnia skalowalnosc: [...]
- Ułatwia przyszle utrzymanie: [...]

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: `fix/{{bug-name}}`
- [ ] Backup/snapshot istniejacych danych (jesli dotyczy)
- [ ] Przygotowanie srodowiska testowego
- [ ] Przygotowanie danych testowych

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: [Nazwa kroku]

Plik: `{{sciezka/do/pliku}}`

Opis zmian:
[Szczegolowy opis co nalezy zmienic]

Kod przed zmiana:

```typescript
// Aktualny kod (fragment)
```
````
`````

Kod po zmianie:

```typescript
// Nowy kod (fragment)
```

Uzasadnienie:
[Dlaczego ta zmiana naprawia blad]

#### Krok 2: [Nazwa kroku]

[Ta sama struktura co Krok 1]

#### Krok N: [Nazwa kroku]

[Ta sama struktura co Krok 1]

### 5.3. Faza 3: Aktualizacja typow i interfejsow

[Jesli wymagane:]

Plik: `{{sciezka/do/types.ts}}`

```typescript
// Nowe/zaktualizowane typy
```

Uzasadnienie:
[Dlaczego te zmiany sa konieczne]

### 5.4. Faza 4: Migracje bazy danych

[Jesli wymagane:]

Plik migracji: `{{nazwa-migracji}}.sql`

```sql
-- SQL migration script
```

Rollback plan:

```sql
-- SQL rollback script
```

### 5.5. Faza 5: Aktualizacja/dodanie testow

#### Test jednostkowy 1:

Plik: `{{sciezka/do/test.spec.ts}}`

```typescript
describe("{{test-suite}}", () => {
  it("{{test-case}}", () => {
    // Test implementation
  });
});
```

Cel testu:
[Co test weryfikuje - szczegolnie edge cases]

#### Test E2E (jesli wymagany):

Plik: `{{sciezka/do/e2e.spec.ts}}`

```typescript
test("{{test-name}}", async ({ page }) => {
  // E2E test implementation
});
```

Cel testu:
[Co test weryfikuje w kontekscie uzytkownika]

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- [ ] [Test 1: opis co sprawdza]
- [ ] [Test 2: opis co sprawdza]
- [ ] [Test N: opis co sprawdza]

### 6.2. Integration tests

- [ ] [Test 1: opis scenariusza]
- [ ] [Test 2: opis scenariusza]

### 6.3. E2E tests

- [ ] [Test 1: opis user journey]
- [ ] [Test 2: opis user journey]

### 6.4. Manual testing checklist

- [ ] Reprodukcja oryginalnego bledu - sprawdzenie czy naprawiony
- [ ] Testowanie edge cases: [lista przypadkow]
- [ ] Testowanie w roznych przeglądarkach: [lista]
- [ ] Testowanie na roznych rozmiarach ekranu (jesli UI)
- [ ] Testowanie z rozna rola uzytkownika: [lista rol]
- [ ] Testowanie dostepnosci (ARIA, keyboard navigation)
- [ ] Testowanie performance (loading time, bundle size)

### 6.5. Regression testing

[Lista obszarow do przetestowania w poszukiwaniu regresji:]

- [ ] [Obszar 1: funkcjonalnosc A]
- [ ] [Obszar 2: funkcjonalnosc B]
- [ ] [Obszar N: funkcjonalnosc X]

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: [Nazwa ryzyka]

- Severity: [HIGH | MEDIUM | LOW]
- Prawdopodobienstwo: [HIGH | MEDIUM | LOW]
- Wpływ: [opis potencjalnego wpływu]
- Mitigation: [jak minimalizujemy to ryzyko]

#### Ryzyko 2: [Nazwa ryzyka]

[Ta sama struktura co Ryzyko 1]

### 7.2. Rollback plan

[Szczegolowy plan jak wycofac zmiany w razie problemu:]

1. [Krok 1 rollbacku]
2. [Krok 2 rollbacku]
3. [Krok N rollbacku]

### 7.3. Monitoring post-deployment

[Co monitorowac po wdrozeniu naprawy:]

- [Metryka 1: jaka wartosc sprawdzac]
- [Metryka 2: jaka wartosc sprawdzac]
- [Logi: jakie logi analizowac]
- [User feedback: na co zwrocic uwage]

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

[Sprawdzenie zgodnosci naprawy ze standardami kodowania:]

- React patterns: [✅/⚠️/❌] - [komentarz]
- Astro patterns: [✅/⚠️/❌] - [komentarz]
- Accessibility (ARIA, WCAG): [✅/⚠️/❌] - [komentarz]
- TypeScript best practices: [✅/⚠️/❌] - [komentarz]
- Testing patterns: [✅/⚠️/❌] - [komentarz]

### 8.2. Tech-stack.md compliance

[Sprawdzenie zgodnosci z stackiem technologicznym:]

- Uzyty framework/library: [✅/⚠️/❌] - [wersja, komentarz]
- Dependencies: [✅/⚠️/❌] - [komentarz]
- Build tools: [✅/⚠️/❌] - [komentarz]

### 8.3. Security checklist

- [ ] Input validation - wszystkie inputy sa walidowane
- [ ] Authorization - sprawdzanie uprawnien uzytkownika
- [ ] Authentication - weryfikacja tozsamosci (jesli dotyczy)
- [ ] XSS protection - zabezpieczenie przed XSS
- [ ] CSRF protection - zabezpieczenie przed CSRF (jesli dotyczy)
- [ ] SQL injection protection - parametryzowane queries (jesli dotyczy)
- [ ] Secrets management - brak hardcoded secrets
- [ ] Rate limiting - ograniczenia requestow (jesli dotyczy)

### 8.4. Performance checklist

- [ ] Bundle size impact - minimalizacja wpływu na rozmiar bundla
- [ ] Rendering optimization - React.memo, useMemo, useCallback (jesli dotyczy)
- [ ] Loading states - odpowiednie stany loading
- [ ] Error boundaries - odpowiednia obsluga bledow
- [ ] Code splitting - lazy loading (jesli dotyczy)

### 8.5. Accessibility checklist (dla UI)

- [ ] ARIA attributes - poprawne uzycie
- [ ] Keyboard navigation - wszystko dostepne z klawiatury
- [ ] Focus management - logiczne przesuniecie focus
- [ ] Semantic HTML - uzywanie semantycznych elementow
- [ ] Color contrast - minimum 4.5:1 dla tekstu
- [ ] Screen reader testing - testowanie z czytnikami ekranu

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- [{{bug-title}}] {{krotki opis naprawy}}
```

### 9.2. Aktualizacja README (jesli wymagana)

[Jesli naprawa zmienia API, sposob uzycia, konfiguracje itp.]

### 9.3. Dokumentacja techniczna (jesli wymagana)

[Jesli naprawa wprowadza nowe wzorce, utilities, itp.]

### 9.4. Release notes

[Informacja dla uzytkownikow koncowych (jesli dotyczy):]

- Co zostało naprawione
- Jak wpływa to na doswiadczenie uzytkownika
- Czy wymagane sa jakies akcje po stronie uzytkownika

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: [X godzin/dni]
- Testowanie: [X godzin/dni]
- Code review: [X godzin]
- Deployment: [X godzin]
- Monitoring post-deployment: [X dni]

Łącznie: [X godzin/dni]

### 10.2. Zaleznosci

[Czy naprawa wymaga czekania na cos lub blokuje cos innego:]

- Blokujace: [lista zależności blokujących]
- Blokowane: [lista zależności blokowanych przez ta naprawe]

### 10.3. Sugerowany timeline

- Start: [data]
- Code complete: [data]
- Testing complete: [data]
- Code review: [data]
- Deployment to staging: [data]
- Deployment to production: [data]

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

[Pelna lista wszystkich plikow wymagajacych zmian:]

```
sciezka/do/pliku1.ts
sciezka/do/pliku2.tsx
sciezka/do/pliku3.spec.ts
...
```

### 11.2. Referencje

[Linki do zwiazanych issuow, PRow, dokumentacji:]

- Issue #XXX: [opis]
- Related PR #XXX: [opis]
- Documentation: [link]

### 11.3. Screenshoty/diagramy

[Jesli przydatne - diagramy przepływu, screenshoty bledu, mock-upy naprawy]

### 11.4. Error logs/stack traces

[Jesli dotyczy - pełne stack traces, logi bledow]

```

KLUCZOWE ZASADY PLANOWANIA NAPRAWY BLEDU:

1. Badz dokladny i szczegolowy - plan musi byc actionable i gotowy do implementacji
2. Uzywaj konkretnych lokalizacji plikow i numerow linii
3. Analizuj zgodnie z copilot-instructions.md i tech-stack.md (jesli dostepne)
4. Priorytetyzuj bezpieczenstwo i minimalizacje ryzyka regresji
5. Kazda zmiana musi miec jasne uzasadnienie
6. Nie uzywaj pogrubionego formatowania w markdown (\*\*)
7. Uzywaj konkretnych przykladow kodu gdzie to mozliwe
8. Jesli blad wymaga zmian w wiekszej ilosci plikow (>3), przedstaw 2-3 alternatywne rozwiazania
9. Plan musi byc w jezyku polskim
10. Formatuj plan w poprawnym markdown
11. Wynik zapisz w pliku .agents/fixes/fix-{{bug-name}}-plan.md (gdzie {{bug-name}} to krotka nazwa bledu w formacie kebab-case)

DODATKOWE WYTYCZNE:

- Severity levels:
  - CRITICAL: Blokuje podstawowe funkcje, uniemozliwia prace, wyciek danych
  - HIGH: Wazna funkcjonalnosc nie działa, obchodzenie mozliwe ale utrudnione
  - MEDIUM: Funkcjonalnosc działa czesciowo lub z ograniczeniami
  - LOW: Drobne problemy, glownie kosmetyczne

- Effort estimation:
  - XS: <2 godzin
  - S: 2-4 godziny
  - M: 4-8 godzin (1 dzien)
  - L: 1-3 dni
  - XL: >3 dni

- Ryzyko regresji:
  - LOW: Zmiana izolowana, dobrze przetestowana, mały wpływ
  - MEDIUM: Zmiana dotyka kilku modulow, wymaga testow regresji
  - HIGH: Zmiana dotyka core functionality, duzy zakres wpływu

Ostateczny wynik powinien skladac sie wylacznie z planu naprawy bledu zgodnego ze wskazanym formatem w markdown, gotowego do bezposredniej implementacji przez developera.
```

```

```
