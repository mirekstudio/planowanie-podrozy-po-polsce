"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { PreviewPin } from "@/lib/suggestBases";
import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/mapbox";

// Rozmiar pineski — na tyle duży, żeby emoji kategorii (patrz
// PreviewPin.icon/getPlaceMapIcon) było czytelne na malutkiej miniaturze
// karty podregionu, ale nie na tyle, żeby przy 3-4 pineskach naraz się
// nakładały.
const PIN_SIZE_PX = 26;

// Miniatura Poziomu 1 (karta podregionu, /planer/bazy/page.tsx) — zgłoszenie
// 05.09 (druga kontynuacja): każda pinezka ma pokazywać etykietę z nazwą
// miejsca po najechaniu (desktop) lub dotknięciu (mobile), korzystając z
// tego samego pola `title`, które zasila podpis tekstowy pod mapą i karty
// kandydatów na Poziomie 2 (patrz pinsFromBaseCandidates w suggestBases.ts).
// Statyczny obrazek z Mapbox Static Images API (mapboxStaticThumbnail.ts,
// nadal używany na /planer/wynik) tego nie potrafi — to zwykły <img>, bez
// żadnych elementów DOM do zawieszenia na nich tooltipa — dlatego tu
// zamiast niego prawdziwa mapa Mapbox GL z prawdziwymi markerami.
//
// CELOWO nieinteraktywna (interactive: false — bez przeciągania/zoomu/
// obrotu): to tylko podgląd wewnątrz klikalnej karty <Link>, nie osobna
// mapa do eksploracji — użytkownik i tak zaraz kliknie kartę, żeby przejść
// do pełnej listy kandydatów na Poziomie 2.
//
// Zgłoszenie 05.09 (kontynuacja, mapy z ikonami kategorii): pinezka
// pokazuje emoji kategorii miejsca (🏰 zamek, 🏖️ plaża, 🌲 park...) zamiast
// jednolitej kropki — patrz PreviewPin.icon, ustawione w
// pinsFromBaseCandidates z BaseCandidate.mapIcon (ten sam mechanizm
// dopasowania co karty, getPlaceMapIcon).
export default function SubRegionPreviewMap({ pins }: { pins: PreviewPin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error state before (re)creating the map instance
    setMapError(false);
    if (!containerRef.current || pins.length === 0 || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [pins[0].lng, pins[0].lat],
      zoom: 7,
      interactive: false,
      attributionControl: false,
    });

    map.on("error", () => setMapError(true));

    const bounds = new mapboxgl.LngLatBounds();
    const popups: mapboxgl.Popup[] = [];

    pins.forEach((pin) => {
      bounds.extend([pin.lng, pin.lat]);

      // Zgłoszenie 05.09 (mapy z ikonami kategorii): pinezka pokazuje
      // ikonę kategorii miejsca (🏰 zamek, 🏖️ plaża, 🗼 latarnia...)
      // zamiast jednolitej czarnej kropki — patrz PreviewPin.icon,
      // policzone tym samym mechanizmem co karty (getPlaceMapIcon).
      const el = document.createElement("div");
      el.style.width = `${PIN_SIZE_PX}px`;
      el.style.height = `${PIN_SIZE_PX}px`;
      el.style.borderRadius = "50%";
      el.style.background = "white";
      el.style.border = "2px solid #111111";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "14px";
      el.style.lineHeight = "1";
      el.textContent = pin.icon;

      // Fallbackowe kotwice (patrz pinsFromBaseCandidates) nie mają
      // tytułu — bez etykiety, nie ma czego pokazywać w tooltipie.
      if (!pin.title) {
        new mapboxgl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
        return;
      }

      el.style.cursor = "pointer";
      // Natywny atrybut title jako tani fallback dostępności (czytniki
      // ekranu / urządzenia bez JS-owego popupu) — oprócz właściwego
      // tooltipa niżej.
      el.title = pin.title;

      const popup = new mapboxgl.Popup({
        offset: 10,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`<div style="color:#111;font-size:13px;">${pin.icon} ${pin.title}</div>`);
      popups.push(popup);

      const showPopup = () => popup.setLngLat([pin.lng, pin.lat]).addTo(map);
      const hidePopup = () => popup.remove();

      // Hover na desktopie.
      el.addEventListener("mouseenter", showPopup);
      el.addEventListener("mouseleave", hidePopup);

      // Dotknięcie na urządzeniach mobilnych — cała karta to <Link>, więc
      // bez stopPropagation/preventDefault dotknięcie pinezki od razu
      // nawigowałoby dalej, zamiast tylko pokazać etykietę.
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (popup.isOpen()) {
          hidePopup();
        } else {
          popups.forEach((p) => p !== popup && p.remove());
          showPopup();
        }
      });

      new mapboxgl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
    });

    map.fitBounds(bounds, { padding: 30, maxZoom: 11 });

    return () => {
      popups.forEach((p) => p.remove());
      map.remove();
    };
  }, [pins]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 p-2 text-center text-xs text-zinc-500 dark:bg-zinc-800">
        Brak skonfigurowanego tokenu Mapbox
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-2 text-center text-xs text-zinc-600 dark:bg-black/80 dark:text-zinc-400">
          Nie udało się załadować mapy.
        </div>
      )}
    </div>
  );
}
