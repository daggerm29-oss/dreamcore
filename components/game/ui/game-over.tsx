'use client'

import { startRun } from '@/lib/game/engine'
import { useGame } from '@/lib/game/store'

const MESSAGES = {
  crash: { title: 'You stopped running.', body: 'The road was not empty. It never is.' },
  cliff: { title: 'You kept going straight.', body: 'She was pointing. You did not look.' },
  lost: { title: 'You stayed.', body: 'Two wrong roads, and the sky forgot your name.' },
}

export function GameOver() {
  const phase = useGame((s) => s.phase)
  const deathKind = useGame((s) => s.deathKind)
  const score = useGame((s) => s.score)
  const best = useGame((s) => s.best)
  const coins = useGame((s) => s.coins)
  const distance = useGame((s) => s.distance)
  const crossroads = useGame((s) => s.crossroads)
  if (phase !== 'dead') return null
  const msg = MESSAGES[deathKind ?? 'crash']

  const stats = [
    ['Score', score.toLocaleString()],
    ['Best', best.toLocaleString()],
    ['Distance', `${distance.toLocaleString()} m`],
    ['Coins', coins.toString()],
    ['Crossroads', crossroads.toString()],
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#141c2e]/45 px-6 backdrop-blur-sm" role="dialog" aria-labelledby="go-title">
      <div className="w-full max-w-md text-center text-white">
        <h2 id="go-title" className="text-balance font-serif text-5xl italic [text-shadow:0_4px_24px_rgba(0,0,0,0.4)]">
          {msg.title}
        </h2>
        <p className="mt-3 font-serif text-lg text-white/85">{msg.body}</p>
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/20 bg-white/15">
          {stats.map(([k, v], i) => (
            <div key={k} className={`bg-[#141c2e]/70 px-4 py-3 ${i === 0 ? 'col-span-2' : ''}`}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">{k}</dt>
              <dd className={`font-mono tabular-nums ${i === 0 ? 'text-4xl' : 'text-xl'}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={startRun}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-8 w-full rounded-full bg-white/90 px-8 py-4 font-mono text-sm uppercase tracking-[0.4em] text-[#1b2540] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          Run again
        </button>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">or press Enter</p>
      </div>
    </div>
  )
}
