'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { pushInput, resetRun, startRun } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import type { Action } from '@/lib/game/types'
import { Scene } from './scene'
import { GameOver } from './ui/game-over'
import { Hud } from './ui/hud'
import { TitleScreen } from './ui/title-screen'
import { ToastLayer } from './ui/toast-layer'

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  Space: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
}

function useControls() {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const phase = useGame.getState().phase
      if (phase !== 'playing') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault()
          startRun()
        }
        return
      }
      const a = KEYMAP[e.code]
      if (a) {
        e.preventDefault()
        if (!e.repeat) pushInput(a)
      }
    }
    const onDown = (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const onUp = (e: PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s || useGame.getState().phase !== 'playing') return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return
      if (Math.abs(dx) > Math.abs(dy)) pushInput(dx < 0 ? 'left' : 'right')
      else pushInput(dy < 0 ? 'up' : 'down')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])
}

export default function Game() {
  useControls()
  useEffect(() => {
    if (useGame.getState().segments.length === 0) resetRun()
  }, [])
  const ready = useGame((s) => s.segments.length > 0)

  return (
    <div className="fixed inset-0 touch-none select-none overflow-hidden bg-[#cfe3f6]">
      {ready && (
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          camera={{ fov: 55, near: 0.1, far: 1800, position: [0, 3, 6] }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }}
        >
          <Scene />
        </Canvas>
      )}
      <Hud />
      <ToastLayer />
      <TitleScreen />
      <GameOver />
    </div>
  )
}
