'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { globalUniforms } from '@/lib/game/assets'
import { audio } from '@/lib/game/audio'
import { player, step } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import { upcomingWeatherIndex, updateWeather, weather } from '@/lib/game/weather'
import { Effects } from './effects'
import { Runner, visual } from './runner'
import { SegmentView } from './segment-view'
import { SkySystem } from './sky-system'

function GameLoop() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    step(dt)
    if (updateWeather(dt)) useGame.setState({ weatherIndex: upcomingWeatherIndex() })
    globalUniforms.uTime.value += dt
    const st = useGame.getState()
    audio.update(dt, {
      playing: st.phase === 'playing' && !player.dying,
      junctionDist: player.junctionDist,
      lying: player.upcomingLying,
      lullabyTell: st.unlocked.lullaby,
      glitch: player.glitch,
      rain: weather.current.rain,
    })
  })
  return null
}

const camTarget = new THREE.Vector3()
const lookTarget = new THREE.Vector3()
const lookCurrent = new THREE.Vector3()

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const yaw = useRef(0)
  const init = useRef(false)
  useFrame(({ clock }, dt) => {
    const phase = useGame.getState().phase
    let d = visual.yaw - yaw.current
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    yaw.current += d * Math.min(1, dt * 6)
    const fx = -Math.sin(yaw.current)
    const fz = -Math.cos(yaw.current)
    const frozen = player.dying && player.deathKind !== 'crash' && player.deathT > 0.25

    if (phase === 'title') {
      const t = clock.elapsedTime * 0.12
      const side = Math.sin(t) * 2.5
      camTarget.set(player.wx - fx * 5.2 + fz * side, 2.1, player.wz - fz * 5.2 - fx * side)
      lookTarget.set(player.wx + fx * 18, 1.6, player.wz + fz * 18)
    } else if (!frozen) {
      const back = 6.2
      camTarget.set(player.wx - fx * back, 3.1 + player.y * 0.45, player.wz - fz * back)
      lookTarget.set(player.wx + fx * 10, 1.2 + player.y * 0.3, player.wz + fz * 10)
    } else {
      lookTarget.set(player.wx, player.y + 1, player.wz)
    }
    if (!init.current) {
      camera.position.copy(camTarget)
      lookCurrent.copy(lookTarget)
      init.current = true
    }
    const k = Math.min(1, dt * (phase === 'title' ? 2 : 9))
    if (!frozen) camera.position.lerp(camTarget, k)
    lookCurrent.lerp(lookTarget, Math.min(1, dt * 10))
    camera.lookAt(lookCurrent)
    const fov = phase === 'playing' ? 60 + (player.speed - 12) * 0.7 : 52
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 2)
    camera.updateProjectionMatrix()
  })
  return null
}

function World() {
  const segments = useGame((s) => s.segments)
  return (
    <>
      {segments.map((seg) => (
        <SegmentView key={seg.id} seg={seg} />
      ))}
    </>
  )
}

export function Scene() {
  return (
    <>
      <GameLoop />
      <CameraRig />
      <SkySystem />
      <World />
      <Runner />
      <Effects />
    </>
  )
}
