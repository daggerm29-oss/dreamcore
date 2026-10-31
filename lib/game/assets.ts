import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LANE_W, ROAD_W } from './constants'

export const globalUniforms = {
  uTime: { value: 0 },
  uGlitch: { value: 0 },
  uLight: { value: 1 },
}

export const NOISE_GLSL = /* glsl */ `
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash21(i), b = hash21(i+vec2(1.,0.)), c = hash21(i+vec2(0.,1.)), d = hash21(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){ float v=0.; float a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
`

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, light: string, dark: string) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? light : dark
    const s = Math.random() * 2.2 + 0.5
    g.fillRect(Math.random() * w, Math.random() * h, s, s)
  }
}

export type RoadKind = 'asphalt' | 'dirt' | 'concrete'

function roadTexture(kind: RoadKind) {
  const W = 512
  const H = 1024
  const [c, g] = makeCanvas(W, H)
  const base = { asphalt: '#4f5257', dirt: '#8a7862', concrete: '#b7b5ae' }[kind]
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  if (kind === 'asphalt') {
    speckle(g, W, H, 90000, 'rgba(255,255,255,0.07)', 'rgba(0,0,0,0.12)')
    const edge = g.createLinearGradient(0, 0, W, 0)
    edge.addColorStop(0, 'rgba(160,150,130,0.55)')
    edge.addColorStop(0.06, 'rgba(160,150,130,0)')
    edge.addColorStop(0.94, 'rgba(160,150,130,0)')
    edge.addColorStop(1, 'rgba(160,150,130,0.55)')
    g.fillStyle = edge
    g.fillRect(0, 0, W, H)
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = 'rgba(20,20,22,0.35)'
      g.lineWidth = 1 + Math.random() * 2
      g.beginPath()
      let x = Math.random() * W
      let y = Math.random() * H
      g.moveTo(x, y)
      for (let k = 0; k < 8; k++) {
        x += (Math.random() - 0.5) * 40
        y += Math.random() * 30
        g.lineTo(x, y)
      }
      g.stroke()
    }
  } else if (kind === 'dirt') {
    speckle(g, W, H, 120000, 'rgba(255,240,210,0.12)', 'rgba(40,25,10,0.14)')
    const center = g.createLinearGradient(0, 0, W, 0)
    center.addColorStop(0, 'rgba(70,95,40,0.85)')
    center.addColorStop(0.08, 'rgba(70,95,40,0)')
    center.addColorStop(0.5, 'rgba(70,70,70,0.22)')
    center.addColorStop(0.92, 'rgba(70,95,40,0)')
    center.addColorStop(1, 'rgba(70,95,40,0.85)')
    g.fillStyle = center
    g.fillRect(0, 0, W, H)
  } else {
    speckle(g, W, H, 60000, 'rgba(255,255,255,0.1)', 'rgba(0,0,0,0.08)')
    g.strokeStyle = 'rgba(60,60,60,0.35)'
    g.lineWidth = 3
    for (let y = 0; y <= H; y += H / 8) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(W, y)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(W / 2, 0)
    g.lineTo(W / 2, H)
    g.stroke()
  }

  if (kind !== 'concrete') {
    const laneEdges = [-LANE_W / 2, LANE_W / 2]
    g.shadowColor = 'rgba(190,255,245,0.9)'
    g.shadowBlur = 12
    g.fillStyle = kind === 'asphalt' ? 'rgba(225,255,250,0.85)' : 'rgba(225,255,250,0.55)'
    for (const e of laneEdges) {
      const x = W * (0.5 + e / ROAD_W)
      for (let y = 40; y < H; y += H / 2) g.fillRect(x - 4, y, 8, H / 5)
    }
    g.shadowBlur = 0
  }

  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

let cloudUrl: string | null = null
export function cloudPuffDataUrl() {
  if (!cloudUrl) cloudUrl = buildCloudPuff()
  return cloudUrl
}

function buildCloudPuff() {
  const S = 256
  const [c, g] = makeCanvas(S, S)
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * S * 0.22
    const x = S / 2 + Math.cos(a) * r
    const y = S / 2 + Math.sin(a) * r
    const rad = S * (0.12 + Math.random() * 0.16)
    const grd = g.createRadialGradient(x, y, 0, x, y, rad)
    grd.addColorStop(0, 'rgba(255,255,255,0.35)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
  }
  return c.toDataURL('image/png')
}

function signTexture() {
  const [c, g] = makeCanvas(256, 256)
  g.fillStyle = '#f4f4f0'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#1d1d1f'
  g.lineWidth = 10
  g.strokeRect(12, 12, 232, 232)
  g.fillStyle = '#1d1d1f'
  g.textAlign = 'center'
  g.font = 'bold 52px Arial, sans-serif'
  g.fillText('DROP', 128, 82)
  g.fillText('LIMIT', 128, 140)
  g.font = 'bold 60px Arial, sans-serif'
  g.fillText('????', 128, 210)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function staticTexture() {
  const [c, g] = makeCanvas(128, 96)
  const img = g.createImageData(128, 96)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = v * 0.85
    img.data[i + 1] = v * 0.95
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function worldGrassMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0 })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uGlitch = globalUniforms.uGlitch
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWPos = (modelMatrix * wp4).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\nuniform float uGlitch;\n${NOISE_GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float gn = fbm(vWPos.xz * 0.045);
        float gd = vnoise(vWPos.xz * 0.7);
        float gf = vnoise(vWPos.xz * 3.1);
        vec3 g1 = vec3(0.11, 0.33, 0.025);
        vec3 g2 = vec3(0.29, 0.52, 0.05);
        vec3 g3 = vec3(0.36, 0.42, 0.10);
        vec3 gc = mix(g1, g2, smoothstep(0.25, 0.75, gn));
        gc = mix(gc, g3, smoothstep(0.62, 0.9, gd) * 0.45);
        gc *= 0.86 + 0.28 * gf;
        float lum = dot(gc, vec3(0.3, 0.59, 0.11));
        gc = mix(gc, vec3(lum) * vec3(0.95, 0.85, 1.05), uGlitch * 0.75);
        diffuseColor.rgb = gc;`,
      )
  }
  return m
}

function rockMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWPos;\n${NOISE_GLSL}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float strata = vnoise(vec2((vWPos.x + vWPos.z) * 0.08, vWPos.y * 0.9));
        float rn = fbm(vec2(vWPos.x + vWPos.z, vWPos.y) * 0.25);
        vec3 rc = mix(vec3(0.20, 0.18, 0.15), vec3(0.42, 0.39, 0.34), rn);
        rc *= 0.8 + 0.35 * strata;
        float top = smoothstep(-2.5, -0.2, vWPos.y);
        rc = mix(rc, vec3(0.12, 0.26, 0.04), top * 0.8);
        diffuseColor.rgb = rc;`,
      )
  }
  return m
}

function roofGeometry() {
  let geo: THREE.BufferGeometry = new THREE.CylinderGeometry(1, 1, 1, 3, 1)
  geo.rotateZ(Math.PI / 2)
  geo.rotateX(-Math.PI / 2)
  geo.scale(1, 1 / 1.5, 1 / 1.732)
  geo.translate(0, 0.5 / 1.5, 0)
  geo = geo.toNonIndexed()
  geo.computeVertexNormals()
  return geo
}

function picketGeometry() {
  const body = new THREE.BoxGeometry(0.09, 0.92, 0.035)
  body.translate(0, 0.46, 0)
  const tip = new THREE.ConeGeometry(0.064, 0.12, 4)
  tip.rotateY(Math.PI / 4)
  tip.translate(0, 0.98, 0)
  return mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()])!
}

function createAssets() {
  const unitBox = new THREE.BoxGeometry(1, 1, 1)
  unitBox.translate(0, 0.5, 0)
  const centeredBox = new THREE.BoxGeometry(1, 1, 1)
  const roads = {
    asphalt: roadTexture('asphalt'),
    dirt: roadTexture('dirt'),
    concrete: roadTexture('concrete'),
  }
  const staticTex = staticTexture()
  return {
    geo: {
      unitBox,
      centeredBox,
      roof: roofGeometry(),
      picket: picketGeometry(),
      sphere: new THREE.SphereGeometry(1, 32, 16),
      ico: new THREE.IcosahedronGeometry(1, 1),
      orb: new THREE.IcosahedronGeometry(0.26, 2),
      cone: new THREE.ConeGeometry(1, 1, 10),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
      taperCyl: new THREE.CylinderGeometry(0.35, 0.5, 1, 6),
      plane: new THREE.PlaneGeometry(1, 1),
      grassBlade: (() => {
        const g = new THREE.PlaneGeometry(0.09, 1, 1, 4)
        g.translate(0, 0.5, 0)
        return g
      })(),
    },
    mat: {
      grass: worldGrassMaterial(),
      rock: rockMaterial(),
      road: {
        asphalt: new THREE.MeshStandardMaterial({ map: roads.asphalt, roughness: 0.92 }),
        dirt: new THREE.MeshStandardMaterial({ map: roads.dirt, roughness: 1 }),
        concrete: new THREE.MeshStandardMaterial({ map: roads.concrete, roughness: 0.9 }),
      },
      houseBody: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
      roof: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }),
      window: new THREE.MeshStandardMaterial({
        color: '#dfe8ee',
        emissive: new THREE.Color('#ffe4a8'),
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.1,
      }),
      door: new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.7 }),
      trim: new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.6 }),
      picket: new THREE.MeshStandardMaterial({ color: '#fbfbf7', roughness: 0.55 }),
      trunk: new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 }),
      canopy: new THREE.MeshStandardMaterial({ color: '#4b7a2a', roughness: 0.9, flatShading: true }),
      conifer: new THREE.MeshStandardMaterial({ color: '#1f3b24', roughness: 0.95, flatShading: true }),
      coin: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 0.9), toneMapped: false }),
      cardboard: new THREE.MeshStandardMaterial({ color: '#b48b5c', roughness: 0.95 }),
      tv: new THREE.MeshStandardMaterial({ color: '#d4cbb5', roughness: 0.6 }),
      tvScreen: new THREE.MeshBasicMaterial({ map: staticTex, color: new THREE.Color(1.6, 1.7, 1.8), toneMapped: false }),
      fridge: new THREE.MeshStandardMaterial({ color: '#a9d6c6', roughness: 0.35, metalness: 0.1 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#dddddd', roughness: 0.2, metalness: 0.9 }),
      post: new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.7 }),
      sign: new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.6 }),
      metal: new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.4, metalness: 0.8 }),
      chevron: new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.7, 1.6, 1.5),
        transparent: true,
        opacity: 0.6,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      panel: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      frame: new THREE.MeshStandardMaterial({ color: '#d9d6d0', roughness: 0.8 }),
      fairy: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6), toneMapped: false }),
      figure: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 1 }),
      deadWood: new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 1 }),
    },
  }
}

export type Assets = ReturnType<typeof createAssets>
let instance: Assets | null = null
export function assets(): Assets {
  if (!instance) instance = createAssets()
  return instance
}
