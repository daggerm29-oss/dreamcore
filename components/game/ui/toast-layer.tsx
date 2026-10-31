'use client'

import { useEffect, useState } from 'react'
import { useGame } from '@/lib/game/store'

export function ToastLayer() {
  const toast = useGame((s) => s.toast)
  const phase = useGame((s) => s.phase)
  const [visibleId, setVisibleId] = useState<number | null>(null)

  useEffect(() => {
    if (!toast) return
    setVisibleId(toast.id)
    const t = setTimeout(() => setVisibleId((v) => (v === toast.id ? null : v)), 4800)
    return () => clearTimeout(t)
  }, [toast])

  if (!toast || phase !== 'playing') return null
  const visible = visibleId === toast.id

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center px-6" aria-live="polite">
      <div
        className={`max-w-lg text-center transition-all duration-700 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
      >
        <p className="font-serif text-3xl italic text-white [text-shadow:0_2px_18px_rgba(30,40,70,0.55)] md:text-4xl">
          {toast.title}
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-white/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          {toast.body}
        </p>
      </div>
    </div>
  )
}
