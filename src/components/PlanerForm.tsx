"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTEREST_OPTIONS } from "@/lib/interests";
import {
  geocodeForward,
  geocodeReverse,
  type GeocodedPlace,
} from "@/lib/geocoding";
import LocationPermissionModal from "@/components/LocationPermissionModal";

type StartPointMessage = { type: "success" | "error"; text: string };

export default function PlanerForm() {
  const router = useRouter();
  const [days, setDays] = useState(3);
  const [startPoint, setStartPoint] = useState<GeocodedPlace | null>(null);
  const [startPointMessage, setStartPointMessage] =
    useState<StartPointMessage | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [transport, setTransport] = useState<"car" | "camper">("car");
  const [travelGroup, setTravelGroup] = useState<"adults" | "family">(
    "adults",
  );
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(1);
  const [childrenAges, setChildrenAges] = useState<number[]>([5]);

  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setStartPointMessage({
        type: "error",
        text: "Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz miejsce startu ręcznie poniżej.",
      });
      return;
    }

    setGeolocating(true);
    setStartPointMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        setGeolocating(false);
        setStartPoint({ lat, lng, label: "Twoja lokalizacja" });
        setStartPointMessage({ type: "success", text: "Lokalizacja ustawiona." });

        const label = await geocodeReverse(lat, lng);
        if (label) {
          setManualAddress(label);
          setStartPoint({ lat, lng, label });
          setStartPointMessage({
            type: "success",
            text: `Lokalizacja ustawiona: ${label}`,
          });
        } else {
          setManualAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (error) => {
        setGeolocating(false);
        void error;
        setStartPointMessage({
          type: "error",
          text: "Nie udało się pobrać lokalizacji, wpisz ją ręcznie poniżej.",
        });
      },
      // Limit czasu liczy się od razu po wywołaniu getCurrentPosition,
      // WLICZAJĄC czas oczekiwania na reakcję użytkownika w systemowym
      // oknie z pytaniem o zgodę — zbyt krótki timeout (wcześniej 10s)
      // potrafił wygasnąć, zanim użytkownik zdążył kliknąć "Zezwól" w
      // tym oknie, zwłaszcza że desktopowy Safari ustala lokalizację
      // przez Wi-Fi (wolniej niż GPS na telefonie). maximumAge > 0
      // pozwala użyć niedawno ustalonej pozycji przy kolejnej próbie
      // zamiast za każdym razem czekać na pełny, powolny pomiar od zera.
      { timeout: 27000, maximumAge: 60000 },
    );
  }

  async function handleGeocodeAddress() {
    if (!manualAddress.trim()) return;

    setGeocoding(true);
    setStartPointMessage(null);

    const result = await geocodeForward(manualAddress);

    setGeocoding(false);

    if (result) {
      setStartPoint(result);
      setStartPointMessage({ type: "success", text: `Ustawiono: ${result.label}` });
    } else {
      setStartPointMessage({
        type: "error",
        text: "Nie znaleziono takiego miejsca. Spróbuj wpisać dokładniejszy adres.",
      });
    }
  }

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest],
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    params.set("days", String(days));
    params.set("transport", transport);
    params.set("travelGroup", travelGroup);
    params.set("numAdults", String(numAdults));
    if (interests.length > 0) {
      params.set("interests", interests.join(","));
    }
    if (travelGroup === "family" && childrenAges.length > 0) {
      params.set("children", childrenAges.join(","));
    }
    if (startPoint) {
      params.set("startLat", String(startPoint.lat));
      params.set("startLng", String(startPoint.lng));
      params.set("startLabel", startPoint.label);
    }

    router.push(`/planer/wynik?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex max-w-xl flex-col gap-8">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Punkt startowy
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            disabled={geolocating}
            className="self-start rounded-full border border-black/[.08] px-4 py-3 text-sm font-medium text-black hover:border-black/[.2] disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-white/[.3]"
          >
            {geolocating
              ? "Pobieranie lokalizacji…"
              : "Użyj mojej aktualnej lokalizacji"}
          </button>

          {showLocationModal && (
            <LocationPermissionModal
              onAllow={() => {
                setShowLocationModal(false);
                handleUseLocation();
              }}
              onDismiss={() => setShowLocationModal(false)}
            />
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
            lub
            <span className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Wpisz miejsce startu
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGeocodeAddress();
                  }
                }}
                placeholder="np. Poznań, ul. Główna 1"
                className="flex-1 rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={geocoding || !manualAddress.trim()}
                className="shrink-0 rounded-lg border border-black/[.08] px-4 py-3 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
              >
                {geocoding ? "Szukam…" : "Znajdź"}
              </button>
            </div>
          </label>

          {startPointMessage && (
            <p
              className={
                startPointMessage.type === "success"
                  ? "text-sm text-green-700 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {startPointMessage.text}
            </p>
          )}
        </div>
      </section>

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
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                checked={interests.includes(interest)}
                onChange={() => toggleInterest(interest)}
                className="h-4 w-4"
              />
              <span className="text-black dark:text-zinc-50">{interest}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Środek transportu
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              { value: "car", label: "Samochód" },
              { value: "camper", label: "Camper" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="radio"
                name="transport"
                checked={transport === option.value}
                onChange={() => setTransport(option.value)}
                className="h-4 w-4"
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
              { value: "adults", label: "Tylko dorośli" },
              { value: "family", label: "Rodzina z dziećmi" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="radio"
                name="travelGroup"
                checked={travelGroup === option.value}
                onChange={() => setTravelGroup(option.value)}
                className="h-4 w-4"
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

      <button
        type="submit"
        className="self-start rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Generuj trasę
      </button>
    </form>
  );
}
