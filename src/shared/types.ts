// Shared types and utilities
// This will be used across frontend and backend

export interface GameState {
  running: boolean;
  score: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface UnicornState {
  position: Vector2D;
  velocity: Vector2D;
  direction: "left" | "right";
  bobOffset: number;
}

export type FoodType = "star" | "rainbow" | "cupcake" | "carrot";

export interface FoodItem {
  id: number;
  position: Vector2D;
  type: FoodType;
  collected: boolean;
  floatOffset: number;
}

export interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}
