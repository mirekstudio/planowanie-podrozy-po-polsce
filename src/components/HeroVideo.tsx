"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const VIDEO_SOURCES = {
  mobile: "/videos/intro-pionowe.mp4",
  desktop: "/videos/intro-poziome.mp4",
};

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Zabezpieczenie dla Safari (desktop) — nie polegamy wyłącznie na
    // atrybutach autoPlay/muted w JSX, tylko dodatkowo ustawiamy muted
    // i wywołujemy play() jawnie przez JS, na wypadek gdyby Safari nie
    // uznał autoplay za dozwolony na podstawie samych atrybutów HTML.
    video.muted = true;
    void video.play().catch(() => {});

    // <source media="..."> wewnątrz <video> przeglądarka dobiera TYLKO
    // RAZ, przy pierwszym wczytaniu elementu — nie reaguje na późniejszą
    // zmianę szerokości okna (obrót telefonu, zmiana rozmiaru okna na
    // desktopie). Bez tego nasłuchu wideo zostaje w "złej" orientacji
    // (np. pionowe rozciągnięte object-fit:cover na szeroki ekran) aż do
    // pełnego przeładowania strony — to jest przyczyna zgłoszonego złego
    // kadrowania po zmianie szerokości ekranu bez odświeżenia.
    const mql = window.matchMedia(MOBILE_QUERY);
    function handleChange(event: MediaQueryListEvent) {
      const currentVideo = videoRef.current;
      if (!currentVideo) return;
      const nextSrc = event.matches ? VIDEO_SOURCES.mobile : VIDEO_SOURCES.desktop;
      if (!currentVideo.currentSrc.endsWith(nextSrc)) {
        currentVideo.src = nextSrc;
        currentVideo.load();
        currentVideo.muted = true;
        void currentVideo.play().catch(() => {});
      }
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    video.volume = 1;
    setMuted(next);
    // Safari (zwłaszcza iOS) czasem nie wznawia dźwięku po samym
    // przełączeniu `muted` na już odtwarzanym wideo — wymaga ponownego
    // wywołania play() w tej samej interakcji użytkownika.
    void video.play().catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Na telefonie wideo ma tekst wypalony w obrazie ("OTO POLSKA
          WŁAŚNIE") — object-fit:cover przycinał go po bokach, gdy
          proporcje widocznego obszaru (inne niż czyste 9:16 przez UI
          przeglądarki) nie zgadzały się z proporcjami samego wideo.
          "contain" pokazuje całe wideo (z czarnymi pasami u góry/dołu w
          razie potrzeby) — próg md pokrywa się z tym samym 767px, przy
          którym przełącza się plik pionowy/poziomy (patrz MOBILE_QUERY). */}
      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-contain md:object-cover"
      >
        <source
          src={VIDEO_SOURCES.mobile}
          type="video/mp4"
          media={MOBILE_QUERY}
        />
        <source src={VIDEO_SOURCES.desktop} type="video/mp4" />
      </video>

      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Włącz dźwięk" : "Wyłącz dźwięk"}
        className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
      >
        {muted ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M16.5 12A4.5 4.5 0 0 0 14 8.05v2.4l2.36 2.36c.09-.26.14-.53.14-.81Z" />
            <path d="M19 12c0 .94-.2 1.83-.55 2.64l1.51 1.51A8.94 8.94 0 0 0 21 12c0-3.71-2.19-6.9-5.35-8.37l-.94 1.61C17.32 6.4 19 9 19 12Z" />
            <path d="M4.27 3 3 4.27l6.02 6.02H5v5.42h3.5L14 21v-6.71l4.73 4.73L20 17.73 4.27 3ZM12 5.72v3.02l-1.94-1.94L12 5.72Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77Z" />
            <path d="M16.5 12A4.5 4.5 0 0 0 14 8.05v7.9c1.48-.66 2.5-2.15 2.5-3.95Z" />
            <path d="M3 8.42v7.16h3.5L12 21V3l-5.5 5.42H3Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
