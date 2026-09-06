"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Place } from "@/data/places";
import type { GeocodedPlace } from "@/lib/geocoding";
import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/mapbox";
import { getPlaceMapIcon } from "@/lib/placeMapIcon";
import { isWithinPoland } from "@/lib/poland";

// Zgłoszenie 05.09 (kontynuacja): dowód wprost pokazał, że TA konkretna
// zgłoszona sprawa nie miała złych współrzędnych (sprawdzone bezpośrednio
// dla wszystkich 8 miejsc w promieniu 30 km od Łeby — żadne nie miało
// null/0,0/odstających wartości; przyczyną była przerwana w locie
// animacja fitBounds, naprawiona osobno niżej). Mimo to warto mieć tu
// niezależną, twardą ochronę na przyszłość — pojedyncze miejsce z
// zepsutymi współrzędnymi (błąd parsowania Geoapify, literówka w danych
// kuratorskich) mogłoby rozciągnąć fitBounds do absurdalnego kadru
// dokładnie tak, jak zgłoszenie opisywało. isWithinPoland (poland.ts) w
// jednym warunku łapie NaN/undefined (porównania liczbowe z nimi są
// zawsze false), (0,0) i punkty ewidentnie spoza kraju.
function hasSaneCoordinates(point: { lat: number; lng: number }): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && isWithinPoland(point);
}

type RouteInfo = {
  distanceKm: number;
  durationMin: number;
  // Pierwszy odcinek trasy (start → pierwszy przystanek) — wydzielony z
  // pełnej trasy, żeby pokazać osobno "ile zajmie sam dojazd", zanim
  // zacznie się właściwe zwiedzanie. Ustawiony tylko wtedy, gdy podano
  // punkt startowy (inaczej pierwszy odcinek to po prostu dwa pierwsze
  // przystanki, co nie ma tego znaczenia).
  firstLegDistanceKm?: number;
  firstLegDurationMin?: number;
};

type LineStringGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

async function fetchDrivingRoute(
  waypoints: { lat: number; lng: number }[],
  hasStartPoint: boolean,
): Promise<{ geometry: LineStringGeometry; info: RouteInfo } | null> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) return null;

  // Mapbox Directions zwraca trasę podzieloną na "legs" — po jednym na
  // każdy odcinek między kolejnymi waypointami. Gdy pierwszym waypointem
  // jest punkt startowy, legs[0] to dokładnie "start → pierwszy
  // przystanek", bez potrzeby osobnego zapytania do API.
  const firstLeg = hasStartPoint ? route.legs?.[0] : undefined;

  return {
    geometry: route.geometry,
    info: {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      firstLegDistanceKm: firstLeg ? firstLeg.distance / 1000 : undefined,
      firstLegDurationMin: firstLeg ? firstLeg.duration / 60 : undefined,
    },
  };
}

// Mapbox GL renderuje text-field własnymi glifami (SDF) generowanymi po
// stronie serwera, które nie obejmują emoji — dlatego ikony emoji
// rysujemy na canvasie (tam używana jest zwykła czcionka systemowa) i
// rejestrujemy jako obrazek przez map.addImage(), a warstwa POI używa
// icon-image zamiast text-field.
function emojiToImageData(emoji: string, size: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${Math.round(size * 0.75)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  return ctx.getImageData(0, 0, size, size);
}

const ROUTE_SOURCE_ID = "driving-route";
const ROUTE_LAYER_ID = "driving-route-line";

// Zgłoszenie 06.09: kolor linii trasy — ten sam odcień, co domyślny
// niebieski akcent suwaków appki ("Liczba dni", "Promień poszukiwań").
// Te suwaki (zwykłe <input type="range">) NIE mają nigdzie w appce
// zdefiniowanego własnego koloru (sprawdzone: brak `accent-color`/
// `accent-*` w całym kodzie) — ich niebieski to domyślny, wbudowany
// akcent Chromium dla natywnych kontrolek formularza, sprawdzony
// bezpośrednio przez porównanie próbki #1a73e8 obok wyrenderowanego
// suwaka (wizualnie nierozróżnialne). Zastąpione poprzednie bordo
// (#6b1725, ten sam odcień co --color-wine-solid) tym niebieskim —
// jedyne miejsce w appce rysujące linię trasy (używane zarówno przez
// /planer/wynik, jak i widok bazy z promieniem w BaseRadiusExplorer).
const ROUTE_LINE_COLOR = "#1a73e8";

type PoiCategoryId = "fuel" | "restaurants" | "shops";

const POI_CATEGORIES: {
  id: PoiCategoryId;
  label: string;
  emoji: string;
  layerId: string;
  filter: mapboxgl.FilterSpecification;
}[] = [
  {
    id: "fuel",
    label: "Stacje paliw",
    emoji: "⛽",
    layerId: "poi-fuel",
    filter: [
      "all",
      ["==", ["get", "class"], "motorist"],
      ["==", ["get", "maki"], "fuel"],
    ],
  },
  {
    id: "restaurants",
    label: "Restauracje",
    emoji: "🍽️",
    layerId: "poi-restaurants",
    filter: ["==", ["get", "class"], "food_and_drink"],
  },
  {
    id: "shops",
    label: "Sklepy / centra handlowe",
    emoji: "🛒",
    layerId: "poi-shops",
    filter: [
      "any",
      ["==", ["get", "class"], "store_like"],
      ["==", ["get", "class"], "food_and_drink_stores"],
    ],
  },
];

export default function MapboxRouteMap({
  stops,
  startPoint,
}: {
  stops: Place[];
  startPoint?: GeocodedPlace | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [activeCategories, setActiveCategories] = useState<
    Record<PoiCategoryId, boolean>
  >({ fuel: false, restaurants: false, shops: false });
  const activeCategoriesRef = useRef(activeCategories);
  useEffect(() => {
    activeCategoriesRef.current = activeCategories;
  }, [activeCategories]);

  function togglePoiCategory(id: PoiCategoryId) {
    setActiveCategories((current) => {
      const next = { ...current, [id]: !current[id] };
      const category = POI_CATEGORIES.find((c) => c.id === id);
      const map = mapRef.current;
      if (map && category && map.getLayer(category.layerId)) {
        map.setLayoutProperty(
          category.layerId,
          "visibility",
          next[id] ? "visible" : "none",
        );
      }
      return next;
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI state when stops/startPoint change, before (re)creating the map instance
    setRouteInfo(null);
    setError(false);
    setMapError(false);

    // Zgłoszenie 05.09: odrzucamy (i logujemy) miejsca z nieprawidłowymi
    // współrzędnymi TU, raz, zanim cokolwiek — marker, bounds, waypoint
    // Directions API — zdąży ich użyć. Patrz hasSaneCoordinates wyżej.
    const validStops = stops.filter((stop) => {
      if (hasSaneCoordinates(stop)) return true;
      console.error(
        `MapboxRouteMap: pomijam miejsce z nieprawidłowymi współrzędnymi (lat=${stop.lat}, lng=${stop.lng}): "${stop.title}" (${stop.slug})`,
      );
      return false;
    });
    const validStartPoint =
      startPoint && hasSaneCoordinates(startPoint) ? startPoint : null;
    if (startPoint && !validStartPoint) {
      console.error(
        `MapboxRouteMap: pomijam punkt startowy z nieprawidłowymi współrzędnymi (lat=${startPoint.lat}, lng=${startPoint.lng}): "${startPoint.label}"`,
      );
    }

    const hasContent = validStops.length > 0 || !!validStartPoint;
    if (!containerRef.current || !hasContent || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter = validStartPoint
      ? ([validStartPoint.lng, validStartPoint.lat] as [number, number])
      : ([validStops[0].lng, validStops[0].lat] as [number, number]);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: initialCenter,
      zoom: 7,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-left");
    mapRef.current = map;
    map.on("error", () => setMapError(true));

    function addPoiLayers() {
      POI_CATEGORIES.forEach((category) => {
        if (map.getLayer(category.layerId)) return;

        const iconId = `${category.layerId}-icon`;
        if (!map.hasImage(iconId)) {
          map.addImage(iconId, emojiToImageData(category.emoji, 44));
        }

        map.addLayer({
          id: category.layerId,
          type: "symbol",
          source: "composite",
          "source-layer": "poi_label",
          filter: category.filter,
          layout: {
            "icon-image": iconId,
            "icon-size": 0.6,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            visibility: activeCategoriesRef.current[category.id]
              ? "visible"
              : "none",
          },
        });

        map.on("mouseenter", category.layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", category.layerId, () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("click", category.layerId, (e) => {
          const feature = e.features?.[0] as
            | { properties?: Record<string, unknown> }
            | undefined;
          if (!feature) return;
          const name =
            (feature.properties?.name as string | undefined) ??
            category.label;

          new mapboxgl.Popup({ offset: 12 })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="color:#111;">${name}</div>`)
            .addTo(map);
        });
      });
    }

    if (map.isStyleLoaded()) {
      addPoiLayers();
    } else {
      map.once("load", addPoiLayers);
    }

    const bounds = new mapboxgl.LngLatBounds();

    if (validStartPoint) {
      const el = document.createElement("div");
      el.style.background = "var(--honey)";
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
        `<div style="color:#111;"><strong>Start: ${validStartPoint.label}</strong></div>`,
      );

      el.addEventListener("mouseenter", () => {
        popup.setLngLat([validStartPoint.lng, validStartPoint.lat]).addTo(map);
      });
      el.addEventListener("mouseleave", () => {
        popup.remove();
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([validStartPoint.lng, validStartPoint.lat])
        .addTo(map);

      bounds.extend([validStartPoint.lng, validStartPoint.lat]);
    }

    validStops.forEach((stop, index) => {
      // Kontener pozycjonujący — samą pinezkę z ikoną kategorii i mały
      // odznaczek numeru w jej rogu (patrz niżej) trzeba pozycjonować
      // względem wspólnego rodzica, żeby oba elementy tworzyły jeden
      // marker.
      //
      // Zgłoszenie 06.09 (regres — pineski nieprzyklejone do mapy):
      // TU był błąd. Własna klasa Mapboxa ".mapboxgl-marker" narzuca
      // temu elementowi "position: absolute" (żeby marker w ogóle NIE
      // uczestniczył w normalnym przepływie dokumentu — Mapbox pozycjonuje
      // go WYŁĄCZNIE przez transform, niezależnie od DOM-owego sąsiedztwa).
      // Poprzednia wersja nadpisywała to inline'em na "position: relative"
      // (żeby dać kontekst pozycjonowania dla odznaczka numeru poniżej) —
      // ale "relative" NIE wyjmuje elementu z przepływu, więc każda kolejna
      // 32px-owa pinezka dosłownie "pchała" następne w dół normalnym
      // block-flow, DODATKOWO do przesunięcia liczonego przez Mapbox.
      // Efekt zmierzony bezpośrednio na żywej produkcji: błąd rósł
      // liniowo, dokładnie 32px na każdą kolejną pinezkę (0, -32, -64,
      // -97, -129...) — pierwsza pinezka (i marker startu, który nigdy
      // nie miał tego nadpisania) były w porządku, każda następna coraz
      // bardziej "odklejona" przy zoomowaniu/przesuwaniu.
      // "position: absolute" TAKŻE tworzy kontekst pozycjonowania dla
      // potomków (nie tylko "relative") — więc odznaczek numeru nadal
      // poprawnie się zakotwicza, a sam marker wraca do wymaganego przez
      // Mapbox zachowania.
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.cursor = "pointer";

      // Zgłoszenie 05.09 (kontynuacja — czytelność ikon): ikona kategorii
      // ma być GŁÓWNYM, czytelnym elementem pinezki (na tyle duża, żeby
      // rozpoznać zamek/plażę/latarnię bez klikania), nie małym
      // dodatkiem w rogu — poprzednia wersja robiła odwrotnie (numer
      // główny, 9px ikona w rogu) i ikona była nieczytelna. Numer
      // kolejności na trasie wciąż jest potrzebny do śledzenia trasy, ale
      // teraz to ON jest małym odznaczkiem w rogu — nadal w pełni czytelny
      // przy 1-2 cyfrach, w przeciwieństwie do emoji przy bardzo małym
      // rozmiarze. Patrz getPlaceMapIcon (ten sam mechanizm dopasowania
      // co karty/placeholdery).
      const categoryIcon = document.createElement("div");
      categoryIcon.style.background = "white";
      categoryIcon.style.width = "32px";
      categoryIcon.style.height = "32px";
      categoryIcon.style.borderRadius = "50%";
      categoryIcon.style.display = "flex";
      categoryIcon.style.alignItems = "center";
      categoryIcon.style.justifyContent = "center";
      categoryIcon.style.fontSize = "17px";
      categoryIcon.style.lineHeight = "1";
      categoryIcon.style.border = "2px solid var(--color-wine-solid)";
      categoryIcon.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)";
      categoryIcon.textContent = getPlaceMapIcon(stop);
      el.appendChild(categoryIcon);

      const numberEl = document.createElement("div");
      numberEl.style.position = "absolute";
      numberEl.style.bottom = "-6px";
      numberEl.style.right = "-6px";
      numberEl.style.background = "var(--color-wine-solid)";
      numberEl.style.color = "#fff";
      numberEl.style.width = "17px";
      numberEl.style.height = "17px";
      numberEl.style.borderRadius = "50%";
      numberEl.style.display = "flex";
      numberEl.style.alignItems = "center";
      numberEl.style.justifyContent = "center";
      numberEl.style.fontSize = "10px";
      numberEl.style.fontWeight = "600";
      numberEl.style.border = "1.5px solid white";
      numberEl.style.boxShadow = "0 0 3px rgba(0,0,0,0.4)";
      numberEl.textContent = String(index + 1);
      el.appendChild(numberEl);

      const popup = new mapboxgl.Popup({
        offset: 16,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(
        `<div style="color:#111;"><strong>${index + 1}. ${getPlaceMapIcon(stop)} ${stop.title}</strong><br>${stop.description}</div>`,
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

    // Zgłoszenie 05.09 (kontynuacja — regres po poprzedniej naprawie):
    // fitBounds domyślnie ANIMUJE przejście kamery ("flyTo"). Ten pierwszy
    // wywołanie i drugie niżej (po dociągnięciu trasy) mogą wystrzelić
    // blisko siebie w czasie — drugie przerywa animację pierwszego W
    // LOCIE. Mapbox liczy wtedy nową krzywą lotu na podstawie AKTUALNEGO,
    // pośredniego stanu kamery (który sam jest w trakcie przejścia) jako
    // nowego punktu startowego — sprawdzone bezpośrednio (odczyt zoom/
    // centrum tuż po starcie): potrafi to dać przejściowo znacznie bardziej
    // oddalony kadr niż jakikolwiek z dwóch docelowych stanów osobno
    // (np. zoom ~5.9, cały kraj, zamiast docelowego ~9, wybrzeże). Appka w
    // końcu doganiała poprawny kadr, ale dopiero po dokończeniu animacji —
    // do tego czasu użytkownik widział błędny, mocno oddalony widok.
    // `animate: false` sprawia, że kamera skacze OD RAZU do policzonego
    // celu — bez żadnej klatki pośredniej do przerwania.
    map.fitBounds(bounds, { padding: 60, maxZoom: 11, animate: false });

    let cancelled = false;

    const waypoints = [
      ...(validStartPoint ? [{ lat: validStartPoint.lat, lng: validStartPoint.lng }] : []),
      ...validStops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];

    if (waypoints.length > 1) {
      fetchDrivingRoute(waypoints, Boolean(validStartPoint))
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
              paint: { "line-color": ROUTE_LINE_COLOR, "line-width": 4 },
            });

            // Zgłoszenie 05.09: ROZSZERZAMY te same `bounds`, które już
            // zawierają bazę/start i WSZYSTKIE przystanki (patrz wyżej) —
            // nie budujemy osobnych granic tylko z geometrii trasy. W
            // teorii linia trasy i tak przechodzi przez każdy przystanek,
            // więc oba zbiory granic powinny wychodzić na to samo — ale
            // to założenie, nie gwarancja (przybliżenie drogi do
            // najbliższej drogi, kolejność waypointów przez odległość od
            // bazy a nie sensowną trasę w BaseRadiusExplorer...). Suma
            // obu granic matematycznie GWARANTUJE, że żaden przystanek z
            // listy pod mapą nigdy nie wypadnie poza kadr, niezależnie od
            // kształtu samej trasy.
            result.geometry.coordinates.forEach((c) => bounds.extend(c));
            // Bez animacji z tego samego powodu co pierwsze wywołanie
            // wyżej — to drugie wywołanie jest właśnie tym, które ma
            // szansę przerwać animację pierwszego w locie.
            map.fitBounds(bounds, { padding: 60, maxZoom: 11, animate: false });
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
      mapRef.current = null;
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
      <div className="mb-3 flex flex-wrap gap-2">
        {POI_CATEGORIES.map((category) => {
          const active = activeCategories[category.id];
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => togglePoiCategory(category.id)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-wine-solid bg-wine-solid text-white active:bg-wine-solid-hover"
                  : "border-black/[.08] text-black hover:border-wine/50 active:border-wine active:bg-wine/5 dark:border-white/[.145] dark:text-zinc-50 dark:hover:border-wine/50 dark:active:bg-wine/10"
              }`}
            >
              {category.emoji} {category.label}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: "400px", width: "100%", borderRadius: "0.75rem" }}
        />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/90 p-4 text-center text-sm text-zinc-600 dark:bg-black/80 dark:text-zinc-400">
            Nie udało się załadować mapy. Sprawdź połączenie z internetem i
            odśwież stronę.
          </div>
        )}
      </div>
      {routeInfo && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Trasa samochodowa: {routeInfo.distanceKm.toFixed(0)} km, ok.{" "}
          {(routeInfo.durationMin / 60).toFixed(1)} h jazdy
        </p>
      )}
      {routeInfo?.firstLegDurationMin !== undefined && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          🚗 Dojazd do pierwszego przystanku: {routeInfo.firstLegDistanceKm?.toFixed(0)}{" "}
          km, ok. {(routeInfo.firstLegDurationMin / 60).toFixed(1)} h — dopiero
          potem zaczyna się zwiedzanie
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
