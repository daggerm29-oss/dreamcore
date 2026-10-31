'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { assets } from '@/lib/game/assets'
import { LANE_W, ROAD_W } from '@/lib/game/constants'
import type { Obstacle, Segment } from '@/lib/game/types'

function FenceObstacle() {
  const a = assets()
  const pickets = useMemo(() => Array.from({ length: 6 }, (_, i) => -0.95 + i * 0.38), [])
  return (
    <group>
      {pickets.map((x) => (
        <mesh key={x} geometry={a.geo.picket} material={a.mat.picket} position={[x, 0, 0]} castShadow />
      ))}
      {[0.3, 0.7].map((y) => (
        <mesh key={y} geometry={a.geo.centeredBox} material={a.mat.picket} position={[0, y, -0.03]} scale={[2.1, 0.09, 0.05]} castShadow />
      ))}
    </group>
  )
}

const SHEET_COLORS = ['#fbf8f2', '#f6d9e1', '#d8e9f5', '#fff4d6']

function BeamObstacle({ variant }: { variant: number }) {
  const a = assets()
  const sheets = useRef<THREE.Group>(null)
  const items = useMemo(() => {
    const out: { x: number; w: number; h: number; color: string }[] = []
    let x = -ROAD_W / 2 + 0.3
    let i = variant
    while (x < ROAD_W / 2 - 0.6) {
      const w = 1.2 + ((i * 37) % 5) * 0.12
      out.push({ x: x + w / 2, w, h: 0.75 + ((i * 13) % 3) * 0.1, color: SHEET_COLORS[i % SHEET_COLORS.length] })
      x += w + 0.12
      i++
    }
    return out
  }, [variant])
  useFrame(({ clock }) => {
    const g = sheets.current
    if (!g) return
    g.children.forEach((c, i) => {
      c.rotation.x = Math.sin(clock.elapsedTime * 1.7 + i) * 0.12
    })
  })
  const poleX = ROAD_W / 2 + 0.3
  return (
    <group>
      {[-poleX, poleX].map((x) => (
        <mesh key={x} geometry={a.geo.cyl} material={a.mat.post} position={[x, 1.3, 0]} scale={[0.14, 2.6, 0.14]} castShadow />
      ))}
      <mesh geometry={a.geo.cyl} material={a.mat.post} position={[0, 2.1, 0]} rotation-z={Math.PI / 2} scale={[0.03, poleX * 2, 0.03]} />
      <group ref={sheets}>
        {items.map((s, i) => (
          <group key={i} position={[s.x, 2.1, 0]}>
            <mesh position={[0, -s.h / 2, 0]} castShadow>
              <planeGeometry args={[s.w, s.h]} />
              <meshStandardMaterial color={s.color} side={THREE.DoubleSide} roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function BlockObstacle({ variant }: { variant: number }) {
  const a = assets()
  if (variant === 0) {
    return (
      <group>
        <mesh geometry={a.geo.unitBox} material={a.mat.cardboard} scale={[1.5, 0.75, 1.1]} castShadow receiveShadow />
        <mesh geometry={a.geo.unitBox} material={a.mat.tv} position={[0, 0.75, 0]} scale={[1.2, 0.95, 1.0]} castShadow />
        <mesh geometry={a.geo.plane} material={a.mat.tvScreen} position={[0, 1.23, 0.51]} scale={[0.95, 0.72, 1]} />
        <mesh geometry={a.geo.cyl} material={a.mat.metal} position={[0.25, 1.95, 0]} rotation-z={-0.5} scale={[0.02, 0.6, 0.02]} />
        <mesh geometry={a.geo.cyl} material={a.mat.metal} position={[-0.25, 1.95, 0]} rotation-z={0.5} scale={[0.02, 0.6, 0.02]} />
      </group>
    )
  }
  if (variant === 1) {
    return (
      <group>
        <mesh geometry={a.geo.unitBox} material={a.mat.cardboard} scale={[1.6, 0.8, 1.1]} castShadow receiveShadow />
        <mesh geometry={a.geo.unitBox} material={a.mat.cardboard} position={[0.1, 0.8, 0]} rotation-y={0.2} scale={[1.2, 0.7, 0.9]} castShadow />
        <mesh geometry={a.geo.unitBox} material={a.mat.cardboard} position={[-0.1, 1.5, 0.05]} rotation-y={-0.3} scale={[0.8, 0.55, 0.7]} castShadow />
      </group>
    )
  }
  return (
    <group>
      <mesh geometry={a.geo.unitBox} material={a.mat.fridge} scale={[1.1, 1.9, 0.9]} castShadow receiveShadow />
      <mesh geometry={a.geo.unitBox} material={a.mat.chrome} position={[0, 1.25, 0.46]} scale={[1.08, 0.03, 0.02]} />
      <mesh geometry={a.geo.unitBox} material={a.mat.chrome} position={[0.42, 0.7, 0.47]} scale={[0.05, 0.4, 0.04]} />
      <mesh geometry={a.geo.unitBox} material={a.mat.chrome} position={[0.42, 1.45, 0.47]} scale={[0.05, 0.25, 0.04]} />
    </group>
  )
}

function ObstacleMesh({ o }: { o: Obstacle }) {
  const x = o.kind === 'beam' ? 0 : o.lane * LANE_W
  return (
    <group position={[x, 0, -o.s]}>
      {o.kind === 'fence' && <FenceObstacle />}
      {o.kind === 'beam' && <BeamObstacle variant={o.variant} />}
      {o.kind === 'block' && <BlockObstacle variant={o.variant} />}
    </group>
  )
}

export function Obstacles({ seg }: { seg: Segment }) {
  return (
    <>
      {seg.obstacles.map((o, i) => (
        <ObstacleMesh key={i} o={o} />
      ))}
    </>
  )
}

const _m = new THREE.Matrix4()
const _zero = new THREE.Matrix4().makeScale(0, 0, 0)

export function Coins({ seg }: { seg: Segment }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const a = assets()
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    seg.coins.forEach((c, i) => {
      if (seg.collected.has(i)) {
        mesh.setMatrixAt(i, _zero)
      } else {
        const bob = Math.sin(t * 3 + c.s * 0.4) * 0.12
        const pulse = 1 + Math.sin(t * 5 + i) * 0.08
        _m.makeScale(pulse, pulse, pulse).setPosition(c.lane * LANE_W, c.y + bob, -c.s)
        mesh.setMatrixAt(i, _m)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  if (seg.coins.length === 0) return null
  return <instancedMesh ref={ref} args={[a.geo.orb, a.mat.coin, seg.coins.length]} frustumCulled={false} />
}
