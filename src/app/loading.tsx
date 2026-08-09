export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/[.08] border-t-black dark:border-white/[.145] dark:border-t-white" />
        <p className="text-sm text-zinc-500">Ładowanie…</p>
      </div>
    </div>
  );
}
