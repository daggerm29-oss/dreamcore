import * as THREE from 'three'
import { FENCE_OFFSET, ROAD_W } from './constants'
import { mulberry32, pick, range, type Rng } from './rng'
import { sideWidths } from './track'
import type { Segment } from './types'

export interface ColoredSet {
  m: THREE.Matrix4[]
  c: THREE.Color[]
}

export interface Decor {
  bodies: ColoredSet
  roofs: ColoredSet
  doors: THREE.Matrix4[]
  windows: THREE.Matrix4[]
  trims: THREE.Matrix4[]
  pickets: THREE.Matrix4[]
  rails: THREE.Matrix4[]
  trunks: THREE.Matrix4[]
  canopies: ColoredSet
  cones: THREE.Matrix4[]
  branches: THREE.Matrix4[]
  mounds: THREE.Matrix4[]
  grass: THREE.Matrix4[]
  panels: ColoredSet
  frames: THREE.Matrix4[]
  fairies: THREE.Matrix4[]
  signs: THREE.Matrix4[]
  posts: THREE.Matrix4[]
}

const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _e = new THREE.Euler()

export function mat(x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _p.set(x, y, z)
  _e.set(rx, ry, rz)
  _q.setFromEuler(_e)
  _s.set(sx, sy, sz)
  return new THREE.Matrix4().compose(_p, _q, _s)
}

const PASTEL = ['#8fb6dc', '#e2826f', '#f1cb6c', '#86c29e', '#f4f0e6', '#c8a6da', '#f2a7b8', '#9fd3d0']
const ROOFS = ['#3e4a63', '#6d3c35', '#4b4b4f', '#7b5641', '#5b3f52']
const WHITES = ['#f6f3ec', '#eeeae2', '#f3efe9', '#e9e6e0']
const BLISS_ROOFS = ['#e1a93a', '#8a4b33', '#c3743d']

function addHouse(d: Decor, r: Rng, x: number, z: number, faceLeft: boolean, body: string, roof: string) {
  const w = range(r, 6.5, 8.5)
  const dep = range(r, 6, 7.5)
  const h = range(r, 3.2, 5.6)
  const rh = range(r, 1.8, 2.8)
  const ry = faceLeft ? -Math.PI / 2 : Math.PI / 2
  const cx = x + (faceLeft ? dep / 2 : -dep / 2)
  const H = mat(cx, 0, z, ry)
  const part = (lx: number, ly: number, lz: number, sx: number, sy: number, sz: number) =>
    H.clone().multiply(mat(lx, ly, lz, 0, sx, sy, sz))
  d.bodies.m.push(part(0, 0, 0, w, h, dep))
  d.bodies.c.push(new THREE.Color(body))
  d.roofs.m.push(part(0, h, 0, w * 1.1, rh, dep * 1.16))
  d.roofs.c.push(new THREE.Color(roof))
  d.doors.push(part(r() < 0.5 ? -w * 0.18 : w * 0.18, 0, dep / 2, 1.0, 2.15, 0.1))
  const floors = h > 4.6 ? 2 : 1
  for (let f = 0; f < floors; f++) {
    const wy = floors === 1 ? h * 0.38 : 0.9 + f * 2.2
    d.windows.push(part(-w * 0.32, wy, dep / 2, 1.1, 1.2, 0.08))
    d.windows.push(part(w * 0.32, wy, dep / 2, 1.1, 1.2, 0.08))
  }
  d.windows.push(part(-dep * 0.0 + w / 2, h * 0.45, 0, 0.08, 1.1, 1.0))
  d.trims.push(part(0, h - 0.12, 0, w + 0.1, 0.22, dep + 0.1))
  d.trims.push(part(0, 0, 0, w + 0.14, 0.3, dep + 0.14))
  if (r() < 0.6) d.trims.push(part(w * 0.28, h + rh * 0.3, -dep * 0.15, 0.55, rh, 0.55))
  if (r() < 0.45) {
    d.trims.push(part(0, 0, dep / 2 + 1, w * 0.7, 0.25, 2))
    d.trims.push(part(-w * 0.32, 0, dep / 2 + 1.8, 0.16, 2.6, 0.16))
    d.trims.push(part(w * 0.32, 0, dep / 2 + 1.8, 0.16, 2.6, 0.16))
    d.trims.push(part(0, 2.55, dep / 2 + 1, w * 0.74, 0.14, 2.1))
  }
}

function fenceRun(d: Decor, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const len = Math.hypot(dx, dz)
  if (len < 0.5) return
  const ry = Math.atan2(dx, dz)
  const n = Math.floor(len / 0.4)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    d.pickets.push(mat(ax + dx * t, 0, az + dz * t, ry + Math.PI / 2))
  }
  for (const y of [0.3, 0.72]) {
    d.rails.push(mat(ax + dx / 2, y, az + dz / 2, ry, 0.04, 0.08, len))
  }
}

function roundTree(d: Decor, r: Rng, x: number, z: number, scale = 1) {
  d.trunks.push(mat(x, 1.2 * scale, z, 0, 0.35 * scale, 2.4 * scale, 0.35 * scale))
  const n = 3
  for (let i = 0; i < n; i++) {
    const s = range(r, 1.3, 2.0) * scale
    d.canopies.m.push(mat(x + range(r, -0.6, 0.6), (3.0 + i * 0.6) * scale, z + range(r, -0.6, 0.6), r() * 6, s, s * 0.9, s))
    d.canopies.c.push(new THREE.Color().setHSL(range(r, 0.22, 0.3), 0.55, range(r, 0.22, 0.32)))
  }
}

function bareTree(d: Decor, r: Rng, x: number, z: number, scale = 1) {
  const th = 2.2 * scale
  d.trunks.push(mat(x, th / 2, z, 0, 0.32 * scale, th, 0.32 * scale))
  const count = 6
  for (let i = 0; i < count; i++) {
    const ry = (i / count) * Math.PI * 2 + r() * 0.5
    const tilt = range(r, 0.35, 0.8)
    const len = range(r, 1.2, 2.2) * scale
    const base = mat(x, th * range(r, 0.75, 1), z, ry, 1, 1, 1, tilt, 0)
    base.multiply(mat(0, len / 2, 0, 0, 0.12 * scale, len, 0.12 * scale))
    d.branches.push(base)
  }
}

function conifer(d: Decor, r: Rng, x: number, z: number) {
  const s = range(r, 0.9, 1.3)
  d.trunks.push(mat(x, 0.5, z, 0, 0.3, 1, 0.3))
  d.cones.push(mat(x, 1.6 * s, z, 0, 1.5 * s, 2.4 * s, 1.5 * s))
  d.cones.push(mat(x, 2.8 * s, z, 0, 1.15 * s, 2.1 * s, 1.15 * s))
  d.cones.push(mat(x, 3.9 * s, z, 0, 0.75 * s, 1.8 * s, 0.75 * s))
}

export function buildDecor(seg: Segment): Decor {
  const r = mulberry32(seg.seed)
  const d: Decor = {
    bodies: { m: [], c: [] },
    roofs: { m: [], c: [] },
    doors: [],
    windows: [],
    trims: [],
    pickets: [],
    rails: [],
    trunks: [],
    canopies: { m: [], c: [] },
    cones: [],
    branches: [],
    mounds: [],
    grass: [],
    panels: { m: [], c: [] },
    frames: [],
    fairies: [],
    signs: [],
    posts: [],
  }
  const L = seg.length
  const { left, right } = sideWidths(seg)
  const sMin = seg.kind === 'branch' ? 16 : 0
  const sMax = seg.kind === 'junction' ? L - 16 : L
  const roadS0 = seg.kind === 'branch' ? FENCE_OFFSET : 0
  const roadS1 = seg.kind === 'junction' ? L - FENCE_OFFSET : L
  const z = (s: number) => -s

  if (seg.biome !== 'fog') {
    fenceRun(d, -FENCE_OFFSET, z(roadS0), -FENCE_OFFSET, z(roadS1))
    fenceRun(d, FENCE_OFFSET, z(roadS0), FENCE_OFFSET, z(roadS1))
  }
  if (seg.kind === 'junction') {
    fenceRun(d, -FENCE_OFFSET, z(L + FENCE_OFFSET), FENCE_OFFSET, z(L + FENCE_OFFSET))
  }

  const grassArea = (x0: number, x1: number, s0: number, s1: number, density: number) => {
    const n = Math.min(5000, Math.floor(Math.abs(x1 - x0) * Math.abs(s1 - s0) * density))
    for (let i = 0; i < n; i++) {
      const gx = range(r, x0, x1)
      const gs = range(r, s0, s1)
      const h = range(r, 0.35, 0.85)
      d.grass.push(mat(gx, 0, z(gs), r() * Math.PI, 1, h, 1, range(r, -0.15, 0.15), range(r, -0.15, 0.15)))
    }
  }
  const gs0 = seg.kind === 'branch' ? ROAD_W / 2 + 0.4 : 0
  const gs1 = seg.kind === 'junction' ? L - ROAD_W / 2 - 0.4 : L
  const edge = ROAD_W / 2 + 0.1
  grassArea(-edge, -Math.min(left - 0.4, edge + 10), gs0, gs1, 3.6)
  grassArea(edge, Math.min(right - 0.4, edge + 10), gs0, gs1, 3.6)

  const leftWide = left > 12
  const rightWide = right > 12

  if (seg.biome === 'houses') {
    for (let s = sMin + 4; s < sMax - 4; s += range(r, 9.5, 11.5)) {
      if (leftWide) addHouse(d, r, -(ROAD_W / 2 + 6), z(s), false, pick(r, PASTEL), pick(r, ROOFS))
    }
    if (leftWide && r() < 0.7) roundTree(d, r, -range(r, 22, 28), z(range(r, sMin, sMax)))
    if (rightWide) {
      for (let s = sMin + 6; s < sMax - 4; s += range(r, 14, 22)) {
        addHouse(d, r, ROAD_W / 2 + 6, z(s), true, pick(r, PASTEL), pick(r, ROOFS))
      }
    }
  } else if (seg.biome === 'hills') {
    for (const side of [-1, 1]) {
      if ((side < 0 && !leftWide) || (side > 0 && !rightWide)) continue
      const n = 3 + Math.floor(r() * 2)
      for (let i = 0; i < n; i++) {
        const rad = range(r, 11, 17)
        const sy = range(r, 0.3, 0.45)
        d.mounds.push(mat(side * range(r, 24, 32), -rad * sy * 0.28, z(range(r, sMin, Math.max(sMin + 1, sMax))), 0, rad, rad * sy, rad * 1.2))
      }
      if (r() < 0.75) {
        const hs = range(r, sMin + 6, Math.max(sMin + 7, sMax - 6))
        addHouse(d, r, side * range(r, 15, 19), z(hs), side > 0, pick(r, WHITES), pick(r, BLISS_ROOFS))
      }
      if (r() < 0.7) bareTree(d, r, side * range(r, 10, 14), z(range(r, sMin, sMax)), range(r, 0.9, 1.3))
      if (r() < 0.4) roundTree(d, r, side * range(r, 12, 20), z(range(r, sMin, sMax)))
    }
  } else if (seg.biome === 'cliff') {
    if (leftWide) {
      for (let i = 0; i < 2; i++) {
        const rad = range(r, 10, 15)
        d.mounds.push(mat(-range(r, 20, 26), -rad * 0.1, z(range(r, sMin, Math.max(sMin + 1, sMax))), 0, rad, rad * 0.38, rad * 1.3))
      }
      if (r() < 0.6) addHouse(d, r, -range(r, 12, 15), z(range(r, sMin + 8, Math.max(sMin + 9, sMax - 8))), false, pick(r, WHITES), pick(r, ROOFS))
      if (r() < 0.6) bareTree(d, r, -range(r, 9, 12), z(range(r, sMin, sMax)))
    }
    if (!rightWide && sMax - sMin > 20) {
      const s = range(r, sMin + 6, sMax - 6)
      d.posts.push(mat(ROAD_W / 2 + 1.0, 1.25, z(s), 0, 0.08, 2.5, 0.08))
      d.signs.push(mat(ROAD_W / 2 + 1.0, 2.6, z(s) + 0.06, -0.35, 1.0, 1.0, 1))
    }
  } else if (seg.biome === 'fog') {
    for (const side of [-1, 1]) {
      if ((side < 0 && !leftWide) || (side > 0 && !rightWide)) continue
      for (let s = sMin + 5; s < sMax - 5; s += range(r, 12, 15)) {
        addHouse(d, r, side * (ROAD_W / 2 + 7), z(s), side > 0, pick(r, WHITES), '#5f6168')
        if (r() < 0.8) conifer(d, r, side * (ROAD_W / 2 + range(r, 2.2, 3.4)), z(s + range(r, -3, 3)))
      }
    }
    const c0 = seg.kind === 'branch' ? 10 : 0
    const c1 = seg.kind === 'junction' ? L - 10 : L
    const cell = 2.4
    const half = 5
    for (let s = c0; s < c1; s += cell) {
      for (let ix = -half; ix < half; ix++) {
        const roll = r()
        const color =
          roll < 0.08 ? new THREE.Color(0.18, 0.18, 0.2) :
          roll < 0.35 ? new THREE.Color(1.5, 0.82, 1.0) :
          roll < 0.55 ? new THREE.Color(0.85, 1.45, 1.3) :
          new THREE.Color(1.15, 1.1, 1.05)
        d.panels.m.push(mat((ix + 0.5) * cell, 6.4, z(s + cell / 2), 0, cell * 0.88, cell * 0.88, 1, Math.PI / 2))
        d.panels.c.push(color)
      }
      d.frames.push(mat(0, 6.42, z(s), 0, cell * half * 2, 0.06, 0.08))
    }
    for (let ix = -half; ix <= half; ix++) {
      d.frames.push(mat(ix * cell, 6.42, z((c0 + c1) / 2), 0, 0.08, 0.06, c1 - c0))
    }
    const fairyCount = Math.floor((c1 - c0) * 3)
    for (let i = 0; i < fairyCount; i++) {
      d.fairies.push(mat(range(r, -half * cell, half * cell), range(r, 6.0, 6.3), z(range(r, c0, c1)), 0, 0.045, 0.045, 0.045))
    }
  }
  return d
}
