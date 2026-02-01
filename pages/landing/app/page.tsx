import { MemecoinSpheres } from './components/memecoin-spheres';
import { Header } from './components/Header';
import { Hero } from './components/Hero';

export default function Home() {
  return (
    <div id="app" className="relative min-h-screen w-full overflow-hidden">
      <Header />

      {/* Sphere behind hero - positioned absolutely */}
      <div className="fixed inset-0 z-0">
        <MemecoinSpheres />
      </div>

      {/* Hero content - above sphere */}
      <Hero />
    </div>
  );
}
