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
  const gameRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let game: { destroy: (arg: boolean) => void } | null = null

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      if (!containerRef.current) return

      const W = containerRef.current.offsetWidth || 400
      const H = containerRef.current.offsetHeight || 300

      const TILE_W = 64
      const TILE_H = 32

      // Tile types: 0=water, 1=grass, 2=dirt, 3=tree, 4=polluted
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

      class IsoScene extends Phaser.Scene {
        preload() {
          // Generate tile textures via graphics
        }

        create() {
          const offsetX = W / 2
          const offsetY = 60

          // Water color shifts from murky to blue based on quality
          const wq = waterQuality / 100
          const waterR = Math.round(0x5a * (1 - wq) + 0x1e * wq)
          const waterG = Math.round(0x1e * (1 - wq) + 0x6b * wq)
          const waterB = Math.round(0x1e * (1 - wq) + 0x8c * wq)
          const dynamicWater = (waterR << 16) | (waterG << 8) | waterB

          // Polluted tiles shift from green to brown based on pollution
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

          for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              const tileType = MAP[row][col]

              const isoX = offsetX + (col - row) * (TILE_W / 2)
              const isoY = offsetY + (col + row) * (TILE_H / 2)

              const gfx = this.add.graphics()
              const topColor = tileColors[tileType]
              // Extra trees based on trees count
              let drawType = tileType
              if (tileType === 1 && trees > 30 && (row + col) % 3 === 0) drawType = 3

              // Draw isometric tile top face
              gfx.fillStyle(topColor, 1)
              gfx.beginPath()
              gfx.moveTo(isoX, isoY)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
              gfx.closePath()
              gfx.fillPath()

              // Extract RGB from topColor for darker side faces
              const tcR = (topColor >> 16) & 0xff
              const tcG = (topColor >> 8) & 0xff
              const tcB = topColor & 0xff
              const leftFaceColor = ((Math.max(0, tcR - 40)) << 16) | ((Math.max(0, tcG - 40)) << 8) | Math.max(0, tcB - 40)
              const rightFaceColor = ((Math.max(0, tcR - 20)) << 16) | ((Math.max(0, tcG - 20)) << 8) | Math.max(0, tcB - 20)

              // Left face (darker)
              gfx.fillStyle(leftFaceColor, 1)
              gfx.beginPath()
              gfx.moveTo(isoX - TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX, isoY + TILE_H + 12)
              gfx.lineTo(isoX - TILE_W / 2, isoY + TILE_H / 2 + 12)
              gfx.closePath()
              gfx.fillPath()

              // Right face (slightly darker)
              gfx.fillStyle(rightFaceColor, 1)
              gfx.beginPath()
              gfx.moveTo(isoX, isoY + TILE_H)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2)
              gfx.lineTo(isoX + TILE_W / 2, isoY + TILE_H / 2 + 12)
              gfx.lineTo(isoX, isoY + TILE_H + 12)
              gfx.closePath()
              gfx.fillPath()

              // Draw tree on tree tiles
              if (drawType === 3) {
                const treeGfx = this.add.graphics()
                // trunk
                treeGfx.fillStyle(0x5a3a1a, 1)
                treeGfx.fillRect(isoX - 3, isoY - 18, 6, 14)
                // canopy
                treeGfx.fillStyle(0x1a7a2a, 0.9)
                treeGfx.fillCircle(isoX, isoY - 22, 12)
                treeGfx.fillStyle(0x22a83a, 0.7)
                treeGfx.fillCircle(isoX, isoY - 26, 8)
              }

              // Water ripple effect
              if (tileType === 0) {
                const ripple = this.add.graphics()
                ripple.lineStyle(1, 0x4dd4f0, 0.3)
                ripple.strokeEllipse(isoX, isoY + TILE_H / 2, TILE_W * 0.6, TILE_H * 0.4)

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

              // Make tile interactive
              const zone = this.add.zone(isoX, isoY + TILE_H / 2, TILE_W, TILE_H)
              zone.setInteractive()
              zone.on('pointerdown', () => {
                const types = ['water', 'grass', 'dirt', 'tree', 'polluted']
                onTileClick?.(types[tileType] ?? 'unknown')
              })
            }
          }

          // Pollution haze overlay
          if (pollution > 50) {
            const haze = this.add.graphics()
            haze.fillStyle(0x5a4a00, 0.15 * (pollution / 100))
            haze.fillRect(0, 0, W, H)
          }

          // Biodiversity particles (butterflies/birds)
          if (biodiversity > 40) {
            for (let i = 0; i < Math.floor(biodiversity / 20); i++) {
              const particle = this.add.graphics()
              particle.fillStyle(0x4ade80, 0.8)
              particle.fillCircle(0, 0, 3)
              particle.x = Phaser.Math.Between(50, W - 50)
              particle.y = Phaser.Math.Between(50, H - 50)

              this.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-60, 60),
                y: particle.y + Phaser.Math.Between(-40, 40),
                duration: 2000 + Math.random() * 2000,
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000,
              })
            }
          }

          // Legend
          const legendY = H - 30
          const legendItems = [
            { color: 0x1e6b8c, label: 'Sungai' },
            { color: 0x2d7a3a, label: 'Tanah' },
            { color: 0x1a5c28, label: 'Pohon' },
            { color: 0x5a4a1a, label: 'Polutan' },
          ]
          legendItems.forEach((item, i) => {
            const lg = this.add.graphics()
            lg.fillStyle(item.color, 1)
            lg.fillRect(10 + i * 80, legendY, 10, 10)
            this.add.text(24 + i * 80, legendY, item.label, {
              fontSize: '9px',
              color: '#86efac',
              fontFamily: 'Arial',
            })
          })
        }
      }

      const config: object = {
        type: Phaser.AUTO,
        width: W,
        height: H,
        backgroundColor: '#0a1a14',
        parent: containerRef.current,
        scene: IsoScene,
        antialias: true,
      }

      game = new Phaser.Game(config as ConstructorParameters<typeof Phaser.Game>[0])
      gameRef.current = game
    }

    initPhaser()

    return () => {
      if (game) game.destroy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollution, biodiversity, waterQuality, trees])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
    />
  )
}
