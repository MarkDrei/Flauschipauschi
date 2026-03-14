// Main game engine logic
// Manages game state, updates, and rendering loop

import type { GameState } from "@/shared/types";

type CollectibleType = "star" | "heart" | "crystal";

interface Collectible {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  speed: number;
  type: CollectibleType;
  color: string;
  pulse: number;
  pulseSpeed: number;
  collected: boolean;
  collectAnim: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
  opacity: number;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

interface UnicornState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
}

const COLLECTIBLE_COLORS: Record<CollectibleType, string[]> = {
  star: ["#FFD700", "#FFA500", "#FFEC4F"],
  heart: ["#FF69B4", "#FF1493", "#FF85A1"],
  crystal: ["#A78BFA", "#8B5CF6", "#DDD6FE"],
};

const PARTICLE_COLORS: Record<CollectibleType, string[]> = {
  star: ["#FFD700", "#FFA500", "#FFEC4F", "#FFFFFF"],
  heart: ["#FF69B4", "#FF1493", "#FFB6C1", "#FFFFFF"],
  crystal: ["#A78BFA", "#8B5CF6", "#C4B5FD", "#FFFFFF"],
};

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private state: GameState = { running: false, score: 0 };

  private unicorn: UnicornState = {
    x: 400,
    y: 300,
    targetX: 400,
    targetY: 300,
    rotation: 0,
  };

  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private clouds: Cloud[] = [];
  private sparkles: Sparkle[] = [];
  private floatingTexts: FloatingText[] = [];
  private rainbowOpacity: number = 0;
  private rainbowGrowing: boolean = false;
  private totalCollected: number = 0;
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private lastTimestamp: number = 0;
  private unicornImage: HTMLImageElement | null = null;

  constructor(canvasElement: HTMLCanvasElement | null) {
    this.canvas = canvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      this.unicorn.x = this.canvas.width / 2 || 400;
      this.unicorn.y = this.canvas.height / 2 || 300;
      this.unicorn.targetX = this.unicorn.x;
      this.unicorn.targetY = this.unicorn.y;
    }
    this.initClouds();
    this.initSparkles();
    this.loadUnicornImage();
    for (let i = 0; i < 8; i++) {
      this.spawnCollectible();
    }
  }

  private loadUnicornImage(): void {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.src = "/unicorn.svg";
    this.unicornImage = img;
  }

  private initClouds(): void {
    const width = this.canvas?.width ?? 800;
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * width,
        y: 40 + Math.random() * 120,
        width: 120 + Math.random() * 100,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.6 + Math.random() * 0.4,
      });
    }
  }

  private initSparkles(): void {
    const width = this.canvas?.width ?? 800;
    const height = this.canvas?.height ?? 600;
    for (let i = 0; i < 40; i++) {
      this.sparkles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        opacity: Math.random(),
        speed: 0.008 + Math.random() * 0.015,
      });
    }
  }

  private spawnCollectible(): void {
    const width = this.canvas?.width ?? 800;
    const types: CollectibleType[] = [
      "star",
      "star",
      "star",
      "heart",
      "heart",
      "crystal",
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const colorList = COLLECTIBLE_COLORS[type];
    this.collectibles.push({
      x: 50 + Math.random() * (width - 100),
      y: -30 - Math.random() * 200,
      size: 18 + Math.random() * 14,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      speed: 0.4 + Math.random() * 0.6,
      type,
      color: colorList[Math.floor(Math.random() * colorList.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.04 + Math.random() * 0.03,
      collected: false,
      collectAnim: 0,
    });
  }

  handleMouseMove(x: number, y: number): void {
    this.unicorn.targetX = x;
    this.unicorn.targetY = y;
  }

  handleClick(x: number, y: number): void {
    this.unicorn.targetX = x;
    this.unicorn.targetY = y;
    for (let i = 0; i < 6; i++) {
      this.spawnParticle(x, y, "#FFD700");
    }
  }

  start(): void {
    if (this.animationFrameId !== null) return; // already running
    this.state.running = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.state.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.state.running) return;
    // Normalize elapsed time to ~1 frame unit (16.67ms = 60fps target).
    // Clamp to 3 to prevent a "spiral of death" after tab suspension/large gaps.
    const elapsed = timestamp - this.lastTimestamp;
    const dt = Math.min(Math.max(elapsed / 16.67, 0), 3);
    this.lastTimestamp = timestamp;
    this.update(dt);
    this.render();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    this.updateUnicorn(dt);
    this.updateCollectibles(dt);
    this.updateParticles(dt);
    this.updateClouds(dt);
    this.updateSparkles(dt);
    this.updateFloatingTexts(dt);
    this.updateRainbow(dt);
    this.updateCombo(dt);
    this.checkCollisions();
    const activeCount = this.collectibles.filter((c) => !c.collected).length;
    if (activeCount < 8) {
      this.spawnCollectible();
    }
  }

  private updateUnicorn(dt: number): void {
    const lerpSpeed = 0.1 * dt;
    const dx = this.unicorn.targetX - this.unicorn.x;
    const dy = this.unicorn.targetY - this.unicorn.y;
    this.unicorn.x += dx * lerpSpeed;
    this.unicorn.y += dy * lerpSpeed;
    // Gentle tilt toward movement direction
    const targetRotation = Math.sign(dx) * 0.05;
    this.unicorn.rotation +=
      (targetRotation - this.unicorn.rotation) * 0.1 * dt;
  }

  private updateCollectibles(dt: number): void {
    const height = this.canvas?.height ?? 600;
    const width = this.canvas?.width ?? 800;
    for (const c of this.collectibles) {
      if (c.collected) {
        c.collectAnim += 0.08 * dt;
        continue;
      }
      c.y += c.speed * dt;
      c.rotation += c.rotSpeed * dt;
      c.pulse += c.pulseSpeed * dt;
      if (c.y > height + 60) {
        c.y = -30 - Math.random() * 100;
        c.x = 50 + Math.random() * (width - 100);
      }
    }
    this.collectibles = this.collectibles.filter(
      (c) => !c.collected || c.collectAnim < 1,
    );
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.08 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private updateClouds(dt: number): void {
    const width = this.canvas?.width ?? 800;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > width + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = 40 + Math.random() * 120;
      }
    }
  }

  private updateSparkles(dt: number): void {
    const width = this.canvas?.width ?? 800;
    const height = this.canvas?.height ?? 600;
    for (const s of this.sparkles) {
      s.opacity += s.speed * dt;
      if (s.opacity > 1) {
        s.opacity = 0;
        s.x = Math.random() * width;
        s.y = Math.random() * height;
      }
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life > 0);
  }

  private updateRainbow(dt: number): void {
    if (this.rainbowGrowing) {
      this.rainbowOpacity += 0.015 * dt;
      if (this.rainbowOpacity >= 0.7) {
        this.rainbowOpacity = 0.7;
        this.rainbowGrowing = false;
      }
    } else if (this.rainbowOpacity > 0) {
      this.rainbowOpacity -= 0.003 * dt;
      if (this.rainbowOpacity < 0) {
        this.rainbowOpacity = 0;
      }
    }
  }

  private updateCombo(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboTimer = 0;
      }
    }
  }

  private checkCollisions(): void {
    const unicornRadius = 32;
    for (const c of this.collectibles) {
      if (c.collected) continue;
      const dx = this.unicorn.x - c.x;
      const dy = this.unicorn.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < unicornRadius + c.size * 0.9) {
        this.collectItem(c);
      }
    }
  }

  private collectItem(c: Collectible): void {
    c.collected = true;
    this.comboCount++;
    // ~3 seconds at 60 fps — reset combo if nothing is collected in that window
    this.comboTimer = 180;
    const baseScore =
      c.type === "star" ? 10 : c.type === "heart" ? 25 : 50;
    const comboMult = Math.min(this.comboCount, 5);
    const points = baseScore * comboMult;
    this.state.score += points;
    this.totalCollected++;

    // Burst particles in a ring
    const colorList = PARTICLE_COLORS[c.type];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.spawnParticle(
        c.x,
        c.y,
        colorList[Math.floor(Math.random() * colorList.length)],
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      );
    }

    // Floating score text
    const comboText =
      comboMult > 1 ? `${comboMult}x COMBO! +${points}` : `+${points}`;
    this.floatingTexts.push({
      x: c.x,
      y: c.y - c.size,
      text: comboText,
      color: COLLECTIBLE_COLORS[c.type][0],
      life: 60,
      maxLife: 60,
      vy: -1.2,
    });

    // Trigger rainbow every 10 collections
    if (this.totalCollected % 10 === 0) {
      this.rainbowGrowing = true;
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    color: string,
    vx?: number,
    vy?: number,
  ): void {
    this.particles.push({
      x,
      y,
      vx: vx ?? (Math.random() - 0.5) * 4,
      vy: vy ?? (Math.random() - 0.5) * 4,
      color,
      life: 25 + Math.random() * 20,
      maxLife: 45,
      size: 2 + Math.random() * 4,
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;
    const { width, height } = canvas;

    // Sky gradient background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, "#7EC8E3");
    skyGrad.addColorStop(0.6, "#C9E8F5");
    skyGrad.addColorStop(1, "#E8F5FF");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    this.drawRainbow(ctx, canvas);
    this.drawSparkles(ctx);
    this.drawClouds(ctx);

    for (const c of this.collectibles) {
      if (!c.collected) {
        this.drawCollectible(ctx, c);
      } else if (c.collectAnim < 1) {
        this.drawCollectedAnimation(ctx, c);
      }
    }

    this.drawParticles(ctx);
    this.drawUnicorn(ctx);
    this.drawFloatingTexts(ctx);
    this.drawUI(ctx, canvas);
  }

  private drawRainbow(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ): void {
    if (this.rainbowOpacity <= 0) return;
    const { width, height } = canvas;
    const colors = [
      "#FF6B6B",
      "#FFA07A",
      "#FFD700",
      "#90EE90",
      "#87CEEB",
      "#9370DB",
    ];
    const cx = width / 2;
    const cy = height + 80;
    const baseRadius = Math.min(width * 0.75, height * 0.9);
    ctx.save();
    for (let i = 0; i < colors.length; i++) {
      const radius = baseRadius - i * 18;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 0);
      ctx.strokeStyle = colors[i];
      ctx.globalAlpha = this.rainbowOpacity;
      ctx.lineWidth = 14;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawSparkles(ctx: CanvasRenderingContext2D): void {
    for (const s of this.sparkles) {
      ctx.globalAlpha = s.opacity * 0.7;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.clouds) {
      ctx.save();
      ctx.globalAlpha = cloud.opacity * 0.85;
      ctx.fillStyle = "#FFFFFF";
      const cx = cloud.x;
      const cy = cloud.y;
      const w = cloud.width;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.28, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.3, cy - w * 0.12, w * 0.22, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.55, cy, w * 0.18, 0, Math.PI * 2);
      ctx.arc(cx - w * 0.25, cy + w * 0.06, w * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCollectible(
    ctx: CanvasRenderingContext2D,
    c: Collectible,
  ): void {
    const scale = 1 + Math.sin(c.pulse) * 0.12;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.scale(scale, scale);
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 18;
    if (c.type === "star") {
      this.drawStar(ctx, c.size, c.color);
    } else if (c.type === "heart") {
      this.drawHeart(ctx, c.size, c.color);
    } else {
      this.drawCrystal(ctx, c.size, c.color);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawCollectedAnimation(
    ctx: CanvasRenderingContext2D,
    c: Collectible,
  ): void {
    const t = c.collectAnim;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1 + t * 0.5, 1 + t * 0.5);
    ctx.globalAlpha = 1 - t;
    if (c.type === "star") {
      this.drawStar(ctx, c.size, c.color);
    } else if (c.type === "heart") {
      this.drawHeart(ctx, c.size, c.color);
    } else {
      this.drawCrystal(ctx, c.size, c.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
  ): void {
    const spikes = 5;
    const outerR = size;
    const innerR = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      } else {
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawHeart(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
  ): void {
    // Two overlapping circles for the bumps + a triangle for the lower body
    const r = size * 0.42;
    const cx = r * 0.7;
    const maxX = cx + r;
    ctx.fillStyle = color;
    // Left bump
    ctx.beginPath();
    ctx.arc(-cx, -r * 0.1, r, 0, Math.PI * 2);
    ctx.fill();
    // Right bump
    ctx.beginPath();
    ctx.arc(cx, -r * 0.1, r, 0, Math.PI * 2);
    ctx.fill();
    // Lower body connecting to bottom point
    ctx.beginPath();
    ctx.moveTo(-maxX, -r * 0.1);
    ctx.lineTo(maxX, -r * 0.1);
    ctx.lineTo(0, size * 0.9);
    ctx.closePath();
    ctx.fill();
  }

  private drawCrystal(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
  ): void {
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, -size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.7);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.5, size * 0.7);
    ctx.lineTo(-size * 0.6, -size * 0.2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // Shine highlight
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(size * 0.25, -size * 0.1);
    ctx.lineTo(0, size * 0.1);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawUnicorn(ctx: CanvasRenderingContext2D): void {
    const { x, y, rotation } = this.unicorn;
    const size = 52;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * 0.4);
    if (
      this.unicornImage &&
      this.unicornImage.complete &&
      this.unicornImage.naturalWidth > 0
    ) {
      ctx.drawImage(this.unicornImage, -size, -size, size * 2, size * 2);
    } else {
      this.drawFallbackUnicorn(ctx, size);
    }
    ctx.restore();

    // Rainbow sparkle trail
    if (Math.random() < 0.4) {
      const trailColors = [
        "#FFD700",
        "#FF69B4",
        "#A78BFA",
        "#87CEEB",
        "#90EE90",
      ];
      const tc = trailColors[Math.floor(Math.random() * trailColors.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        color: tc,
        life: 18,
        maxLife: 18,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private drawFallbackUnicorn(
    ctx: CanvasRenderingContext2D,
    size: number,
  ): void {
    // Body
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(0, 5, size * 0.65, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#E8D5C4";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Head
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(
      size * 0.5,
      -size * 0.2,
      size * 0.3,
      size * 0.25,
      0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    // Horn
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(size * 0.65, -size * 0.3);
    ctx.lineTo(size * 0.85, -size * 0.7);
    ctx.lineTo(size * 0.75, -size * 0.25);
    ctx.closePath();
    ctx.fill();
    // Rainbow mane dots
    const maneColors = [
      "#FF69B4",
      "#FF6B6B",
      "#FFD700",
      "#90EE90",
      "#87CEEB",
      "#A78BFA",
    ];
    for (let i = 0; i < maneColors.length; i++) {
      ctx.fillStyle = maneColors[i];
      ctx.beginPath();
      ctx.arc(size * 0.2 - i * 4, -size * 0.25 + i * 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  private drawUI(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ): void {
    const { width, height } = canvas;

    // Score panel
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    this.roundRect(ctx, 20, 16, 180, 56, 14);
    ctx.fill();
    ctx.fillStyle = "#7C3AED";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("✨ SCORE", 36, 38);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#FF69B4";
    ctx.fillText(String(this.state.score), 36, 62);

    // Combo indicator
    if (this.comboCount > 1) {
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#FF4500";
      ctx.fillText(`🔥 ${this.comboCount}x COMBO!`, width - 165, 44);
    }

    // Instructions before first collection
    if (this.totalCollected === 0) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#5B21B6";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "🦄 Move your mouse to guide the unicorn!",
        width / 2,
        height - 28,
      );
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
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

  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }
}
