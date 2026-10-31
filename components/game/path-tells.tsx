'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { assets } from '@/lib/game/assets'
import { mulberry32, range } from '@/lib/game/rng'
import type { Segment } from '@/lib/game/types'

const PETAL_COUNT = 140
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

function Petals({ seed, nearX }: { seed: number; nearX: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const data = useMemo(() => {
    const r = mulberry32(seed)
    return Array.from({ length: PETAL_COUNT }, () => ({
      x: range(r, -9, 9) + nearX * 0.3,
      y: range(r, 0.5, 7),
      s: range(r, 4, 46),
      sp: range(r, 0.4, 1.2),
      ph: r() * Math.PI * 2,
      size: range(r, 0.07, 0.14),
    }))
  }, [seed, nearX])
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 0.7), [])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.7, 1.05, 1.25),
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  )
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    data.forEach((p, i) => {
      const y = ((p.y - t * p.sp * 0.5) % 7 + 7) % 7 + 0.3
      _p.set(p.x + Math.sin(t * p.sp + p.ph) * 1.2, y, -(p.s + Math.cos(t * 0.6 + p.ph) * 1.5))
      _e.set(t * p.sp * 2 + p.ph, t * p.sp + p.ph, 0)
      _q.setFromEuler(_e)
      _s.setScalar(p.size)
      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, PETAL_COUNT]} frustumCulled={false} />
}

function Birds({ seed }: { seed: number }) {
  const group = useRef<THREE.Group>(null)
  const birds = useMemo(() => {
    const r = mulberry32(seed + 7)
    return Array.from({ length: 5 }, () => ({ rad: range(r, 4, 9), h: range(r, 11, 17), sp: range(r, 0.4, 0.7), ph: r() * 6.28 }))
  }, [seed])
  const wingGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.7, 0, -0.15, 0, 0, -0.3], 3))
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2c2a33', side: THREE.DoubleSide }), [])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const t = clock.elapsedTime
    g.children.forEach((b, i) => {
      const d = birds[i]
      const a = t * d.sp + d.ph
      b.position.set(Math.cos(a) * d.rad, d.h + Math.sin(t * 1.3 + d.ph) * 0.6, -26 + Math.sin(a) * d.rad)
      b.rotation.y = -a
      const flap = Math.sin(t * 9 + d.ph) * 0.6
      b.children[0].rotation.z = flap
      b.children[1].rotation.z = -flap
    })
  })
  return (
    <group ref={group}>
      {birds.map((_, i) => (
        <group key={i}>
          <mesh geometry={wingGeo} material={mat} />
          <mesh geometry={wingGeo} material={mat} scale={[-1, 1, 1]} />
        </group>
      ))}
    </group>
  )
}

function Faceless({ x }: { x: number }) {
  const a = assets()
  return (
    <group position={[x, 0, -18]}>
      <mesh material={a.mat.figure} position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.22, 1.3, 4, 10]} />
      </mesh>
      <mesh material={a.mat.figure} position={[0, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
      </mesh>
    </group>
  )
}

function DeadTree({ x }: { x: number }) {
  const a = assets()
  return (
    <group position={[x, 0, -32]}>
      <mesh geometry={a.geo.taperCyl} material={a.mat.deadWood} position={[0, 1.6, 0]} scale={[0.4, 3.2, 0.4]} castShadow />
      {[0.6, -0.7, 1.2].map((rz, i) => (
        <mesh key={i} geometry={a.geo.cyl} material={a.mat.deadWood} position={[rz * 0.5, 2.6 + i * 0.3, 0]} rotation-z={rz} scale={[0.08, 1.6, 0.08]} castShadow />
      ))}
    </group>
  )
}

export function PathTells({ seg }: { seg: Segment }) {
  const nearX = seg.side === 'left' ? -1 : 1
  if (seg.alive) {
    return (
      <>
        <Petals seed={seg.seed} nearX={nearX} />
        <Birds seed={seg.seed} />
      </>
    )
  }
  return (
    <>
      <Faceless x={nearX * 6.5} />
      <DeadTree x={-nearX * 7} />
    </>
  )
}
