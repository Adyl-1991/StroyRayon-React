import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { extname, join, posix } from 'node:path'

const maxProductImageSize = 5 * 1024 * 1024
const productImageMimeTypes: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

type UploadableFile = {
  buffer?: Buffer
  mimetype: string
  originalname: string
  size: number
}

type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string
}

export type StoredObject = {
  driver: string
  key: string
  src: string
  path: string
  filename: string
  originalName: string
  size: number
  mimeType: string
}

@Injectable()
export class StorageService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (this.driver === 's3') this.getS3Config()
    if (!['local', 's3'].includes(this.driver)) {
      throw new Error(`Unsupported STORAGE_DRIVER: ${this.driver}`)
    }
  }

  get driver() {
    return (this.configService.get<string>('STORAGE_DRIVER') || 'local').toLowerCase()
  }

  validateProductImage(file: UploadableFile) {
    if (!file?.buffer) throw new BadRequestException('Image file is required')
    if (file.size > maxProductImageSize) {
      throw new BadRequestException('Image file is too large. Maximum size is 5 MB')
    }
    if (!productImageMimeTypes[file.mimetype]) {
      throw new BadRequestException('Only JPG, PNG and WEBP images are allowed')
    }
  }

  async uploadProductImage(file: UploadableFile, requestOrigin?: string): Promise<StoredObject> {
    this.validateProductImage(file)
    const extension = productImageMimeTypes[file.mimetype]
    const baseName = normalizeFilename(file.originalname)
    const filename = `${Date.now()}-${randomBytes(5).toString('hex')}-${baseName}${extension}`
    const key = posix.join('products', filename)

    if (this.driver === 's3') {
      await this.putS3Object(key, file.buffer!, file.mimetype)
      return {
        driver: 's3',
        key,
        src: joinUrl(this.getS3Config().publicBaseUrl, key),
        path: key,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }
    }

    const localRoot = this.configService.get<string>('STORAGE_LOCAL_ROOT') || 'uploads'
    const targetDir = join(process.cwd(), localRoot, 'products')
    await mkdir(targetDir, { recursive: true })
    await writeFile(join(targetDir, filename), file.buffer!)
    const publicPath = `/uploads/${key}`
    const publicBaseUrl = this.configService.get<string>('STORAGE_PUBLIC_BASE_URL')?.replace(/\/+$/g, '')
    const publicApiOrigin = this.configService.get<string>('PUBLIC_API_ORIGIN')?.replace(/\/+$/g, '')
    return {
      driver: 'local',
      key,
      src: publicBaseUrl ? joinUrl(publicBaseUrl, key) : `${publicApiOrigin || requestOrigin || ''}${publicPath}`,
      path: publicPath,
      filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }
  }

  async deleteObject(driver: string | null | undefined, key: string | null | undefined) {
    if (!key || !driver || driver === 'legacy') return { deleted: false, reason: 'legacy-or-missing-key' }
    if (driver === 's3') {
      await this.deleteS3Object(key)
      return { deleted: true, reason: 's3-deleted' }
    }
    if (driver !== 'local') return { deleted: false, reason: `unsupported-driver-${driver}` }
    if (!isSafeStorageKey(key)) return { deleted: false, reason: 'unsafe-key' }

    const localRoot = this.configService.get<string>('STORAGE_LOCAL_ROOT') || 'uploads'
    const root = join(process.cwd(), localRoot)
    const target = join(root, key)
    await rm(target, { force: true })
    return { deleted: true, reason: 'local-deleted' }
  }

  private getS3Config(): S3Config {
    const config = {
      endpoint: this.configService.get<string>('S3_ENDPOINT') || '',
      region: this.configService.get<string>('S3_REGION') || '',
      bucket: this.configService.get<string>('S3_BUCKET') || '',
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') || '',
      secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') || '',
      publicBaseUrl: this.configService.get<string>('S3_PUBLIC_BASE_URL') || '',
    }
    const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key)
    if (missing.length) {
      throw new Error(`STORAGE_DRIVER=s3 requires ${missing.join(', ')}`)
    }
    return config
  }

  private async putS3Object(key: string, body: Buffer, contentType: string) {
    const config = this.getS3Config()
    const url = buildS3Url(config, key)
    const headers = signS3Request('PUT', url, config, body, contentType)
    const response = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(body) })
    if (!response.ok) throw new Error(`S3 upload failed with HTTP ${response.status}`)
  }

  private async deleteS3Object(key: string) {
    const config = this.getS3Config()
    const url = buildS3Url(config, key)
    const headers = signS3Request('DELETE', url, config, Buffer.alloc(0))
    const response = await fetch(url, { method: 'DELETE', headers })
    if (!response.ok && response.status !== 404) throw new Error(`S3 delete failed with HTTP ${response.status}`)
  }
}

export function isProductImageMimeType(mimetype: string) {
  return Boolean(productImageMimeTypes[mimetype])
}

export function getMaxProductImageSize() {
  return maxProductImageSize
}

function normalizeFilename(originalName: string) {
  const withoutExtension = originalName.replace(extname(originalName), '')
  const ascii = withoutExtension
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return ascii || 'product-image'
}

function joinUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/g, '')}/${key.replace(/^\/+/g, '')}`
}

function isSafeStorageKey(key: string) {
  return key.startsWith('products/') && !key.includes('..') && !key.startsWith('/')
}

function buildS3Url(config: S3Config, key: string) {
  return `${config.endpoint.replace(/\/+$/g, '')}/${encodeURIComponent(config.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`
}

function signS3Request(method: 'PUT' | 'DELETE', url: string, config: S3Config, body: Buffer, contentType?: string) {
  const parsed = new URL(url)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = createHash('sha256').update(body).digest('hex')
  const headers: Record<string, string> = {
    host: parsed.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  if (contentType) headers['content-type'] = contentType
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key]}\n`).join('')
  const canonicalRequest = [
    method,
    parsed.pathname,
    parsed.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')
  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3')
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string, service: string) {
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update(service).digest()
  return createHmac('sha256', kService).update('aws4_request').digest()
}
