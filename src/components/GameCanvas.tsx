"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/game/engine";

interface GameCanvasProps {
  width?: number;
  height?: number;
}

export default function GameCanvas({
  width = 800,
  height = 600,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engine.start();

    return () => engine.stop();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-2xl shadow-2xl"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    />
  );
}
