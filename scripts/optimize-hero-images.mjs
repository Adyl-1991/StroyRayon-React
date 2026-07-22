import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const sourceDirectory = path.resolve('public/images/banners')
const outputDirectory = path.join(sourceDirectory, 'optimized')
const bannerNames = ['construction', 'plumbing', 'tools', 'electrical', 'garden']
const widths = [768, 1600]

await mkdir(outputDirectory, { recursive: true })

for (const bannerName of bannerNames) {
  const sourcePath = path.join(sourceDirectory, `hero-${bannerName}.png`)

  for (const width of widths) {
    const pipeline = sharp(sourcePath).resize({ width, withoutEnlargement: true })

    await Promise.all([
      pipeline
        .clone()
        .avif({ quality: 50, effort: 6 })
        .toFile(path.join(outputDirectory, `hero-${bannerName}-${width}.avif`)),
      pipeline
        .clone()
        .webp({ quality: 76, effort: 6, smartSubsample: true })
        .toFile(path.join(outputDirectory, `hero-${bannerName}-${width}.webp`)),
    ])
  }
}

console.log(`Optimized ${bannerNames.length} hero banners in AVIF and WebP.`)
