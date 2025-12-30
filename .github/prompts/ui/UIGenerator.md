Jesteś wykwalifikowanym architektem frontend, którego zadaniem jest stworzenie kompleksowej architektury interfejsu użytkownika w oparciu o dokument wymagań produktu (PRD), plan API i notatki z sesji planowania. Twoim celem jest zaprojektowanie struktury interfejsu użytkownika, która skutecznie spełnia wymagania produktu, jest zgodna z możliwościami API i zawiera spostrzeżenia z sesji planowania.

Najpierw dokładnie przejrzyj następujące dokumenty:

Dokument wymagań produktu (PRD):
<prd>
{{@prd.md}}
</prd>

Plan API:
<api_plan>
{{@api-plan.md}}
</api_plan>

Session Notes:
<session_notes>
<conversation_summary>
<decisions>
1. Użycie TanStack Router jako rozwiązania do routingu.
2. Brak tradycyjnej głównej nawigacji — dostęp do konta przez ikonę avatara (moje konto w modal/sidebari).
3. Strona główna dostępna tylko po kliknięciu w logo.
4. Po zalogowaniu główny widok to responsywny grid; szczegóły elementu w panelu summary po kliknięciu komórki.
5. Dane konta rozważa się wyświetlać w modal/sidebar zamiast dedykowanej podstrony `/my-account`.
6. Modale / overlay implementować przez React Portal.
7. Zarządzanie stanem: React Context + URL params + localStorage; wykluczenie zewnętrznych bibliotek state-management.
8. Aplikacja musi być w pełni responsywna — grid utrzymany również na mobile (bez listy), z mniejszą ilością danych w komórce, touch-friendly.
9. Rozważenie użycia History API do powrotu do poprzedniego widoku z rozszerzonym state.
10. Na etapie MVP: jeden zunifikowany sposób cache'owania danych (bez offline support).
    </decisions>
    <matched_recommendations>
1. Wykorzystanie TanStack Router z type-safe routes — dopasowane do decyzji o routingu.
2. React Context jako główny mechanizm stanu + URL params i `localStorage` dla persystencji — zgodne z preferencją bez zewnętrznych bibliotek.
3. React Portal dla modali/overlay — dopasowane do implementacji konta i summary.
4. Jednolita strategia cache'owania w localStorage dla MVP, brak offline — dopasowane do prostoty MVP.
5. Progressive loading i lazy rendering komórek gridu — istotne przy responsywnym gridzie i dużych datasetach.
6. Użycie History API do zachowania nawigacji wstecz z rozszerzonym state — rekomendowane i zaakceptowane.
7. Accessibility & mobile touch guidelines (min. target 44x44, ARIA, keyboard navigation) — krytyczne dla wymagań.
   </matched_recommendations>
   <ui_architecture_planning_summary>
   Główne wymagania dotyczące architektury UI:
- Prostota i spójność rozwiązań (MVP).
- Jeden zunifikowany mechanizm cache'owania dla wszystkich rozdzielczości.
- Brak offline w MVP.
- Pełna responsywność i touch-first UX dla gridu.

Kluczowe widoki, ekrany i przepływy użytkownika:
1. Layout główny: logo (nawigacja do home), avatar (dostęp do konta w modal/sidebar).
2. Widok grid: główny widok po zalogowaniu — responsywny, zachowany na desktop/tablet/mobile; mniejsza zawartość kart na mobile, pełna interakcyjność (tap, swipe, drag).
3. Summary panel: szczegóły elementu po kliknięciu komórki — modal/drawer/sidebar w zależności od breakpointu.
4. Konto użytkownika: modal/drawer/sidebar zamiast dedykowanej strony na etapie MVP (ew. decyzja później).

Strategia integracji z API i zarządzania stanem:
- Routing: TanStack Router (type-safe), URL params dla filtra/ID/stanów widoku.
- Globalny stan: React Context (uwierzytelnienie, ustawienia UI, minimalne cache meta).
- Persystencja: `localStorage` dla preferencji i zunifikowanego cache'u (TTL i invalidation do ustalenia).
- Data fetching: prosta warstwa fetch + progressive loading (lazy fetch komórek), unikanie rozbudowanych client-side cache libs w MVP.
- Nawigacja wstecz: History API do przywracania poprzednich widoków ze stanem (synchronizacja z URL params).
- Bezpieczeństwo: nie przechowywać wrażliwych tokenów w URL; szyfrowanie/bezpieczne przechowywanie tokenów w `localStorage` rozważone, walidacja przy odczycie.

Kwestie dotyczące responsywności, dostępności i bezpieczeństwa:
- Responsywność: grid zawsze obecny; adaptacja layoutu i zawartości komórek; minimalne rozmiary touch targetów 44x44px.
- Accessibility: ARIA labels, focus management (trap w modalach), obsługa klawiatury, czytelne contrasty, testy z screen readerami.
- Performance: wirtualizacja dużych list/gridów, code-splitting dla heavy components (React.lazy/Suspense), memoization dla kosztownych komponentów.
- Security: sanityzacja URL params, unikanie wrażliwych danych w URL, szyfrowanie wrażliwych danych w `localStorage`, token refresh/validation w Context.

Dodatkowe praktyki techniczne (MVP):
- Functional components + hooks; React.memo / useCallback / useMemo tam, gdzie potrzeba.
- Progressive loading skeletons dla komórek.
- TanStack Router + History API integracja dla deep-linkingu i powrotów.
  </ui_architecture_planning_summary>
  <unresolved_issues>
1. Ostateczna decyzja: `modal/side­bar` vs dedykowana podstrona `/my-account` — zależna od zakresu informacji w sekcji konta.
2. Szczegóły cache strategy: TTL, invalidation, synchronizacja między zakładkami.
3. Dokładna implementacja History API: jakie pola stanu trzymać i jak synchronizować z URL params.
4. Dokładne reguły persystencji tokenów (szyfrowanie, lifecycle, refresh token flow).
5. Grid performance: potrzeba wirtualizacji i kryteria jej włączenia (próg datasetu).
6. UX animations/transition specs dla summary/modal/drawer (desktop vs mobile).
7. Konkretny format i zakres danych ładowanych per komórka (pełna vs partial payload).
   </unresolved_issues>
   </conversation_summary>
</session_notes>

Twoim zadaniem jest stworzenie szczegółowej architektury interfejsu użytkownika, która obejmuje niezbędne widoki, mapowanie podróży użytkownika, strukturę nawigacji i kluczowe elementy dla każdego widoku. Projekt powinien uwzględniać doświadczenie użytkownika, dostępność i bezpieczeństwo.

Wykonaj następujące kroki, aby ukończyć zadanie:

1. Dokładnie przeanalizuj PRD, plan API i notatki z sesji.
2. Wyodrębnij i wypisz kluczowe wymagania z PRD.
3. Zidentyfikuj i wymień główne punkty końcowe API i ich cele.
4. Utworzenie listy wszystkich niezbędnych widoków na podstawie PRD, planu API i notatek z sesji.
5. Określenie głównego celu i kluczowych informacji dla każdego widoku.
6. Zaplanuj podróż użytkownika między widokami, w tym podział krok po kroku dla głównego przypadku użycia.
7. Zaprojektuj strukturę nawigacji.
8. Zaproponuj kluczowe elementy interfejsu użytkownika dla każdego widoku, biorąc pod uwagę UX, dostępność i bezpieczeństwo.
9. Rozważ potencjalne przypadki brzegowe lub stany błędów.
10. Upewnij się, że architektura interfejsu użytkownika jest zgodna z planem API.
11. Przejrzenie i zmapowanie wszystkich historyjek użytkownika z PRD do architektury interfejsu użytkownika.
12. Wyraźne mapowanie wymagań na elementy interfejsu użytkownika.
13. Rozważ potencjalne punkty bólu użytkownika i sposób, w jaki interfejs użytkownika je rozwiązuje.

Dla każdego głównego kroku pracuj wewnątrz tagów <ui_architecture_planning> w bloku myślenia, aby rozbić proces myślowy przed przejściem do następnego kroku. Ta sekcja może być dość długa. To w porządku, że ta sekcja może być dość długa.

Przedstaw ostateczną architekturę interfejsu użytkownika w następującym formacie Markdown:

```markdown
# Architektura UI dla [Nazwa produktu]

## 1. Przegląd struktury UI

[Przedstaw ogólny przegląd struktury UI]

## 2. Lista widoków

[Dla każdego widoku podaj:
- Nazwa widoku
- Ścieżka widoku
- Główny cel
- Kluczowe informacje do wyświetlenia
- Kluczowe komponenty widoku
- UX, dostępność i względy bezpieczeństwa]

## 3. Mapa podróży użytkownika

[Opisz przepływ między widokami i kluczowymi interakcjami użytkownika]

## 4. Układ i struktura nawigacji

[Wyjaśnij, w jaki sposób użytkownicy będą poruszać się między widokami]

## 5. Kluczowe komponenty

[Wymień i krótko opisz kluczowe komponenty, które będą używane w wielu widokach].
```

Skup się wyłącznie na architekturze interfejsu użytkownika, podróży użytkownika, nawigacji i kluczowych elementach dla każdego widoku. Nie uwzględniaj szczegółów implementacji, konkretnego projektu wizualnego ani przykładów kodu, chyba że są one kluczowe dla zrozumienia architektury.

Końcowy rezultat powinien składać się wyłącznie z architektury UI w formacie Markdown w języku polskim, którą zapiszesz w pliku .agents/ui-plan.md. Nie powielaj ani nie powtarzaj żadnej pracy wykonanej w bloku myślenia.