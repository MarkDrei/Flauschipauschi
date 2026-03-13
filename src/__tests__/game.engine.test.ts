import { describe, it, expect } from "vitest";
import { GameEngine } from "@/game/engine";

describe("GameEngine", () => {
  it("should initialize with correct default state", () => {
    const mockCanvas = document.createElement("canvas");
    const engine = new GameEngine(mockCanvas);
    const state = engine.getState();

    expect(state.running).toBe(false);
    expect(state.score).toBe(0);
  });

  it("should handle null canvas gracefully", () => {
    const engine = new GameEngine(null);
    expect(() => engine.start()).not.toThrow();
  });
});
