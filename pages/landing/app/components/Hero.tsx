export function Hero() {
  return (
    <section className="relative z-10 flex items-center min-h-screen px-8 md:px-24 lg:px-32 xl:px-40 mt-10 pointer-events-none">
      <div className="text-left max-w-xl">
        {/* Tagline */}
        <p className="tagline-pulse font-display text-lg md:text-xl font-semibold tracking-wide mb-4">
          The social meme wallet
        </p>

        {/* Main Headline */}
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-5 whitespace-nowrap">
          React on X with <span className="text-gradient">Frens</span>
        </h1>

        {/* Subheadline */}
        <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-10">
          Show <span className="text-gradient">LOVE</span> where it matters
        </h2>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-start gap-4 pointer-events-auto">
          <a
            href="#download"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white text-sm font-semibold rounded-full hover:brightness-110 transition-all"
          >
            Get extension
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-6 py-3 text-foreground text-sm font-medium rounded-full border-2 border-foreground/20 hover:border-foreground/40 transition-colors"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
}
