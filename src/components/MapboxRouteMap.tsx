"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";
import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/mapbox";

type RouteInfo = {
  distanceKm: number;
  durationMin: number;
};

type LineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

async function fetchDrivingRoute(
  waypoints: { lat: number; lng: number }[],
): Promise<{ geometry: LineStringGeometry; info: RouteInfo } | null> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;

  return {
    geometry: route.geometry,
    info: {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    },
  };
}

const ROUTE_SOURCE_ID = "driving-route";
const ROUTE_LAYER_ID = "driving-route-line";

export default function MapboxRouteMap({
  stops,
  startPoint,
}: {
  stops: Place[];
  startPoint?: GeocodedPlace | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI state when stops/startPoint change, before (re)creating the map instance
    setRouteInfo(null);
    setError(false);

    const hasContent = stops.length > 0 || !!startPoint;
    if (!containerRef.current || !hasContent || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter = startPoint
      ? ([startPoint.lng, startPoint.lat] as [number, number])
      : ([stops[0].lng, stops[0].lat] as [number, number]);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: 7,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");

    const bounds = new mapboxgl.LngLatBounds();

    if (startPoint) {
      const el = document.createElement("div");
      el.style.background = "#2563eb";
      el.style.color = "#fff";
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.borderRadius = "50%";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "14px";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      el.textContent = "🏁";

      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(
        `<div style="color:#111;"><strong>Start: ${startPoint.label}</strong></div>`,
      );

      el.addEventListener("mouseenter", () => {
        popup.setLngLat([startPoint.lng, startPoint.lat]).addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([startPoint.lng, startPoint.lat])
        .addTo(map);

      bounds.extend([startPoint.lng, startPoint.lat]);
    }

    stops.forEach((stop, index) => {
      const el = document.createElement("div");
      el.style.background = "#000";
      el.style.color = "#fff";
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.borderRadius = "50%";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontSize = "13px";
      el.style.fontWeight = "600";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      el.textContent = String(index + 1);

      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(
        `<div style="color:#111;"><strong>${index + 1}. ${stop.title}</strong><br>${stop.description}</div>`,
      );

      el.addEventListener("mouseenter", () => {
        popup.setLngLat([stop.lng, stop.lat]).addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);

      bounds.extend([stop.lng, stop.lat]);
    });

    map.fitBounds(bounds, { padding: 60, maxZoom: 11 });

    let cancelled = false;

    const waypoints = [
      ...(startPoint ? [{ lat: startPoint.lat, lng: startPoint.lng }] : []),
      ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];

    if (waypoints.length > 1) {
      fetchDrivingRoute(waypoints)
        .then((result) => {
          if (cancelled) return;
          if (!result) {
            setError(true);
            return;
          }

          setRouteInfo(result.info);

          const addRoute = () => {
            if (map.getSource(ROUTE_SOURCE_ID)) return;
            map.addSource(ROUTE_SOURCE_ID, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: result.geometry,
              },
            });
            map.addLayer({
              id: ROUTE_LAYER_ID,
              type: "line",
              source: ROUTE_SOURCE_ID,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": "#dc2626", "line-width": 4 },
            });

            const routeBounds = new mapboxgl.LngLatBounds();
            result.geometry.coordinates.forEach((c) =>
              routeBounds.extend(c),
            );
            map.fitBounds(routeBounds, { padding: 60, maxZoom: 11 });
          };

          if (map.isStyleLoaded()) {
            addRoute();
          } else {
            map.once("load", addRoute);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    }

    return () => {
      cancelled = true;
      map.remove();
    };
  }, [stops, startPoint]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-black/[.08] bg-white text-center text-sm text-zinc-500 dark:border-white/[.145] dark:bg-zinc-900">
        Brak skonfigurowanego tokenu Mapbox (NEXT_PUBLIC_MAPBOX_TOKEN).
      </div>
    );
  }

  if (stops.length === 0 && !startPoint) return null;

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: "400px", width: "100%", borderRadius: "0.75rem" }}
      />
      {routeInfo && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Trasa samochodowa: {routeInfo.distanceKm.toFixed(0)} km, ok.{" "}
          {(routeInfo.durationMin / 60).toFixed(1)} h jazdy
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          Nie udało się pobrać rzeczywistej trasy z Mapbox — pokazano same
          przystanki.
        </p>
      )}
    </div>
  );
}
