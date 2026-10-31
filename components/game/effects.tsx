'use client'

import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Glitch,
  HueSaturation,
  Noise,
  Scanline,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, GlitchMode, ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { globalUniforms } from '@/lib/game/assets'
import { player } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import { weather } from '@/lib/game/weather'

interface ChromaRef {
  offset: THREE.Vector2
}
interface HueRef {
  saturation: number
  hue: number
}

export function Effects() {
  const glitch = useGame((s) => s.glitch)
  const chroma = useRef<ChromaRef>(null)
  const hue = useRef<HueRef>(null)
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), [])
  const delay = useMemo(() => new THREE.Vector2(1.2, 3.2), [])
  const duration = useMemo(() => new THREE.Vector2(0.08, 0.28), [])
  const strength = useMemo(() => new THREE.Vector2(0.04, 0.16), [])

  useFrame(() => {
    const g = globalUniforms.uGlitch.value
    const speedFx = Math.max(0, (player.speed - 14) / 12)
    const o = 0.0005 + speedFx * 0.0008 + g * 0.0035
    chroma.current?.offset.set(o, o * 0.6)
    if (hue.current) {
      hue.current.saturation = weather.current.saturation - g * 0.45
      hue.current.hue = g * 0.12
    }
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.82} luminanceSmoothing={0.25} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <HueSaturation ref={hue as never} saturation={0.1} />
      <ChromaticAberration ref={chroma as never} offset={offset} radialModulation modulationOffset={0.25} />
      <Glitch
        active={glitch}
        mode={GlitchMode.SPORADIC}
        delay={delay}
        duration={duration}
        strength={strength}
        ratio={0.85}
      />
      <Scanline density={1.6} opacity={glitch ? 0.12 : 0.035} blendFunction={BlendFunction.OVERLAY} />
      <Noise premultiply opacity={0.5} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={0.28} darkness={glitch ? 0.8 : 0.5} />
    </EffectComposer>
  )
}
