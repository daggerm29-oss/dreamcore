import type { Biome } from './types'

export const LANE_W = 2.4
export const ROAD_W = 8.4
export const FENCE_OFFSET = ROAD_W / 2 + 1.4
export const START_SPEED = 12
export const MAX_SPEED = 25
export const GRAVITY = 38
export const JUMP_V = 13
export const SLIDE_TIME = 0.8
export const TURN_WINDOW = 24
export const STRAIGHT_LEN = 80
export const JUNCTION_LEN = 64
export const BRANCH_LEN = 46
export const NARROW_W = 7

export const TELL_UNLOCKS = { shadow: 0, lullaby: 450, path: 1100 }

export const BIOME_WIDTHS: Record<Biome, { left: number; right: number }> = {
  hills: { left: 46, right: 46 },
  houses: { left: 34, right: 7 },
  cliff: { left: 32, right: 6.6 },
  fog: { left: 26, right: 26 },
}

export const BIOME_ROAD: Record<Biome, 'asphalt' | 'dirt' | 'concrete'> = {
  hills: 'dirt',
  houses: 'asphalt',
  cliff: 'asphalt',
  fog: 'concrete',
}
