import type { Place } from "@/data/places";
import { INTEREST_OPTIONS } from "@/lib/interests";

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
        className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
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
        className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
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
          className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
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
      <div>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Zainteresowania (tagi używane przez planer trasy)
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <label
              key={interest}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/[.08] bg-white p-3 text-sm dark:border-white/[.145] dark:bg-zinc-900"
            >
              <input
                type="checkbox"
                name="tags"
                value={interest}
                defaultChecked={place?.tags.includes(interest)}
                className="h-4 w-4"
              />
              <span className="text-black dark:text-zinc-50">{interest}</span>
            </label>
          ))}
        </div>
      </div>
      <button
        type="submit"
        className="mt-2 self-start rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Zapisz
      </button>
    </form>
  );
}
