import Link from "next/link";

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Background fullscreen */}
      <img
        src="/background.svg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Unicorn2 centered on top of background */}
      <img
        src="/unicorn2.svg"
        alt="unicorn"
        className="absolute inset-0 m-auto w-64 h-64"
      />
      {/* Play button */}
      <div className="absolute inset-0 flex items-end justify-center pb-16">
        <Link
          href="/game"
          className="bg-purple-500 hover:bg-purple-600 text-white text-2xl font-bold px-10 py-4 rounded-full shadow-lg transition-transform hover:scale-105"
        >
          🦄 Play!
        </Link>
      </div>
    </main>
  );
}
