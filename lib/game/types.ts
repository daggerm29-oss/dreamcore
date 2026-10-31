export type Dir = 0 | 1 | 2 | 3
export type Side = 'left' | 'right'
export type Biome = 'hills' | 'houses' | 'cliff' | 'fog'
export type SegmentKind = 'straight' | 'junction' | 'branch'
export type ObstacleKind = 'fence' | 'beam' | 'block'

export interface Obstacle {
  s: number
  lane: number
  kind: ObstacleKind
  variant: number
}

export interface Coin {
  s: number
  lane: number
  y: number
}

export interface Segment {
  id: number
  kind: SegmentKind
  biome: Biome
  ox: number
  oz: number
  dir: Dir
  length: number
  seed: number
  obstacles: Obstacle[]
  coins: Coin[]
  collected: Set<number>
  pointTo?: Side
  correct?: Side
  lying?: boolean
  side?: Side
  alive?: boolean
  parentId?: number
  narrowSide?: Side
}

export type Action = 'left' | 'right' | 'up' | 'down'
export type DeathKind = 'crash' | 'cliff' | 'lost'
