'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useI18n } from '@/components/settings/PreferencesProvider'
import type { GameAction } from '@/types'
import {
  hotspotLevelColor,
  type MapHotspot,
} from '@/lib/gameplay/hotspots'

export type MapActionTrigger = (action: GameAction) => void

interface Props {
  pollution: number
  biodiversity: number
  waterQuality: number
  trees: number
  hotspots: MapHotspot[]
  selectedHotspotId?: string | null
  onTileClick?: (type: string) => void
  onHotspotClick?: (hotspot: MapHotspot) => void
  /**
   * Registers the imperative action trigger with the parent. GameplayClient
   * calls it after a valid action so the canvas can animate without forcing
   * the map to re-render for every action.
   */
  onAction?: (trigger: MapActionTrigger) => void
}

/**
 * A small river basin: forest in the back-left, farmland on the left, a winding
 * river on the right, and polluted ground at the lower bend. A hand-drawn look
 * is intentional; every tile has its own height, texture, and props.
 */
const MAP = [
  [3, 3, 1, 1, 0, 0, 1, 2, 2],
  [3, 1, 1, 1, 0, 0, 0, 2, 2],
  [1, 1, 3, 1, 1, 0, 0, 1, 2],
  [1, 3, 3, 1, 1, 1, 0, 0, 1],
  [2, 1, 3, 1, 1, 1, 1, 0, 0],
  [2, 2, 1, 1, 1, 4, 1, 0, 0],
  [2, 2, 2, 1, 4, 4, 1, 1, 0],
  [2, 2, 1, 4, 4, 4, 1, 1, 0],
  [1, 2, 1, 1, 4, 1, 1, 0, 0],
]

const TILE_TYPES = ['water', 'grass', 'dirt', 'tree', 'polluted']

const HUT_TILE = { row: 0, col: 6 }
const BRIDGE_TILE = { row: 2, col: 5 }

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

type TapEffect = {
  x: number
  y: number
  start: number
}

type TilePalette = {
  top: string
  left: string
  right: string
  edge: string
}

const TILE_COORDS = MAP.flatMap((row, rowIndex) =>
  row.map((type, colIndex) => ({ type, row: rowIndex, col: colIndex }))
)

/** Deterministic per-tile noise so the map feels natural but stays stable. */
function tileNoise(row: number, col: number, salt = 0) {
  const value = Math.sin(row * 127.1 + col * 311.7 + salt * 74.7) * 43758.5453
  return value - Math.floor(value)
}

/**
 * Height in half-tile units. Water sits low, forest and dry ground sit higher,
 * which gives the map visible cliffs instead of a flat board.
 */
const TILE_HEIGHTS = MAP.map((row, rowIndex) =>
  row.map((type, colIndex) => {
    const noise = tileNoise(rowIndex, colIndex, 3)
    if (type === 0) return 0
    if (type === 3) return 0.95 + noise * 0.35
    if (type === 4) return 0.18 + noise * 0.22
    if (type === 2) return 0.38 + noise * 0.25
    return 0.5 + noise * 0.25
  })
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

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function rgb(r: number, g: number, b: number, alpha = 1) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`
}

function getTilePalette(
  type: number,
  row: number,
  col: number,
  waterQuality: number,
  pollution: number
): TilePalette {
  const noise = tileNoise(row, col, 1)
  const variation = (noise - 0.5) * 20

  let base: [number, number, number]

  if (type === 0) {
    // Polluted water turns olive/brown; clean water is a deep river blue.
    const clean: [number, number, number] = [47, 139, 181]
    const dirty: [number, number, number] = [103, 108, 66]
    const t = clamp01(waterQuality / 100)
    base = [
      mix(dirty[0], clean[0], t),
      mix(dirty[1], clean[1], t),
      mix(dirty[2], clean[2], t),
    ]
  } else if (type === 3) {
    base = [47, 108, 58]
  } else if (type === 4) {
    const cleanSoil: [number, number, number] = [108, 105, 60]
    const sludge: [number, number, number] = [91, 59, 36]
    const t = clamp01(pollution / 100)
    base = [
      mix(cleanSoil[0], sludge[0], t),
      mix(cleanSoil[1], sludge[1], t),
      mix(cleanSoil[2], sludge[2], t),
    ]
  } else if (type === 2) {
    base = [158, 126, 76]
  } else {
    base = [63, 139, 77]
  }

  const top = [
    base[0] + variation,
    base[1] + variation,
    base[2] + variation * 0.7,
  ]
  const left = [top[0] * 0.62, top[1] * 0.62, top[2] * 0.62]
  const right = [top[0] * 0.79, top[1] * 0.79, top[2] * 0.79]

  return {
    top: rgb(top[0], top[1], top[2]),
    left: rgb(left[0], left[1], left[2]),
    right: rgb(right[0], right[1], right[2]),
    edge: type === 0 ? 'rgba(156,232,244,0.28)' : 'rgba(243,225,174,0.26)',
  }
}

function isInsideMap(row: number, col: number) {
  return row >= 0 && row < MAP.length && col >= 0 && col < MAP[0].length
}

function hasWaterNeighbor(row: number, col: number) {
  return (
    (isInsideMap(row - 1, col) && MAP[row - 1][col] === 0) ||
    (isInsideMap(row + 1, col) && MAP[row + 1][col] === 0) ||
    (isInsideMap(row, col - 1) && MAP[row][col - 1] === 0) ||
    (isInsideMap(row, col + 1) && MAP[row][col + 1] === 0)
  )
}

function getMapGeometry(width: number, height: number): MapGeometry {
  const rows = MAP.length
  const cols = MAP[0].length
  const tileW = Math.max(
    30,
    Math.min(84, Math.floor(Math.min(width / (cols + 1.5), (height - 28) / 5)))
  )
  const tileH = tileW / 2
  const side = Math.round(tileH * 0.4)
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
    offsetY: Math.max(20, (height - 28 - mapH - side) / 2 + 5),
  }
}

function getTileBase(geo: MapGeometry, row: number, col: number) {
  return {
    x: geo.offsetX + (col - row) * (geo.tileW / 2),
    y: geo.offsetY + (col + row) * (geo.tileH / 2),
  }
}

function getTileCenter(geo: MapGeometry, row: number, col: number) {
  const base = getTileBase(geo, row, col)
  const lift = TILE_HEIGHTS[row][col] * geo.tileH * 0.55
  return { x: base.x, y: base.y + geo.tileH / 2 - lift }
}

function getHotspotPosition(geo: MapGeometry, hotspot: MapHotspot) {
  const center = getTileCenter(geo, hotspot.row, hotspot.col)
  return { x: center.x, y: center.y - geo.tileH * 0.42 }
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

function diamondPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  tileW: number,
  tileH: number
) {
  ctx.beginPath()
  ctx.moveTo(x, topY)
  ctx.lineTo(x + tileW / 2, topY + tileH / 2)
  ctx.lineTo(x, topY + tileH)
  ctx.lineTo(x - tileW / 2, topY + tileH / 2)
  ctx.closePath()
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawTreeProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  tileW: number,
  tileH: number,
  variation: number
) {
  const trunkW = Math.max(2, tileW * 0.055)
  const trunkH = tileH * (0.7 + variation * 0.22)
  const crown = tileW * (0.17 + variation * 0.04)

  // Soft cast shadow, always toward the lower right.
  ctx.fillStyle = 'rgba(4, 18, 12, 0.25)'
  ctx.beginPath()
  ctx.ellipse(
    x + tileW * 0.15,
    groundY + tileH * 0.12,
    crown * 0.95,
    crown * 0.32,
    0,
    0,
    Math.PI * 2
  )
  ctx.fill()

  ctx.fillStyle = '#5b3b20'
  ctx.fillRect(x - trunkW / 2, groundY - trunkH, trunkW, trunkH)

  ctx.fillStyle = '#1a6a35'
  ctx.beginPath()
  ctx.arc(x, groundY - trunkH - crown * 0.35, crown, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2f9147'
  ctx.beginPath()
  ctx.arc(
    x - crown * 0.3,
    groundY - trunkH - crown * 0.62,
    crown * 0.66,
    0,
    Math.PI * 2
  )
  ctx.fill()

  ctx.fillStyle = '#7bd88f'
  ctx.beginPath()
  ctx.arc(
    x + crown * 0.22,
    groundY - trunkH - crown * 0.9,
    crown * 0.38,
    0,
    Math.PI * 2
  )
  ctx.fill()
}

function drawHutProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  tileW: number,
  tileH: number
) {
  const w = tileW * 0.5
  const h = tileH * 0.48
  const roofH = tileH * 0.34

  ctx.fillStyle = 'rgba(4, 18, 12, 0.28)'
  ctx.beginPath()
  ctx.ellipse(x + tileW * 0.12, groundY + tileH * 0.13, w * 0.8, tileH * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wall
  ctx.fillStyle = '#d7c08b'
  ctx.fillRect(x - w / 2, groundY - h, w, h)
  ctx.fillStyle = 'rgba(94, 68, 37, 0.35)'
  ctx.fillRect(x + w * 0.1, groundY - h, w * 0.4, h)

  // Door and window
  ctx.fillStyle = '#5b3b20'
  ctx.fillRect(x - w * 0.18, groundY - h * 0.58, w * 0.24, h * 0.58)
  ctx.fillStyle = 'rgba(120, 205, 231, 0.75)'
  ctx.fillRect(x + w * 0.18, groundY - h * 0.65, w * 0.16, h * 0.24)

  // Roof
  ctx.fillStyle = '#8a4a2a'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.7, groundY - h)
  ctx.lineTo(x, groundY - h - roofH)
  ctx.lineTo(x + w * 0.7, groundY - h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.28)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Little flag
  ctx.strokeStyle = '#d7c08b'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x, groundY - h - roofH)
  ctx.lineTo(x, groundY - h - roofH - tileH * 0.24)
  ctx.stroke()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(x, groundY - h - roofH - tileH * 0.24)
  ctx.lineTo(x + tileW * 0.13, groundY - h - roofH - tileH * 0.17)
  ctx.lineTo(x, groundY - h - roofH - tileH * 0.1)
  ctx.closePath()
  ctx.fill()
}

function drawBridgeProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  tileW: number,
  tileH: number
) {
  const w = tileW * 1.15
  const h = tileH * 0.54

  ctx.save()
  ctx.translate(x, groundY)
  ctx.rotate(-0.04)

  // Bridge deck
  ctx.fillStyle = '#9a6a3c'
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h * 0.28)
  ctx.lineTo(w / 2, -h * 0.52)
  ctx.lineTo(w / 2, h * 0.25)
  ctx.lineTo(-w / 2, h * 0.48)
  ctx.closePath()
  ctx.fill()

  // Planks
  ctx.strokeStyle = 'rgba(68, 40, 20, 0.55)'
  ctx.lineWidth = 1
  for (let i = -2; i <= 2; i++) {
    const px = (i / 5) * w
    ctx.beginPath()
    ctx.moveTo(px, -h * 0.36 - (px / w) * h * 0.2)
    ctx.lineTo(px, h * 0.35 - (px / w) * h * 0.2)
    ctx.stroke()
  }

  // Railings
  ctx.strokeStyle = '#6b4528'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h * 0.38)
  ctx.lineTo(w / 2, -h * 0.62)
  ctx.moveTo(-w / 2, h * 0.36)
  ctx.lineTo(w / 2, h * 0.12)
  ctx.stroke()

  ctx.restore()
}

function drawWasteProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  tileW: number
) {
  const s = tileW * 0.12
  ctx.fillStyle = 'rgba(4, 18, 12, 0.28)'
  ctx.beginPath()
  ctx.ellipse(x, groundY + s * 0.4, s * 2.4, s * 0.75, 0, 0, Math.PI * 2)
  ctx.fill()

  const barrels = [
    { dx: -s * 1.2, dy: 0, color: '#6b7a45' },
    { dx: s * 0.4, dy: -s * 0.2, color: '#8a5a32' },
    { dx: s * 1.5, dy: s * 0.3, color: '#4f6e56' },
  ]

  barrels.forEach((barrel) => {
    ctx.fillStyle = barrel.color
    ctx.fillRect(x + barrel.dx - s * 0.5, groundY + barrel.dy - s, s, s)
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(x + barrel.dx - s * 0.5, groundY + barrel.dy - s, s * 0.22, s)
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.35)'
    ctx.lineWidth = 1
    ctx.strokeRect(x + barrel.dx - s * 0.5, groundY + barrel.dy - s, s, s)
  })

  // Loose trash bags
  ctx.fillStyle = '#353b36'
  ctx.beginPath()
  ctx.arc(x - s * 0.2, groundY - s * 0.4, s * 0.6, 0, Math.PI * 2)
  ctx.arc(x + s * 0.9, groundY - s * 0.15, s * 0.45, 0, Math.PI * 2)
  ctx.fill()
}

function drawReeds(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileW: number,
  variation: number
) {
  const height = tileW * (0.12 + variation * 0.08)
  ctx.strokeStyle = 'rgba(124, 172, 76, 0.8)'
  ctx.lineWidth = 1
  for (let i = -2; i <= 2; i++) {
    const dx = i * tileW * 0.035
    ctx.beginPath()
    ctx.moveTo(x + dx, y)
    ctx.quadraticCurveTo(x + dx + height * 0.2, y - height * 0.6, x + dx + height * 0.35, y - height)
    ctx.stroke()
  }
}

function drawTileTexture(
  ctx: CanvasRenderingContext2D,
  type: number,
  row: number,
  col: number,
  centerX: number,
  centerY: number,
  tileW: number,
  tileH: number,
  now: number
) {
  const n1 = tileNoise(row, col, 10)
  const n2 = tileNoise(row, col, 11)
  const n3 = tileNoise(row, col, 12)

  if (type === 0) {
    const phase = (now / 2200 + row * 0.17 + col * 0.11) % 1
    ctx.strokeStyle = `rgba(202, 244, 255, ${0.18 + phase * 0.12})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(
      centerX,
      centerY,
      tileW * 0.27,
      tileH * 0.14,
      0,
      0,
      Math.PI * 2
    )
    ctx.stroke()

    const glintX = centerX + (n1 - 0.5) * tileW * 0.4
    const glintY = centerY + (n2 - 0.5) * tileH * 0.25
    ctx.strokeStyle = `rgba(235, 253, 255, ${0.28 + phase * 0.16})`
    ctx.beginPath()
    ctx.moveTo(glintX - tileW * 0.08, glintY)
    ctx.lineTo(glintX + tileW * 0.08, glintY)
    ctx.stroke()
    return
  }

  if (type === 2) {
    ctx.fillStyle = 'rgba(92, 66, 35, 0.45)'
    for (let i = 0; i < 3; i++) {
      const px = centerX + (tileNoise(row, col, 20 + i) - 0.5) * tileW * 0.56
      const py = centerY + (tileNoise(row, col, 30 + i) - 0.5) * tileH * 0.48
      ctx.beginPath()
      ctx.ellipse(px, py, 1.2 + i * 0.3, 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(224, 196, 142, 0.18)'
    ctx.beginPath()
    ctx.moveTo(centerX - tileW * 0.22, centerY + tileH * 0.08)
    ctx.lineTo(centerX + tileW * 0.18, centerY - tileH * 0.08)
    ctx.stroke()
    return
  }

  if (type === 1 || type === 3) {
    ctx.strokeStyle = 'rgba(167, 226, 129, 0.32)'
    ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      const px = centerX + (tileNoise(row, col, 40 + i) - 0.5) * tileW * 0.62
      const py = centerY + (tileNoise(row, col, 50 + i) - 0.5) * tileH * 0.5
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + (i % 2 === 0 ? 1 : -1), py - tileH * 0.07)
      ctx.stroke()
    }
    return
  }

  // Polluted ground: oily patches and a faint toxic sheen.
  ctx.fillStyle = `rgba(52, 34, 24, ${0.25 + n1 * 0.15})`
  ctx.beginPath()
  ctx.ellipse(
    centerX - tileW * 0.1,
    centerY + tileH * 0.02,
    tileW * 0.2,
    tileH * 0.12,
    0.3,
    0,
    Math.PI * 2
  )
  ctx.fill()
  ctx.strokeStyle = `rgba(174, 110, 214, ${0.12 + n2 * 0.12})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(
    centerX + tileW * 0.12,
    centerY - tileH * 0.04,
    tileW * 0.16,
    tileH * 0.09,
    -0.25,
    0,
    Math.PI * 2
  )
  ctx.stroke()

  if (n3 > 0.55) {
    ctx.fillStyle = 'rgba(170, 196, 80, 0.55)'
    ctx.beginPath()
    ctx.arc(centerX + tileW * 0.1, centerY + tileH * 0.1, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.2,
    width * 0.5,
    height * 0.45,
    Math.max(width, height) * 0.78
  )
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawHotspotMarker(
  ctx: CanvasRenderingContext2D,
  hotspot: MapHotspot,
  x: number,
  y: number,
  now: number,
  selected: boolean,
  hovered: boolean,
  label: string,
  tileH: number
) {
  const color = hotspotLevelColor(hotspot.level)
  const pulse = (now / 1500 + (hotspot.row + hotspot.col) * 0.13) % 1
  const radius = selected ? 10 : 8

  // Pulsing ring, strongest for critical hotspots.
  ctx.strokeStyle = `${color}${Math.round((1 - pulse) * (selected ? 0.75 : 0.45) * 255)
    .toString(16)
    .padStart(2, '0')}`
  ctx.lineWidth = selected ? 2.2 : 1.5
  ctx.beginPath()
  ctx.ellipse(
    x,
    y,
    radius + 5 + pulse * 13,
    (radius + 5 + pulse * 13) * 0.58,
    0,
    0,
    Math.PI * 2
  )
  ctx.stroke()

  if (selected || hovered) {
    ctx.fillStyle = 'rgba(5, 20, 14, 0.9)'
    ctx.font = '600 9px system-ui, sans-serif'
    const textWidth = ctx.measureText(label).width
    roundedRect(ctx, x - textWidth / 2 - 5, y - radius - tileH * 0.52, textWidth + 10, 15, 7.5)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#f8fafc'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y - radius - tileH * 0.52 + 7.5)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }

  if (hotspot.disaster) {
    // Warning triangle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y - radius - 2)
    ctx.lineTo(x + radius + 2, y + radius)
    ctx.lineTo(x - radius - 2, y + radius)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(8, 24, 18, 0.9)'
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.fillStyle = '#081812'
    ctx.font = '700 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', x, y + radius * 0.32)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  } else {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#081812'
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', x, y + 0.5)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }
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

function drawTapEffects(
  ctx: CanvasRenderingContext2D,
  effects: TapEffect[],
  now: number,
  geo: MapGeometry
) {
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index]
    const t = (now - effect.start) / 520

    if (t >= 1) {
      effects.splice(index, 1)
      continue
    }

    const grow = easeOutCubic(t)
    ctx.strokeStyle = `rgba(134,239,172,${0.55 * (1 - t)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(
      effect.x,
      effect.y,
      geo.tileW * (0.15 + grow * 0.36),
      geo.tileH * (0.13 + grow * 0.32),
      0,
      0,
      Math.PI * 2
    )
    ctx.stroke()
  }
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

export default function IsometricMap({
  pollution,
  biodiversity,
  waterQuality,
  trees,
  hotspots,
  selectedHotspotId,
  onTileClick,
  onHotspotClick,
  onAction,
}: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const sizeRef = useRef({ width: 360, height: 260 })
  const dprRef = useRef(1)
  const lastFrameRef = useRef(0)
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; phase: number }[]
  >([])
  const actionEffectsRef = useRef<ActiveActionEffect[]>([])
  const tapEffectsRef = useRef<TapEffect[]>([])
  const actionSeqRef = useRef(0)
  const hoveredHotspotRef = useRef<string | null>(null)
  const selectedHotspotRef = useRef<string | null>(null)
  const hotspotsRef = useRef(hotspots)

  selectedHotspotRef.current = selectedHotspotId ?? null
  hotspotsRef.current = hotspots

  const draw = useCallback(
    (canvas: HTMLCanvasElement, now = performance.now()) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width: W, height: H } = sizeRef.current
      const dpr = dprRef.current
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

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

      // Sky/ground backdrop
      const backdrop = ctx.createLinearGradient(0, 0, W, H)
      backdrop.addColorStop(0, '#0d2118')
      backdrop.addColorStop(0.55, '#0a1a14')
      backdrop.addColorStop(1, '#07130e')
      ctx.fillStyle = backdrop
      ctx.fillRect(0, 0, W, H)

      const treeDensity = clamp01(trees / 70)

      // Draw tiles back to front (painter's algorithm).
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const tileType = MAP[row][col]
          const palette = getTilePalette(
            tileType,
            row,
            col,
            waterQuality,
            pollution
          )
          const base = getTileBase(geo, row, col)
          const lift = TILE_HEIGHTS[row][col] * TILE_H * 0.55
          const topY = base.y - lift
          const centerY = topY + TILE_H / 2

          // Ground shadow makes the plateau feel raised.
          if (tileType !== 0) {
            ctx.fillStyle = 'rgba(3, 14, 9, 0.22)'
            ctx.beginPath()
            ctx.ellipse(
              base.x + TILE_W * 0.12,
              base.y + TILE_H * 0.72,
              TILE_W * 0.44,
              TILE_H * 0.25,
              0,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }

          // Left cliff face
          ctx.fillStyle = palette.left
          ctx.beginPath()
          ctx.moveTo(base.x - TILE_W / 2, topY + TILE_H / 2)
          ctx.lineTo(base.x, topY + TILE_H)
          ctx.lineTo(base.x, base.y + TILE_H + SIDE)
          ctx.lineTo(base.x - TILE_W / 2, base.y + TILE_H / 2 + SIDE)
          ctx.closePath()
          ctx.fill()

          // Right cliff face
          ctx.fillStyle = palette.right
          ctx.beginPath()
          ctx.moveTo(base.x, topY + TILE_H)
          ctx.lineTo(base.x + TILE_W / 2, topY + TILE_H / 2)
          ctx.lineTo(base.x + TILE_W / 2, base.y + TILE_H / 2 + SIDE)
          ctx.lineTo(base.x, base.y + TILE_H + SIDE)
          ctx.closePath()
          ctx.fill()

          // Top face
          diamondPath(ctx, base.x, topY, TILE_W, TILE_H)
          ctx.fillStyle = palette.top
          ctx.fill()

          // Tuck texture inside the diamond.
          ctx.save()
          diamondPath(ctx, base.x, topY, TILE_W, TILE_H)
          ctx.clip()
          drawTileTexture(
            ctx,
            tileType,
            row,
            col,
            base.x,
            centerY,
            TILE_W,
            TILE_H,
            now
          )

          // Shoreline sand/foam
          if (tileType !== 0 && hasWaterNeighbor(row, col)) {
            ctx.strokeStyle = 'rgba(232, 213, 158, 0.52)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(base.x - TILE_W / 2, topY + TILE_H / 2)
            ctx.lineTo(base.x, topY + TILE_H)
            ctx.lineTo(base.x + TILE_W / 2, topY + TILE_H / 2)
            ctx.stroke()
          }

          // Decorative vegetation and props.
          const propNoise = tileNoise(row, col, 7)
          if (tileType === 3) {
            drawTreeProp(
              ctx,
              base.x,
              centerY,
              TILE_W,
              TILE_H,
              tileNoise(row, col, 8)
            )
            if (propNoise > 0.66) {
              drawTreeProp(
                ctx,
                base.x + TILE_W * 0.18,
                centerY + TILE_H * 0.08,
                TILE_W * 0.62,
                TILE_H * 0.62,
                propNoise
              )
            }
          } else if (tileType === 1 && propNoise < treeDensity * 0.34) {
            drawTreeProp(
              ctx,
              base.x,
              centerY,
              TILE_W * 0.8,
              TILE_H * 0.8,
              propNoise
            )
          } else if (tileType === 1 && hasWaterNeighbor(row, col)) {
            drawReeds(ctx, base.x, centerY + TILE_H * 0.15, TILE_W, propNoise)
          }

          if (tileType === 2 && propNoise > 0.76) {
            ctx.fillStyle = 'rgba(105, 82, 48, 0.85)'
            ctx.beginPath()
            ctx.ellipse(
              base.x - TILE_W * 0.12,
              centerY,
              TILE_W * 0.06,
              TILE_H * 0.045,
              0,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }

          if (row === HUT_TILE.row && col === HUT_TILE.col) {
            drawHutProp(ctx, base.x, centerY, TILE_W, TILE_H)
          }

          if (row === BRIDGE_TILE.row && col === BRIDGE_TILE.col) {
            drawBridgeProp(ctx, base.x, centerY, TILE_W, TILE_H)
          }

          if (tileType === 4) {
            drawWasteProp(ctx, base.x, centerY, TILE_W)
          }

          ctx.restore()

          // Crisp rim light along the top edge.
          diamondPath(ctx, base.x, topY, TILE_W, TILE_H)
          ctx.strokeStyle = palette.edge
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      // Warm sunlight from the upper left.
      const light = ctx.createLinearGradient(0, 0, W, H)
      light.addColorStop(0, 'rgba(255, 236, 170, 0.09)')
      light.addColorStop(0.45, 'rgba(255, 236, 170, 0.02)')
      light.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = light
      ctx.fillRect(0, 0, W, H)

      // Pollution haze
      if (pollution > 40) {
        ctx.fillStyle = `rgba(80,60,0,${0.1 * (pollution / 100)})`
        ctx.fillRect(0, 0, W, H)
      }

      // Biodiversity but terflies
      if (biodiversity > 25) {
        particlesRef.current.forEach((p) => {
          const alpha = 0.55 + Math.sin(p.phase) * 0.25
          const flap = Math.abs(Math.sin(p.phase * 1.8))
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(Math.sin(p.phase) * 0.4)
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
          ctx.beginPath()
          ctx.ellipse(-2.5, 0, 2.4, 1 + flap, -0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(134, 239, 172, ${alpha})`
          ctx.beginPath()
          ctx.ellipse(2.5, 0, 2.4, 1 + flap, 0.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
      }

      // Problem-area markers sit above the terrain, below action effects.
      hotspots.forEach((hotspot) => {
        const point = getHotspotPosition(geo, hotspot)
        drawHotspotMarker(
          ctx,
          hotspot,
          point.x,
          point.y,
          now,
          hotspot.id === selectedHotspotId,
          hotspot.id === hoveredHotspotRef.current,
          t(hotspot.label),
          TILE_H
        )
      })

      drawActionEffects(ctx, actionEffectsRef.current, now, geo)
      drawTapEffects(ctx, tapEffectsRef.current, now, geo)

      drawVignette(ctx, W, H)

      // Legend
      const legendY = H - 22
      const itemW = Math.floor(W / 4)
      const fontSize = W < 360 ? 9 : 10
      ctx.fillStyle = 'rgba(10,26,20,0.78)'
      ctx.fillRect(0, H - 28, W, 28)
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`
      const legendItems = [
        { color: rgb(47, 139, 181), label: t('Sungai') },
        { color: '#3f8b4d', label: t('Tanah') },
        { color: '#1a5c28', label: t('Pohon') },
        { color: rgb(91, 59, 36), label: t('Cemar') },
      ]
      legendItems.forEach((item, i) => {
        const lx = i * itemW + 6
        ctx.fillStyle = item.color
        ctx.fillRect(lx, legendY, 8, 8)
        ctx.fillStyle = '#86efac'
        ctx.fillText(item.label, lx + 11, legendY + 8)
      })
    },
    [biodiversity, pollution, selectedHotspotId, hotspots, t, trees, waterQuality]
  )

  /**
   * Called imperatively by GameplayClient after a valid action. The effect is
   * stored in a ref so the existing requestAnimationFrame loop can draw it
   * without causing a React re-render.
   */
  const triggerAction = useCallback((action: GameAction) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const geo = getMapGeometry(sizeRef.current.width, sizeRef.current.height)
    actionSeqRef.current += 1

    // Prefer the selected problem area when the action matches its fix.
    const selected = hotspotsRef.current.find(
      (hotspot) =>
        hotspot.id === selectedHotspotRef.current &&
        hotspot.recommendedAction === action
    )
    const tile = selected ?? pickActionTile(action, actionSeqRef.current)
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
    const { width: W, height: H } = sizeRef.current
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
    lastFrameRef.current = performance.now()

    const loop = (now: number) => {
      if (!running) return

      const elapsed = now - lastFrameRef.current
      const dt = Math.min(2.5, Math.max(0.25, elapsed / 16.667))
      lastFrameRef.current = now

      const { width: W, height: H } = sizeRef.current
      particlesRef.current.forEach((p) => {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.phase += 0.04 * dt
        if (p.x < 10 || p.x > W - 10) p.vx *= -1
        if (p.y < 10 || p.y > H - 10) p.vy *= -1
      })

      draw(canvas, now)
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

    const resize = () => {
      const width = parent.clientWidth || 360
      const height = parent.clientHeight || 260
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

      sizeRef.current = { width, height }
      dprRef.current = dpr
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    return () => observer.disconnect()
  }, [])

  const hotspotAt = useCallback(
    (x: number, y: number, geo: MapGeometry) => {
      const radius = Math.max(15, geo.tileW * 0.32)
      let closest: { hotspot: MapHotspot; distance: number } | null = null

      hotspotsRef.current.forEach((hotspot) => {
        const point = getHotspotPosition(geo, hotspot)
        const distance = Math.hypot(x - point.x, y - point.y)
        if (distance <= radius && (!closest || distance < closest.distance)) {
          closest = { hotspot, distance }
        }
      })

      return closest
    },
    []
  )

  // Pointer interaction. using pointerdown only avoids the duplicate
  // touchstart + synthetic click events that mobile browsers fire.
  const handleInteraction = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const geo = getMapGeometry(rect.width, rect.height)
      const problem = hotspotAt(x, y, geo)

      if (problem) {
        onHotspotClick?.(problem.hotspot)
        return
      }

      const { rows: ROWS, cols: COLS, tileW: TILE_W } = geo

      // Find closest tile
      let closest = { dist: Infinity, type: 1, row: 0, col: 0 }
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const center = getTileCenter(geo, row, col)
          const dist = Math.hypot(x - center.x, y - center.y)
          if (dist < closest.dist) {
            closest = { dist, type: MAP[row][col], row, col }
          }
        }
      }

      if (closest.dist < TILE_W) {
        const center = getTileCenter(geo, closest.row, closest.col)
        tapEffectsRef.current = [
          ...tapEffectsRef.current.slice(-4),
          { x: center.x, y: center.y, start: performance.now() },
        ]
        onTileClick?.(TILE_TYPES[closest.type] ?? 'unknown')
      }
    },
    [hotspotAt, onHotspotClick, onTileClick]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const geo = getMapGeometry(rect.width, rect.height)
      const problem = hotspotAt(e.clientX - rect.left, e.clientY - rect.top, geo)
      hoveredHotspotRef.current = problem?.hotspot.id ?? null
      canvas.style.cursor = problem ? 'pointer' : 'crosshair'
    },
    [hotspotAt]
  )

  const handlePointerLeave = useCallback(() => {
    hoveredHotspotRef.current = null
    const canvas = canvasRef.current
    if (canvas) canvas.style.cursor = 'crosshair'
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const geo = getMapGeometry(rect.width, rect.height)

      const problem = hotspotsRef.current[0]
      if (problem) {
        onHotspotClick?.(problem)
        return
      }

      const center = getTileCenter(geo, 0, 0)
      tapEffectsRef.current = [
        ...tapEffectsRef.current.slice(-4),
        { x: center.x, y: center.y, start: performance.now() },
      ]
      onTileClick?.('water')
    },
    [onHotspotClick, onTileClick]
  )

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full cursor-crosshair"
      style={{ touchAction: 'none' }}
      onPointerDown={handleInteraction}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      role="button"
      tabIndex={0}
      aria-label={t(
        'Peta ekosistem interaktif. Ketuk tile atau titik masalah untuk melihat kondisinya.'
      )}
    />
  )
}
