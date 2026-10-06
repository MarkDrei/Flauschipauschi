// Splits the layered unicorn SVG into per-part layers and computes the 2D
// transform of every layer for a given pose. DOM-agnostic: works with the
// browser's DOMParser as well as jsdom (used by offline render scripts).
//
// Rules:
// - Every <g id="..."> is a part; nesting defines the hierarchy (a child moves
//   with its parent). `data-pivot="x y"` is the part's joint.
// - The non-part content of a group is cut into "layers" at each child part so
//   the original paint order is kept exactly (e.g. head: mane, head shape,
//   horn, forelock, eye, ...).

import type { Pose, PartPose } from "./unicornPose";

/** Affine matrix [a, b, c, d, e, f] (canvas / SVG `matrix()` order). */
export type Mat = [number, number, number, number, number, number];

export interface RigLayer {
  part: string;
  /** Serialized SVG markup of this layer's elements. */
  markup: string;
}

export interface Rig {
  viewBox: [number, number, number, number];
  defs: string;
  layers: RigLayer[];
  parent: Record<string, string | null>;
  pivot: Record<string, [number, number]>;
}

interface ElementLike {
  tagName: string;
  children: ArrayLike<ElementLike> & Iterable<ElementLike>;
  getAttribute(name: string): string | null;
  outerHTML: string;
}

export function buildRig(svg: ElementLike): Rig {
  const vb = (svg.getAttribute("viewBox") ?? "0 0 520 350")
    .trim()
    .split(/[\s,]+/)
    .map(Number) as [number, number, number, number];
  const rig: Rig = { viewBox: vb, defs: "", layers: [], parent: {}, pivot: {} };

  const isPart = (el: ElementLike) =>
    el.tagName.toLowerCase() === "g" && !!el.getAttribute("id");

  const walk = (el: ElementLike, part: string) => {
    let run: string[] = [];
    const flush = () => {
      if (run.length) rig.layers.push({ part, markup: run.join("") });
      run = [];
    };
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "defs") {
        rig.defs += child.outerHTML;
      } else if (isPart(child)) {
        flush();
        const id = child.getAttribute("id") as string;
        rig.parent[id] = part === "" ? null : part;
        const pv = child.getAttribute("data-pivot");
        const [px, py] = pv ? pv.trim().split(/[\s,]+/).map(Number) : [0, 0];
        rig.pivot[id] = [px, py];
        walk(child, id);
      } else {
        run.push(child.outerHTML);
      }
    }
    flush();
  };
  walk(svg, "");
  return rig;
}

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function multiply(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** translate(dx,dy) · rotate(angle about pivot) */
function localMatrix(p: PartPose, [px, py]: [number, number]): Mat {
  const r = (p.angle * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // T(px+dx, py+dy) · R · T(-px, -py)
  return [c, s, -s, c, px + p.dx - c * px + s * py, py + p.dy - s * px - c * py];
}

function scaleYAbout(sy: number, [, py]: [number, number]): Mat {
  return [1, 0, 0, sy, 0, py - sy * py];
}

/**
 * World matrix (sprite space) for every layer, in paint order.
 * Parts missing from the pose stay at rest.
 */
export function layerMatrices(rig: Rig, pose: Partial<Pose>): Mat[] {
  const world: Record<string, Mat> = {};
  const partWorld = (id: string): Mat => {
    if (id === "") return IDENTITY;
    if (world[id]) return world[id];
    const p = (pose as Record<string, PartPose | undefined>)[id];
    const parent = partWorld(rig.parent[id] ?? "");
    world[id] = p ? multiply(parent, localMatrix(p, rig.pivot[id])) : parent;
    return world[id];
  };
  return rig.layers.map((layer) => {
    const m = partWorld(layer.part);
    const p = (pose as Record<string, PartPose | undefined>)[layer.part];
    return p && p.scaleY !== 1
      ? multiply(m, scaleYAbout(p.scaleY, rig.pivot[layer.part]))
      : m;
  });
}

/** Standalone SVG document for one layer (same viewBox as the source). */
export function layerSvg(rig: Rig, layer: RigLayer, width: number): string {
  const [x, y, w, h] = rig.viewBox;
  const height = Math.round((width * h) / w);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" ` +
    `width="${width}" height="${height}">${rig.defs}${layer.markup}</svg>`
  );
}

/** Whole posed unicorn as one flat SVG fragment (used for offline renders). */
export function posedSvgFragment(rig: Rig, pose: Partial<Pose>): string {
  const mats = layerMatrices(rig, pose);
  return rig.layers
    .map(
      (l, i) =>
        `<g transform="matrix(${mats[i].map((v) => +v.toFixed(5)).join(" ")})">${l.markup}</g>`,
    )
    .join("");
}
