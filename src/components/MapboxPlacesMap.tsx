"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place } from "@/data/places";
import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/mapbox";
import { getPlaceMapIcon } from "@/lib/placeMapIcon";

export default function MapboxPlacesMap({ places }: { places: Place[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error state before (re)creating the map instance
    setMapError(false);
    if (!containerRef.current || places.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [places[0].lng, places[0].lat],
      zoom: 7,
    });
    mapRef.current = map;

    map.on("error", () => setMapError(true));

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    const bounds = new mapboxgl.LngLatBounds();

    places.forEach((place) => {
      // Zgłoszenie 05.09 (mapy z ikonami kategorii): pinezka pokazuje
      // emoji kategorii miejsca (🏰 zamek, 🏖️ plaża, 🗼 latarnia...)
      // zamiast jednolitej czerwonej kropki dla wszystkich miejsc naraz —
      // patrz getPlaceMapIcon (ten sam mechanizm dopasowania co karty).
      const el = document.createElement("div");
      el.style.background = "white";
      el.style.width = "26px";
      el.style.height = "26px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid #dc2626";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "14px";
      el.style.lineHeight = "1";
      el.style.cursor = "pointer";
      el.textContent = getPlaceMapIcon(place);

      const popup = new mapboxgl.Popup({
        offset: 12,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(
        `<div style="color:#111;"><strong>${place.title}</strong><br>${place.description}</div>`,
      );

      el.addEventListener("mouseenter", () => {
        popup.setLngLat([place.lng, place.lat]).addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      bounds.extend([place.lng, place.lat]);
    });

    map.fitBounds(bounds, { padding: 40, maxZoom: 10 });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [places]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-xl border border-black/[.08] bg-white text-center text-sm text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900">
        Brak skonfigurowanego tokenu Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN).
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height: "500px", width: "100%", borderRadius: "0.75rem" }}
      />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90 p-4 text-center text-sm text-zinc-600 dark:bg-black/80 dark:text-zinc-400">
          Nie udało się załadować mapy. Sprawdź połączenie z internetem i
          odśwież stronę.
        </div>
      )}
    </div>
  );
}
