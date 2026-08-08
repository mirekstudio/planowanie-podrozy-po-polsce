"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place } from "@/data/places";
import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/mapbox";

export default function MapboxPlacesMap({ places }: { places: Place[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [places[0].lng, places[0].lat],
      zoom: 7,
    });
    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    const bounds = new mapboxgl.LngLatBounds();

    places.forEach((place) => {
      const el = document.createElement("div");
      el.style.background = "#dc2626";
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";

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
    <div
      ref={containerRef}
      style={{ height: "500px", width: "100%", borderRadius: "0.75rem" }}
    />
  );
}
