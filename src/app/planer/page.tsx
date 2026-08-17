import PlanerForm from "@/components/PlanerForm";
import {
  parsePlannerInitialValues,
  type PlannerSearchParams,
} from "@/lib/plannerSearchParams";

export default async function PlanerPage({
  searchParams,
}: {
  searchParams: Promise<PlannerSearchParams>;
}) {
  const params = await searchParams;
  const initialValues = parsePlannerInitialValues(params);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Zaplanuj swoją podróż
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Odpowiedz na kilka pytań, żebyśmy mogli dopasować trasę do Ciebie.
        </p>

        <PlanerForm initialValues={initialValues} />
      </main>
    </div>
  );
}
