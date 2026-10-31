'use client'

import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { assets } from '@/lib/game/assets'
import { BIOME_ROAD, ROAD_W } from '@/lib/game/constants'
import { buildDecor } from '@/lib/game/decor'
import { useGame } from '@/lib/game/store'
import { sideWidths, yawOf } from '@/lib/game/track'
import type { Segment } from '@/lib/game/types'
import { Girl } from './girl'
import { GrassField, type GrassTint } from './grass-field'
import { Instanced } from './instanced'
import { Coins, Obstacles } from './obstacles'
import { PathTells } from './path-tells'

const SLAB_DEPTH = 28

function Road({ seg }: { seg: Segment }) {
  const a = assets()
  const s0 = seg.kind === 'branch' ? ROAD_W / 2 : 0
  const s1 = seg.kind === 'junction' ? seg.length + ROAD_W / 2 : seg.length
  const len = s1 - s0
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(ROAD_W, len)
    g.rotateX(-Math.PI / 2)
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / (ROAD_W * 2)))
    return g
  }, [len])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} material={a.mat.road[BIOME_ROAD[seg.biome]]} position={[0, 0.02, -(s0 + len / 2)]} receiveShadow />
  )
}

function GroundSlab({ seg }: { seg: Segment }) {
  const a = assets()
  const { left, right } = sideWidths(seg)
  const s0 = seg.kind === 'branch' ? 0 : -0.3
  const s1 = seg.kind === 'junction' ? seg.length + 7 : seg.length + 0.3
  const materials = useMemo(() => [a.mat.rock, a.mat.rock, a.mat.grass, a.mat.rock, a.mat.rock, a.mat.rock], [a])
  const y = seg.kind === 'branch' ? -0.012 : 0
  return (
    <mesh
      geometry={a.geo.centeredBox}
      material={materials}
      position={[(right - left) / 2, y - SLAB_DEPTH / 2, -(s0 + s1) / 2]}
      scale={[left + right, SLAB_DEPTH, s1 - s0]}
      receiveShadow
    />
  )
}

function Chevrons({ seg }: { seg: Segment }) {
  const a = assets()
  const ref = useRef<THREE.Group>(null)
  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(0.7, 0.55)
    shape.lineTo(0.7, 0.2)
    shape.lineTo(0.25, -0.15)
    shape.lineTo(0.7, -0.5)
    shape.lineTo(0.7, -0.85)
    shape.lineTo(0, -0.3)
    shape.closePath()
    const g = new THREE.ShapeGeometry(shape)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  useFrame(({ clock }) => {
    if (ref.current) {
      const o = 0.35 + Math.sin(clock.elapsedTime * 3) * 0.25
      a.mat.chevron.opacity = o
    }
  })
  return (
    <group ref={ref} position={[0, 0.04, -seg.length]}>
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <mesh key={`${side}-${i}`} geometry={geo} material={a.mat.chevron} position={[side * (1.2 + i * 0.9), 0, 0]} scale={[side * -1, 1, 1]} />
        )),
      )}
    </group>
  )
}

function DecorMeshes({ seg, tint }: { seg: Segment; tint: GrassTint }) {
  const a = assets()
  const d = useMemo(() => buildDecor(seg), [seg])
  return (
    <>
      <GrassField matrices={d.grass} tint={tint} />
      <Instanced geometry={a.geo.unitBox} material={a.mat.houseBody} matrices={d.bodies.m} colors={d.bodies.c} castShadow receiveShadow />
      <Instanced geometry={a.geo.roof} material={a.mat.roof} matrices={d.roofs.m} colors={d.roofs.c} castShadow />
      <Instanced geometry={a.geo.unitBox} material={a.mat.door} matrices={d.doors} />
      <Instanced geometry={a.geo.centeredBox} material={a.mat.window} matrices={d.windows} />
      <Instanced geometry={a.geo.unitBox} material={a.mat.trim} matrices={d.trims} castShadow />
      <Instanced geometry={a.geo.picket} material={a.mat.picket} matrices={d.pickets} castShadow />
      <Instanced geometry={a.geo.centeredBox} material={a.mat.picket} matrices={d.rails} />
      <Instanced geometry={a.geo.cyl} material={a.mat.trunk} matrices={d.trunks} castShadow />
      <Instanced geometry={a.geo.ico} material={a.mat.canopy} matrices={d.canopies.m} colors={d.canopies.c} castShadow />
      <Instanced geometry={a.geo.cone} material={a.mat.conifer} matrices={d.cones} castShadow />
      <Instanced geometry={a.geo.cyl} material={a.mat.trunk} matrices={d.branches} castShadow />
      <Instanced geometry={a.geo.sphere} material={a.mat.grass} matrices={d.mounds} receiveShadow />
      <Instanced geometry={a.geo.plane} material={a.mat.panel} matrices={d.panels.m} colors={d.panels.c} />
      <Instanced geometry={a.geo.centeredBox} material={a.mat.frame} matrices={d.frames} />
      <Instanced geometry={a.geo.sphere} material={a.mat.fairy} matrices={d.fairies} />
      <Instanced geometry={a.geo.cyl} material={a.mat.post} matrices={d.posts} castShadow />
      <Instanced geometry={a.geo.plane} material={a.mat.sign} matrices={d.signs} />
    </>
  )
}

export const SegmentView = memo(function SegmentView({ seg }: { seg: Segment }) {
  const pathTell = useGame((s) => s.unlocked.path)
  const showTells = seg.kind === 'branch' && pathTell
  const tint: GrassTint = showTells ? (seg.alive ? 'alive' : 'dead') : 'normal'
  return (
    <group position={[seg.ox, 0, seg.oz]} rotation-y={yawOf(seg.dir)}>
      <Road seg={seg} />
      <GroundSlab seg={seg} />
      <DecorMeshes seg={seg} tint={tint} />
      <Obstacles seg={seg} />
      <Coins seg={seg} />
      {seg.kind === 'junction' && (
        <>
          <Girl seg={seg} />
          <Chevrons seg={seg} />
        </>
      )}
      {showTells && <PathTells seg={seg} />}
    </group>
  )
})
