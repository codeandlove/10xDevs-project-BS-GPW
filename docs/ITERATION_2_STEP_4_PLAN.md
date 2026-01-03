# Krok 4: Advanced Filters - Plan implementacji

**Cel**: Rozszerzone opcje filtrowania dla lepszej kontroli nad danymi

---

## 📋 Zadania do wykonania:

### 1. Date Range Picker (Custom)
- [ ] `src/components/grid/DateRangePicker.tsx`
- [ ] Custom date range (from/to)
- [ ] Quick presets (7d, 14d, 30d, 90d)
- [ ] Validation (from < to)
- [ ] Integration z GridContext

### 2. Event Type Filter (Multi-select)
- [ ] `src/components/grid/EventTypeFilter.tsx`
- [ ] Multi-select dla event types (CZARNY_ŁABĘDŹ, SZARY_ŁABĘDŹ, etc.)
- [ ] "Select all" / "Clear all"
- [ ] Badge count dla active filters
- [ ] Integration z GridContext

### 3. Sort Options
- [ ] `src/components/grid/SortOptions.tsx`
- [ ] Sort by: Date (asc/desc), Percent change (asc/desc)
- [ ] Dropdown selector
- [ ] Integration z GridContext

### 4. Filter Persistence (URL state)
- [ ] Zapisywanie filtrów w URL query params
- [ ] Restore filtrów przy page load
- [ ] Share-able URLs z filtrami

### 5. Clear Filters Button
- [ ] Reset all filters do default
- [ ] Visual indicator gdy filtry są active
- [ ] Confirmation dialog (opcjonalne)

---

## 🎯 Expected Features:

- **Date Range**: Custom from/to dates
- **Event Types**: Multi-select filter
- **Sort**: By date or percent change
- **URL State**: Shareable filtered views
- **Clear All**: One-click reset

---

**Status**: 🔄 W TRAKCIE
**Priorytet**: 🟢 WYSOKI (ważne dla UX)

