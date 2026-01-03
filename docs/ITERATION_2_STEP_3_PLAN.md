# Krok 3: Grid Virtualization - Plan implementacji

**Cel**: Zaimplementować virtual scrolling dla wydajności z dużymi zbiorami danych

---

## 📋 Zadania do wykonania:

### 1. Instalacja zależności ✅
```bash
npm install @tanstack/react-virtual
```

### 2. Utworzenie VirtualizedGrid component
- [ ] `src/components/grid/VirtualizedGrid.tsx`
- [ ] Virtual scrolling dla rows
- [ ] Virtual scrolling dla columns
- [ ] Dynamic cell sizing
- [ ] Sticky header row
- [ ] Sticky left column (symbols)

### 3. Refaktor GridView
- [ ] Dodać toggle między BasicGrid a VirtualizedGrid
- [ ] Użyć VirtualizedGrid gdy events.length > 100
- [ ] Zachować istniejącą funkcjonalność (cell click, selection, etc.)

### 4. Performance optimizations
- [ ] React.memo dla komórek
- [ ] useCallback dla event handlers
- [ ] useMemo dla computed values

### 5. Testing
- [ ] Test z małą ilością danych (< 100)
- [ ] Test z dużą ilością danych (1000+)
- [ ] Test scrolling performance
- [ ] Test responsive design

---

## 🎯 Expected Benefits:

- **Performance**: 60fps scrolling nawet z 1000+ events
- **Memory**: Renderowanie tylko widocznych komórek
- **UX**: Płynne scrollowanie bez lagów

---

**Status**: 🔄 W TRAKCIE
**Priorytet**: 🟡 ŚREDNI (nice to have, ale nie blokuje MVP)

