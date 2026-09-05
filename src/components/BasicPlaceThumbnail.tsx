// Zgłoszenie 05.09: jedno miejsce renderujące zdjęcie (albo placeholder)
// miejsca "podstawowego" (Geoapify) — używane wszędzie, gdzie appka
// pokazuje takie karty (miejsca/page.tsx, planer/wynik, BaseRadiusExplorer,
// planer/bazy BaseCard, miejsca/[slug]). Wcześniej każde z tych miejsc
// miało własną, skopiowaną kopię tego samego "isBasic ? (image ? <img> :
// 📍) : ...)" — jedna uniwersalna pinezka dla WSZYSTKICH miejsc bez
// zdjęcia, niezależnie od typu. Teraz placeholder to `icon` dopasowany do
// kategorii (patrz getCategoryDisplay), a logika istnieje w jednym miejscu
// — więc każda przyszła poprawka (np. nowa kategoria) automatycznie
// obejmie wszystkie karty naraz, bez ryzyka, że jedna z kopii zostanie
// pominięta.
//
// Celowo zwykły <img>, nie next/image — zdjęcia z Geoapify/Wikipedii
// pochodzą z różnych, nieprzewidywalnych domen; next/image wymagałby
// zarejestrowania każdej z nich w next.config (ten sam kompromis, który
// appka już akceptowała dla miejsc "basic" przed tą zmianą).
export default function BasicPlaceThumbnail({
  image,
  imageAlt,
  icon,
  className,
  iconClassName = "text-3xl",
}: {
  image: string | null | undefined;
  imageAlt: string;
  icon?: string | null;
  className: string;
  iconClassName?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={imageAlt} className={className} />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${iconClassName} ${className}`}
    >
      {icon || "📍"}
    </div>
  );
}
