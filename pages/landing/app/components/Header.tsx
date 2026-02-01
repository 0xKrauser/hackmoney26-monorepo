import Image from 'next/image';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-center justify-end">
      <a href="/" className="flex items-center h-12" aria-label="Home">
        <Image
          src="/logo.png"
          alt="Frens logo"
          width={40}
          height={40}
          className="h-10 w-auto"
          priority
        />
      </a>
    </header>
  );
}
