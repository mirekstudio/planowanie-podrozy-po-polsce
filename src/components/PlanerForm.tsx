"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INTEREST_OPTIONS } from "@/lib/interests";
import {
  REGION_TYPE_OPTIONS,
  ACTIVE_REGION_TYPE_OPTIONS,
  SURROUNDINGS_OPTIONS,
  NEARBY_ATTRACTION_SUGGESTIONS,
} from "@/lib/placeFilters";
import {
  ACCOMMODATION_TYPE_OPTIONS,
  type AccommodationTypePreference,
} from "@/lib/accommodation";

export type TravelStyle = "baza_wypadowa" | "trasa_objazdowa";

export type PlanerFormInitialValues = {
  days?: number;
  interests?: string[];
  regionTypes?: string[];
  surroundings?: string[];
  nearbyAttractions?: string[];
  transport?: "car" | "camper" | "motorcycle";
  travelGroup?: "adults" | "family" | "single";
  numAdults?: number;
  childrenAges?: number[];
  accommodationType?: AccommodationTypePreference;
  travelStyle?: TravelStyle;
};

// Cztery kroki tej samej ścieżki (nie osobne strony/formularze) — patrz
// uproszczenie architektury appki: "Planowanie trasy" przestało być
// osobnym punktem wejścia w menu, a Planer stał się jedyną, spójną
// ścieżką od pytań do gotowej, wybranej trasy z mapą (ostatni krok
// mieszka już na /planer/wynik, poza tym komponentem). "Styl podróży" na
// razie tylko zapisuje wybór (patrz travelStyle w handleSubmit) — nie ma
// jeszcze żadnego efektu na sam algorytm generowania trasy, to celowe,
// osobne zadanie na później.
const STEP_LABELS = ["Styl podróży", "Zainteresowania", "Czas trwania", "Logistyka"] as const;
type Step = 1 | 2 | 3 | 4;

export default function PlanerForm({
  initialValues,
}: {
  initialValues?: PlanerFormInitialValues;
}) {
  const router = useRouter();
  // Generowanie trasy (zapytania do Supabase, czasem też do Geoapify przy
  // rzadszych kombinacjach filtrów) potrafi trwać 1-2+ sekund — bez tego
  // isPending przycisk "Generuj trasę" nie dawał żadnej wizualnej reakcji
  // przez cały ten czas, bo router.push() z komponentu klienckiego nie
  // sygnalizuje stanu oczekiwania stronie źródłowej samo z siebie.
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(1);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>(
    initialValues?.travelStyle ?? "trasa_objazdowa",
  );
  const [days, setDays] = useState(initialValues?.days ?? 3);
  const [interests, setInterests] = useState<string[]>(
    initialValues?.interests ?? [],
  );
  const [regionTypes, setRegionTypes] = useState<string[]>(
    initialValues?.regionTypes ?? [],
  );
  const [surroundings, setSurroundings] = useState<string[]>(
    initialValues?.surroundings ?? [],
  );
  const [nearbyAttractions, setNearbyAttractions] = useState<string[]>(
    initialValues?.nearbyAttractions ?? [],
  );
  const [transport, setTransport] = useState<"car" | "camper" | "motorcycle">(
    initialValues?.transport ?? "car",
  );
  const [travelGroup, setTravelGroup] = useState<"adults" | "family" | "single">(
    initialValues?.travelGroup ?? "adults",
  );
  const [numAdults, setNumAdults] = useState(initialValues?.numAdults ?? 2);
  const [numChildren, setNumChildren] = useState(
    initialValues?.childrenAges?.length ?? 1,
  );
  const [childrenAges, setChildrenAges] = useState<number[]>(
    initialValues?.childrenAges ?? [5],
  );
  const [accommodationType, setAccommodationType] = useState<
    AccommodationTypePreference | ""
  >(initialValues?.accommodationType ?? "");

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest],
    );
  }

  function toggleValue(
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) {
    setter((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  }

  function handleNumChildrenChange(value: number) {
    const count = Math.max(0, value);
    setNumChildren(count);
    setChildrenAges((current) => {
      const next = current.slice(0, count);
      while (next.length < count) next.push(5);
      return next;
    });
  }

  function handleChildAgeChange(index: number, age: number) {
    setChildrenAges((current) => {
      const next = [...current];
      next[index] = age;
      return next;
    });
  }

  function goToStep(next: Step) {
    setStep(next);
    // Bez tego, po kliknięciu "Dalej"/"Wstecz" na dłuższym kroku,
    // użytkownik lądowałby wzrokiem w tym samym miejscu na stronie co
    // poprzedni krok (np. w połowie ekranu), a nie na początku nowego —
    // myląco wyglądałoby to tak, jakby nic się nie zmieniło.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    params.set("days", String(days));
    // Decyduje, na którą ścieżkę trafi submit (patrz niżej) — samego
    // algorytmu doboru/sortowania miejsc na razie nie zmienia, patrz
    // komentarz przy STEP_LABELS i src/lib/suggestBases.ts.
    params.set("travelStyle", travelStyle);
    params.set("transport", transport);
    params.set("travelGroup", travelGroup);
    params.set("numAdults", String(numAdults));
    if (interests.length > 0) {
      params.set("interests", interests.join(","));
    }
    if (regionTypes.length > 0) {
      params.set("regionType", regionTypes.join(","));
    }
    if (surroundings.length > 0) {
      params.set("surroundings", surroundings.join(","));
    }
    if (nearbyAttractions.length > 0) {
      params.set("nearbyAttraction", nearbyAttractions.join(","));
    }
    if (travelGroup === "family" && childrenAges.length > 0) {
      params.set("children", childrenAges.join(","));
    }
    if (accommodationType) {
      params.set("accommodationType", accommodationType);
    }

    // "Baza wypadowa" prowadzi na osobną ścieżkę (lista proponowanych baz,
    // patrz suggestBases.ts) zamiast do generatora tras wielodniowych —
    // to inna logika, nie wariant tej samej, patrz komentarz w
    // suggestBases.ts.
    const destination =
      travelStyle === "baza_wypadowa" ? "/planer/bazy" : "/planer/wynik";

    startTransition(() => {
      router.push(`${destination}?${params.toString()}`);
    });
  }

  const isBazaWypadowa = travelStyle === "baza_wypadowa";
  const submitLabel = isBazaWypadowa ? "Pokaż proponowane bazy" : "Generuj trasę";
  const submitPendingLabel = isBazaWypadowa
    ? "Szukanie baz…"
    : "Generowanie trasy…";

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex max-w-xl flex-col gap-8">
      <ol className="flex items-center gap-2" aria-label="Postęp planowania trasy">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = (index + 1) as Step;
          const isActive = step === stepNumber;
          const isDone = step > stepNumber;
          return (
            <li
              key={label}
              aria-current={isActive ? "step" : undefined}
              className="flex flex-1 items-center gap-2 last:flex-initial"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-wine-solid text-white"
                    : isDone
                      ? "bg-wine-solid/15 text-wine-solid"
                      : "bg-black/5 text-zinc-400 dark:bg-white/10 dark:text-zinc-600"
                }`}
              >
                {isDone ? "✓" : stepNumber}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  isActive
                    ? "text-black dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-500"
                }`}
              >
                {label}
              </span>
              {stepNumber < 4 && (
                <span className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
              )}
            </li>
          );
        })}
      </ol>
      <p className="-mt-6 text-xs text-zinc-500 sm:hidden">
        Krok {step} z 4: {STEP_LABELS[step - 1]}
      </p>

      {step === 1 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Styl podróży
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            To na razie wpływa tylko na to, co appka zapamięta — dobór miejsc
            dostosujemy do tego wyboru w kolejnym kroku prac.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                {
                  value: "baza_wypadowa",
                  label: "Baza wypadowa",
                  description:
                    "Jeden punkt centralny, z którego robisz wypady w okolicę",
                },
                {
                  value: "trasa_objazdowa",
                  label: "Trasa objazdowa",
                  description:
                    "Codziennie nowe miejsce, przemieszczasz się wzdłuż trasy",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
              >
                <input
                  type="radio"
                  name="travelStyle"
                  checked={travelStyle === option.value}
                  onChange={() => setTravelStyle(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-honey"
                />
                <span className="flex flex-col">
                  <span className="text-black dark:text-zinc-50">
                    {option.label}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <>
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Region geograficzny
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Jeśli nic nie zaznaczysz, weźmiemy pod uwagę wszystkie dostępne regiony.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {REGION_TYPE_OPTIONS.map((option) => {
                // Poza "Morze" te opcje generowałyby trasę wyłącznie z
                // automatycznych danych Geoapify, bez żadnej redakcji — patrz
                // komentarz przy ACTIVE_REGION_TYPE_OPTIONS w placeFilters.ts.
                // Zostają widoczne (żeby było widać, co appka docelowo obejmie),
                // ale niedostępne do wyboru, dopóki appka nie ma tam kuratorskiej
                // treści.
                const isActive = (ACTIVE_REGION_TYPE_OPTIONS as readonly string[]).includes(
                  option,
                );
                return (
                  <label
                    key={option}
                    // Jedyna grupa filtrów, gdzie zamiast domyślnego bursztynu
                    // (patrz reszta formularza) użyty jest morski turkus — to
                    // typ regionu geograficznego (Morze/Góry/Jeziora/Miasta),
                    // najbliższy tematycznie kolorowi zarezerwowanemu dla
                    // natury/wybrzeża w tej palecie.
                    className={
                      isActive
                        ? "flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-tide/40 has-checked:border-tide has-checked:bg-tide/10 active:bg-tide/10 dark:border-white/[.145] dark:bg-zinc-900"
                        : "flex cursor-not-allowed items-center gap-3 rounded-lg border border-black/[.08] bg-zinc-100 p-3 opacity-60 dark:border-white/[.145] dark:bg-zinc-800"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={regionTypes.includes(option)}
                      disabled={!isActive}
                      onChange={() => isActive && toggleValue(setRegionTypes, option)}
                      className="h-4 w-4 accent-tide disabled:cursor-not-allowed"
                    />
                    <span className="text-black dark:text-zinc-50">
                      {option}
                      {!isActive && (
                        <span className="ml-1 text-xs text-zinc-500">(wkrótce)</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Zainteresowania
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Jeśli nic nie zaznaczysz, weźmiemy pod uwagę wszystkie miejsca.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <label
                  key={interest}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={interests.includes(interest)}
                    onChange={() => toggleInterest(interest)}
                    className="h-4 w-4 accent-honey"
                  />
                  <span className="text-black dark:text-zinc-50">{interest}</span>
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 3 && (
        <section>
          <label className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Liczba dni: {days}
          </label>
          <input
            type="range"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </section>
      )}

      {step === 4 && (
        <>
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Środek transportu
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {(
                [
                  { value: "car", label: "Samochód osobowy" },
                  { value: "motorcycle", label: "Motocykl" },
                  { value: "camper", label: "Camper" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                >
                  <input
                    type="radio"
                    name="transport"
                    checked={transport === option.value}
                    onChange={() => setTransport(option.value)}
                    className="h-4 w-4 accent-honey"
                  />
                  <span className="text-black dark:text-zinc-50">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Skład podróży
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {(
                [
                  { value: "single", label: "Singiel" },
                  { value: "adults", label: "Tylko dorośli" },
                  { value: "family", label: "Rodzina z dziećmi" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                >
                  <input
                    type="radio"
                    name="travelGroup"
                    checked={travelGroup === option.value}
                    onChange={() => {
                      setTravelGroup(option.value);
                      // "Singiel" oznacza dokładnie jedną osobę — pole "Liczba
                      // osób dorosłych" jest wtedy ukryte (patrz niżej), więc
                      // wartość trzeba ustawić tutaj, żeby nie zostawała
                      // przypadkowo z poprzedniego wyboru (np. 2).
                      if (option.value === "single") setNumAdults(1);
                    }}
                    className="h-4 w-4 accent-honey"
                  />
                  <span className="text-black dark:text-zinc-50">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>

            {travelGroup === "family" && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Liczba dzieci
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={numChildren}
                    onChange={(e) =>
                      handleNumChildrenChange(Number(e.target.value))
                    }
                    className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </label>

                {childrenAges.map((age, index) => (
                  <label key={index} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Wiek dziecka {index + 1}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={age}
                      onChange={(e) =>
                        handleChildAgeChange(index, Number(e.target.value))
                      }
                      className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          {travelGroup !== "single" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium uppercase tracking-wide text-zinc-500">
                Liczba osób dorosłych
              </span>
              <input
                type="number"
                min={1}
                max={20}
                value={numAdults}
                onChange={(e) => setNumAdults(Number(e.target.value))}
                className="mt-1 max-w-[8rem] rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          )}

          <details className="group rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
            <summary className="cursor-pointer text-sm font-medium uppercase tracking-wide text-zinc-500">
              Filtry zaawansowane
            </summary>

            <div className="mt-4 flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Typ noclegu
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Dla tras wielodniowych zaproponujemy nocleg na każdy dzień. Jeśli
                  nic nie zaznaczysz, dobierzemy go na podstawie środka transportu.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {ACCOMMODATION_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                    >
                      <input
                        type="radio"
                        name="accommodationType"
                        checked={accommodationType === option.value}
                        onChange={() => setAccommodationType(option.value)}
                        className="h-4 w-4 accent-honey"
                      />
                      <span className="text-black dark:text-zinc-50">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Bliskość atrakcji
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Dotyczy głównie noclegów, ale też niektórych atrakcji.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {NEARBY_ATTRACTION_SUGGESTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={nearbyAttractions.includes(option)}
                        onChange={() => toggleValue(setNearbyAttractions, option)}
                        className="h-4 w-4 accent-honey"
                      />
                      <span className="text-black dark:text-zinc-50">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Otoczenie
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {SURROUNDINGS_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 transition-colors hover:border-honey/40 has-checked:border-honey has-checked:bg-honey/10 active:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={surroundings.includes(option)}
                        onChange={() => toggleValue(setSurroundings, option)}
                        className="h-4 w-4 accent-honey"
                      />
                      <span className="text-black dark:text-zinc-50">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </>
      )}

      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep((step - 1) as Step)}
            className="rounded-full border border-black/[.08] px-5 py-3 text-sm font-medium text-black transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50 dark:active:bg-wine/10"
          >
            Wstecz
          </button>
        )}

        {step < 4 ? (
          <button
            key="next"
            type="button"
            onClick={() => goToStep((step + 1) as Step)}
            className="inline-flex min-w-[8rem] items-center justify-center rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover"
          >
            Dalej
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-wine-solid-hover active:bg-wine-solid-hover disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isPending && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 shrink-0 animate-spin"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-90"
                />
              </svg>
            )}
            {isPending ? submitPendingLabel : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
