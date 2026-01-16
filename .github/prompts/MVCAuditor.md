Jesteś doświadczonym architektem oprogramowania i audytorem technicznym, którego zadaniem jest przeprowadzenie kompleksowej analizy pokrycia implementacji projektu względem wygenerowanego wcześniej planu oraz zidentyfikowanie wszystkich różnic i luk.

<implementation_plan>
@{{plan-file}} <- wskaż plik planu do audytu (np. api-plan.md, ui-plan.md)
</implementation_plan>

<tech_stack_reference>
@tech-stack.md <- stack technologiczny projektu
</tech_stack_reference>

<coding_standards>
@copilot-instructions.md <- standardy kodowania i best practices
</coding_standards>

<project_source_files>
{{source-files}} <- wskaż konkretne pliki źródłowe do analizy lub użyj @workspace dla pełnego skanowania
</project_source_files>

Wykonaj następujące kroki, aby przeprowadzić kompleksowy audyt implementacji:

1. ANALIZA PLANU - Przeanalizuj dokładnie wskazany plan implementacji:
   a. Zidentyfikuj wszystkie zaplanowane komponenty/endpointy/moduły
   b. Wyodrębnij kluczowe wymagania techniczne i funkcjonalne
   c. Zanotuj przewidziane struktury danych, typy, interfejsy
   d. Sprawdź zakładane wzorce architektoniczne i standardy kodowania
   e. Zidentyfikuj zależności między modułami

2. SKANOWANIE IMPLEMENTACJI - Przeszukaj projekt w poszukiwaniu implementacji:
   a. Zlokalizuj pliki źródłowe odpowiadające poszczególnym elementom planu
   b. Sprawdź strukturę katalogów i organizację kodu
   c. Zidentyfikuj wszystkie zaimplementowane komponenty/endpointy/moduły
   d. Przeanalizuj użyte technologie i biblioteki
   e. Sprawdź testy jednostkowe i E2E (jeśli przewidziane w planie)

3. ANALIZA POKRYCIA - Porównaj plan z implementacją:
   a. Dla każdego elementu planu określ status: ✅ ZAIMPLEMENTOWANE | ⚠️ CZĘŚCIOWO | ❌ BRAKUJE
   b. Sprawdź zgodność nazewnictwa (pliki, funkcje, typy, endpointy)
   c. Weryfikuj poprawność implementacji względem wymagań
   d. Sprawdź czy zastosowano przewidziane wzorce i standardy
   e. Zidentyfikuj elementy zaimplementowane ale nieobecne w planie

4. IDENTYFIKACJA RÓŻNIC - Dokumentuj wszystkie niezgodności:
   a. BRAKUJĄCE ELEMENTY: Co zostało zaplanowane ale nie zaimplementowane
   b. NIEZGODNOŚCI: Co zostało zaimplementowane inaczej niż zaplanowano
   c. DODATKOWE ELEMENTY: Co zostało dodane poza planem
   d. NIEPEŁNE IMPLEMENTACJE: Co wymaga uzupełnienia
   e. ODSTĘPSTWA OD STANDARDÓW: Gdzie kod nie przestrzega copilot-instructions.md

5. WERYFIKACJA TECHNICZNA:
   a. Sprawdź zgodność z tech-stack.md (użyte technologie i wersje)
   b. Weryfikuj typy TypeScript (kompletność, poprawność)
   c. Sprawdź obsługę błędów i walidację
   d. Oceń bezpieczeństwo (autoryzacja, walidacja input, secrets)
   e. Sprawdź dostępność (ARIA, keyboard navigation - jeśli UI)
   f. Weryfikuj testy (pokrycie, jakość assertions)

6. OCENA JAKOŚCI KODU:
   a. Zgodność z ESLint/Prettier rules
   b. Użycie wzorców z copilot-instructions.md (React hooks, Astro islands, etc.)
   c. Optymalizacja performance (memo, useMemo, useCallback, virtualizacja)
   d. Dokumentacja i komentarze w kodzie
   e. Organizacja i czytelność struktury

Przygotuj raport audytu z następującą strukturą:

```markdown
# Raport Audytu Implementacji - {{plan-name}}

Data audytu: {{current-date}}
Audytowany plan: {{plan-file}}
Zakres analizy: {{scope-description}}

## 1. Podsumowanie wykonawcze

### 1.1. Statystyki pokrycia

- Elementy zaplanowane: X
- Elementy zaimplementowane: Y (Z%)
- Elementy częściowo zaimplementowane: N
- Elementy brakujące: M
- Elementy dodatkowe (poza planem): P

### 1.2. Ogólna ocena

[Krótka ocena stanu implementacji: KOMPLETNA | ZAAWANSOWANA | W TRAKCIE | POCZĄTKOWA]

### 1.3. Kluczowe ustalenia

[3-5 najważniejszych wniosków z audytu]

### 1.4. Priorytety działań

[Lista najbardziej krytycznych elementów do uzupełnienia]

## 2. Szczegółowa analiza pokrycia

[Dla każdego głównego modułu/sekcji z planu:]

### 2.1. {{Module-Name}}

#### Status: [✅ KOMPLETNY | ⚠️ CZĘŚCIOWY | ❌ BRAK IMPLEMENTACJI]

#### Planowane elementy:

- [Element 1] - Status
- [Element 2] - Status
- [Element N] - Status

#### Lokalizacja w projekcie:

- Pliki: [lista plików]
- Ścieżki: [lista ścieżek]

#### Analiza szczegółowa:

[Szczegółowy opis co zostało zaimplementowane, jak działa, co działa dobrze]

#### Zidentyfikowane problemy:

- [Problem 1: opis + severity + lokalizacja]
- [Problem 2: opis + severity + lokalizacja]

#### Rekomendacje:

- [Akcja 1: co zrobić, gdzie, jak]
- [Akcja 2: co zrobić, gdzie, jak]

## 3. Niezgodności i różnice

### 3.1. Brakujące elementy (❌ CRITICAL)

[Lista elementów zaplanowanych ale niezaimplementowanych - priorytet wysoki]

### 3.2. Niepełne implementacje (⚠️ MEDIUM)

[Lista elementów częściowo zaimplementowanych - wymagają uzupełnienia]

### 3.3. Niezgodności z planem (⚠️ MEDIUM)

[Lista elementów zaimplementowanych inaczej niż w planie]

### 3.4. Odstępstwa od standardów (⚠️ LOW-MEDIUM)

[Naruszenia copilot-instructions.md, tech-stack.md]

### 3.5. Elementy dodatkowe (ℹ️ INFO)

[Implementacje nieobecne w planie - mogą być wartościowe lub niepotrzebne]

## 4. Analiza techniczna

### 4.1. Stack technologiczny

- ✅/❌ Zgodność z tech-stack.md
- Użyte technologie i wersje
- Zależności (package.json analysis)

### 4.2. Typy i interfejsy (TypeScript)

- Kompletność definicji typów
- Zgodność z planem (DTO, modele, responses)
- Type safety score

### 4.3. Obsługa błędów i walidacja

- Error handling patterns
- Input validation (Zod schemas)
- Error responses consistency

### 4.4. Bezpieczeństwo

- Autoryzacja i uwierzytelnianie
- Walidacja danych wejściowych
- Secrets management
- Rate limiting (jeśli przewidziane)

### 4.5. Testy

- Unit tests coverage
- E2E tests coverage
- Jakość testów (assertions, edge cases)
- Brakujące testy

### 4.6. Dostępność (dla UI)

- ARIA attributes
- Keyboard navigation
- Focus management
- Semantic HTML

### 4.7. Performance

- Optimizations (memo, useMemo, useCallback)
- Virtualization (jeśli wymagana)
- Bundle size considerations
- Loading states

## 5. Jakość kodu

### 5.1. Zgodność ze standardami

- ESLint/Prettier compliance
- Copilot-instructions.md adherence
- Code organization

### 5.2. Best practices

- React patterns (hooks, functional components)
- Astro patterns (islands, SSR)
- Clean code principles

### 5.3. Dokumentacja

- Code comments quality
- README completeness
- API documentation

## 6. Mapa różnic (szczegółowa)

[Tabela lub lista porównawcza plan vs. implementacja:]

| Element planu | Status | Lokalizacja | Uwagi                |
| ------------- | ------ | ----------- | -------------------- |
| [Element 1]   | ✅     | path/file   | OK                   |
| [Element 2]   | ⚠️     | path/file   | Niepełne: brak X     |
| [Element 3]   | ❌     | -           | Nie zaimplementowano |

## 7. Rekomendacje i plan działania

### 7.1. Krytyczne (do natychmiastowej realizacji)

- [ ] [Akcja 1: szczegółowy opis, szacowany effort]
- [ ] [Akcja 2: szczegółowy opis, szacowany effort]

### 7.2. Ważne (do realizacji w najbliższym sprincie)

- [ ] [Akcja 3: szczegółowy opis]
- [ ] [Akcja 4: szczegółowy opis]

### 7.3. Opcjonalne (nice-to-have)

- [ ] [Akcja 5: szczegółowy opis]
- [ ] [Akcja 6: szczegółowy opis]

### 7.4. Sugerowane usprawnienia

[Propozycje ulepszeń wykraczających poza plan - jeśli mają wartość biznesową]

## 8. Załączniki

### 8.1. Lista przeanalizowanych plików

[Pełna lista plików źródłowych włączonych do audytu]

### 8.2. Fragmenty kodu wymagające uwagi

[Snippety kodu z problemami + sugestie poprawek]

### 8.3. Metryki

- LOC (lines of code)
- Liczba komponentów/endpointów
- Test coverage %
- TypeScript strict mode compliance
```

KLUCZOWE ZASADY AUDYTU:

1. Bądź dokładny i szczegółowy - audyt musi być actionable
2. Używaj konkretnych lokalizacji plików i numerów linii
3. Oceniaj według planu, tech-stack.md i copilot-instructions.md
4. Priorytetyzuj problemy (CRITICAL > MEDIUM > LOW)
5. Każda niezgodność musi mieć jasną rekomendację naprawy
6. Nie używaj pogrubionego formatowania w markdown (\*\*)
7. Używaj konkretnych przykładów kodu gdzie to możliwe
8. Raport musi być w języku polskim
9. Formatuj raport w poprawnym markdown
10. Wynik zapisz w pliku .agents/audit/{{plan-name}}-audit.md

Ostateczny wynik powinien składać się wyłącznie z raportu audytu zgodnego ze wskazanym formatem w markdown.
