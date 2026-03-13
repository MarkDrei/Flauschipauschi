"use client";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Flauschipauschi</h1>
        <p className="mb-8 text-xl text-gray-300">
          A Next.js 15 + TypeScript + Canvas game
        </p>
        <canvas
          id="gameCanvas"
          className="border-2 border-white"
          width={800}
          height={600}
        />
        <div className="mt-8">
          <p className="text-sm text-gray-400">
            Canvas is ready for game rendering
          </p>
        </div>
      </div>
    </main>
  );
}
