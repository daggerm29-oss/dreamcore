import { create } from 'zustand'
import type { DeathKind, Segment } from './types'

export type Phase = 'title' | 'playing' | 'dead'

export interface Toast {
  id: number
  title: string
  body: string
}

interface GameState {
  phase: Phase
  segments: Segment[]
  score: number
  coins: number
  distance: number
  glitch: boolean
  toast: Toast | null
  deathKind: DeathKind | null
  best: number
  crossroads: number
  unlocked: { shadow: boolean; lullaby: boolean; path: boolean }
  muted: boolean
  weatherIndex: number
  showToast: (title: string, body: string) => void
}

let toastId = 0

export const useGame = create<GameState>((set) => ({
  phase: 'title',
  segments: [],
  score: 0,
  coins: 0,
  distance: 0,
  glitch: false,
  toast: null,
  deathKind: null,
  best: 0,
  crossroads: 0,
  unlocked: { shadow: true, lullaby: false, path: false },
  muted: false,
  weatherIndex: 0,
  showToast: (title, body) => set({ toast: { id: ++toastId, title, body } }),
}))
