import {
  BIOME_WIDTHS,
  BRANCH_LEN,
  JUNCTION_LEN,
  NARROW_W,
  STRAIGHT_LEN,
} from './constants'
import { mulberry32, pick, type Rng } from './rng'
import type { Biome, Dir, Segment, SegmentKind, Side } from './types'

export const DIRS: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

export const fwdOf = (d: Dir) => DIRS[d]
export const rightOf = (d: Dir) => DIRS[(d + 1) % 4]
export const yawOf = (d: Dir) => {
  const [fx, fz] = DIRS[d]
  return Math.atan2(-fx, -fz)
}
export const turnDir = (d: Dir, side: Side) => ((d + (side === 'right' ? 1 : 3)) % 4) as Dir

export function segEnd(seg: Segment): [number, number] {
  const [fx, fz] = fwdOf(seg.dir)
  return [seg.ox + fx * seg.length, seg.oz + fz * seg.length]
}

export function toWorld(seg: Segment, s: number, x: number): [number, number] {
  const [fx, fz] = fwdOf(seg.dir)
  const [rx, rz] = rightOf(seg.dir)
  return [seg.ox + fx * s + rx * x, seg.oz + fz * s + rz * x]
}

export function toLocal(seg: Segment, wx: number, wz: number): [number, number] {
  const [fx, fz] = fwdOf(seg.dir)
  const [rx, rz] = rightOf(seg.dir)
  const dx = wx - seg.ox
  const dz = wz - seg.oz
  return [dx * fx + dz * fz, dx * rx + dz * rz]
}

export function sideWidths(seg: Segment) {
  const base = BIOME_WIDTHS[seg.biome]
  let { left, right } = base
  if (seg.narrowSide === 'left') left = Math.min(left, NARROW_W)
  if (seg.narrowSide === 'right') right = Math.min(right, NARROW_W)
  return { left, right }
}

const BIOMES: Biome[] = ['hills', 'houses', 'cliff', 'fog']

interface GenContext {
  rand: Rng
  nextId: number
  biome: Biome
  junctions: number
  distanceHint: number
}

const ctx: GenContext = {
  rand: mulberry32(1),
  nextId: 1,
  biome: 'houses',
  junctions: 0,
  distanceHint: 0,
}

export function resetGenerator(seed: number) {
  ctx.rand = mulberry32(seed)
  ctx.nextId = 1
  ctx.biome = 'houses'
  ctx.junctions = 0
  ctx.distanceHint = 0
}

function makeSeg(
  kind: SegmentKind,
  biome: Biome,
  ox: number,
  oz: number,
  dir: Dir,
  length: number,
  extra: Partial<Segment> = {},
): Segment {
  return {
    id: ctx.nextId++,
    kind,
    biome,
    ox,
    oz,
    dir,
    length,
    seed: Math.floor(ctx.rand() * 1e9),
    obstacles: [],
    coins: [],
    collected: new Set(),
    ...extra,
  }
}

function coinLine(seg: Segment, s0: number, count: number, lane: number, y = 1) {
  for (let i = 0; i < count; i++) seg.coins.push({ s: s0 + i * 2.3, lane, y })
}

function genObstacles(seg: Segment, s0: number, s1: number, d: number) {
  const r = ctx.rand
  let s = s0
  const lanes = [-1, 0, 1]
  while (s < s1) {
    const roll = r()
    const free = pick(r, lanes)
    if (roll < 0.28) {
      const lane = pick(r, lanes)
      seg.obstacles.push({ s, lane, kind: 'block', variant: Math.floor(r() * 3) })
      const coinLane = lanes.filter((l) => l !== lane)[Math.floor(r() * 2)]
      coinLine(seg, s - 5, 5, coinLane)
    } else if (roll < 0.48) {
      const full = r() < 0.45 + d * 0.3
      const fenceLanes = full ? lanes : lanes.filter(() => r() < 0.6)
      if (fenceLanes.length === 0) fenceLanes.push(free)
      for (const lane of fenceLanes) seg.obstacles.push({ s, lane, kind: 'fence', variant: 0 })
      const arcLane = pick(r, fenceLanes)
      for (let i = 0; i < 5; i++) {
        const t = (i - 2) / 2
        seg.coins.push({ s: s + t * 3.2, lane: arcLane, y: 1 + (1 - t * t) * 1.6 })
      }
    } else if (roll < 0.66) {
      seg.obstacles.push({ s, lane: 9, kind: 'beam', variant: Math.floor(r() * 3) })
      coinLine(seg, s - 2.3, 3, free, 0.55)
    } else if (roll < 0.84) {
      for (const lane of lanes) {
        if (lane !== free) seg.obstacles.push({ s, lane, kind: 'block', variant: Math.floor(r() * 3) })
      }
      coinLine(seg, s - 4.6, 5, free)
    } else {
      const others = lanes.filter((l) => l !== free)
      seg.obstacles.push({ s, lane: others[0], kind: 'fence', variant: 0 })
      seg.obstacles.push({ s, lane: others[1], kind: 'block', variant: Math.floor(r() * 3) })
      coinLine(seg, s - 4.6, 5, free)
    }
    s += 22 - d * 9 + r() * 6
  }
}

function pickBiome(current: Biome): Biome {
  const options = BIOMES.filter((b) => b !== current)
  return pick(ctx.rand, options)
}

export function generateLeg(
  x: number,
  z: number,
  dir: Dir,
  distance: number,
  first: boolean,
): Segment[] {
  const r = ctx.rand
  const d = Math.min(1, distance / 3000)
  const out: Segment[] = []
  const nStraight = first ? 3 : 1 + (r() < 0.6 ? 1 : 0)
  let cx = x
  let cz = z
  for (let i = 0; i < nStraight; i++) {
    const seg = makeSeg('straight', ctx.biome, cx, cz, dir, STRAIGHT_LEN)
    genObstacles(seg, first && i === 0 ? 50 : 12, STRAIGHT_LEN - 6, d)
    out.push(seg)
    ;[cx, cz] = segEnd(seg)
  }

  const isFirstJunction = ctx.junctions === 0
  const lieChance = isFirstJunction ? 0 : 0.28 + d * 0.17
  const lying = r() < lieChance
  const correct: Side = r() < 0.5 ? 'left' : 'right'
  const pointTo: Side = lying ? (correct === 'left' ? 'right' : 'left') : correct
  const junction = makeSeg('junction', ctx.biome, cx, cz, dir, JUNCTION_LEN, {
    lying,
    correct,
    pointTo,
  })
  genObstacles(junction, 8, JUNCTION_LEN - 30, d)
  out.push(junction)
  ctx.junctions++

  const [jx, jz] = segEnd(junction)
  const nextBiome = pickBiome(ctx.biome)
  for (const side of ['left', 'right'] as Side[]) {
    const branch = makeSeg('branch', nextBiome, jx, jz, turnDir(dir, side), BRANCH_LEN, {
      side,
      parentId: junction.id,
      alive: side === correct,
      narrowSide: side === 'left' ? 'right' : 'left',
    })
    coinLine(branch, 14, 8, 0)
    out.push(branch)
  }
  ctx.biome = nextBiome
  return out
}
