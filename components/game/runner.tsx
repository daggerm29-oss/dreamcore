'use client'

import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { audio } from '@/lib/game/audio'
import { player } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'

const RUNNER_GLB = '/models/runner.glb'

const assetExists = (url: string) =>
  fetch(url, { method: 'HEAD' })
    .then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
    .catch(() => false)

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export const visual = { yaw: 0 }

function useRunnerRoot() {
  const root = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = root.current
    if (!g) return
    visual.yaw = lerpAngle(visual.yaw, player.yaw, Math.min(1, dt * 9))
    g.position.set(player.wx, player.y, player.wz)
    g.rotation.y = visual.yaw
  })
  return root
}

type Limb = React.RefObject<THREE.Group | null>

function ProceduralRunner() {
  const root = useRunnerRoot()
  const body = useRef<THREE.Group>(null)
  const thighL = useRef<THREE.Group>(null)
  const thighR = useRef<THREE.Group>(null)
  const shinL = useRef<THREE.Group>(null)
  const shinR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const foreL = useRef<THREE.Group>(null)
  const foreR = useRef<THREE.Group>(null)
  const lastStep = useRef(0)

  const mats = useMemo(
    () => ({
      shirt: new THREE.MeshStandardMaterial({ color: '#e4d3b4', roughness: 0.9 }),
      jeans: new THREE.MeshStandardMaterial({ color: '#3d5378', roughness: 0.85 }),
      skin: new THREE.MeshStandardMaterial({ color: '#e8bf9d', roughness: 0.7 }),
      hair: new THREE.MeshStandardMaterial({ color: '#3b281c', roughness: 0.8 }),
      shoe: new THREE.MeshStandardMaterial({ color: '#f1eee8', roughness: 0.6 }),
      sole: new THREE.MeshStandardMaterial({ color: '#8b3a2e', roughness: 0.8 }),
    }),
    [],
  )

  useFrame((_, dt) => {
    const phase = useGame.getState().phase
    const running = phase === 'playing' && !player.dying
    const ph = player.phase
    const air = player.y > 0.05
    const slide = player.sliding > 0
    const k = Math.min(1, dt * 14)
    const set = (ref: Limb, x: number) => {
      if (ref.current) ref.current.rotation.x += (x - ref.current.rotation.x) * k
    }
    const swing = Math.sin(ph)
    if (!running) {
      const idle = phase === 'title' ? Math.sin(performance.now() * 0.002) * 0.04 : 0
      set(thighL, 0); set(thighR, 0); set(shinL, 0); set(shinR, 0)
      set(armL, idle); set(armR, -idle); set(foreL, 0.2); set(foreR, 0.2)
      if (body.current) {
        const deadLean = player.dying && player.deathKind === 'crash' ? -1.4 : 0
        body.current.rotation.x += (deadLean - body.current.rotation.x) * Math.min(1, dt * 6)
        body.current.position.y += ((player.dying && player.deathKind === 'crash' ? -0.6 : 0) - body.current.position.y) * Math.min(1, dt * 6)
      }
      return
    }
    if (slide) {
      set(thighL, 1.5); set(thighR, 1.2); set(shinL, -0.4); set(shinR, -1.0)
      set(armL, -0.9); set(armR, -0.9); set(foreL, 0.3); set(foreR, 0.3)
    } else if (air) {
      set(thighL, 1.1); set(thighR, -0.3); set(shinL, -1.4); set(shinR, -0.8)
      set(armL, 2.6); set(armR, -0.8); set(foreL, 0.4); set(foreR, 1.2)
    } else {
      set(thighL, swing * 0.95); set(thighR, -swing * 0.95)
      set(shinL, -Math.max(0, -Math.sin(ph - 0.6)) * 1.7 - 0.15)
      set(shinR, -Math.max(0, Math.sin(ph - 0.6)) * 1.7 - 0.15)
      set(armL, -swing * 0.9); set(armR, swing * 0.9)
      set(foreL, 1.3); set(foreR, 1.3)
      const stepIdx = Math.floor(ph / Math.PI)
      if (stepIdx !== lastStep.current) {
        lastStep.current = stepIdx
        audio.footstep()
      }
    }
    if (body.current) {
      const targetX = slide ? -1.05 : 0.18
      const targetY = slide ? -0.55 : air ? 0 : Math.abs(Math.cos(ph)) * 0.07
      body.current.rotation.x += (targetX - body.current.rotation.x) * k
      body.current.position.y += (targetY - body.current.position.y) * k
    }
  })

  const leg = (side: number, thigh: Limb, shin: Limb) => (
    <group ref={thigh} position={[side * 0.1, 0.95, 0]}>
      <mesh material={mats.jeans} position={[0, -0.22, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.32, 4, 10]} />
      </mesh>
      <group ref={shin} position={[0, -0.46, 0]}>
        <mesh material={mats.jeans} position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.062, 0.3, 4, 10]} />
        </mesh>
        <mesh material={mats.shoe} position={[0, -0.43, -0.05]} castShadow>
          <boxGeometry args={[0.11, 0.08, 0.26]} />
        </mesh>
        <mesh material={mats.sole} position={[0, -0.475, -0.05]}>
          <boxGeometry args={[0.115, 0.025, 0.27]} />
        </mesh>
      </group>
    </group>
  )

  const arm = (side: number, upper: Limb, fore: Limb) => (
    <group ref={upper} position={[side * 0.235, 1.43, 0]}>
      <mesh material={mats.shirt} position={[0, -0.13, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.18, 4, 10]} />
      </mesh>
      <group ref={fore} position={[0, -0.3, 0]}>
        <mesh material={mats.skin} position={[0, -0.13, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.2, 4, 10]} />
        </mesh>
        <mesh material={mats.skin} position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.05, 10, 8]} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh material={mats.shirt} position={[0, 1.22, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.36, 6, 14]} />
        </mesh>
        <mesh material={mats.jeans} position={[0, 0.96, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.08, 4, 12]} />
        </mesh>
        <mesh material={mats.skin} position={[0, 1.55, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.1, 8]} />
        </mesh>
        <group position={[0, 1.72, 0]}>
          <mesh material={mats.skin} castShadow>
            <sphereGeometry args={[0.12, 20, 16]} />
          </mesh>
          <mesh material={mats.hair} position={[0, 0.035, 0.015]} scale={[1.1, 1.0, 1.12]}>
            <sphereGeometry args={[0.12, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          <mesh material={mats.hair} position={[0, -0.02, 0.07]}>
            <boxGeometry args={[0.2, 0.14, 0.08]} />
          </mesh>
        </group>
        {leg(-1, thighL, shinL)}
        {leg(1, thighR, shinR)}
        {arm(-1, armL, foreL)}
        {arm(1, armR, foreR)}
      </group>
    </group>
  )
}

function GlbRunner() {
  const root = useRunnerRoot()
  const { scene, animations } = useGLTF(RUNNER_GLB)
  const model = useMemo(() => {
    const m = cloneSkinned(scene)
    const box = new THREE.Box3().setFromObject(m)
    const h = box.max.y - box.min.y || 1
    m.scale.setScalar(1.75 / h)
    m.position.y = -box.min.y * (1.75 / h)
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true
    })
    return m
  }, [scene])
  const { actions, names } = useAnimations(animations, model)
  const current = useRef<string | null>(null)
  const find = (re: RegExp) => names.find((n) => re.test(n)) ?? null
  const clips = useMemo(
    () => ({ run: find(/run/i) ?? names[0] ?? null, jump: find(/jump/i), slide: find(/slide|roll|crouch/i), idle: find(/idle/i) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [names],
  )
  useEffect(() => {
    const first = clips.idle ?? clips.run
    if (first) {
      actions[first]?.reset().fadeIn(0.2).play()
      current.current = first
    }
  }, [actions, clips])
  useFrame(() => {
    const phase = useGame.getState().phase
    const want =
      phase !== 'playing' ? clips.idle ?? clips.run
      : player.sliding > 0 && clips.slide ? clips.slide
      : player.y > 0.05 && clips.jump ? clips.jump
      : clips.run
    if (want && want !== current.current) {
      if (current.current) actions[current.current]?.fadeOut(0.15)
      actions[want]?.reset().fadeIn(0.15).play()
      current.current = want
    }
  })
  return (
    <group ref={root}>
      <primitive object={model} rotation-y={Math.PI} />
    </group>
  )
}

export function Runner() {
  const { data: hasGlb } = useSWR(RUNNER_GLB, assetExists, { revalidateOnFocus: false })
  if (!hasGlb) return <ProceduralRunner />
  return (
    <Suspense fallback={<ProceduralRunner />}>
      <GlbRunner />
    </Suspense>
  )
}
