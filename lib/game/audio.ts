const MELODY: [number | null, number][] = [
  [76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2],
  [72, 1], [74, 1], [76, 1], [79, 1], [76, 3], [null, 1],
  [76, 1], [79, 1], [81, 2], [84, 1], [83, 1], [81, 2],
  [79, 1], [76, 1], [74, 1], [76, 1], [72, 3], [null, 2],
]

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

interface AudioUpdate {
  playing: boolean
  junctionDist: number
  lying: boolean
  lullabyTell: boolean
  glitch: boolean
  rain: number
}

class GameAudio {
  ctx: AudioContext | null = null
  master!: GainNode
  sfx!: GainNode
  windGain!: GainNode
  rainGain!: GainNode
  lullabyGain!: GainNode
  droneGain!: GainNode
  noiseBuf!: AudioBuffer
  noteIndex = 0
  nextNoteTime = 0
  birdTimer = 2
  muted = false

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.8
    this.master.connect(ctx.destination)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.7
    this.sfx.connect(this.master)

    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

    this.windGain = this.loopNoise(380, 0.6, 0.05)
    this.rainGain = this.loopNoise(2600, 0.4, 0)

    this.lullabyGain = ctx.createGain()
    this.lullabyGain.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3200
    this.lullabyGain.connect(lp)
    lp.connect(this.master)

    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0
    this.droneGain.connect(this.master)
    for (const f of [55, 58.3, 110.5]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.05
      const filt = ctx.createBiquadFilter()
      filt.type = 'lowpass'
      filt.frequency.value = 240
      o.connect(filt).connect(g).connect(this.droneGain)
      o.start()
    }
    this.nextNoteTime = ctx.currentTime + 0.5
  }

  private loopNoise(freq: number, q: number, gain: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(f).connect(g).connect(this.master)
    src.start()
    return g
  }

  setMuted(m: boolean) {
    this.muted = m
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1)
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', dest?: AudioNode, when = 0, bend = 0) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * bend), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(dest ?? this.sfx)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private noiseHit(dur: number, vol: number, freq: number) {
    const ctx = this.ctx
    if (!ctx) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.sfx)
    src.start(t, Math.random())
    src.stop(t + dur)
  }

  footstep() {
    this.noiseHit(0.08, 0.12, 700 + Math.random() * 300)
  }
  coin() {
    this.tone(1318, 0.25, 0.08, 'sine')
    this.tone(1975, 0.35, 0.05, 'sine', undefined, 0.05)
  }
  jump() {
    this.noiseHit(0.18, 0.08, 1400)
  }
  slide() {
    this.noiseHit(0.4, 0.07, 500)
  }
  turn() {
    this.noiseHit(0.3, 0.1, 900)
  }
  correct() {
    this.tone(784, 0.8, 0.06, 'sine')
    this.tone(1175, 1.2, 0.05, 'sine', undefined, 0.12)
  }
  wrong() {
    this.tone(220, 1.6, 0.12, 'sawtooth', undefined, 0, 0.5)
    this.noiseHit(0.8, 0.15, 300)
  }
  death() {
    this.tone(160, 1.8, 0.18, 'triangle', undefined, 0, 0.3)
    this.noiseHit(0.5, 0.25, 220)
  }

  private chirp() {
    const base = 2600 + Math.random() * 1800
    const n = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) this.tone(base, 0.09, 0.025, 'sine', undefined, i * 0.11, 1.35)
  }

  update(dt: number, u: AudioUpdate) {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const near = u.playing ? Math.max(0, Math.min(1, (150 - u.junctionDist) / 120)) : 0
    const lieAudible = u.lying && u.lullabyTell

    this.lullabyGain.gain.setTargetAtTime(near * 0.22, now, 0.4)
    this.windGain.gain.setTargetAtTime(u.playing ? 0.06 : 0.035, now, 0.5)
    this.rainGain.gain.setTargetAtTime(u.rain * 0.09, now, 1)
    this.droneGain.gain.setTargetAtTime(u.glitch ? 0.5 : 0, now, 0.8)

    if (near > 0.01) {
      while (this.nextNoteTime < now + 0.2) {
        const [note, beats] = MELODY[this.noteIndex]
        const beat = lieAudible ? 0.42 : 0.32
        if (note !== null) {
          const detune = lieAudible ? Math.pow(2, (-(40 + Math.random() * 70)) / 1200) : 1
          const f = midiHz(note) * detune
          const when = this.nextNoteTime - now
          this.tone(f, 1.4, 0.18, 'sine', this.lullabyGain, when, lieAudible ? 0.94 : 1)
          this.tone(f * 2.01, 0.6, 0.05, 'sine', this.lullabyGain, when)
          this.tone(f * 3.0, 0.25, 0.02, 'triangle', this.lullabyGain, when)
        }
        this.nextNoteTime += beats * beat
        this.noteIndex = (this.noteIndex + 1) % MELODY.length
      }
    } else {
      this.nextNoteTime = now + 0.1
      this.noteIndex = 0
    }

    const birdsSilenced = u.glitch || (lieAudible && near > 0.05)
    this.birdTimer -= dt
    if (this.birdTimer <= 0) {
      this.birdTimer = 1.5 + Math.random() * 3.5
      if (!birdsSilenced && u.rain < 0.5) this.chirp()
    }
  }
}

export const audio = new GameAudio()
