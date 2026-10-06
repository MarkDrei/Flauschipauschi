// Procedural unicorn animation — pure functions, no DOM, no side effects.
//
// stepMotion() integrates a tiny bit of physics (smoothed speed, trot phase,
// damped springs for the "lagging" secondary motion). computePose() turns that
// state into per-part transforms. Both are pure so they can be unit-tested and
// reused by offline render scripts.
//
// Conventions (sprite space = the SVG's viewBox, unicorn faces +x):
// - angle: degrees, positive = clockwise (SVG/canvas convention, y points down).
//   For a leg hanging down, positive swings the hoof backwards.
//   For the tail (pointing back/left), positive lifts its tip.
// - dx/dy: translation in the parent's space (px of the viewBox).
// - scaleY: vertical scale around the part's pivot, applied to the part's own
//   artwork only (not inherited by child parts).
// - Velocities are in screen px per 60 fps frame; dt is in 60 fps frames.

export const PART_IDS = [
  "body",
  "tail",
  "leg_back_left",
  "leg_front_left",
  "leg_back_right",
  "leg_front_right",
  "head",
  "mane",
  "horn",
  "forelock",
  "eye",
  "cheek",
  "mouth",
] as const;

export type PartId = (typeof PART_IDS)[number];

export interface PartPose {
  angle: number;
  dx: number;
  dy: number;
  scaleY: number;
}

export type Pose = Record<PartId, PartPose>;

export interface MotionInput {
  /** Current velocity in screen px per frame. */
  vx: number;
  vy: number;
  /** True while the unicorn is being dragged / actively moving. */
  moving: boolean;
}

export interface MotionState {
  /** Time in frames (60 fps units). */
  time: number;
  vx: number;
  vy: number;
  moving: boolean;
  /** +1 = facing right (as drawn), -1 = facing left (mirrored). */
  facing: 1 | -1;
  /** Smoothed speed (px/frame). */
  speed: number;
  /** Trot phase in radians. */
  gait: number;
  /** Stride intensity 0..1 — fades in while moving, out after release. */
  stride: number;
  /** Spring following forward speed: drives trailing tail/mane/legs (deg). */
  trail: number;
  trailV: number;
  /** Spring following vertical speed: drives pitch and tail lift (deg). */
  lift: number;
  liftV: number;
}

export function initialMotion(): MotionState {
  return {
    time: 0,
    vx: 0,
    vy: 0,
    moving: false,
    facing: 1,
    speed: 0,
    gait: 0,
    stride: 0,
    trail: 0,
    trailV: 0,
    lift: 0,
    liftV: 0,
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Exponential approach factor that is frame-rate independent. */
const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

// Spring constants (per frame²). Damping ratio ≈ 0.6 → soft, one small overshoot.
const SPRING_K = 0.05;
const SPRING_C = 0.27;
const MAX_TRAIL = 24;
const MAX_LIFT = 16;
const FULL_STRIDE_SPEED = 9; // px/frame at which the trot is at full amplitude

function stepSpring(
  pos: number,
  vel: number,
  target: number,
  dt: number,
): [number, number] {
  // Semi-implicit Euler with sub-steps so dt up to 3 frames stays stable.
  const steps = Math.max(1, Math.ceil(dt));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    vel += (SPRING_K * (target - pos) - SPRING_C * vel) * h;
    pos += vel * h;
  }
  return [pos, vel];
}

/** Advance the motion state by dt frames. Pure: returns a new object. */
export function stepMotion(
  m: MotionState,
  input: MotionInput,
  dt: number,
): MotionState {
  const { vx, vy, moving } = input;
  const rawSpeed = Math.hypot(vx, vy);
  const speed = m.speed + (rawSpeed - m.speed) * approach(0.2, dt);

  // Face the direction of horizontal travel (with a dead zone against jitter).
  let facing = m.facing;
  if (vx > 0.6) facing = 1;
  else if (vx < -0.6) facing = -1;

  const strideTarget = moving ? clamp(speed / FULL_STRIDE_SPEED, 0, 1) : 0;
  const stride =
    m.stride + (strideTarget - m.stride) * approach(moving ? 0.15 : 0.08, dt);

  // Trot cadence follows the drag speed (capped so it never looks frantic).
  const cadence = 0.09 + 0.028 * Math.min(speed, 14);
  const gait = (m.gait + cadence * dt * Math.max(stride, 0.15)) % (Math.PI * 2);

  // Secondary motion lags behind the movement via damped springs.
  const forward = moving ? Math.abs(vx) + Math.abs(vy) * 0.35 : 0;
  const [trail, trailV] = stepSpring(
    m.trail,
    m.trailV,
    clamp(forward * 2.2, 0, MAX_TRAIL),
    dt,
  );
  const [lift, liftV] = stepSpring(
    m.lift,
    m.liftV,
    moving ? clamp(vy * 1.8, -MAX_LIFT, MAX_LIFT) : 0,
    dt,
  );

  return {
    time: m.time + dt,
    vx,
    vy,
    moving,
    facing,
    speed,
    gait,
    stride,
    trail,
    trailV,
    lift,
    liftV,
  };
}

/** Deterministic pseudo-random in [0,1) for event scheduling. */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Periodic one-shot events (blink, tail flick) with a deterministic jittered
 * interval. Returns progress 0..1 while the event runs, or -1.
 */
function eventProgress(
  time: number,
  period: number,
  duration: number,
  seed: number,
): number {
  const cycle = Math.floor(time / period);
  const start = cycle * period + hash01(cycle + seed) * (period - duration);
  const p = (time - start) / duration;
  return p >= 0 && p <= 1 ? p : -1;
}

const neutral = (): PartPose => ({ angle: 0, dx: 0, dy: 0, scaleY: 1 });

export function neutralPose(): Pose {
  const pose = {} as Pose;
  for (const id of PART_IDS) pose[id] = neutral();
  return pose;
}

/** Map motion state to per-part transforms. Pure. */
export function computePose(m: MotionState): Pose {
  const pose = neutralPose();
  const t = m.time;
  const s = m.stride;
  const g = m.gait;
  const idle = 1 - s;

  // Facing is applied by the renderer as a mirror; in sprite space the
  // vertical spring still means "moving down" → positive.
  const lift = m.lift;
  const trail = m.trail;

  // --- body: trot bounce, slight rocking, pitch with vertical motion, breathing
  pose.body.dy = -5.5 * s * Math.abs(Math.sin(g));
  pose.body.angle = lift * 0.35 + 1.6 * s * Math.sin(2 * g + 0.4);
  pose.body.scaleY = 1 + 0.018 * Math.sin(t * 0.05) * (0.4 + 0.6 * idle);

  // --- legs: diagonal-pair trot; legs trail behind the motion and lift when
  // swinging forward.
  const legSwing = 24 * s;
  const legTrail = trail * 0.6;
  const legs: [PartId, number][] = [
    ["leg_front_right", 0],
    ["leg_back_left", 0.25],
    ["leg_front_left", Math.PI],
    ["leg_back_right", Math.PI + 0.25],
  ];
  for (const [id, phase] of legs) {
    const p = g + phase;
    const isBack = id.startsWith("leg_back");
    // Back legs swing a little less and trail a little more.
    const amp = isBack ? legSwing * 0.85 : legSwing;
    pose[id].angle = legTrail * (isBack ? 1.15 : 1) + amp * Math.sin(p);
    // angle decreasing (cos(p) < 0) = leg swinging forward → lift the hoof
    pose[id].dy = -4.5 * s * Math.max(0, -Math.cos(p));
  }

  // --- tail: streams behind (lifts with forward speed, opposes vertical
  // motion), sways with the trot, gentle idle sway + occasional flick.
  const flick = eventProgress(t, 300, 36, 7);
  const flickAngle =
    flick >= 0 ? 14 * Math.sin(flick * Math.PI * 3) * (1 - flick) : 0;
  pose.tail.angle =
    trail * 0.85 +
    lift * 0.9 +
    7 * s * Math.sin(g * 2 - 0.9) +
    idle * (2.5 * Math.sin(t * 0.04) + flickAngle);

  // --- head: bob on the trot, lean into motion, pitch with vertical motion
  pose.head.angle =
    3.2 * s * Math.sin(2 * g + 1.0) +
    trail * 0.12 +
    lift * 0.25 +
    idle * 1.4 * Math.sin(t * 0.03);
  pose.head.dy = 2.5 * s * Math.sin(2 * g + 0.6);

  // --- mane: drags back, follows the head bob with a delay
  pose.mane.angle =
    trail * 0.5 +
    5 * s * Math.sin(2 * g - 0.3) +
    idle * 1.6 * Math.sin(t * 0.035 + 1.0);

  // --- forelock: blown back a little (its tip points forward, so negative)
  pose.forelock.angle =
    -trail * 0.22 + 3 * s * Math.sin(2 * g - 0.5) + idle * Math.sin(t * 0.05);

  // --- eye: blink every ~3–5 s
  const blink = eventProgress(t, 240, 10, 3);
  pose.eye.scaleY = blink >= 0 ? 1 - 0.9 * Math.sin(blink * Math.PI) : 1;

  // --- mouth: a slightly bigger grin while trotting
  pose.mouth.scaleY = 1 + 0.25 * s;

  return pose;
}
