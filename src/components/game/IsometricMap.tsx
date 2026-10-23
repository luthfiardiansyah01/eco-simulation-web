'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { GameAction } from '@/types'

export type MapActionTrigger = (action: GameAction) => void

interface Props {
  pollution: number
  biodiversity: number
  waterQuality: number
  trees: number
  onTileClick?: (type: string) => void
  /**
   * Registers the imperative action trigger with the parent. GameplayClient
   * calls it after a valid action so the canvas can animate without forcing
   * the map to re-render for every action.
   */
  onAction?: (trigger: MapActionTrigger) => void
}

const MAP = [
  [0, 0, 0, 1, 1, 1, 2, 2],
  [0, 0, 1, 1, 3, 1, 1, 2],
  [0, 1, 1, 3, 1, 1, 2, 2],
  [1, 1, 3, 1, 1, 2, 4, 4],
  [1, 3, 1, 1, 2, 4, 4, 4],
  [1, 1, 1, 2, 4, 4, 2, 1],
  [2, 2, 4, 4, 4, 2, 1, 1],
  [2, 4, 4, 4, 2, 1, 1, 0],
]

const TILE_TYPES = ['water', 'grass', 'dirt', 'tree', 'polluted']

type MapGeometry = {
  width: number
  height: number
  tileW: number
  tileH: number
  side: number
  rows: number
  cols: number
  offsetX: number
  offsetY: number
}

type EffectParticle = {
  angle: number
  speed: number
  size: number
  delay: number
  spin: number
  kind: 'dot' | 'leaf' | 'trash' | 'bubble'
}

type ActiveActionEffect = {
  type: GameAction
  start: number
  duration: number
  x: number
  y: number
  particles: EffectParticle[]
}

const TILE_COORDS = MAP.flatMap((row, rowIndex) =>
  row.map((type, colIndex) => ({ type, row: rowIndex, col: colIndex }))
)

const ACTION_COLORS: Record<GameAction, string> = {
  clean_waste: '74,222,128',
  plant_tree: '74,222,128',
  scan_water: '45,212,191',
  deploy_drone: '251,191,36',
  build_filter: '56,189,248',
  open_map: '251,191,36',
  analyze_area: '45,212,191',
  return_base: '251,191,36',
}

const ACTION_DURATIONS: Record<GameAction, number> = {
  clean_waste: 1100,
  plant_tree: 1000,
  scan_water: 1300,
  deploy_drone: 1500,
  build_filter: 1200,
  open_map: 1000,
  analyze_area: 1200,
  return_base: 850,
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function easeOutCubic(value: number) {
  const t = clamp01(value)
  return 1 - Math.pow(1 - t, 3)
}

function getMapGeometry(width: number, height: number): MapGeometry {
  const tileW = width < 360 ? 36 : width < 480 ? 46 : 58
  const tileH = tileW / 2
  const side = Math.round(tileH * 0.45)
  const rows = MAP.length
  const cols = MAP[0].length
  const mapH = (rows + cols) * (tileH / 2)

  return {
    width,
    height,
    tileW,
    tileH,
    side,
    rows,
    cols,
    offsetX: width / 2,
    offsetY: Math.max(16, (height - mapH - side) / 2),
  }
}

function getTileCenter(geo: MapGeometry, row: number, col: number) {
  return {
    x: geo.offsetX + (col - row) * (geo.tileW / 2),
    y: geo.offsetY + (col + row) * (geo.tileH / 2) + geo.tileH / 2,
  }
}

function pickActionTile(action: GameAction, seed: number) {
  const preferredTypes: Record<GameAction, number[]> = {
    clean_waste: [4, 2],
    plant_tree: [1, 3],
    scan_water: [0],
    deploy_drone: [1, 0, 2],
    build_filter: [0],
    open_map: [1, 2, 0],
    analyze_area: [1, 3, 4],
    return_base: [1, 2],
  }

  const candidates = TILE_COORDS.filter((tile) => preferredTypes[action].includes(tile.type))
  const pool = candidates.length > 0 ? candidates : TILE_COORDS
  return pool[seed % pool.length]
}

function createEffectParticles(action: GameAction): EffectParticle[] {
  const kinds: Record<GameAction, EffectParticle['kind'][]> = {
    clean_waste: ['trash', 'dot', 'trash', 'dot'],
    plant_tree: ['leaf', 'leaf', 'dot'],
    scan_water: ['bubble', 'dot', 'bubble'],
    deploy_drone: ['dot', 'dot', 'bubble'],
    build_filter: ['bubble', 'bubble', 'dot'],
    open_map: ['dot', 'dot'],
    analyze_area: ['dot', 'dot', 'bubble'],
    return_base: ['dot', 'dot'],
  }
  const actionKinds = kinds[action]
  const count = action === 'plant_tree' ? 12 : 16

  return Array.from({ length: count }, (_, index) => {
    const upward = action === 'plant_tree' || action === 'build_filter'
    const angle = upward
      ? -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      : Math.random() * Math.PI * 2

    return {
      angle,
      speed: 14 + Math.random() * 38,
      size: 1 + Math.random() * 2.4,
      delay: Math.random() * 0.22,
      spin: Math.random() * Math.PI * 2,
      kind: actionKinds[index % actionKinds.length],
    }
  })
}

function drawPulseRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  geo: MapGeometry,
  progress: number,
  color: string,
  alpha: number
) {
  const grow = easeOutCubic(progress)
  const rx = geo.tileW * (0.22 + grow * 0.78)
  const ry = geo.tileH * (0.16 + grow * 0.44)

  ctx.strokeStyle = `rgba(${color},${alpha * (1 - progress)})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function drawActionParticles(
  ctx: CanvasRenderingContext2D,
  effect: ActiveActionEffect,
  t: number,
  color: string,
  fade: number
) {
  effect.particles.forEach((particle) => {
    const local = clamp01((t - particle.delay) / (1 - particle.delay))
    if (local <= 0) return

    const distance = particle.speed * local
    const x = effect.x + Math.cos(particle.angle) * distance
    const y = effect.y + Math.sin(particle.angle) * distance * 0.55
      - (particle.kind === 'leaf' ? local * 18 : 0)
    const alpha = Math.sin(Math.PI * clamp01(local * 1.25)) * fade

    if (particle.kind === 'trash') {
      ctx.fillStyle = `rgba(138,104,48,${alpha})`
      ctx.fillRect(x - particle.size, y - particle.size, particle.size * 2, particle.size * 2)
      return
    }

    if (particle.kind === 'bubble') {
      ctx.strokeStyle = `rgba(${color},${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, particle.size, 0, Math.PI * 2)
      ctx.stroke()
      return
    }

    if (particle.kind === 'leaf') {
      ctx.fillStyle = `rgba(74,222,128,${alpha})`
      ctx.beginPath()
      ctx.ellipse(
        x,
        y,
        particle.size * 1.5,
        particle.size * 0.65,
        particle.spin + local * 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      return
    }

    ctx.fillStyle = `rgba(${color},${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawActionEffect(
  ctx: CanvasRenderingContext2D,
  effect: ActiveActionEffect,
  t: number,
  geo: MapGeometry
) {
  const color = ACTION_COLORS[effect.type]
  const fade = clamp01(1 - t)
  const { x, y } = effect

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // A soft landing pad/ripple shared by every action.
  drawPulseRing(ctx, x, y, geo, clamp01(t * 1.35), color, 0.75)
  drawPulseRing(ctx, x, y, geo, clamp01(t * 1.35 - 0.22), color, 0.35)

  drawActionParticles(ctx, effect, t, color, fade)

  switch (effect.type) {
    case 'plant_tree': {
      const grow = easeOutCubic(clamp01(t / 0.65))
      const rootY = y + geo.tileH * 0.12
      const topY = rootY - geo.tileH * 1.25 * grow
      const leafFade = clamp01((1 - t) * 3)
      const leafR = geo.tileW * 0.2 * grow

      ctx.strokeStyle = `rgba(90,58,26,${leafFade})`
      ctx.lineWidth = Math.max(1.5, geo.tileW * 0.045)
      ctx.beginPath()
      ctx.moveTo(x, rootY)
      ctx.lineTo(x, topY)
      ctx.stroke()

      ctx.fillStyle = `rgba(34,168,58,${leafFade})`
      ctx.beginPath()
      ctx.arc(x, topY, leafR, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(74,222,128,${leafFade})`
      ctx.beginPath()
      ctx.arc(x - leafR * 0.35, topY - leafR * 0.2, leafR * 0.62, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'scan_water': {
      const angle = -Math.PI / 2 + t * Math.PI * 2
      const radius = geo.tileW * 0.72

      ctx.strokeStyle = `rgba(${color},${0.8 * fade})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, radius, angle, angle + Math.PI * 0.65)
      ctx.stroke()

      ctx.fillStyle = `rgba(${color},${0.7 * fade})`
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'deploy_drone': {
      const travel = easeOutCubic(t)
      const droneX = x - geo.tileW * 1.15 + geo.tileW * 2.3 * travel
      const droneY = y - geo.tileH * 0.85 - Math.sin(t * Math.PI) * geo.tileH * 0.9

      ctx.strokeStyle = `rgba(${color},${0.3 * fade})`
      ctx.lineWidth = 1
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.moveTo(x - geo.tileW * 1.15, y - geo.tileH * 0.3)
      ctx.quadraticCurveTo(x, y - geo.tileH * 2.2, droneX, droneY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = `rgba(251,191,36,${fade})`
      ctx.fillRect(droneX - 5, droneY - 2, 10, 4)
      ctx.beginPath()
      ctx.arc(droneX, droneY, 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(251,191,36,${0.8 * fade})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(droneX - 8, droneY - 5)
      ctx.lineTo(droneX + 8, droneY - 5)
      ctx.moveTo(droneX - 8, droneY + 4)
      ctx.lineTo(droneX + 8, droneY + 4)
      ctx.stroke()
      break
    }

    case 'build_filter': {
      const filterR = geo.tileW * 0.16
      ctx.fillStyle = `rgba(${color},${0.32 * fade})`
      ctx.beginPath()
      ctx.arc(x, y, filterR * 1.7, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = `rgba(${color},${0.9 * fade})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, filterR, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(x - filterR * 0.55, y)
      ctx.lineTo(x + filterR * 0.55, y)
      ctx.moveTo(x, y - filterR * 0.55)
      ctx.lineTo(x, y + filterR * 0.55)
      ctx.stroke()
      break
    }

    case 'analyze_area':
    case 'open_map': {
      const radius = geo.tileW * (0.55 + easeOutCubic(t) * 0.55)
      ctx.strokeStyle = `rgba(${color},${0.55 * fade})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - radius, y)
      ctx.lineTo(x + radius, y)
      ctx.moveTo(x, y - radius * 0.65)
      ctx.lineTo(x, y + radius * 0.65)
      ctx.stroke()

      ctx.fillStyle = `rgba(${color},${0.7 * fade})`
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'return_base': {
      ctx.strokeStyle = `rgba(${color},${0.65 * fade})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y - geo.tileH * 0.25)
      ctx.lineTo(x + geo.tileW * 0.18, y + geo.tileH * 0.18)
      ctx.lineTo(x - geo.tileW * 0.18, y + geo.tileH * 0.18)
      ctx.closePath()
      ctx.stroke()
      break
    }

    case 'clean_waste':
    default:
      break
  }

  ctx.restore()
}

function drawActionEffects(
  ctx: CanvasRenderingContext2D,
  effects: ActiveActionEffect[],
  now: number,
  geo: MapGeometry
) {
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index]
    const t = (now - effect.start) / effect.duration

    if (t >= 1) {
      effects.splice(index, 1)
      continue
    }

    drawActionEffect(ctx, effect, clamp01(t), geo)
  }
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t)
}

export default function IsometricMap({
  pollution,
  biodiversity,
  waterQuality,
  trees,
  onTileClick,
  onAction,
}: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rippleRef = useRef<number>(0)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; phase: number }[]>([])
  const actionEffectsRef = useRef<ActiveActionEffect[]>([])
  const actionSeqRef = useRef(0)

  const draw = useCallback((canvas: HTMLCanvasElement, now = performance.now()) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const geo = getMapGeometry(W, H)
    const {
      tileW: TILE_W,
      tileH: TILE_H,
      side: SIDE,
      rows: ROWS,
      cols: COLS,
      offsetX,
      offsetY,
    } = geo

    // Dynamic colors
    const wq = waterQuality / 100
    const waterColor = `rgb(${lerp(0x5a, 0x1e, wq)},${lerp(0x1e, 0x6b, wq)},${lerp(0x1e, 0x9c, wq)})`
    const waterDark  = `rgb(${lerp(0x3a, 0x0e, wq)},${lerp(0x0e, 0x4b, wq)},${lerp(0x0e, 0x7c, wq)})`

    const pl = pollution / 100
    const pollColor = `rgb(${lerp(0x2d, 0x5a, pl)},${lerp(0x7a, 0x3a, pl)},${lerp(0x3a, 0x0a, pl)})`
    const pollDark  = `rgb(${lerp(0x1d, 0x4a, pl)},${lerp(0x5a, 0x2a, pl)},${lerp(0x2a, 0x00, pl)})`

    const tileTop: Record<number, string> = {
      0: waterColor,
      1: '#2d7a3a',
      2: '#8b6914',
      3: '#1a5c28',
      4: pollColor,
    }
    const tileSide: Record<number, string> = {
      0: waterDark,
      1: '#1a5225',
      2: '#6b4f10',
      3: '#0f3a18',
      4: pollDark,
    }

    // Clear
    ctx.fillStyle = '#0a1a14'
    ctx.fillRect(0, 0, W, H)

    // Draw tiles back to front (painter's algorithm)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tileType = MAP[row][col]
        const drawType = (tileType === 1 && trees > 30 && (row + col) % 3 === 0) ? 3 : tileType

        const isoX = offsetX + (col - row) * (TILE_W / 2)
        const isoY = offsetY + (col + row) * (TILE_H / 2)

        // Left face
        ctx.fillStyle = tileSide[tileType]
        ctx.beginPath()
        ctx.moveTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
        ctx.lineTo(isoX, isoY + TILE_H)
        ctx.lineTo(isoX, isoY + TILE_H + SIDE)
        ctx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2 + SIDE)
        ctx.closePath()
        ctx.fill()

        // Right face (slightly lighter than left)
        ctx.fillStyle = tileTop[tileType]
        ctx.globalAlpha = 0.6
        ctx.beginPath()
        ctx.moveTo(isoX, isoY + TILE_H)
        ctx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
        ctx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2 + SIDE)
        ctx.lineTo(isoX, isoY + TILE_H + SIDE)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1

        // Top face
        ctx.fillStyle = tileTop[tileType]
        ctx.beginPath()
        ctx.moveTo(isoX, isoY)
        ctx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
        ctx.lineTo(isoX, isoY + TILE_H)
        ctx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
        ctx.closePath()
        ctx.fill()

        // Water ripple
        if (tileType === 0) {
          const phase = (rippleRef.current / 60 + row * 0.3 + col * 0.2) % 1
          ctx.strokeStyle = `rgba(77,212,240,${0.15 + phase * 0.1})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.ellipse(isoX, isoY + TILE_H / 2, TILE_W * 0.3 * (0.8 + phase * 0.4), TILE_H * 0.2 * (0.8 + phase * 0.4), 0, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Tree
        if (drawType === 3) {
          const tw = Math.max(3, TILE_W * 0.07)
          const th = TILE_H * 0.55
          const cr = TILE_W * 0.18

          ctx.fillStyle = '#5a3a1a'
          ctx.fillRect(isoX - tw / 2, isoY - th, tw, th)

          ctx.fillStyle = '#1a7a2a'
          ctx.beginPath()
          ctx.arc(isoX, isoY - th - cr * 0.4, cr, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#22a83a'
          ctx.beginPath()
          ctx.arc(isoX, isoY - th - cr * 0.9, cr * 0.65, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Pollution haze
    if (pollution > 40) {
      ctx.fillStyle = `rgba(80,60,0,${0.1 * (pollution / 100)})`
      ctx.fillRect(0, 0, W, H)
    }

    // Biodiversity particles
    if (biodiversity > 30) {
      particlesRef.current.forEach((p) => {
        const alpha = 0.5 + Math.sin(p.phase) * 0.3
        ctx.fillStyle = `rgba(74,222,128,${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Action feedback animations
    drawActionEffects(ctx, actionEffectsRef.current, now, geo)

    // Legend
    const legendY = H - 18
    const itemW = Math.floor(W / 4)
    const fontSize = W < 360 ? 8 : 9
    ctx.font = `${fontSize}px Arial`
    const legendItems = [
      { color: waterColor, label: t('Sungai') },
      { color: '#2d7a3a', label: t('Tanah')  },
      { color: '#1a5c28', label: t('Pohon')  },
      { color: pollColor, label: t('Cemar')  },
    ]
    legendItems.forEach((item, i) => {
      const lx = i * itemW + 6
      ctx.fillStyle = item.color
      ctx.fillRect(lx, legendY, 8, 8)
      ctx.fillStyle = '#86efac'
      ctx.fillText(item.label, lx + 11, legendY + 8)
    })
  }, [pollution, biodiversity, waterQuality, trees, t])

  /**
   * Called imperatively by GameplayClient after a valid action. The effect is
   * stored in a ref so the existing requestAnimationFrame loop can draw it
   * without causing a React re-render.
   */
  const triggerAction = useCallback((action: GameAction) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const geo = getMapGeometry(canvas.width, canvas.height)
    actionSeqRef.current += 1

    const tile = pickActionTile(action, actionSeqRef.current)
    const center = getTileCenter(geo, tile.row, tile.col)

    actionEffectsRef.current = [
      ...actionEffectsRef.current.slice(-4),
      {
        type: action,
        start: performance.now(),
        duration: ACTION_DURATIONS[action],
        x: center.x,
        y: center.y,
        particles: createEffectParticles(action),
      },
    ]
  }, [])

  // Register the trigger with GameplayClient. Keeping it in a callback avoids
  // a map re-render every time an action button is pressed.
  useEffect(() => {
    onAction?.(triggerAction)
  }, [onAction, triggerAction])

  // Init particles
  useEffect(() => {
    if (!canvasRef.current) return
    const W = canvasRef.current.width
    const H = canvasRef.current.height
    const count = Math.min(6, Math.floor(biodiversity / 15))
    particlesRef.current = Array.from({ length: count }, () => ({
      x: 30 + Math.random() * (W - 60),
      y: 30 + Math.random() * (H - 60),
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.4,
      phase: Math.random() * Math.PI * 2,
    }))
  }, [biodiversity])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let running = true
    const loop = () => {
      if (!running) return
      rippleRef.current = (rippleRef.current + 1) % 60

      // Update particles
      const W = canvas.width
      const H = canvas.height
      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.phase += 0.04
        if (p.x < 10 || p.x > W - 10) p.vx *= -1
        if (p.y < 10 || p.y > H - 10) p.vy *= -1
      })

      draw(canvas, performance.now())
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const observer = new ResizeObserver(() => {
      canvas.width = parent.offsetWidth || 360
      canvas.height = parent.offsetHeight || 260
    })
    observer.observe(parent)

    // Initial size
    canvas.width = parent.offsetWidth || 360
    canvas.height = parent.offsetHeight || 260

    return () => observer.disconnect()
  }, [])

  // Touch/click handler
  const handleInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const geo = getMapGeometry(canvas.width, canvas.height)
    const { rows: ROWS, cols: COLS, tileW: TILE_W } = geo

    // Find closest tile
    let closest = { dist: Infinity, type: 1 }
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const center = getTileCenter(geo, row, col)
        const dist = Math.hypot(x - center.x, y - center.y)
        if (dist < closest.dist) {
          closest = { dist, type: MAP[row][col] }
        }
      }
    }

    if (closest.dist < TILE_W) {
      onTileClick?.(TILE_TYPES[closest.type] ?? 'unknown')
    }
  }, [onTileClick])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    />
  )
}
