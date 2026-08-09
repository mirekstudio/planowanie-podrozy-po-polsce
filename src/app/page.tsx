export default function Home() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/biskupin.jpg"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="/videos/intro-pionowe.mp4"
          type="video/mp4"
          media="(max-width: 767px)"
        />
        <source src="/videos/intro-poziome.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
