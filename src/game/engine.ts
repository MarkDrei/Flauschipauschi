// Main game engine logic
// Manages game state, updates, and rendering loop

import type {
  GameState,
  UnicornState,
  FoodItem,
  Particle,
  FoodType,
} from "@/shared/types";

const GROUND_HEIGHT = 90;
const UNICORN_RADIUS = 38; // collision radius
const FOOD_RADIUS = 22;
const FOOD_SPAWN_INTERVAL_MS = 1800;
const MAX_FOOD_ITEMS = 7;
const UNICORN_SPEED = 260; // pixels per second
const INITIAL_FOOD_COUNT = 5;

const MANE_COLORS = [
  "#FF6B9D",
  "#FF9B4E",
  "#FFE566",
  "#66D9A0",
  "#66B2FF",
  "#CC88FF",
];

const FOOD_COLORS: Record<FoodType, string[]> = {
  star: ["#FFD700", "#FFA500", "#FFF8B0"],
  rainbow: ["#FF6B9D", "#FF9B4E", "#FFE566", "#66D9A0", "#66B2FF", "#CC88FF"],
  cupcake: ["#FF9BE8", "#FF6B9D", "#FFFFFF", "#C8860F"],
  carrot: ["#FF6600", "#FF8800", "#228B22"],
};

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private state: GameState = {
    running: false,
    score: 0,
  };

  private unicorn: UnicornState = {
    position: { x: 400, y: 280 },
    velocity: { x: 0, y: 0 },
    direction: "right",
    bobOffset: 0,
  };

  private foodItems: FoodItem[] = [];
  private particles: Particle[] = [];
  private clouds: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  private lastFoodSpawnMs: number = 0;
  private foodIdCounter: number = 0;
  private keys: Set<string> = new Set();
  private lastTimestamp: number = 0;
  private bobTime: number = 0;

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(canvasElement: HTMLCanvasElement | null) {
    this.canvas = canvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
    }
    this.initClouds();
  }

  private initClouds(): void {
    this.clouds = [
      { x: 80, y: 55, width: 130, height: 55 },
      { x: 320, y: 35, width: 170, height: 65 },
      { x: 590, y: 70, width: 145, height: 52 },
      { x: 760, y: 45, width: 110, height: 44 },
    ];
  }

  start(): void {
    this.state.running = true;
    this.state.score = 0;
    this.foodItems = [];
    this.particles = [];
    this.keys.clear();
    this.bobTime = 0;

    const canvasW = this.canvas?.width ?? 800;
    const canvasH = this.canvas?.height ?? 600;
    this.unicorn = {
      position: { x: canvasW / 2, y: (canvasH - GROUND_HEIGHT) / 2 },
      velocity: { x: 0, y: 0 },
      direction: "right",
      bobOffset: 0,
    };

    this.lastFoodSpawnMs = Date.now();
    for (let i = 0; i < INITIAL_FOOD_COUNT; i++) {
      this.spawnFood();
    }

    this.keydownHandler = (e: KeyboardEvent) => {
      this.keys.add(e.key);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
    };
    this.keyupHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.keydownHandler);
      window.addEventListener("keyup", this.keyupHandler);
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.state.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (typeof window !== "undefined") {
      if (this.keydownHandler)
        window.removeEventListener("keydown", this.keydownHandler);
      if (this.keyupHandler)
        window.removeEventListener("keyup", this.keyupHandler);
    }
    this.keys.clear();
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.state.running) return;

    const deltaMs = this.lastTimestamp
      ? Math.min(timestamp - this.lastTimestamp, 50)
      : 16;
    this.lastTimestamp = timestamp;

    this.update(deltaMs);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  // ─── Update ────────────────────────────────────────────────────────────────

  private update(deltaMs: number): void {
    this.updateUnicorn(deltaMs);
    this.updateClouds(deltaMs);
    this.updateFood(deltaMs);
    this.updateParticles(deltaMs);
    this.checkCollisions();
  }

  private updateUnicorn(deltaMs: number): void {
    let vx = 0;
    let vy = 0;

    if (this.keys.has("ArrowLeft") || this.keys.has("a") || this.keys.has("A"))
      vx -= 1;
    if (
      this.keys.has("ArrowRight") ||
      this.keys.has("d") ||
      this.keys.has("D")
    )
      vx += 1;
    if (this.keys.has("ArrowUp") || this.keys.has("w") || this.keys.has("W"))
      vy -= 1;
    if (
      this.keys.has("ArrowDown") ||
      this.keys.has("s") ||
      this.keys.has("S")
    )
      vy += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const dt = deltaMs / 1000;
    this.unicorn.position.x += vx * UNICORN_SPEED * dt;
    this.unicorn.position.y += vy * UNICORN_SPEED * dt;
    this.unicorn.velocity = { x: vx, y: vy };

    if (vx > 0) this.unicorn.direction = "right";
    else if (vx < 0) this.unicorn.direction = "left";

    this.bobTime += deltaMs * 0.003;
    this.unicorn.bobOffset = Math.sin(this.bobTime) * 5;

    const margin = 42;
    const w = this.canvas?.width ?? 800;
    const h = this.canvas?.height ?? 600;
    this.unicorn.position.x = Math.max(
      margin,
      Math.min(w - margin, this.unicorn.position.x)
    );
    this.unicorn.position.y = Math.max(
      margin,
      Math.min(h - GROUND_HEIGHT - margin, this.unicorn.position.y)
    );
  }

  private updateClouds(deltaMs: number): void {
    const w = this.canvas?.width ?? 800;
    for (const c of this.clouds) {
      c.x -= 0.025 * deltaMs;
      if (c.x + c.width < 0) {
        c.x = w + 40;
        c.y = 25 + Math.random() * 110;
      }
    }
  }

  private updateFood(deltaMs: number): void {
    const now = Date.now();
    const active = this.foodItems.filter((f) => !f.collected).length;

    if (
      now - this.lastFoodSpawnMs > FOOD_SPAWN_INTERVAL_MS &&
      active < MAX_FOOD_ITEMS
    ) {
      this.spawnFood();
      this.lastFoodSpawnMs = now;
    }

    const t = now * 0.001;
    for (const food of this.foodItems) {
      food.floatOffset = Math.sin(t * 2 + food.id * 1.3) * 5;
    }

    // Remove already-collected items (after particle burst finished)
    this.foodItems = this.foodItems.filter((f) => !f.collected);

    void deltaMs; // used via Date.now() timing above
  }

  private spawnFood(): void {
    const types: FoodType[] = ["star", "rainbow", "cupcake", "carrot"];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = this.canvas?.width ?? 800;
    const h = this.canvas?.height ?? 600;
    const margin = 65;
    const maxY = h - GROUND_HEIGHT - margin;

    this.foodItems.push({
      id: this.foodIdCounter++,
      position: {
        x: margin + Math.random() * (w - margin * 2),
        y: 70 + Math.random() * (maxY - 70),
      },
      type,
      collected: false,
      floatOffset: 0,
    });
  }

  private updateParticles(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const p of this.particles) {
      p.position.x += p.velocity.x * dt * 60;
      p.position.y += p.velocity.y * dt * 60;
      p.life -= deltaMs * 0.04;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private checkCollisions(): void {
    for (const food of this.foodItems) {
      if (food.collected) continue;

      const dx = food.position.x - this.unicorn.position.x;
      const dy =
        food.position.y +
        food.floatOffset -
        (this.unicorn.position.y + this.unicorn.bobOffset);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < UNICORN_RADIUS + FOOD_RADIUS) {
        food.collected = true;
        this.state.score += 10;
        this.spawnParticles(
          food.position.x,
          food.position.y + food.floatOffset,
          food.type
        );
      }
    }
  }

  private spawnParticles(x: number, y: number, type: FoodType): void {
    const colors = FOOD_COLORS[type];
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        position: { x, y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 25 + Math.random() * 20,
        maxLife: 45,
        size: 3 + Math.random() * 4,
      });
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#87CEEB");
    sky.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    this.renderClouds(ctx);
    this.renderGround(ctx, width, height);

    for (const food of this.foodItems) {
      this.renderFood(ctx, food);
    }

    this.renderParticles(ctx);
    this.renderUnicorn(ctx);
    this.renderUI(ctx, width, height);
  }

  // ─── Clouds ────────────────────────────────────────────────────────────────

  private renderClouds(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    for (const c of this.clouds) {
      this.drawCloud(ctx, c.x, c.y, c.width, c.height);
    }
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const puffs = [
      { cx: x + w * 0.25, cy: y + h * 0.6, r: h * 0.48 },
      { cx: x + w * 0.5, cy: y + h * 0.38, r: h * 0.58 },
      { cx: x + w * 0.75, cy: y + h * 0.6, r: h * 0.48 },
      { cx: x + w * 0.12, cy: y + h * 0.72, r: h * 0.35 },
      { cx: x + w * 0.88, cy: y + h * 0.72, r: h * 0.35 },
    ];
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Ground ────────────────────────────────────────────────────────────────

  private renderGround(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = "#7EC850";
    ctx.fillRect(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT);

    ctx.fillStyle = "#5A9E35";
    ctx.fillRect(0, height - GROUND_HEIGHT, width, 14);

    // Grass blades
    ctx.strokeStyle = "#4E8A2E";
    ctx.lineWidth = 1.8;
    for (let i = 15; i < width; i += 28 + (i % 37)) {
      ctx.beginPath();
      ctx.moveTo(i, height - GROUND_HEIGHT);
      ctx.lineTo(i - 4, height - GROUND_HEIGHT - 11);
      ctx.moveTo(i + 7, height - GROUND_HEIGHT);
      ctx.lineTo(i + 10, height - GROUND_HEIGHT - 9);
      ctx.stroke();
    }

    // Flowers on ground
    const flowerX = [60, 160, 270, 390, 520, 650, 740];
    for (const fx of flowerX) {
      this.drawFlower(ctx, fx, height - GROUND_HEIGHT + 8);
    }
  }

  private drawFlower(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    const petalColors = ["#FF9BE8", "#FFE566", "#FF9B4E", "#66D9A0", "#CC88FF"];
    const color = petalColors[Math.floor(x / 100) % petalColors.length];
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * 5,
        y + Math.sin(a) * 5,
        3.5,
        2,
        a,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Food items ────────────────────────────────────────────────────────────

  private renderFood(ctx: CanvasRenderingContext2D, food: FoodItem): void {
    const x = food.position.x;
    const y = food.position.y + food.floatOffset;

    ctx.save();
    ctx.translate(x, y);

    switch (food.type) {
      case "star":
        this.drawStar(ctx, 0, 0, FOOD_RADIUS);
        break;
      case "rainbow":
        this.drawRainbowPiece(ctx, 0, 0, FOOD_RADIUS);
        break;
      case "cupcake":
        this.drawCupcake(ctx, 0, 0, FOOD_RADIUS);
        break;
      case "carrot":
        this.drawCarrot(ctx, 0, 0, FOOD_RADIUS);
        break;
    }

    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const spikes = 5;
    const outer = size;
    const inner = size * 0.42;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawRainbowPiece(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    const colors = [
      "#FF4444",
      "#FF9B4E",
      "#FFE566",
      "#66D9A0",
      "#66B2FF",
      "#CC88FF",
    ];
    const yBase = y + size * 0.35;
    for (let i = 0; i < colors.length; i++) {
      const r = size * (1 - i * 0.12);
      ctx.beginPath();
      ctx.arc(x, yBase, r, Math.PI, 0);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = size * 0.13;
      ctx.stroke();
    }
  }

  private drawCupcake(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    // Cup wrapper
    ctx.beginPath();
    ctx.moveTo(x - size * 0.55, y + size * 0.2);
    ctx.lineTo(x - size * 0.38, y + size * 0.9);
    ctx.lineTo(x + size * 0.38, y + size * 0.9);
    ctx.lineTo(x + size * 0.55, y + size * 0.2);
    ctx.closePath();
    ctx.fillStyle = "#C8860F";
    ctx.fill();
    // Wrapper stripes
    ctx.strokeStyle = "#E09B30";
    ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) {
      const sx = x + i * size * 0.2;
      ctx.beginPath();
      ctx.moveTo(sx - size * 0.05, y + size * 0.25);
      ctx.lineTo(sx - size * 0.05, y + size * 0.88);
      ctx.stroke();
    }
    // Frosting blob
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.05, size * 0.55, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FF9BE8";
    ctx.fill();
    // Sprinkles
    const sp = [
      ["#FF4444", -8, -8],
      ["#44AAFF", 6, -12],
      ["#44FF88", -4, -16],
      ["#FFFF44", 10, -4],
    ] as [string, number, number][];
    for (const [col, sx, sy] of sp) {
      ctx.fillStyle = col;
      ctx.save();
      ctx.translate(x + sx, y + sy);
      ctx.rotate(0.8);
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    }
  }

  private drawCarrot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    // Body
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.9);
    ctx.lineTo(x - size * 0.42, y - size * 0.28);
    ctx.lineTo(x + size * 0.42, y - size * 0.28);
    ctx.closePath();
    ctx.fillStyle = "#FF6600";
    ctx.fill();
    // Horizontal lines
    ctx.strokeStyle = "#FF8800";
    ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      const ly = y - size * 0.28 + (i * size * 1.2) / 4;
      const halfW = size * 0.42 * (1 - i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - halfW, ly);
      ctx.lineTo(x + halfW, ly);
      ctx.stroke();
    }
    // Green top
    ctx.strokeStyle = "#228B22";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * size * 0.12, y - size * 0.28);
      ctx.quadraticCurveTo(
        x + i * size * 0.38,
        y - size * 0.9,
        x + i * size * 0.15,
        y - size * 1.12
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ─── Particles ─────────────────────────────────────────────────────────────

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Unicorn ───────────────────────────────────────────────────────────────

  private renderUnicorn(ctx: CanvasRenderingContext2D): void {
    const x = this.unicorn.position.x;
    const y = this.unicorn.position.y + this.unicorn.bobOffset;
    const facing = this.unicorn.direction === "right" ? 1 : -1;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // Tail
    this.drawUnicornTail(ctx);

    // Body
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E0D0FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 5, 35, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Legs
    ctx.fillStyle = "#F5F0FF";
    ctx.strokeStyle = "#D0C0FF";
    ctx.lineWidth = 1.5;
    const legs: [number, number][] = [
      [-18, 18],
      [-6, 22],
      [8, 22],
      [20, 18],
    ];
    for (const [lx, ly] of legs) {
      ctx.beginPath();
      ctx.moveTo(lx - 4, ly);
      ctx.lineTo(lx - 4, ly + 17);
      ctx.arc(lx, ly + 17, 4, Math.PI, 0);
      ctx.lineTo(lx + 4, ly);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Neck
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E0D0FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(22, -8, 11, 15, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#E0D0FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(30, -21, 16, 13, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Horn
    ctx.beginPath();
    ctx.moveTo(30, -34);
    ctx.lineTo(25, -54);
    ctx.lineTo(36, -34);
    ctx.closePath();
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Horn spiral
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(33, -36);
    ctx.quadraticCurveTo(29, -44, 27, -50);
    ctx.stroke();

    // Mane
    this.drawUnicornMane(ctx);

    // Eye
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(37, -23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(38.2, -24.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Cheek blush
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.ellipse(41, -17, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Nostril
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.ellipse(41, -15, 2.2, 1.4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawUnicornMane(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    const pts = [
      { x: 19, y: -17 },
      { x: 15, y: -10 },
      { x: 11, y: -4 },
      { x: 8, y: 2 },
    ];
    for (let i = 0; i < MANE_COLORS.length; i++) {
      const offset = (i - 2.5) * 2.4;
      ctx.strokeStyle = MANE_COLORS[i];
      ctx.beginPath();
      ctx.moveTo(pts[0].x + offset, pts[0].y);
      for (const pt of pts.slice(1)) {
        ctx.lineTo(pt.x + offset * 0.5, pt.y);
      }
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  private drawUnicornTail(ctx: CanvasRenderingContext2D): void {
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const t = this.bobTime;
    for (let i = 0; i < MANE_COLORS.length; i++) {
      ctx.strokeStyle = MANE_COLORS[i];
      ctx.beginPath();
      ctx.moveTo(-32, 8 + i * 1.5);
      ctx.quadraticCurveTo(
        -52 + Math.sin(t + i * 0.4) * 9,
        -4 + Math.cos(t * 0.8 + i) * 11,
        -48 + Math.sin(t * 1.2 + i * 0.3) * 13,
        22 + i * 1.8
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  private renderUI(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // Score panel
    ctx.fillStyle = "rgba(255,255,255,0.80)";
    this.drawRoundedRect(ctx, 10, 10, 160, 48, 12);
    ctx.fill();

    ctx.fillStyle = "#7B3FAF";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("⭐ Score", 24, 30);
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(String(this.state.score), 24, 52);

    // Hint at bottom
    ctx.fillStyle = "rgba(80,40,130,0.55)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Arrow keys / WASD to fly · Collect the food! 🌈",
      width / 2,
      height - 6
    );
    ctx.textAlign = "left";
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }
}
