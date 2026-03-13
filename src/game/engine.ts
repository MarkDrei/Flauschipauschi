// Main game engine logic
// Manages game state, updates, and rendering loop

import type { GameState } from "@/shared/types";

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private state: GameState = {
    running: false,
    score: 0,
  };

  constructor(canvasElement: HTMLCanvasElement | null) {
    this.canvas = canvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
    }
  }

  start(): void {
    this.state.running = true;
    this.gameLoop();
  }

  stop(): void {
    this.state.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private gameLoop = (): void => {
    if (!this.state.running) return;

    this.update();
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    // Game logic updates
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = "rgb(15, 23, 42)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw game objects
    this.drawGameObjects();
  }

  private drawGrid(): void {
    if (!this.ctx || !this.canvas) return;

    const gridSize = 40;
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawGameObjects(): void {
    if (!this.ctx || !this.canvas) return;

    // Draw center dot
    this.ctx.fillStyle = "rgb(255, 255, 255)";
    this.ctx.beginPath();
    this.ctx.arc(
      this.canvas.width / 2,
      this.canvas.height / 2,
      5,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }

  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }
}
