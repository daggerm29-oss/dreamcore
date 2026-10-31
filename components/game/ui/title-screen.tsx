'use client'

import { Headphones } from 'lucide-react'
import { startRun } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'

const CONTROLS = [
  ['Change lane / turn', 'Left · Right'],
  ['Jump', 'Up · Space'],
  ['Slide', 'Down'],
]

export function TitleScreen() {
  const phase = useGame((s) => s.phase)
  if (phase !== 'title') return null

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between bg-gradient-to-b from-[#1b2540]/25 via-transparent to-[#1b2540]/55 px-6 py-10 text-white md:py-14">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.35)]">
          an endless run above the clouds
        </p>
        <h1 className="mt-4 text-balance font-serif text-6xl italic leading-none [text-shadow:0_4px_30px_rgba(30,40,80,0.45)] md:text-8xl">
          Where She Points
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty font-serif text-xl text-white/95 [text-shadow:0_2px_12px_rgba(20,30,60,0.6)]">
          At every crossroads, a little girl shows you the way. She is usually telling the truth.
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <button
          type="button"
          onClick={startRun}
          onPointerDown={(e) => e.stopPropagation()}
          className="group w-full rounded-full border border-white/40 bg-white/90 px-8 py-4 font-mono text-sm uppercase tracking-[0.4em] text-[#1b2540] shadow-[0_0_40px_rgba(255,255,255,0.45)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          Begin the run
        </button>
        <ul className="grid w-full grid-cols-3 gap-2 rounded-xl border border-white/20 bg-[#141c2e]/50 p-3 backdrop-blur-md">
          {CONTROLS.map(([label, keys]) => (
            <li key={label} className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">{label}</div>
              <div className="mt-1 font-mono text-xs text-white">{keys}</div>
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/80">
          <Headphones className="size-4" aria-hidden="true" />
          Sound matters. Swipe on touch screens.
        </p>
      </div>
    </div>
  )
}
