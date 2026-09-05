import type { RouteVariant } from "@/lib/generateRoute";
import { COASTAL_SUB_REGIONS } from "@/lib/poland";

// Zgłoszenie 05.09 (kontynuacja audytu spójności mapa/tekst): dla
// wariantów odcinka wybrzeża (Zachodnie/Środkowe/Wschodnie) pole
// RouteVariant.summary to statyczny opis z poland.ts (np. "Świnoujście –
// Kołobrzeg – Ustka") — ta sama treść na karcie wariantu i w nagłówku
// wybranej trasy, niezależna od tego, ile i jakich przystanków appka
// faktycznie dobrała (widocznych na mapie/w miniaturze tuż obok). Dla
// tych wariantów budujemy podpis z prawdziwych tytułów przystanków
// (variant.route.stops) — TEGO SAMEGO źródła, które zasila mapę/miniaturę
// (patrz buildRouteThumbnailUrl/MapboxRouteMap w /planer/wynik/page.tsx)
// — więc tekst nigdy nie może wymieniać więcej ani innych miejsc niż
// faktycznie widać. Warianty niebędące podregionem wybrzeża (tempo/
// zainteresowanie) mają opisowe, nie-wyliczankowe summary bez tego
// ryzyka — te zostają bez zmian.
export function summarizeStopTitles(
  stops: { title: string }[],
  maxNames = 3,
): string | null {
  const uniqueTitles = Array.from(new Set(stops.map((s) => s.title)));
  if (uniqueTitles.length === 0) return null;
  const shown = uniqueTitles.slice(0, maxNames);
  return uniqueTitles.length > maxNames ? `${shown.join(" – ")} – …` : shown.join(" – ");
}

export function displaySummary(variant: RouteVariant): string {
  const isCoastalSubRegion = COASTAL_SUB_REGIONS.some((sub) => sub.id === variant.id);
  if (!isCoastalSubRegion) return variant.summary;
  return summarizeStopTitles(variant.route.stops) ?? variant.summary;
}
