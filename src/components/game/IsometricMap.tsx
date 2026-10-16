'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Props {
  pollution: number
  biodiversity: number
  waterQuality: number
  trees: number
  onTileClick?: (type: string) => void
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

function hexToRgb(hex: number) {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff }
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a * (1 - t) + b * t)
}

export default function IsometricMap({ pollution, biodiversity, waterQuality, trees, onTileClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rippleRef = useRef<number>(0)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; phase: number }[]>([])

  const draw = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    // Tile size adapts to width
    const TILE_W = W < 360 ? 36 : W < 480 ? 46 : 58
    const TILE_H = TILE_W / 2
    const SIDE = Math.round(TILE_H * 0.45)

    const ROWS = MAP.length
    const COLS = MAP[0].length

    const mapH = (ROWS + COLS) * (TILE_H / 2)
    const offsetX = W / 2
    const offsetY = Math.max(16, (H - mapH - SIDE) / 2)

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

    // Legend
    const legendY = H - 18
    const itemW = Math.floor(W / 4)
    const fontSize = W < 360 ? 8 : 9
    ctx.font = `${fontSize}px Arial`
    const legendItems = [
      { color: waterColor, label: 'Sungai' },
      { color: '#2d7a3a', label: 'Tanah'  },
      { color: '#1a5c28', label: 'Pohon'  },
      { color: pollColor, label: 'Cemar'  },
    ]
    legendItems.forEach((item, i) => {
      const lx = i * itemW + 6
      ctx.fillStyle = item.color
      ctx.fillRect(lx, legendY, 8, 8)
      ctx.fillStyle = '#86efac'
      ctx.fillText(item.label, lx + 11, legendY + 8)
    })
  }, [pollution, biodiversity, waterQuality, trees])

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

      draw(canvas)
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

    const W = canvas.width
    const H = canvas.height
    const TILE_W = W < 360 ? 36 : W < 480 ? 46 : 58
    const TILE_H = TILE_W / 2
    const ROWS = MAP.length
    const COLS = MAP[0].length
    const mapH = (ROWS + COLS) * (TILE_H / 2)
    const offsetX = W / 2
    const offsetY = Math.max(16, (H - mapH - Math.round(TILE_H * 0.45)) / 2)

    // Find closest tile
    let closest = { dist: Infinity, type: 1 }
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const isoX = offsetX + (col - row) * (TILE_W / 2)
        const isoY = offsetY + (col + row) * (TILE_H / 2) + TILE_H / 2
        const dist = Math.hypot(x - isoX, y - isoY)
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
