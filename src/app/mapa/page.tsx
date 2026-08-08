import MapboxPlacesMapLoader from "@/components/MapboxPlacesMapLoader";
import { getPlaces } from "@/lib/getPlaces";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const places = await getPlaces();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Mapa miejsc
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Wszystkie przykładowe miejsca na jednej mapie.
        </p>

        <div className="mt-10">
          <MapboxPlacesMapLoader places={places} />
        </div>
      </main>
    </div>
  );
}
