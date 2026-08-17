import type { Place } from "@/data/places";
import { INTEREST_OPTIONS } from "@/lib/interests";
import {
  REGION_TYPE_OPTIONS,
  SURROUNDINGS_OPTIONS,
  NEARBY_ATTRACTION_SUGGESTIONS,
} from "@/lib/placeFilters";

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        name={name}
        {...props}
        className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  ...props
}: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <textarea
        name={name}
        {...props}
        className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}

export default function PlaceForm({
  place,
  action,
}: {
  place?: Place;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="mt-8 flex max-w-xl flex-col gap-4">
      <Field
        label="Slug (unikalny identyfikator w adresie URL)"
        name="slug"
        defaultValue={place?.slug}
        placeholder="np. wolin"
        required
      />
      <Field label="Tytuł" name="title" defaultValue={place?.title} required />
      <Field
        label="Region"
        name="region"
        defaultValue={place?.region}
        placeholder="woj. zachodniopomorskie"
        required
      />
      <TextArea
        label="Krótki opis (widoczny na karcie)"
        name="description"
        defaultValue={place?.description}
        rows={2}
        required
      />
      <TextArea
        label="Pełny opis (strona szczegółów)"
        name="longDescription"
        defaultValue={place?.longDescription}
        rows={5}
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Szerokość geograficzna (lat)"
          name="lat"
          type="number"
          step="any"
          defaultValue={place?.lat}
          required
        />
        <Field
          label="Długość geograficzna (lng)"
          name="lng"
          type="number"
          step="any"
          defaultValue={place?.lng}
          required
        />
      </div>
      <Field
        label="Ścieżka do zdjęcia"
        name="image"
        defaultValue={place?.image}
        placeholder="/images/nazwa.jpg"
        required
      />
      <Field
        label="Tekst alternatywny zdjęcia (alt)"
        name="imageAlt"
        defaultValue={place?.imageAlt}
        required
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Pozycja kadrowania zdjęcia
        </span>
        <select
          name="imagePosition"
          defaultValue={place?.imagePosition ?? ""}
          className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Środek (domyślnie)</option>
          <option value="top">Góra</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Autor zdjęcia"
          name="creditAuthor"
          defaultValue={place?.credit.author}
          required
        />
        <Field
          label="Licencja zdjęcia"
          name="creditLicense"
          defaultValue={place?.credit.license}
          placeholder="CC BY-SA 4.0"
          required
        />
      </div>
      <Field
        label="Kolejność wyświetlania (mniejsze = wyżej)"
        name="sortOrder"
        type="number"
        defaultValue={place?.sortOrder ?? 0}
        required
      />
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 text-sm transition-colors has-checked:border-honey has-checked:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={place?.featured}
          className="h-4 w-4 accent-honey"
        />
        <span className="text-black dark:text-zinc-50">
          Polecane (widoczne w sekcji &bdquo;Polecane&rdquo; w bocznym menu)
        </span>
      </label>
      <div>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Zainteresowania (tagi używane przez planer trasy)
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <label
              key={interest}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 text-sm transition-colors has-checked:border-honey has-checked:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="tags"
                value={interest}
                defaultChecked={place?.tags.includes(interest)}
                className="h-4 w-4 accent-honey"
              />
              <span className="text-black dark:text-zinc-50">{interest}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Typ regionu
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {REGION_TYPE_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 text-sm transition-colors has-checked:border-tide has-checked:bg-tide/10 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="regionType"
                value={option}
                defaultChecked={place?.regionType.includes(option)}
                className="h-4 w-4 accent-tide"
              />
              <span className="text-black dark:text-zinc-50">{option}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Otoczenie
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {SURROUNDINGS_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 text-sm transition-colors has-checked:border-honey has-checked:bg-honey/10 dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="surroundings"
                value={option}
                defaultChecked={place?.surroundings.includes(option)}
                className="h-4 w-4 accent-honey"
              />
              <span className="text-black dark:text-zinc-50">{option}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Bliskość atrakcji (opcjonalnie)
        </span>
        <input
          name="nearbyAttraction"
          list="nearby-attraction-suggestions"
          defaultValue={place?.nearbyAttraction ?? ""}
          placeholder="np. W centrum starego miasta"
          className="rounded-lg border border-black/[.08] bg-white px-3 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
        />
        <datalist id="nearby-attraction-suggestions">
          {NEARBY_ATTRACTION_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </label>
      <TextArea
        label="Rekomendowane kempingi (jeden na linię, opcjonalnie)"
        name="recommendedCampsites"
        defaultValue={place?.recommendedCampsites.join("\n")}
        rows={3}
        placeholder={"Camping Relax (Świnoujście)\nCamping Tramp (Wolin)"}
      />
      <TextArea
        label="Wskazówka kulinarna (opcjonalnie)"
        name="culinaryTip"
        defaultValue={place?.culinaryTip ?? ""}
        rows={2}
        placeholder="np. Ryby z kutra prosto z portu, najlepiej na wieczornym spacerze po nabrzeżu."
      />
      <button
        type="submit"
        className="mt-2 self-start rounded-full bg-wine-solid px-5 py-3 text-sm font-medium text-white hover:bg-wine-solid-hover"
      >
        Zapisz
      </button>
    </form>
  );
}
