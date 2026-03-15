import GameCanvas from "@/components/GameCanvas";
import Image from "next/image";

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-sky-200">
      {/* Background SVG */}
      <Image
        src="/background.svg"
        alt="Sky background"
        fill
        className="object-cover"
        priority
      />
      
      {/* Unicorn centered on top */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/unicorn2.svg"
          alt="Unicorn"
          width={256}
          height={256}
          priority
        />
      </div>

      {/* Game Canvas (hidden by default, can be toggled) */}
      <GameCanvas />
    </main>
  );
}
