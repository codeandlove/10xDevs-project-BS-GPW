<db-plan>
@db-plan.md
</db-plan>

<prd>
@prd.md
</prd>

<tech-stack>
@tech_stack.md
</tech-stack>

Jesteś doświadczonym architektem API, którego zadaniem jest stworzenie kompleksowego planu API REST. Twój plan będzie oparty na podanym schemacie bazy danych, dokumencie wymagań produktu (PRD) i stacku technologicznym podanym powyżej. Uważnie przejrzyj dane wejściowe i wykonaj następujące kroki:

1. Przeanalizuj schemat bazy danych:
   - Zidentyfikuj główne encje (tabele)
   - Zanotuj relacje między jednostkami
   - Rozważ wszelkie indeksy, które mogą mieć wpływ na projekt API
   - Zwróć uwagę na warunki walidacji określone w schemacie.

2. Przeanalizuj PRD:
   - Zidentyfikuj kluczowe cechy i funkcjonalności
   - Zwróć uwagę na konkretne wymagania dotyczące operacji na danych (pobieranie, tworzenie, aktualizacja, usuwanie)
   - Zidentyfikuj wymagania logiki biznesowej, które wykraczają poza operacje CRUD

3. Rozważ stack technologiczny:
   - Upewnij się, że plan API jest zgodny z określonymi technologiami.
   - Rozważ, w jaki sposób te technologie mogą wpłynąć na projekt API

4. Tworzenie kompleksowego planu interfejsu API REST:
   - Zdefiniowanie głównych zasobów w oparciu o encje bazy danych i wymagania PRD
   - Zaprojektowanie punktów końcowych CRUD dla każdego zasobu
   - Zaprojektuj punkty końcowe dla logiki biznesowej opisanej w PRD
   - Uwzględnienie paginacji, filtrowania i sortowania dla punktów końcowych listy.
   - Zaplanuj odpowiednie użycie metod HTTP
   - Zdefiniowanie struktur ładunku żądania i odpowiedzi
   - Uwzględnienie mechanizmów uwierzytelniania i autoryzacji, jeśli wspomniano o nich w PRD
   - Rozważenie ograniczenia szybkości i innych środków bezpieczeństwa

Przed dostarczeniem ostatecznego planu, pracuj wewnątrz tagów <api_analysis> w swoim bloku myślenia, aby rozbić swój proces myślowy i upewnić się, że uwzględniłeś wszystkie niezbędne aspekty. W tej sekcji:

1. Wymień główne encje ze schematu bazy danych. Ponumeruj każdą encję i zacytuj odpowiednią część schematu.
2. Wymień kluczowe funkcje logiki biznesowej z PRD. Ponumeruj każdą funkcję i zacytuj odpowiednią część PRD.
3. Zmapuj funkcje z PRD do potencjalnych punktów końcowych API. Dla każdej funkcji rozważ co najmniej dwa możliwe projekty punktów końcowych i wyjaśnij, który z nich wybrałeś i dlaczego.
4. Rozważ i wymień wszelkie wymagania dotyczące bezpieczeństwa i wydajności. Dla każdego wymagania zacytuj część dokumentów wejściowych, która je obsługuje.
5. Wyraźnie mapuj logikę biznesową z PRD na punkty końcowe API.
6. Uwzględnienie warunków walidacji ze schematu bazy danych w planie API.

Ta sekcja może być dość długa.

Ostateczny plan API powinien być sformatowany w markdown i zawierać następujące sekcje:

```markdown
# REST API Plan

## 1. Zasoby

- Wymień każdy główny zasób i odpowiadającą mu tabelę bazy danych

## 2. Punkty końcowe

Dla każdego zasobu podaj:

- Metoda HTTP
- Ścieżka URL
- Krótki opis
- Parametry zapytania (jeśli dotyczy)
- Struktura ładunku żądania JSON (jeśli dotyczy)
- Struktura ładunku odpowiedzi JSON
- Kody i komunikaty powodzenia
- Kody i komunikaty błędów

## 3. Uwierzytelnianie i autoryzacja

- Opisz wybrany mechanizm uwierzytelniania i szczegóły implementacji

## 4. Walidacja i logika biznesowa

- Lista warunków walidacji dla każdego zasobu
- Opisz, w jaki sposób logika biznesowa jest zaimplementowana w API
```

Upewnij się, że Twój plan jest kompleksowy, dobrze skonstruowany i odnosi się do wszystkich aspektów materiałów wejściowych. Jeśli musisz przyjąć jakieś założenia z powodu niejasnych informacji wejściowych, określ je wyraźnie w swojej analizie.

Końcowy wynik powinien składać się wyłącznie z planu API w formacie markdown w języku angielskim, który zapiszesz w .agents/api-plan.md i nie powinien powielać ani powtarzać żadnej pracy wykonanej w bloku myślenia.
