import * as THREE from 'three'

export interface WeatherParams {
  elevation: number
  azimuth: number
  turbidity: number
  rayleigh: number
  mie: number
  mieG: number
  fogColor: THREE.Color
  fogFar: number
  sunIntensity: number
  sunColor: THREE.Color
  hemiSky: THREE.Color
  hemiIntensity: number
  cloudLight: THREE.Color
  cloudShadow: THREE.Color
  rain: number
  rainbow: number
  windowGlow: number
  saturation: number
}

interface WeatherDef {
  name: string
  cloudColor: string
  p: WeatherParams
}

const c = (hex: string) => new THREE.Color(hex)

export const WEATHERS: WeatherDef[] = [
  {
    name: 'Clear heaven',
    cloudColor: '#ffffff',
    p: {
      elevation: 38, azimuth: 160, turbidity: 1.6, rayleigh: 1.1, mie: 0.004, mieG: 0.8,
      fogColor: c('#cfe3f6'), fogFar: 300, sunIntensity: 2.8, sunColor: c('#fff4e2'),
      hemiSky: c('#bcd8ff'), hemiIntensity: 1.0, cloudLight: c('#ffffff'), cloudShadow: c('#a9bfdc'),
      rain: 0, rainbow: 0, windowGlow: 0.15, saturation: 0.1,
    },
  },
  {
    name: 'Golden hour',
    cloudColor: '#ffe6c4',
    p: {
      elevation: 9, azimuth: 200, turbidity: 5, rayleigh: 2.2, mie: 0.006, mieG: 0.86,
      fogColor: c('#f2d8c2'), fogFar: 260, sunIntensity: 2.3, sunColor: c('#ffc98e'),
      hemiSky: c('#f6d4b8'), hemiIntensity: 0.8, cloudLight: c('#ffe2bf'), cloudShadow: c('#c7a2a8'),
      rain: 0, rainbow: 0, windowGlow: 0.7, saturation: 0.15,
    },
  },
  {
    name: 'Pink dusk',
    cloudColor: '#ffd0e0',
    p: {
      elevation: 3, azimuth: 230, turbidity: 8, rayleigh: 3.4, mie: 0.008, mieG: 0.9,
      fogColor: c('#f0c3d6'), fogFar: 220, sunIntensity: 1.5, sunColor: c('#ffb0c6'),
      hemiSky: c('#e7b9d6'), hemiIntensity: 0.75, cloudLight: c('#ffd3e3'), cloudShadow: c('#a68bb8'),
      rain: 0, rainbow: 0, windowGlow: 1.2, saturation: 0.2,
    },
  },
  {
    name: 'Whiteout fog',
    cloudColor: '#f2f2f5',
    p: {
      elevation: 30, azimuth: 120, turbidity: 10, rayleigh: 0.6, mie: 0.02, mieG: 0.7,
      fogColor: c('#e6e8ee'), fogFar: 85, sunIntensity: 0.9, sunColor: c('#f2f0ff'),
      hemiSky: c('#e4e7ef'), hemiIntensity: 1.1, cloudLight: c('#f4f4f7'), cloudShadow: c('#c4c7d1'),
      rain: 0, rainbow: 0, windowGlow: 0.9, saturation: -0.1,
    },
  },
  {
    name: 'Pastel overcast',
    cloudColor: '#ece6f4',
    p: {
      elevation: 26, azimuth: 90, turbidity: 12, rayleigh: 2.8, mie: 0.01, mieG: 0.75,
      fogColor: c('#dcd8ea'), fogFar: 190, sunIntensity: 1.0, sunColor: c('#efe6ff'),
      hemiSky: c('#d9d5ec'), hemiIntensity: 1.0, cloudLight: c('#efeaf6'), cloudShadow: c('#b2acc8'),
      rain: 0, rainbow: 0, windowGlow: 0.5, saturation: 0,
    },
  },
  {
    name: 'Soft rain',
    cloudColor: '#cfd5dc',
    p: {
      elevation: 22, azimuth: 70, turbidity: 18, rayleigh: 1.4, mie: 0.02, mieG: 0.7,
      fogColor: c('#b8c3cd'), fogFar: 150, sunIntensity: 0.55, sunColor: c('#dbe4f0'),
      hemiSky: c('#b8c4d2'), hemiIntensity: 1.0, cloudLight: c('#d6dce3'), cloudShadow: c('#8f9aa8'),
      rain: 1, rainbow: 0, windowGlow: 0.9, saturation: -0.15,
    },
  },
  {
    name: 'After the rain',
    cloudColor: '#ffffff',
    p: {
      elevation: 24, azimuth: 30, turbidity: 2.5, rayleigh: 1.3, mie: 0.004, mieG: 0.8,
      fogColor: c('#d3e7f2'), fogFar: 280, sunIntensity: 2.4, sunColor: c('#fff7ea'),
      hemiSky: c('#c4def5'), hemiIntensity: 1.0, cloudLight: c('#ffffff'), cloudShadow: c('#a8bdd6'),
      rain: 0, rainbow: 1, windowGlow: 0.2, saturation: 0.18,
    },
  },
]

const HOLD = 46
const BLEND = 9

function cloneParams(p: WeatherParams): WeatherParams {
  return {
    ...p,
    fogColor: p.fogColor.clone(),
    sunColor: p.sunColor.clone(),
    hemiSky: p.hemiSky.clone(),
    cloudLight: p.cloudLight.clone(),
    cloudShadow: p.cloudShadow.clone(),
  }
}

export const weather = {
  index: 0,
  t: 0,
  current: cloneParams(WEATHERS[0].p),
}

const smooth = (t: number) => t * t * (3 - 2 * t)

function blendInto(out: WeatherParams, a: WeatherParams, b: WeatherParams, t: number) {
  const keys = [
    'elevation', 'azimuth', 'turbidity', 'rayleigh', 'mie', 'mieG', 'fogFar', 'sunIntensity',
    'hemiIntensity', 'rain', 'rainbow', 'windowGlow', 'saturation',
  ] as const
  for (const k of keys) out[k] = a[k] + (b[k] - a[k]) * t
  out.fogColor.copy(a.fogColor).lerp(b.fogColor, t)
  out.sunColor.copy(a.sunColor).lerp(b.sunColor, t)
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t)
  out.cloudLight.copy(a.cloudLight).lerp(b.cloudLight, t)
  out.cloudShadow.copy(a.cloudShadow).lerp(b.cloudShadow, t)
}

export function resetWeather() {
  weather.index = 0
  weather.t = 0
  blendInto(weather.current, WEATHERS[0].p, WEATHERS[0].p, 0)
}

export function updateWeather(dt: number): boolean {
  weather.t += dt
  let changed = false
  if (weather.t > HOLD + BLEND) {
    weather.t -= HOLD + BLEND
    weather.index = (weather.index + 1) % WEATHERS.length
    changed = true
  }
  const a = WEATHERS[weather.index].p
  const b = WEATHERS[(weather.index + 1) % WEATHERS.length].p
  const t = weather.t > HOLD ? smooth((weather.t - HOLD) / BLEND) : 0
  blendInto(weather.current, a, b, t)
  if (weather.t > HOLD && weather.t - dt <= HOLD) changed = true
  return changed
}

export function upcomingWeatherIndex() {
  return weather.t > HOLD ? (weather.index + 1) % WEATHERS.length : weather.index
}
