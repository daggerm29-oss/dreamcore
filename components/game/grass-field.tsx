'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { assets, globalUniforms } from '@/lib/game/assets'
import { Instanced } from './instanced'

export type GrassTint = 'normal' | 'alive' | 'dead'

const TINTS: Record<GrassTint, [string, string]> = {
  normal: ['#1f4a0c', '#9ccc4a'],
  alive: ['#245a10', '#c6f06a'],
  dead: ['#3d3a36', '#a49c8c'],
}

const vertex = /* glsl */ `
uniform float uTime;
varying float vH;
varying float vShade;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec3 pos = position;
  float h = uv.y;
  pos.x *= (1.0 - h * 0.85);
  vec4 wp = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  float w = sin(uTime * 1.6 + wp.x * 0.32 + wp.z * 0.21) * 0.55 + sin(uTime * 3.3 + wp.x * 1.4 + wp.z) * 0.18;
  wp.x += w * h * h * 0.32;
  wp.z += w * h * h * 0.18;
  vH = h;
  vShade = 0.85 + 0.3 * fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const fragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uTip;
uniform float uLight;
uniform float uGlitch;
varying float vH;
varying float vShade;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec3 c = mix(uBase, uTip, smoothstep(0.0, 1.0, vH)) * vShade * (0.55 + 0.45 * uLight);
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(c, vec3(lum) * vec3(0.95, 0.85, 1.05), uGlitch * 0.75);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

export function GrassField({ matrices, tint }: { matrices: THREE.Matrix4[]; tint: GrassTint }) {
  const material = useMemo(() => {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uBase: { value: new THREE.Color() }, uTip: { value: new THREE.Color() } },
    ])
    uniforms.uTime = globalUniforms.uTime
    uniforms.uLight = globalUniforms.uLight
    uniforms.uGlitch = globalUniforms.uGlitch
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide,
      fog: true,
    })
  }, [])

  useEffect(() => {
    material.uniforms.uBase.value.set(TINTS[tint][0])
    material.uniforms.uTip.value.set(TINTS[tint][1])
  }, [material, tint])

  useEffect(() => () => material.dispose(), [material])

  return <Instanced geometry={assets().geo.grassBlade} material={material} matrices={matrices} />
}
