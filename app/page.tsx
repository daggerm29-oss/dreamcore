import { GameClient } from '@/components/game/game-client'

export default function Page() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Where She Points, an endless runner above the clouds</h1>
      <GameClient />
    </main>
  )
}
