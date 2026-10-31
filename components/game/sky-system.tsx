'use client'

import { Cloud, Clouds, Sky } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { assets, cloudPuffDataUrl, globalUniforms, NOISE_GLSL } from '@/lib/game/assets'
import { currentSegment, player } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'
import { weather, WEATHERS } from '@/lib/game/weather'

class NoFogLambert extends THREE.MeshLambertMaterial {
  constructor(params?: THREE.MeshLambertMaterialParameters) {
    super(params)
    this.fog = false
  }
}

const sun = new THREE.Vector3()
const tmpColor = new THREE.Color()
const GLITCH_FOG = new THREE.Color('#8c8496')
const FOG_BIOME = new THREE.Color('#e8e4ea')

const env = { fogMix: 0, glitch: 0 }

export function SkySystem() {
  const scene = useThree((s) => s.scene)
  const skyRef = useRef<THREE.Mesh>(null)
  const dir = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)

  useEffect(() => {
    scene.fog = new THREE.Fog('#cfe3f6', 20, 300)
    return () => {
      scene.fog = null
    }
  }, [scene])

  useFrame((_, dt) => {
    const w = weather.current
    const seg = currentSegment()
    const fogTarget = seg?.biome === 'fog' ? 1 : 0
    env.fogMix += (fogTarget - env.fogMix) * Math.min(1, dt * 0.8)
    env.glitch += ((player.glitch ? 1 : 0) - env.glitch) * Math.min(1, dt * 1.5)
    globalUniforms.uGlitch.value = env.glitch

    const elevation = w.elevation
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(w.azimuth)
    sun.setFromSphericalCoords(1, phi, theta)

    const sky = skyRef.current as unknown as { material: THREE.ShaderMaterial; position: THREE.Vector3 } | null
    if (sky) {
      sky.position.set(player.wx, 0, player.wz)
      const u = sky.material.uniforms
      u.sunPosition.value.copy(sun)
      u.turbidity.value = THREE.MathUtils.lerp(w.turbidity, 20, env.glitch)
      u.rayleigh.value = THREE.MathUtils.lerp(w.rayleigh, 0.15, env.glitch)
      u.mieCoefficient.value = w.mie
      u.mieDirectionalG.value = w.mieG
    }

    const fog = scene.fog as THREE.Fog
    tmpColor.copy(w.fogColor).lerp(FOG_BIOME, env.fogMix * 0.7).lerp(GLITCH_FOG, env.glitch * 0.8)
    fog.color.copy(tmpColor)
    const far = Math.min(w.fogFar, THREE.MathUtils.lerp(400, 70, env.fogMix))
    fog.far = THREE.MathUtils.lerp(far, 130, env.glitch * 0.6)
    fog.near = Math.min(12, fog.far * 0.1)

    const flicker = env.glitch > 0.05 ? 1 - env.glitch * 0.35 * (Math.random() < 0.05 ? 1 : 0) : 1
    const light = dir.current
    if (light) {
      light.position.set(player.wx + sun.x * 90, Math.max(8, sun.y * 90), player.wz + sun.z * 90)
      light.target.position.set(player.wx, 0, player.wz)
      light.target.updateMatrixWorld()
      light.intensity = w.sunIntensity * (1 - env.fogMix * 0.4) * (1 - env.glitch * 0.45) * flicker
      light.color.copy(w.sunColor)
    }
    if (hemi.current) {
      hemi.current.intensity = w.hemiIntensity
      hemi.current.color.copy(w.hemiSky).lerp(GLITCH_FOG, env.glitch * 0.5)
    }
    globalUniforms.uLight.value = Math.min(1.2, 0.35 + w.sunIntensity * 0.3)
    assets().mat.window.emissiveIntensity = w.windowGlow + env.fogMix * 0.6
  })

  return (
    <>
      <Sky ref={skyRef as never} distance={4500} sunPosition={[0, 1, 0]} turbidity={2} rayleigh={1} />
      <hemisphereLight ref={hemi} args={['#bcd8ff', '#5b7a2e', 1]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        ref={dir}
        castShadow
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <CloudSea />
      <Suspense fallback={null}>
        <CloudTowers />
      </Suspense>
      <Rain />
      <Rainbow />
    </>
  )
}

const seaVertex = /* glsl */ `
varying vec3 vW;
#include <common>
#include <fog_pars_vertex>
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

const seaFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uLightC;
uniform vec3 uShadowC;
uniform float uGlitch;
varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
${NOISE_GLSL}
void main() {
  vec2 p = vW.xz;
  float n = fbm(p * 0.011 + vec2(uTime * 0.008, uTime * 0.004));
  float n2 = fbm(p * 0.045 - vec2(uTime * 0.02, 0.0));
  float h = n * 0.72 + n2 * 0.28;
  vec3 c = mix(uShadowC, uLightC, smoothstep(0.28, 0.72, h));
  c += pow(smoothstep(0.55, 0.92, h), 2.0) * 0.18;
  c = mix(c, vec3(dot(c, vec3(0.33))) * vec3(0.8, 0.75, 0.9), uGlitch * 0.6);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

function CloudSea() {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(() => {
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uLightC: { value: new THREE.Color('#ffffff') }, uShadowC: { value: new THREE.Color('#a9bfdc') } },
    ])
    uniforms.uTime = globalUniforms.uTime
    uniforms.uGlitch = globalUniforms.uGlitch
    return new THREE.ShaderMaterial({ uniforms, vertexShader: seaVertex, fragmentShader: seaFragment, fog: true })
  }, [])
  useFrame(() => {
    if (mesh.current) mesh.current.position.set(player.wx, -24, player.wz)
    material.uniforms.uLightC.value.copy(weather.current.cloudLight)
    material.uniforms.uShadowC.value.copy(weather.current.cloudShadow)
  })
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} material={material}>
      <planeGeometry args={[5000, 5000, 1, 1]} />
    </mesh>
  )
}

const TOWERS: { pos: [number, number, number]; bounds: [number, number, number]; seed: number }[] = [
  { pos: [420, 70, -160], bounds: [90, 45, 60], seed: 1 },
  { pos: [-380, 90, -300], bounds: [110, 55, 70], seed: 2 },
  { pos: [120, 60, -520], bounds: [120, 40, 60], seed: 3 },
  { pos: [-160, 80, 480], bounds: [100, 50, 70], seed: 4 },
  { pos: [520, 100, 330], bounds: [120, 60, 80], seed: 5 },
  { pos: [-540, 60, 140], bounds: [100, 40, 60], seed: 6 },
]

function CloudTowers() {
  const group = useRef<THREE.Group>(null)
  const texture = useMemo(() => cloudPuffDataUrl(), [])
  const weatherIndex = useGame((s) => s.weatherIndex)
  const glitch = useGame((s) => s.glitch)
  const color = glitch ? '#9a93a6' : WEATHERS[weatherIndex].cloudColor
  useFrame(() => {
    if (group.current) group.current.position.set(player.wx, 0, player.wz)
  })
  return (
    <group ref={group}>
      <Clouds material={NoFogLambert} texture={texture} limit={420} frustumCulled={false}>
        {TOWERS.map((t) => (
          <Cloud
            key={t.seed}
            seed={t.seed}
            position={t.pos}
            bounds={t.bounds}
            segments={60}
            volume={80}
            smallestVolume={0.4}
            growth={6}
            speed={0.08}
            fade={600}
            opacity={0.95}
            color={color}
            concentrate="inside"
          />
        ))}
      </Clouds>
    </group>
  )
}

const RAIN_COUNT = 1600

function Rain() {
  const ref = useRef<THREE.LineSegments>(null)
  const camera = useThree((s) => s.camera)
  const { geometry, offsets } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(RAIN_COUNT * 6)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const o = Array.from({ length: RAIN_COUNT }, () => [
      (Math.random() - 0.5) * 60,
      Math.random() * 30,
      (Math.random() - 0.5) * 60,
      14 + Math.random() * 8,
    ])
    return { geometry: g, offsets: o }
  }, [])
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#dfe8f2', transparent: true, opacity: 0, depthWrite: false }),
    [],
  )
  useFrame((_, dt) => {
    const amount = weather.current.rain
    material.opacity = amount * 0.45
    const line = ref.current
    if (!line) return
    line.visible = amount > 0.02
    if (!line.visible) return
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < RAIN_COUNT; i++) {
      const o = offsets[i]
      o[1] -= o[3] * dt * 2
      if (o[1] < 0) o[1] += 30
      const x = camera.position.x + o[0]
      const y = camera.position.y - 8 + o[1]
      const z = camera.position.z + o[2]
      arr[i * 6] = x
      arr[i * 6 + 1] = y
      arr[i * 6 + 2] = z
      arr[i * 6 + 3] = x + 0.05
      arr[i * 6 + 4] = y - 0.7
      arr[i * 6 + 5] = z
    }
    pos.needsUpdate = true
  })
  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

const rainbowVertex = /* glsl */ `
varying float vR;
void main() {
  vR = length(position.xy);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const rainbowFragment = /* glsl */ `
uniform float uOpacity;
varying float vR;
vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}
void main() {
  float t = clamp((vR - 300.0) / 50.0, 0.0, 1.0);
  vec3 c = hue(0.78 * t);
  float a = sin(t * 3.14159) * uOpacity;
  gl_FragColor = vec4(c * 0.9, a * 0.38);
}
`

function Rainbow() {
  const mesh = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: rainbowVertex,
        fragmentShader: rainbowFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [],
  )
  const fwd = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const op = weather.current.rainbow * (1 - globalUniforms.uGlitch.value)
    material.uniforms.uOpacity.value = op
    m.visible = op > 0.01
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    m.position.set(camera.position.x + fwd.x * 700, -60, camera.position.z + fwd.z * 700)
    m.lookAt(camera.position.x, -60, camera.position.z)
  })
  return (
    <mesh ref={mesh} material={material}>
      <ringGeometry args={[300, 350, 96, 1, 0, Math.PI]} />
    </mesh>
  )
}
