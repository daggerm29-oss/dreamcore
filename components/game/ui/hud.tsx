'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { audio } from '@/lib/game/audio'
import { useGame } from '@/lib/game/store'
import { WEATHERS } from '@/lib/game/weather'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md border border-white/25 bg-[#141c2e]/55 px-4 py-2 text-white shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  )
}

export function Hud() {
  const phase = useGame((s) => s.phase)
  const coins = useGame((s) => s.coins)
  const score = useGame((s) => s.score)
  const distance = useGame((s) => s.distance)
  const glitch = useGame((s) => s.glitch)
  const muted = useGame((s) => s.muted)
  const weatherIndex = useGame((s) => s.weatherIndex)
  const unlocked = useGame((s) => s.unlocked)

  if (phase === 'title') return null

  const toggleMute = () => {
    audio.setMuted(!muted)
    useGame.setState({ muted: !muted })
  }

  return (
    <div className="pointer-events-none absolute inset-0 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <Panel className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="size-6 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fff6c8,#f2c14e_55%,#b9832a)] shadow-[0_0_14px_rgba(255,210,110,0.85)]"
          />
          <span className="font-mono text-2xl tabular-nums tracking-wider">{coins}</span>
          <span className="sr-only">coins</span>
        </Panel>
        <div className="flex flex-col items-end gap-2">
          <Panel className="min-w-40 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">Score</div>
            <div className="font-mono text-2xl tabular-nums tracking-wider">{score.toLocaleString()}</div>
          </Panel>
          <Panel className="min-w-40 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/70">Distance</div>
            <div className="font-mono text-xl tabular-nums tracking-wider">{distance.toLocaleString()} m</div>
          </Panel>
        </div>
      </div>

      {glitch && (
        <div className="absolute inset-x-0 top-24 flex justify-center">
          <p className="animate-pulse font-mono text-xs uppercase tracking-[0.5em] text-[#ffd1dc] [text-shadow:2px_0_#ff3b6b,-2px_0_#3bd6ff]">
            this is not the way home
          </p>
        </div>
      )}

      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between md:inset-x-6 md:bottom-6">
        <div className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.45)]">
          <span>{WEATHERS[weatherIndex].name}</span>
          <span className="text-white/60">
            {'Tells: shadow'}
            {unlocked.lullaby ? ' / lullaby' : ''}
            {unlocked.path ? ' / living path' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto rounded-full border border-white/25 bg-[#141c2e]/55 p-3 text-white backdrop-blur-md transition hover:bg-[#141c2e]/75"
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>
    </div>
  )
}
