const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outDir = path.join(__dirname, '..', 'public', 'icons')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#3a3f5c"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="#4ade80"/>
      <text x="${size / 2}" y="${size / 2}"
        font-family="Arial" font-weight="bold" font-size="${size * 0.4}"
        text-anchor="middle" dominant-baseline="central" fill="#1e2235">E</text>
    </svg>
  `
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outDir, `icon-${size}x${size}.png`))
  console.log(`Generated icon-${size}x${size}.png`)
}

;(async () => {
  for (const size of sizes) {
    await generateIcon(size)
  }
  console.log('All icons generated!')
})()
