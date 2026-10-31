'use client'

import dynamic from 'next/dynamic'

const Game = dynamic(() => import('./game'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-[#cfe3f6]">
      <p className="font-serif text-2xl italic text-[#1b2540]/70">rising above the clouds...</p>
    </div>
  ),
})

export function GameClient() {
  return <Game />
}
