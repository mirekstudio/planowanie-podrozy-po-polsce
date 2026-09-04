"use client";

import { useState } from "react";
import {
  geocodeForward,
  geocodeReverse,
  type GeocodedPlace,
} from "@/lib/geocoding";
import LocationPermissionModal from "@/components/LocationPermissionModal";

type StartPointMessage = { type: "success" | "error"; text: string };

// Wydzielone z PlanerForm.tsx (dawna sekcja "Punkt startowy" formularza) —
// appka pyta o punkt startowy dopiero na etapie "Start — nawiguj" na
// wygenerowanej trasie, nie przy jej generowaniu (patrz uproszczenie
// architektury: generowanie trasy działa wyłącznie w obrębie Polski,
// niezależnie od tego, skąd wyruszy użytkownik). Ten komponent to
// dokładnie ta sama logika/UI (GPS albo ręczny adres), tylko wywołująca
// `onSelect` zamiast trzymająca stan lokalnie w formularzu.
export default function StartPointPicker({
  onSelect,
}: {
  onSelect: (point: GeocodedPlace) => void;
}) {
  const [manualAddress, setManualAddress] = useState("");
  const [message, setMessage] = useState<StartPointMessage | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setMessage({
        type: "error",
        text: "Twoja przeglądarka nie obsługuje geolokalizacji. Wpisz miejsce startu ręcznie poniżej.",
      });
      return;
    }

    setGeolocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        setGeolocating(false);
        onSelect({ lat, lng, label: "Twoja lokalizacja" });
        setMessage({ type: "success", text: "Lokalizacja ustawiona." });

        const label = await geocodeReverse(lat, lng);
        if (label) {
          setManualAddress(label);
          onSelect({ lat, lng, label });
          setMessage({
            type: "success",
            text: `Lokalizacja ustawiona: ${label}`,
          });
        } else {
          setManualAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (error) => {
        setGeolocating(false);
        // Rozróżniamy dokładny powód, żeby użytkownik (i my przy
        // diagnozowaniu) widział, czy to odmowa dostępu (ustawienia
        // systemu/przeglądarki), przekroczony czas, czy chwilowy brak
        // sygnału — zamiast zawsze tego samego ogólnego komunikatu.
        let text = "Nie udało się pobrać lokalizacji, wpisz ją ręcznie poniżej.";
        if (error.code === error.PERMISSION_DENIED) {
          text =
            "Odmówiono dostępu do lokalizacji (sprawdź ustawienia lokalizacji dla tej przeglądarki w systemie). Wpisz adres ręcznie poniżej.";
        } else if (error.code === error.TIMEOUT) {
          text =
            "Przekroczono limit czasu pobierania lokalizacji. Spróbuj ponownie lub wpisz adres ręcznie poniżej.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          text =
            "Nie udało się chwilowo ustalić lokalizacji. Spróbuj ponownie lub wpisz adres ręcznie poniżej.";
        }
        setMessage({ type: "error", text });
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
    setMessage(null);

    const result = await geocodeForward(manualAddress);

    setGeocoding(false);

    if (result) {
      onSelect(result);
      setMessage({ type: "success", text: `Ustawiono: ${result.label}` });
    } else {
      setMessage({
        type: "error",
        text: "Nie znaleziono takiego miejsca. Spróbuj wpisać dokładniejszy adres.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setShowLocationModal(true)}
        disabled={geolocating}
        className="self-start rounded-full border border-black/[.08] px-4 py-3 text-sm font-medium text-black transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50 dark:active:bg-wine/10"
      >
        {geolocating ? "Pobieranie lokalizacji…" : "Użyj mojej aktualnej lokalizacji"}
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
            className="shrink-0 rounded-lg border border-black/[.08] px-4 py-3 text-sm font-medium transition-colors hover:border-wine/50 active:border-wine active:bg-wine/5 disabled:opacity-50 dark:border-white/[.145] dark:hover:border-wine/50 dark:active:bg-wine/10"
          >
            {geocoding ? "Szukam…" : "Znajdź"}
          </button>
        </div>
      </label>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-sm text-green-700 dark:text-green-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
