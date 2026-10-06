import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { buildRig, layerMatrices, posedSvgFragment } from "@/game/unicornRig";
import { neutralPose, PART_IDS } from "@/game/unicornPose";

const svgText = fs.readFileSync(
  path.resolve(__dirname, "../../public/unicorn.svg"),
  "utf8",
);
const rig = buildRig(
  new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement,
);

describe("unicorn rig", () => {
  it("finds every animated part with a pivot", () => {
    for (const id of PART_IDS) {
      expect(rig.pivot[id], id).toBeDefined();
      expect(rig.layers.some((l) => l.part === id), id).toBe(true);
    }
    expect(rig.viewBox).toEqual([0, 0, 520, 350]);
  });

  it("keeps the SVG's paint order and hierarchy", () => {
    const order = rig.layers.map((l) => l.part);
    expect(order.indexOf("tail")).toBeLessThan(order.indexOf("body"));
    expect(order.indexOf("leg_front_right")).toBeLessThan(order.indexOf("body"));
    expect(order.indexOf("mane")).toBeLessThan(order.indexOf("head"));
    expect(order.lastIndexOf("head")).toBeLessThan(order.indexOf("eye"));
    expect(rig.parent.head).toBe("body");
    expect(rig.parent.mane).toBe("head");
    expect(rig.parent.horn).toBe("head");
    expect(rig.parent.leg_back_left).toBe("body");
  });

  it("neutral pose = identity transforms", () => {
    for (const m of layerMatrices(rig, neutralPose())) {
      expect(m.map((v) => +v.toFixed(6))).toEqual([1, 0, 0, 1, 0, 0]);
    }
  });

  it("children inherit their parent's rotation about the parent's pivot", () => {
    const pose = neutralPose();
    pose.head.angle = 20;
    const mats = layerMatrices(rig, pose);
    const hornIdx = rig.layers.findIndex((l) => l.part === "horn");
    const headIdx = rig.layers.findIndex((l) => l.part === "head");
    expect(mats[hornIdx]).toEqual(mats[headIdx]);
    // the head pivot itself does not move
    const [px, py] = rig.pivot.head;
    const m = mats[headIdx];
    expect(m[0] * px + m[2] * py + m[4]).toBeCloseTo(px, 6);
    expect(m[1] * px + m[3] * py + m[5]).toBeCloseTo(py, 6);
  });

  it("scaleY only affects the part's own artwork", () => {
    const pose = neutralPose();
    pose.body.scaleY = 1.1;
    const mats = layerMatrices(rig, pose);
    const bodyIdx = rig.layers.findIndex((l) => l.part === "body");
    const headIdx = rig.layers.findIndex((l) => l.part === "head");
    expect(mats[bodyIdx][3]).toBeCloseTo(1.1, 6);
    expect(mats[headIdx][3]).toBeCloseTo(1, 6);
  });

  it("serialises a posed fragment", () => {
    const frag = posedSvgFragment(rig, neutralPose());
    expect(frag.match(/<g transform="matrix/g)?.length).toBe(rig.layers.length);
  });
});
