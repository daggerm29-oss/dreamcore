'use client'

import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { player } from '@/lib/game/engine'
import { toWorld } from '@/lib/game/track'
import type { Segment } from '@/lib/game/types'

interface FigureRefs {
  arm: React.RefObject<THREE.Group | null>
  head: React.RefObject<THREE.Group | null>
}

interface FigureMats {
  dress: THREE.Material
  skin: THREE.Material
  hair: THREE.Material
  shoe: THREE.Material
  eye: THREE.Material
}

const dressProfile = [
  [0.0, 1.06], [0.11, 1.05], [0.135, 1.0], [0.13, 0.9], [0.15, 0.78],
  [0.2, 0.62], [0.27, 0.46], [0.31, 0.4], [0.29, 0.38],
].map(([x, y]) => new THREE.Vector2(x, y))

const GirlFigure = forwardRef<THREE.Group, { refs: FigureRefs; mats: FigureMats; hideFace?: boolean }>(
  function GirlFigure({ refs, mats, hideFace }, ref) {
    const dressGeo = useMemo(() => new THREE.LatheGeometry(dressProfile, 20), [])
    return (
      <group ref={ref}>
        <mesh geometry={dressGeo} material={mats.dress} />
        {[-0.07, 0.07].map((x) => (
          <group key={x}>
            <mesh material={mats.skin} position={[x, 0.2, 0]}>
              <cylinderGeometry args={[0.032, 0.028, 0.4, 8]} />
            </mesh>
            <mesh material={mats.shoe} position={[x, 0.03, 0.025]}>
              <boxGeometry args={[0.07, 0.06, 0.13]} />
            </mesh>
          </group>
        ))}
        <mesh material={mats.skin} position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.08, 8]} />
        </mesh>
        <group ref={refs.head} position={[0, 1.13, 0]}>
          <mesh material={mats.skin} position={[0, 0.11, 0]}>
            <sphereGeometry args={[0.105, 20, 16]} />
          </mesh>
          <mesh material={mats.hair} position={[0, 0.14, -0.02]} scale={[1.08, 1.05, 1.08]}>
            <sphereGeometry args={[0.105, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          </mesh>
          <mesh material={mats.hair} position={[0, -0.02, -0.07]}>
            <boxGeometry args={[0.23, 0.4, 0.06]} />
          </mesh>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} material={mats.hair} position={[x, 0.0, 0.0]}>
              <boxGeometry args={[0.04, 0.32, 0.12]} />
            </mesh>
          ))}
          {!hideFace &&
            [-0.035, 0.035].map((x) => (
              <mesh key={x} material={mats.eye} position={[x, 0.11, 0.095]}>
                <sphereGeometry args={[0.014, 8, 8]} />
              </mesh>
            ))}
        </group>
        <group ref={refs.arm} position={[0.12, 1.0, 0]}>
          <mesh material={mats.skin} position={[0, -0.19, 0]}>
            <capsuleGeometry args={[0.026, 0.32, 4, 8]} />
          </mesh>
        </group>
        <group position={[-0.12, 1.0, 0]} rotation-z={-0.08}>
          <mesh material={mats.skin} position={[0, -0.19, 0]}>
            <capsuleGeometry args={[0.026, 0.32, 4, 8]} />
          </mesh>
        </group>
      </group>
    )
  },
)

const realMats = (): FigureMats => ({
  dress: new THREE.MeshStandardMaterial({ color: '#f3ece6', roughness: 0.85, side: THREE.DoubleSide }),
  skin: new THREE.MeshStandardMaterial({ color: '#f0dbcf', roughness: 0.7 }),
  hair: new THREE.MeshStandardMaterial({ color: '#121014', roughness: 0.6 }),
  shoe: new THREE.MeshStandardMaterial({ color: '#1a1416', roughness: 0.4 }),
  eye: new THREE.MeshBasicMaterial({ color: '#050505' }),
})

const shadowMats = (): FigureMats => {
  const m = new THREE.MeshBasicMaterial({
    color: '#0b0a12',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  return { dress: m, skin: m, hair: m, shoe: m, eye: m }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export function Girl({ seg }: { seg: Segment }) {
  const pointSign = seg.pointTo === 'left' ? -1 : 1
  const truthSign = seg.correct === 'left' ? -1 : 1
  const realArm = useRef<THREE.Group>(null)
  const realHead = useRef<THREE.Group>(null)
  const shadowArm = useRef<THREE.Group>(null)
  const shadowHead = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const mats = useMemo(realMats, [])
  const sMats = useMemo(shadowMats, [])
  const raise = useRef(0)
  const local = useMemo(() => {
    const [gx, gz] = toWorld(seg, seg.length + 3, 0)
    return { gx, gz }
  }, [seg])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const dx = player.wx - local.gx
    const dz = player.wz - local.gz
    const dist = Math.hypot(dx, dz)
    const target = dist < 160 ? 1 : 0
    raise.current += (target - raise.current) * Math.min(1, dt * 2.5)
    const r = raise.current
    const angleTo = (side: number) => side * (Math.PI / 2) * r + side * 0.05
    if (realArm.current) {
      realArm.current.rotation.z = angleTo(pointSign)
      realArm.current.position.x = 0.12 * pointSign
    }
    if (shadowArm.current) {
      shadowArm.current.rotation.z = angleTo(truthSign)
      shadowArm.current.position.x = 0.12 * truthSign
    }
    if (realHead.current) {
      realHead.current.rotation.z = 0.28 + Math.sin(t * 0.7) * 0.04
      const passed = player.segId !== seg.id
      const look = passed ? Math.sin(t * 0.3) * 0.2 + pointSign * 0.9 : Math.sin(t * 0.5) * 0.08
      realHead.current.rotation.y = lerpAngle(realHead.current.rotation.y, look, Math.min(1, dt * 3))
    }
    if (shadowHead.current) shadowHead.current.rotation.z = 0.28
    if (body.current) body.current.rotation.z = Math.sin(t * 0.9) * 0.015
  })

  return (
    <group position={[0, 0, -(seg.length + 3)]}>
      <group ref={body} scale={1.15}>
        <GirlFigure refs={{ arm: realArm, head: realHead }} mats={mats} />
      </group>
      <group position={[0.05, 0.03, 0.05]} rotation-x={Math.PI / 2} rotation-z={0.25}>
        <group scale={[1.15, 1.7, 0.02]}>
          <GirlFigure refs={{ arm: shadowArm, head: shadowHead }} mats={sMats} hideFace />
        </group>
      </group>
    </group>
  )
}
