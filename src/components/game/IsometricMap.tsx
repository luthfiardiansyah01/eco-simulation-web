'use client'

import { useEffect, useRef } from 'react'

interface Props {
  pollution: number
  biodiversity: number
  waterQuality: number
  trees: number
  onTileClick?: (type: string) => void
}

export default function IsometricMap({ pollution, biodiversity, waterQuality, trees, onTileClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<{ destroy: (arg: boolean) => void } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      if (!containerRef.current || destroyed) return

      const W = containerRef.current.offsetWidth || 360
      const H = containerRef.current.offsetHeight || 260

      // Tile size adapts to screen width: smaller on mobile
      const TILE_W = W < 380 ? 40 : W < 500 ? 52 : 64
      const TILE_H = TILE_W / 2
      const SIDE_H = Math.round(TILE_H * 0.4)

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

      const ROWS = MAP.length
      const COLS = MAP[0].length

      // Dynamic water color based on quality
      const wq = waterQuality / 100
      const waterR = Math.round(0x5a * (1 - wq) + 0x1e * wq)
      const waterG = Math.round(0x1e * (1 - wq) + 0x6b * wq)
      const waterB = Math.round(0x1e * (1 - wq) + 0x8c * wq)
      const dynamicWater = (waterR << 16) | (waterG << 8) | waterB

      // Dynamic polluted color
      const pl = pollution / 100
      const pollR = Math.round(0x2d * (1 - pl) + 0x5a * pl)
      const pollG = Math.round(0x7a * (1 - pl) + 0x4a * pl)
      const pollB = Math.round(0x3a * (1 - pl) + 0x1a * pl)
      const dynamicPoll = (pollR << 16) | (pollG << 8) | pollB

      const tileColors: Record<number, number> = {
        0: dynamicWater,
        1: 0x2d7a3a,
        2: 0x8b6914,
        3: 0x1a5c28,
        4: dynamicPoll,
      }

      // Center map within canvas
      const mapPixelW = (ROWS + COLS) * (TILE_W / 2)
      const mapPixelH = (ROWS + COLS) * (TILE_H / 2)
      const offsetX = W / 2
      const offsetY = Math.max(20, (H - mapPixelH) / 2)

      class IsoScene extends Phaser.Scene {
        create() {
          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              const tileType = MAP[row][col]
              const isoX = offsetX + (col - row) * (TILE_W / 2)
              const isoY = offsetY + (col + row) * (TILE_H / 2)

              let drawType = tileType
              if (tileType === 1 && trees > 30 && (row + col) % 3 === 0) drawType = 3

              const topColor = tileColors[tileType]
              const tcR = (topColor >> 16) & 0xff
              const tcG = (topColor >> 8) & 0xff
              const tcB = topColor & 0xff
              const leftFace = ((Math.max(0, tcR - 40)) << 16) | ((Math.max(0, tcG - 40)) << 8) | Math.max(0, tcB - 40)
              const rightFace = ((Math.max(0, tcR - 20)) << 16) | ((Math.max(0, tcG - 20)) << 8) | Math.max(0, tcB - 20)

              const gfx = this.add.graphics()

              // Top face
              gfx.fillStyle(topColor, 1)
              gfx.beginPath()
              gfx.moveTo(isoX, isoY)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
              gfx.closePath()
              gfx.fillPath()

              // Left face
              gfx.fillStyle(leftFace, 1)
              gfx.beginPath()
              gfx.moveTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX, isoY + TILE_H + SIDE_H)
              gfx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2 + SIDE_H)
              gfx.closePath()
              gfx.fillPath()

              // Right face
              gfx.fillStyle(rightFace, 1)
              gfx.beginPath()
              gfx.moveTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2 + SIDE_H)
              gfx.lineTo(isoX, isoY + TILE_H + SIDE_H)
              gfx.closePath()
              gfx.fillPath()

              // Tree
              if (drawType === 3) {
                const tg = this.add.graphics()
                const trunkW = Math.max(3, TILE_W * 0.06)
                const trunkH = TILE_H * 0.5
                const canopyR = TILE_W * 0.2
                tg.fillStyle(0x5a3a1a, 1)
                tg.fillRect(isoX - trunkW / 2, isoY - trunkH, trunkW, trunkH)
                tg.fillStyle(0x1a7a2a, 0.9)
                tg.fillCircle(isoX, isoY - trunkH - canopyR * 0.5, canopyR)
                tg.fillStyle(0x22a83a, 0.7)
                tg.fillCircle(isoX, isoY - trunkH - canopyR, canopyR * 0.65)
              }

              // Water ripple
              if (tileType === 0) {
                const ripple = this.add.graphics()
                ripple.lineStyle(1, 0x4dd4f0, 0.3)
                ripple.strokeEllipse(isoX, isoY + TILE_H / 2, TILE_W * 0.55, TILE_H * 0.35)
                this.tweens.add({
                  targets: ripple,
                  alpha: { from: 0.3, to: 0 },
                  scaleX: { from: 1, to: 1.3 },
                  scaleY: { from: 1, to: 1.3 },
                  duration: 2000 + Math.random() * 1000,
                  repeat: -1,
                  delay: Math.random() * 2000,
                })
              }

              // Touch-friendly interactive zone
              const zone = this.add.zone(isoX, isoY + TILE_H / 2, TILE_W, TILE_H)
              zone.setInteractive()
              zone.on('pointerdown', () => {
                const types = ['water', 'grass', 'dirt', 'tree', 'polluted']
                onTileClick?.(types[tileType] ?? 'unknown')
              })
            }
          }

          // Pollution haze
          if (pollution > 50) {
            const haze = this.add.graphics()
            haze.fillStyle(0x5a4a00, 0.12 * (pollution / 100))
            haze.fillRect(0, 0, W, H)
          }

          // Biodiversity particles
          if (biodiversity > 40) {
            const count = Math.min(5, Math.floor(biodiversity / 20))
            for (let i = 0; i < count; i++) {
              const p = this.add.graphics()
              p.fillStyle(0x4ade80, 0.8)
              p.fillCircle(0, 0, Math.max(2, TILE_W * 0.05))
              p.x = Phaser.Math.Between(30, W - 30)
              p.y = Phaser.Math.Between(30, H - 60)
              this.tweens.add({
                targets: p,
                x: p.x + Phaser.Math.Between(-50, 50),
                y: p.y + Phaser.Math.Between(-30, 30),
                duration: 2000 + Math.random() * 2000,
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000,
              })
            }
          }

          // Legend — responsive spacing
          const legendY = H - 22
          const itemW = Math.floor(W / 4)
          const legendItems = [
            { color: dynamicWater, label: 'Sungai' },
            { color: 0x2d7a3a,     label: 'Tanah'  },
            { color: 0x1a5c28,     label: 'Pohon'  },
            { color: dynamicPoll,  label: 'Cemar'  },
          ]
          const fontSize = W < 380 ? '8px' : '9px'
          legendItems.forEach((item, i) => {
            const lx = i * itemW + 8
            const lg = this.add.graphics()
            lg.fillStyle(item.color, 1)
            lg.fillRect(lx, legendY, 8, 8)
            this.add.text(lx + 11, legendY, item.label, {
              fontSize,
              color: '#86efac',
              fontFamily: 'Arial',
            })
          })
        }
      }

      const config = {
        type: Phaser.CANVAS,
        width: W,
        height: H,
        backgroundColor: '#0a1a14',
        parent: containerRef.current,
        scene: IsoScene,
        antialias: false,
        // Scale to fill container on any screen
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: W,
          height: H,
        },
      }

      if (destroyed) return
      const game = new Phaser.Game(config as ConstructorParameters<typeof Phaser.Game>[0])
      gameRef.current = game
    }

    initPhaser()

    // Resize observer — rebuild game if container size changes significantly
    let resizeTimer: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (gameRef.current) {
          gameRef.current.destroy(true)
          gameRef.current = null
        }
        if (!destroyed) initPhaser()
      }, 300)
    })
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      destroyed = true
      clearTimeout(resizeTimer)
      observer.disconnect()
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollution, biodiversity, waterQuality, trees])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '200px', touchAction: 'none' }}
    />
  )
}
