export const INTEREST_OPTIONS = [
  "Historia",
  "Natura",
  "Architektura",
  "Aktywność fizyczna",
  "Relaks",
] as const;

export type Interest = (typeof INTEREST_OPTIONS)[number];

// Wartości powyżej muszą zostać bez zmian — odpowiadają tagom w bazie
// danych i są używane do dopasowywania miejsc. Ten słownik podmienia
// tylko to, co widzi użytkownik, żeby nazewnictwo było spójne w całej
// appce (szuflada, filtr na liście miejsc, Planer, wynik trasy).
const INTEREST_LABELS: Partial<Record<Interest, string>> = {
  Historia: "Polska w pigułce",
};

export function interestLabel(interest: string): string {
  return INTEREST_LABELS[interest as Interest] ?? interest;
}
