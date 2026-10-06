import { describe, it, expect } from "vitest";
import {
  computePose,
  initialMotion,
  stepMotion,
  PART_IDS,
  type MotionInput,
  type MotionState,
} from "@/game/unicornPose";

function run(
  m: MotionState,
  input: MotionInput,
  frames: number,
  dt = 1,
): MotionState {
  for (let i = 0; i < frames; i += dt) m = stepMotion(m, input, dt);
  return m;
}

/** Peak-to-peak amplitude of a part's angle over `frames` frames. */
function legRange(speed: number, frames = 120): number {
  let m = run(initialMotion(), { vx: speed, vy: 0, moving: true }, 120);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < frames; i++) {
    m = stepMotion(m, { vx: speed, vy: 0, moving: true }, 1);
    const a = computePose(m).leg_front_right.angle;
    lo = Math.min(lo, a);
    hi = Math.max(hi, a);
  }
  return hi - lo;
}

/** Where a point attached to a part ends up after rotating about its pivot. */
function rotatePoint(
  [x, y]: [number, number],
  [px, py]: [number, number],
  deg: number,
): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [px + c * (x - px) - s * (y - py), py + s * (x - px) + c * (y - py)];
}

const TAIL_PIVOT: [number, number] = [122, 178];
const TAIL_TIP: [number, number] = [40, 260];
const MANE_PIVOT: [number, number] = [350, 60];
const MANE_TIP: [number, number] = [290, 250];

describe("unicorn pose", () => {
  it("returns a transform for every part, neutral-ish at rest", () => {
    const pose = computePose(initialMotion());
    for (const id of PART_IDS) {
      expect(pose[id]).toBeDefined();
      expect(Math.abs(pose[id].angle)).toBeLessThan(3);
      expect(Math.abs(pose[id].dx)).toBeLessThan(0.01);
      expect(Math.abs(pose[id].dy)).toBeLessThan(0.01);
    }
  });

  it("is pure: stepMotion does not mutate its input", () => {
    const m = initialMotion();
    const copy = { ...m };
    stepMotion(m, { vx: 10, vy: 3, moving: true }, 1);
    expect(m).toEqual(copy);
  });

  it("swings the legs more at higher drag speed", () => {
    const slow = legRange(2);
    const fast = legRange(12);
    expect(fast).toBeGreaterThan(slow * 1.5);
    expect(fast).toBeGreaterThan(25);
  });

  it("trots faster at higher drag speed", () => {
    const gaitTravel = (v: number) => {
      let m = run(initialMotion(), { vx: v, vy: 0, moving: true }, 60);
      let travelled = 0;
      for (let i = 0; i < 60; i++) {
        const before = m.gait;
        m = stepMotion(m, { vx: v, vy: 0, moving: true }, 1);
        travelled += (m.gait - before + Math.PI * 2) % (Math.PI * 2);
      }
      return travelled;
    };
    expect(gaitTravel(12)).toBeGreaterThan(gaitTravel(3) * 1.3);
  });

  it("legs trail behind the movement (lag, not stiff)", () => {
    let m = run(initialMotion(), { vx: 12, vy: 0, moving: true }, 3);
    const early = m.trail;
    m = run(m, { vx: 12, vy: 0, moving: true }, 120);
    expect(early).toBeLessThan(m.trail * 0.5); // spring lags at first
    // averaged over a stride the legs are swept backwards (positive angle)
    let sum = 0;
    for (let i = 0; i < 120; i++) {
      m = stepMotion(m, { vx: 12, vy: 0, moving: true }, 1);
      const p = computePose(m);
      sum += p.leg_front_right.angle + p.leg_back_left.angle;
    }
    expect(sum / 240).toBeGreaterThan(5);
  });

  it("tail and mane drag behind, opposite to the velocity", () => {
    const rest = computePose(initialMotion());
    const fwd = computePose(
      run(initialMotion(), { vx: 12, vy: 0, moving: true }, 90),
    );
    // moving forward (+x in sprite space): tips move backwards (-x)
    const tailRest = rotatePoint(TAIL_TIP, TAIL_PIVOT, rest.tail.angle);
    const tailFwd = rotatePoint(TAIL_TIP, TAIL_PIVOT, fwd.tail.angle);
    expect(tailFwd[0]).toBeLessThan(tailRest[0]);
    const maneRest = rotatePoint(MANE_TIP, MANE_PIVOT, rest.mane.angle);
    const maneFwd = rotatePoint(MANE_TIP, MANE_PIVOT, fwd.mane.angle);
    expect(maneFwd[0]).toBeLessThan(maneRest[0]);

    // moving up vs down: the tail tip goes the other way
    const up = computePose(
      run(initialMotion(), { vx: 0, vy: -8, moving: true }, 90),
    );
    const down = computePose(
      run(initialMotion(), { vx: 0, vy: 8, moving: true }, 90),
    );
    const tipUp = rotatePoint(TAIL_TIP, TAIL_PIVOT, up.tail.angle);
    const tipDown = rotatePoint(TAIL_TIP, TAIL_PIVOT, down.tail.angle);
    expect(tipUp[1]).toBeGreaterThan(tipDown[1]); // moving up → tail hangs lower
  });

  it("faces the direction of travel and keeps facing after release", () => {
    let m = run(initialMotion(), { vx: -6, vy: 0, moving: true }, 10);
    expect(m.facing).toBe(-1);
    m = run(m, { vx: 0, vy: 0, moving: false }, 30);
    expect(m.facing).toBe(-1);
    m = run(m, { vx: 6, vy: 0, moving: true }, 5);
    expect(m.facing).toBe(1);
  });

  it("settles smoothly back to neutral after release", () => {
    let m = run(initialMotion(), { vx: 14, vy: -5, moving: true }, 120);
    const moving = computePose(m);
    m = stepMotion(m, { vx: 0, vy: 0, moving: false }, 1);
    const justReleased = computePose(m);
    // no snapping: one frame after release the pose is still close
    expect(
      Math.abs(justReleased.tail.angle - moving.tail.angle),
    ).toBeLessThan(6);
    m = run(m, { vx: 0, vy: 0, moving: false }, 300);
    const settled = computePose(m);
    expect(m.stride).toBeLessThan(0.01);
    expect(Math.abs(m.trail)).toBeLessThan(0.2);
    expect(Math.abs(m.lift)).toBeLessThan(0.2);
    for (const id of [
      "leg_front_left",
      "leg_front_right",
      "leg_back_left",
      "leg_back_right",
    ] as const) {
      expect(Math.abs(settled[id].angle)).toBeLessThan(0.5);
      expect(Math.abs(settled[id].dy)).toBeLessThan(0.1);
    }
    expect(Math.abs(settled.body.dy)).toBeLessThan(0.1);
  });

  it("breathes and blinks while idle", () => {
    let m = initialMotion();
    let minEye = 1;
    let minScale = 1;
    let maxScale = 1;
    for (let i = 0; i < 600; i++) {
      m = stepMotion(m, { vx: 0, vy: 0, moving: false }, 1);
      const p = computePose(m);
      minEye = Math.min(minEye, p.eye.scaleY);
      minScale = Math.min(minScale, p.body.scaleY);
      maxScale = Math.max(maxScale, p.body.scaleY);
    }
    expect(minEye).toBeLessThan(0.3);
    expect(minEye).toBeGreaterThan(0);
    expect(maxScale - minScale).toBeGreaterThan(0.01);
    expect(maxScale - minScale).toBeLessThan(0.05);
  });

  it("is roughly frame-rate independent", () => {
    const a = run(initialMotion(), { vx: 10, vy: 0, moving: true }, 60, 1);
    const b = run(initialMotion(), { vx: 10, vy: 0, moving: true }, 60, 2);
    expect(Math.abs(a.trail - b.trail)).toBeLessThan(a.trail * 0.15);
    expect(Math.abs(a.stride - b.stride)).toBeLessThan(0.05);
  });
});
