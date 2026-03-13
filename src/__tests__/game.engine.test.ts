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
    engine.stop();
  });

  it("should set running to true after start", () => {
    const canvas = document.createElement("canvas");
    const engine = new GameEngine(canvas);
    engine.start();
    expect(engine.getState().running).toBe(true);
    engine.stop();
  });

  it("should set running to false after stop", () => {
    const canvas = document.createElement("canvas");
    const engine = new GameEngine(canvas);
    engine.start();
    engine.stop();
    expect(engine.getState().running).toBe(false);
  });

  it("should reset score to 0 on start", () => {
    const canvas = document.createElement("canvas");
    const engine = new GameEngine(canvas);
    // Start a first session
    engine.start();
    engine.stop();
    // Start a second session — score must be reset regardless of prior sessions
    engine.start();
    expect(engine.getState().score).toBe(0);
    engine.stop();
  });

  it("should return a frozen state snapshot", () => {
    const canvas = document.createElement("canvas");
    const engine = new GameEngine(canvas);
    const state = engine.getState();
    expect(Object.isFrozen(state)).toBe(true);
  });
});
