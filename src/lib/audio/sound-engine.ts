export type SoundName =
  | 'click'
  | 'toggle'
  | 'success'
  | 'error'
  | 'clean'
  | 'plant'
  | 'water'
  | 'drone'
  | 'filter'
  | 'map'
  | 'tile'
  | 'start'
  | 'missionComplete'
  | 'achievement'

type ToneOptions = {
  type?: OscillatorType
  volume?: number
  endFreq?: number
  attack?: number
  detune?: number
}

type NoiseOptions = {
  volume?: number
  frequency?: number
  endFrequency?: number
  q?: number
  type?: BiquadFilterType
}

/**
 * Small Web Audio synth for UI and gameplay feedback.
 *
 * Sounds are generated at runtime instead of shipping audio files, so the PWA
 * gets feedback without adding cache weight or licensing concerns. The context
 * is created lazily on the first user gesture to satisfy browser autoplay rules.
 */
class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false
  private volume = 0.7
  private readonly maxVolume = 0.4

  private ambienceRunning = false
  private ambienceGain: GainNode | null = null
  private ambienceNodes: AudioScheduledSourceNode[] = []
  private ambienceTimer: number | null = null

  setMuted(muted: boolean) {
    this.muted = muted
    this.applyMasterGain()
  }

  /** `volume` is normalized 0–1; the engine applies a safe maximum gain. */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    this.applyMasterGain()
  }

  private applyMasterGain() {
    if (!this.ctx || !this.master) return

    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(
      this.muted ? 0 : this.volume * this.maxVolume,
      now,
      0.02
    )
  }

  async unlock() {
    const ctx = this.ensureContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // Browsers can still reject resume() outside a trusted gesture.
      }
    }
  }

  /**
   * Procedural nature ambience for gameplay: a soft pad, river, wind, and
   * occasional synthesized birds. No samples or third-party recordings are used.
   */
  startAmbience() {
    if (this.ambienceRunning) return

    const ctx = this.ensureContext()
    const master = this.master
    if (!ctx || !master) return

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // The next trusted gesture will retry.
      })
    }

    this.ambienceRunning = true

    const bus = ctx.createGain()
    bus.gain.setValueAtTime(0.0001, ctx.currentTime)
    bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 2.5)
    bus.connect(master)

    this.ambienceGain = bus

    // River: looping brown noise with a slowly moving low-pass filter.
    const water = ctx.createBufferSource()
    water.buffer = this.createNoiseBuffer(4, 'brown')
    water.loop = true

    const waterFilter = ctx.createBiquadFilter()
    waterFilter.type = 'lowpass'
    waterFilter.frequency.value = 900
    waterFilter.Q.value = 0.6

    const waterGain = ctx.createGain()
    waterGain.gain.value = 0.35

    const waterLfo = ctx.createOscillator()
    waterLfo.frequency.value = 0.08
    const waterLfoGain = ctx.createGain()
    waterLfoGain.gain.value = 250
    waterLfo.connect(waterLfoGain)
    waterLfoGain.connect(waterFilter.frequency)

    water.connect(waterFilter)
    waterFilter.connect(waterGain)
    waterGain.connect(bus)

    // Wind: pink noise, gently swelling in and out.
    const wind = ctx.createBufferSource()
    wind.buffer = this.createNoiseBuffer(5, 'pink')
    wind.loop = true

    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 620
    windFilter.Q.value = 0.4

    const windGain = ctx.createGain()
    windGain.gain.value = 0.11

    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.05
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 0.075
    windLfo.connect(windLfoGain)
    windLfoGain.connect(windGain.gain)

    wind.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(bus)

    // Pad: a quiet open fifth that keeps the ambience musical.
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 720
    const padGain = ctx.createGain()
    padGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    padGain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 4)
    padFilter.connect(padGain)
    padGain.connect(bus)

    const padNotes = [
      { frequency: 130.81, type: 'sine' as OscillatorType, detune: -4 },
      { frequency: 196, type: 'triangle' as OscillatorType, detune: 3 },
      { frequency: 261.63, type: 'sine' as OscillatorType, detune: -2 },
      { frequency: 329.63, type: 'triangle' as OscillatorType, detune: 5 },
    ]
    padNotes.forEach(({ frequency, type, detune }) => {
      const oscillator = ctx.createOscillator()
      const voiceGain = ctx.createGain()

      oscillator.type = type
      oscillator.frequency.value = frequency
      oscillator.detune.value = detune
      voiceGain.gain.value = 0.22

      oscillator.connect(voiceGain)
      voiceGain.connect(padFilter)
      oscillator.start()

      this.ambienceNodes.push(oscillator)
    })

    water.start()
    wind.start()
    waterLfo.start()
    windLfo.start()

    this.ambienceNodes.push(water, wind, waterLfo, windLfo)

    // Birds arrive every few seconds, with no strict rhythm.
    const scheduleBird = () => {
      if (!this.ambienceRunning) return

      this.ambienceTimer = window.setTimeout(() => {
        this.ambienceTimer = null
        if (!this.ambienceRunning) return
        this.chirp()
        scheduleBird()
      }, 4_000 + Math.random() * 5_000)
    }

    scheduleBird()
  }

  stopAmbience() {
    if (!this.ambienceRunning) return

    this.ambienceRunning = false
    if (this.ambienceTimer !== null) {
      window.clearTimeout(this.ambienceTimer)
      this.ambienceTimer = null
    }

    const ctx = this.ctx
    const bus = this.ambienceGain
    const nodes = this.ambienceNodes

    this.ambienceGain = null
    this.ambienceNodes = []

    if (!ctx || !bus) return

    const now = ctx.currentTime
    bus.gain.cancelScheduledValues(now)
    bus.gain.setTargetAtTime(0.0001, now, 0.25)

    window.setTimeout(() => {
      nodes.forEach((node) => {
        try {
          node.stop()
          node.disconnect()
        } catch {
          // A source may already have ended naturally.
        }
      })
      bus.disconnect()
    }, 1_200)
  }

  play(name: SoundName) {
    if (this.muted) return

    const ctx = this.ensureContext()
    if (!ctx || !this.master) return

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // The next trusted gesture will retry.
      })
    }

    const now = ctx.currentTime + 0.005

    switch (name) {
      case 'click':
        this.tone(700, now, 0.055, {
          type: 'triangle',
          volume: 0.08,
          endFreq: 480,
          attack: 0.003,
        })
        break

      case 'toggle':
        this.tone(520, now, 0.055, { type: 'triangle', volume: 0.07 })
        this.tone(760, now + 0.05, 0.07, { type: 'triangle', volume: 0.06 })
        break

      case 'success':
        this.sequence([523.25, 659.25, 783.99], now, 0.08, 0.13, 0.09)
        break

      case 'error':
        this.tone(190, now, 0.18, {
          type: 'sawtooth',
          volume: 0.08,
          endFreq: 120,
        })
        this.tone(95, now + 0.02, 0.22, {
          type: 'square',
          volume: 0.035,
          endFreq: 70,
        })
        break

      case 'clean':
        this.noise(now, 0.28, {
          volume: 0.075,
          frequency: 1_200,
          endFrequency: 400,
          q: 0.8,
        })
        this.tone(220, now, 0.16, {
          type: 'triangle',
          volume: 0.045,
          endFreq: 110,
        })
        break

      case 'plant':
        this.tone(300, now, 0.1, {
          type: 'triangle',
          volume: 0.075,
          endFreq: 420,
        })
        this.tone(520, now + 0.09, 0.13, {
          type: 'sine',
          volume: 0.055,
          endFreq: 660,
        })
        break

      case 'water':
        this.tone(760, now, 0.22, {
          type: 'sine',
          volume: 0.05,
          endFreq: 1_280,
        })
        this.tone(1_180, now + 0.1, 0.2, {
          type: 'sine',
          volume: 0.035,
          endFreq: 880,
        })
        this.noise(now, 0.25, {
          volume: 0.018,
          frequency: 2_500,
          q: 1.5,
        })
        break

      case 'drone':
        this.tone(95, now, 0.32, {
          type: 'sawtooth',
          volume: 0.04,
          endFreq: 150,
        })
        this.tone(190, now + 0.02, 0.28, {
          type: 'triangle',
          volume: 0.028,
          endFreq: 240,
        })
        this.noise(now, 0.3, {
          volume: 0.018,
          frequency: 900,
          q: 0.6,
        })
        break

      case 'filter':
        this.tone(120, now, 0.18, {
          type: 'sine',
          volume: 0.09,
          endFreq: 70,
        })
        this.tone(620, now + 0.05, 0.24, {
          type: 'sine',
          volume: 0.04,
          endFreq: 980,
        })
        this.noise(now + 0.02, 0.24, {
          volume: 0.028,
          frequency: 1_800,
          q: 1,
        })
        break

      case 'map':
        this.tone(440, now, 0.06, { type: 'triangle', volume: 0.05 })
        this.tone(660, now + 0.06, 0.08, { type: 'triangle', volume: 0.04 })
        break

      case 'tile':
        this.tone(260, now, 0.045, {
          type: 'triangle',
          volume: 0.045,
          endFreq: 220,
        })
        break

      case 'start':
        this.sequence([392, 523.25], now, 0.09, 0.11, 0.08)
        break

      case 'missionComplete':
        this.sequence([523.25, 659.25, 783.99, 1_046.5], now, 0.16, 0.12, 0.09)
        this.sequence([659.25, 783.99, 1_046.5], now + 0.62, 0.24, 0.11, 0.1)
        this.noise(now + 0.1, 0.5, {
          volume: 0.02,
          frequency: 3_000,
          q: 0.8,
        })
        break

      case 'achievement':
        this.sequence([880, 1_174.66, 1_567.98, 2_093], now, 0.08, 0.18, 0.055)
        this.noise(now, 0.4, {
          volume: 0.015,
          frequency: 4_000,
          q: 1.2,
        })
        break
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      const AudioContextCtor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext

      if (!AudioContextCtor) return null

      this.ctx = new AudioContextCtor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume * this.maxVolume
      this.master.connect(this.ctx.destination)
    }

    return this.ctx
  }

  private sequence(
    frequencies: number[],
    start: number,
    spacing: number,
    duration: number,
    volume: number
  ) {
    frequencies.forEach((frequency, index) => {
      this.tone(frequency, start + index * spacing, duration, {
        type: 'triangle',
        volume,
      })
    })
  }

  private chirp() {
    const ctx = this.ctx
    const bus = this.ambienceGain
    if (!ctx || !bus) return

    const start = ctx.currentTime + 0.05
    const base = 1_400 + Math.random() * 1_200
    const notes = 2 + Math.floor(Math.random() * 2)

    for (let index = 0; index < notes; index += 1) {
      const noteStart = start + index * 0.1

      this.tone(
        base,
        noteStart,
        0.075,
        {
          type: 'sine',
          volume: 0.12,
          endFreq: base * 1.35,
          attack: 0.005,
        },
        bus
      )

      this.tone(
        base * 1.45,
        noteStart + 0.035,
        0.055,
        {
          type: 'triangle',
          volume: 0.06,
          endFreq: base * 1.7,
          attack: 0.004,
        },
        bus
      )
    }
  }

  private createNoiseBuffer(duration: number, color: 'brown' | 'pink'): AudioBuffer {
    const ctx = this.ctx
    if (!ctx) throw new Error('Audio context is not available')

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    if (color === 'brown') {
      let last = 0
      for (let index = 0; index < frameCount; index += 1) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[index] = last * 3.5
      }
      return buffer
    }

    // Paul Kellet's pink-noise approximation.
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0

    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[index] =
        (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }

    return buffer
  }

  private tone(
    frequency: number,
    start: number,
    duration: number,
    options: ToneOptions = {},
    destination?: AudioNode
  ) {
    const ctx = this.ctx
    const output = destination ?? this.master
    if (!ctx || !output) return

    const {
      type = 'sine',
      volume = 0.1,
      endFreq,
      attack = 0.01,
      detune = 0,
    } = options

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start)
    if (endFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        start + duration
      )
    }
    if (detune) oscillator.detune.setValueAtTime(detune, start)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(volume, start + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    oscillator.connect(gain)
    gain.connect(output)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private noise(start: number, duration: number, options: NoiseOptions = {}) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const {
      volume = 0.05,
      frequency = 800,
      endFrequency,
      q = 0.8,
      type = 'bandpass',
    } = options

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frameCount; index += 1) {
      data[index] = Math.random() * 2 - 1
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(frequency, start)
    if (endFrequency) {
      filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration)
    }
    filter.Q.value = q

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(start)
    source.stop(start + duration + 0.02)
  }
}

export const soundEngine = new SoundEngine()
