import Image from "next/image";

export default function PolskaWPigulcePage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Polska w pigułce
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Krótkie wprowadzenie, zanim wyruszysz w podróż — trochę historii i
          garść przydatnych informacji.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Historia w skrócie
          </h2>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-black/[.08] dark:border-white/[.145]">
            <Image
              src="/images/gniezno.jpg"
              alt="Katedra w Gnieźnie o zmierzchu"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
            <p className="relative p-6 text-sm leading-7 text-zinc-100 sm:p-8 sm:text-base sm:leading-8">
              Polska to jeden z najstarszych krajów Europy Środkowej – jej
              historia zaczyna się oficjalnie w 966 roku, gdy książę Mieszko I
              przyjął chrzest, wprowadzając kraj do chrześcijańskiej
              wspólnoty Europy. Przez kolejne stulecia Polska bywała potęgą
              (w XVI wieku jedną z największych w Europie) i krajem, który na
              123 lata zniknął z map (rozbiory 1795–1918). Odzyskała
              niepodległość w 1918 roku, przetrwała zniszczenia II wojny
              światowej i dekady komunizmu, by od 1989 roku zbudować jedną z
              najdynamiczniej rozwijających się gospodarek w Europie. Dziś to
              kraj, gdzie średniowieczne zamki sąsiadują z nowoczesnymi
              centrami technologicznymi.
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
            Na zdjęciu: Gniezno, pierwsza stolica Polski.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Fakty praktyczne
          </h2>
          <dl className="mt-4 divide-y divide-black/[.08] rounded-xl border border-black/[.08] bg-white dark:divide-white/[.145] dark:border-white/[.145] dark:bg-zinc-900">
            {[
              {
                label: "Ustrój",
                value:
                  "Republika parlamentarna, członek Unii Europejskiej (od 2004) i NATO",
              },
              {
                label: "Waluta",
                value:
                  "Złoty polski (PLN) – Polska nie należy do strefy euro",
              },
              {
                label: "Język",
                value:
                  "Polski – w większych miastach i miejscach turystycznych porozumiesz się po angielsku/niemiecku",
              },
              {
                label: "Bezpieczeństwo",
                value:
                  "Polska jest uważana za jeden z bezpieczniejszych krajów Europy",
              },
              {
                label: "Ruch drogowy",
                value:
                  "Prawostronny, obowiązkowe światła mijania przez cały rok, winiety/opłaty na niektórych autostradach",
              },
              {
                label: "Kampery",
                value:
                  "Rosnąca sieć pól kamperowych, ale mniej rozwinięta infrastruktura niż w Niemczech/Holandii – warto planować z wyprzedzeniem",
              },
              {
                label: "Numer alarmowy",
                value: "112 (ogólnoeuropejski)",
              },
            ].map((fact) => (
              <div
                key={fact.label}
                className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr] sm:gap-4 sm:p-5"
              >
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {fact.label}
                </dt>
                <dd className="text-black dark:text-zinc-50">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
