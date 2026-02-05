/**
 * GPW Indices Configuration
 * Skalowalna konfiguracja indeksów GPW - łatwe dodawanie nowych indeksów
 */

import type { GPWIndex } from "../types/nocodb.types";

/**
 * Definicje indeksów GPW
 * Każdy indeks zawiera: id, name, description, symbols[]
 */
export const GPW_INDICES: GPWIndex[] = [
  {
    id: "wig20",
    name: "WIG20",
    description: "20 największych i najpłynniejszych spółek GPW",
    symbols: [
      "11B",
      "ALE",
      "CCC",
      "CDR",
      "CPS",
      "DNP",
      "JSW",
      "KGH",
      "KRU",
      "LPP",
      "LTS",
      "MBK",
      "OPL",
      "PEO",
      "PGE",
      "PKN",
      "PKO",
      "PZU",
      "SPL",
      "TPE",
    ],
  },
  {
    id: "mwig40",
    name: "mWIG40",
    description: "40 średnich spółek GPW (poniżej WIG20)",
    symbols: [
      // TODO: Uzupełnić symbole mWIG40 przed deployem
      // Tymczasowo pusta lista - do weryfikacji z GPW
    ],
  },
  {
    id: "swig80",
    name: "sWIG80",
    description: "80 małych spółek GPW (poniżej mWIG40)",
    symbols: [
      // TODO: Uzupełnić symbole sWIG80 przed deployem
      // Tymczasowo pusta lista - do weryfikacji z GPW
    ],
  },
  {
    id: "wiggry",
    name: "WIG-Games",
    description: "Indeks spółek z branży gier",
    symbols: ["11B", "CDR", "CIG", "PCF", "PLG", "TEN"],
  },
];

/**
 * Helper: Pobierz indeks po ID
 */
export function getIndexById(id: string): GPWIndex | undefined {
  return GPW_INDICES.find((index) => index.id === id);
}

/**
 * Helper: Pobierz wszystkie dostępne indeksy
 */
export function getAllIndices(): GPWIndex[] {
  return GPW_INDICES;
}

/**
 * Helper: Pobierz symbole dla danego indeksu
 */
export function getIndexSymbols(id: string): string[] {
  const index = getIndexById(id);
  return index?.symbols || [];
}

/**
 * Helper: Sprawdź czy indeks istnieje
 */
export function hasIndex(id: string): boolean {
  return GPW_INDICES.some((index) => index.id === id);
}

/**
 * Eksport stałych dla backward compatibility i convenience
 * (można używać bezpośrednio w kodzie bez wywoływania funkcji)
 */
export const WIG20_SYMBOLS = getIndexSymbols("wig20");
export const MWIG40_SYMBOLS = getIndexSymbols("mwig40");
export const SWIG80_SYMBOLS = getIndexSymbols("swig80");
export const WIGGRY_SYMBOLS = getIndexSymbols("wiggry");
