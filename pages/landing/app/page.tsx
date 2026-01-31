import MemecoinSpheres from "./components/MemecoinSpheres";

export default function Home() {
  return (
    <div id="app" className="relative w-full h-screen bg-background">
      <div className="absolute left-[8vw] top-1/2 -translate-y-1/2 z-10 flex flex-col items-start justify-center pointer-events-none max-w-[40vw] md:max-w-full md:p-8 md:justify-start md:pt-[15vh] md:items-center">
        <div className="flex flex-col items-start gap-2 md:items-center">
          <h1 className="text-5xl font-bold leading-tight text-primary select-none md:text-[2.5rem] md:text-center" style={{ textShadow: "0 0 20px var(--background)" }}>Meme the Moment</h1>
          <h2 className="text-2xl font-medium leading-tight text-foreground select-none md:text-2xl md:text-center" style={{ textShadow: "0 0 20px var(--background)" }}>Drop memecoins on bangers</h2>
          <p className="text-base font-normal text-muted-foreground select-none mt-4 md:text-base md:text-center" style={{ textShadow: "0 0 20px var(--background)" }}>The social meme wallet</p>
        </div>
      </div>
      <MemecoinSpheres />
    </div>
  );
}
