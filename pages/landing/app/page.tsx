import { MemecoinSpheres } from './components/memecoin-spheres';

export default function Home() {
  return (
    <div id="app" className="relative h-screen w-full">
      {/* Hero section */}
      <div className="hero pointer-events-none absolute left-[8vw] top-1/2 z-[2] flex max-w-[40vw] -translate-y-1/2 flex-col items-start justify-center max-md:left-0 max-md:max-w-full max-md:items-center max-md:justify-start max-md:p-8 max-md:pt-[15vh]">
        <div className="hero-content flex flex-col items-start gap-2 max-md:items-center max-md:text-center">
          <h1
            className="text-primary select-none text-left text-[4rem] font-bold leading-[110%] max-md:text-center max-md:text-[2.5rem]"
            style={{ textShadow: '0 0 30px var(--background)' }}>
            Meme the Moment
          </h1>
          <h2
            className="text-foreground select-none text-left text-[2rem] font-medium leading-[110%] max-md:text-center max-md:text-[1.5rem]"
            style={{ textShadow: '0 0 30px var(--background)' }}>
            Drop memecoins on bangers
          </h2>
          <p
            className="tagline text-muted-foreground mt-4 select-none text-[1.1rem] font-normal max-md:text-center max-md:text-base"
            style={{ textShadow: '0 0 20px var(--background)' }}>
            The social meme wallet
          </p>
        </div>
      </div>

      <MemecoinSpheres />
    </div>
  );
}
