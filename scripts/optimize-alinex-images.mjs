import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const productsRoot = path.join(root, 'public', 'images', 'products')
const reportPath = path.join(root, 'reports', 'customer-audit', 'image-optimization.json')

const variants = [
  { filename: 'thumb-320.webp', width: 320, quality: 78 },
  { filename: 'card-640.webp', width: 640, quality: 80 },
  { filename: 'detail-900.webp', width: 900, quality: 84 },
]

async function fileSize(filePath) {
  return (await stat(filePath)).size
}

async function optimizeDirectory(directoryName) {
  const directory = path.join(productsRoot, directoryName)
  const sourcePath = path.join(directory, 'main.png')
  const sourceBytes = await fileSize(sourcePath)
  const metadata = await sharp(sourcePath).metadata()

  const outputs = []
  for (const variant of variants) {
    const outputPath = path.join(directory, variant.filename)
    await sharp(sourcePath)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: variant.quality, effort: 4, smartSubsample: true })
      .toFile(outputPath)

    outputs.push({
      file: path.relative(root, outputPath).replaceAll('\\', '/'),
      width: variant.width,
      bytes: await fileSize(outputPath),
    })
  }

  return {
    slug: directoryName,
    source: path.relative(root, sourcePath).replaceAll('\\', '/'),
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    sourceBytes,
    outputs,
  }
}

async function main() {
  const entries = await readdir(productsRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('alinex-'))
    .map((entry) => entry.name)
    .sort()

  const products = []
  for (const directory of directories) {
    products.push(await optimizeDirectory(directory))
  }

  const sourceBytes = products.reduce((sum, product) => sum + product.sourceBytes, 0)
  const bytesByVariant = Object.fromEntries(
    variants.map((variant) => [
      variant.filename,
      products.reduce(
        (sum, product) => sum + (product.outputs.find((output) => output.file.endsWith(variant.filename))?.bytes || 0),
        0,
      ),
    ]),
  )
  const savingsPercent = Object.fromEntries(
    Object.entries(bytesByVariant).map(([filename, bytes]) => [filename, Number((100 - (bytes / sourceBytes) * 100).toFixed(1))]),
  )
  const report = {
    generatedAt: new Date().toISOString(),
    products: products.length,
    sourceBytes,
    bytesByVariant,
    savingsPercent,
    variants,
    files: products,
  }

  await mkdir(path.dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    products: report.products,
    sourceBytes: report.sourceBytes,
    bytesByVariant: report.bytesByVariant,
    savingsPercent: report.savingsPercent,
    reportPath,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
