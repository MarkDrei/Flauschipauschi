import GameCanvas from "@/components/GameCanvas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flauschipauschi – Play!",
  description: "Fly your unicorn and collect all the yummy treats!",
};

export default function GamePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-purple-100 gap-4 p-4">
      <h1 className="text-4xl font-bold text-purple-700">
        🦄 Flauschipauschi 🦄
      </h1>
      <p className="text-purple-500 text-lg">
        Fly your unicorn and collect all the yummy treats!
      </p>
      <GameCanvas width={800} height={600} />
    </main>
  );
}
