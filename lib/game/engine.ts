import { audio } from './audio'
import {
  GRAVITY,
  JUMP_V,
  LANE_W,
  MAX_SPEED,
  SLIDE_TIME,
  START_SPEED,
  TELL_UNLOCKS,
  TURN_WINDOW,
} from './constants'
import { useGame } from './store'
import { generateLeg, resetGenerator, segEnd, toLocal, toWorld, yawOf } from './track'
import type { Action, DeathKind, Segment } from './types'
import { resetWeather } from './weather'

export const track = { segments: [] as Segment[] }

export const player = {
  segId: 0,
  s: 2,
  x: 0,
  lane: 0,
  y: 0,
  vy: 0,
  sliding: 0,
  speed: START_SPEED,
  distance: 0,
  score: 0,
  pendingTurn: null as null | 'left' | 'right',
  yaw: 0,
  wx: 0,
  wz: 0,
  phase: 0,
  dying: false,
  deathT: 0,
  deathKind: null as DeathKind | null,
  glitch: false,
  junctionDist: 999,
  upcomingLying: false,
  toastsShown: new Set<string>(),
}

const queue: Action[] = []
let publishTimer = 0

export function pushInput(a: Action) {
  if (queue.length < 4) queue.push(a)
}

function publishSegments() {
  useGame.setState({ segments: track.segments.slice() })
}

export function currentSegment(): Segment | undefined {
  return track.segments.find((s) => s.id === player.segId)
}

export function resetRun() {
  resetGenerator(Math.floor(Math.random() * 1e9))
  track.segments = generateLeg(0, 0, 0, 0, true)
  Object.assign(player, {
    segId: track.segments[0].id,
    s: 2,
    x: 0,
    lane: 0,
    y: 0,
    vy: 0,
    sliding: 0,
    speed: START_SPEED,
    distance: 0,
    score: 0,
    pendingTurn: null,
    yaw: 0,
    wx: 0,
    wz: -2,
    phase: 0,
    dying: false,
    deathT: 0,
    deathKind: null,
    glitch: false,
    junctionDist: 999,
    upcomingLying: false,
    toastsShown: new Set<string>(),
  })
  queue.length = 0
  resetWeather()
  publishSegments()
  useGame.setState({
    score: 0,
    coins: 0,
    distance: 0,
    glitch: false,
    deathKind: null,
    crossroads: 0,
    toast: null,
    unlocked: { shadow: true, lullaby: false, path: false },
  })
}

export function startRun() {
  resetRun()
  audio.init()
  useGame.setState({ phase: 'playing' })
  useGame
    .getState()
    .showToast('Run toward the crossroads', 'She will show you the way. Swipe or use the arrow keys.')
}

function die(kind: DeathKind) {
  if (player.dying) return
  player.dying = true
  player.deathKind = kind
  player.deathT = 0
  audio.death()
}

function oneToast(key: string, title: string, body: string) {
  if (player.toastsShown.has(key)) return
  player.toastsShown.add(key)
  useGame.getState().showToast(title, body)
}

function computeJunctionInfo(seg: Segment) {
  const idx = track.segments.indexOf(seg)
  let dist = seg.length - player.s
  if (seg.kind === 'junction') {
    player.junctionDist = dist
    player.upcomingLying = !!seg.lying
    return
  }
  for (let i = idx + 1; i < track.segments.length; i++) {
    const n = track.segments[i]
    if (n.kind === 'junction') {
      player.junctionDist = dist + n.length
      player.upcomingLying = !!n.lying
      return
    }
    if (n.kind === 'branch') break
    dist += n.length
  }
  player.junctionDist = 999
  player.upcomingLying = false
}

function doTurn(seg: Segment, side: 'left' | 'right') {
  const branch = track.segments.find((b) => b.kind === 'branch' && b.parentId === seg.id && b.side === side)
  if (!branch) return
  const [wx, wz] = toWorld(seg, player.s, player.x)
  const [ns, nx] = toLocal(branch, wx, wz)
  player.segId = branch.id
  player.s = ns
  player.x = nx
  player.lane = 0
  player.pendingTurn = null

  track.segments = track.segments.filter(
    (b) => !(b.kind === 'branch' && b.parentId === seg.id && b.id !== branch.id),
  )
  const [ex, ez] = segEnd(branch)
  track.segments.push(...generateLeg(ex, ez, branch.dir, player.distance, false))

  const state = useGame.getState()
  useGame.setState({ crossroads: state.crossroads + 1 })
  const correct = side === seg.correct
  if (correct) {
    player.score += 250
    audio.correct()
    if (player.glitch) {
      player.glitch = false
      useGame.setState({ glitch: false })
      state.showToast('The sky remembers you', 'You found your way back.')
    }
  } else if (player.glitch) {
    die('lost')
  } else {
    player.glitch = true
    useGame.setState({ glitch: true })
    audio.wrong()
    state.showToast('This is not the way home', 'One more wrong turn and you stay here forever.')
  }
  publishSegments()
}

function advanceSegment(seg: Segment) {
  const idx = track.segments.indexOf(seg)
  const next = track.segments[idx + 1]
  if (!next || next.kind === 'branch') return
  player.s -= seg.length
  player.segId = next.id
  const keepFrom = Math.max(0, idx)
  if (keepFrom > 0) track.segments = track.segments.slice(keepFrom)
  publishSegments()
}

function checkUnlocks() {
  const st = useGame.getState()
  if (!st.unlocked.lullaby && player.distance > TELL_UNLOCKS.lullaby) {
    useGame.setState({ unlocked: { ...st.unlocked, lullaby: true } })
    st.showToast('Listen to her lullaby', 'When the melody sours and the birds fall silent, she is lying.')
  } else if (!st.unlocked.path && player.distance > TELL_UNLOCKS.path) {
    useGame.setState({ unlocked: { ...useGame.getState().unlocked, path: true } })
    st.showToast('Follow the path that still breathes', 'The true road has petals in the air. The false one is very still.')
  }
}

export function step(dt: number) {
  const st = useGame.getState()
  const seg = currentSegment()
  if (!seg) return

  if (st.phase !== 'playing') {
    const [wx, wz] = toWorld(seg, player.s, player.x)
    player.wx = wx
    player.wz = wz
    player.yaw = yawOf(seg.dir)
    computeJunctionInfo(seg)
    return
  }

  if (player.dying) {
    player.deathT += dt
    if (player.deathKind === 'cliff' || player.deathKind === 'lost') {
      player.s += player.speed * 0.6 * dt
      player.vy -= GRAVITY * 0.5 * dt
      player.y += player.vy * dt
    }
    const [wx, wz] = toWorld(seg, player.s, player.x)
    player.wx = wx
    player.wz = wz
    if (player.deathT > 1.6 && st.phase === 'playing') {
      const score = Math.floor(player.score)
      useGame.setState({ phase: 'dead', deathKind: player.deathKind, score, best: Math.max(st.best, score) })
    }
    return
  }

  player.speed = Math.min(MAX_SPEED, START_SPEED + player.distance * 0.0045)
  const inWindow = seg.kind === 'junction' && player.s > seg.length - TURN_WINDOW

  while (queue.length) {
    const a = queue.shift()!
    if (a === 'left' || a === 'right') {
      if (inWindow) {
        if (!player.pendingTurn) {
          player.pendingTurn = a
          audio.turn()
        }
      } else {
        player.lane = Math.max(-1, Math.min(1, player.lane + (a === 'left' ? -1 : 1)))
      }
    } else if (a === 'up') {
      if (player.y <= 0.01) {
        player.vy = JUMP_V
        player.sliding = 0
        audio.jump()
      }
    } else if (a === 'down') {
      if (player.y > 0.05) player.vy = -22
      player.sliding = SLIDE_TIME
      audio.slide()
    }
  }

  const ds = player.speed * dt
  player.s += ds
  player.distance += ds
  player.score += ds
  player.x += (player.lane * LANE_W - player.x) * Math.min(1, dt * 12)
  player.vy -= GRAVITY * dt
  player.y += player.vy * dt
  if (player.y < 0) {
    player.y = 0
    player.vy = 0
  }
  player.sliding = Math.max(0, player.sliding - dt)
  player.phase += dt * player.speed * 0.95

  if (seg.kind === 'junction') {
    if (player.pendingTurn && player.s >= seg.length - 1.2) {
      doTurn(seg, player.pendingTurn)
    } else if (!player.pendingTurn && player.s > seg.length + 3) {
      die('cliff')
    }
  } else if (player.s >= seg.length) {
    advanceSegment(seg)
  }

  const cur = currentSegment()!
  for (const o of cur.obstacles) {
    const depth = o.kind === 'block' ? 0.55 : 0.25
    if (Math.abs(o.s - player.s) > depth + 0.3) continue
    if (o.kind !== 'beam' && Math.abs(o.lane * LANE_W - player.x) > 1.1) continue
    if (o.kind === 'fence' && player.y < 0.9) die('crash')
    else if (o.kind === 'beam' && player.sliding <= 0) die('crash')
    else if (o.kind === 'block') die('crash')
  }
  for (let i = 0; i < cur.coins.length; i++) {
    if (cur.collected.has(i)) continue
    const c = cur.coins[i]
    if (Math.abs(c.s - player.s) > 0.9) continue
    if (Math.abs(c.lane * LANE_W - player.x) > 1.0) continue
    const bodyY = player.sliding > 0 ? player.y + 0.5 : player.y + 1
    if (Math.abs(c.y - bodyY) > 1.2) continue
    cur.collected.add(i)
    player.score += 10
    audio.coin()
    useGame.setState({ coins: useGame.getState().coins + 1 })
  }

  const [wx, wz] = toWorld(cur, player.s, player.x)
  player.wx = wx
  player.wz = wz
  player.yaw = yawOf(cur.dir)
  computeJunctionInfo(cur)

  if (player.junctionDist < 90) {
    oneToast('shadow', 'Watch her shadow', 'She may lie. Her shadow cannot.')
  }
  checkUnlocks()

  publishTimer -= dt
  if (publishTimer <= 0) {
    publishTimer = 0.1
    useGame.setState({ score: Math.floor(player.score), distance: Math.floor(player.distance) })
  }
}
