import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DeleteObjectCommand, PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3'
import { randomBytes } from 'node:crypto'
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

export type S3Config = {
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
  private s3Client?: S3Client

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
        src: buildPublicObjectUrl(this.getS3Config().publicBaseUrl, key),
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
      src: publicBaseUrl ? buildPublicObjectUrl(publicBaseUrl, key) : `${publicApiOrigin || requestOrigin || ''}${publicPath}`,
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
    const envNames = {
      endpoint: 'S3_ENDPOINT',
      region: 'S3_REGION',
      bucket: 'S3_BUCKET',
      accessKeyId: 'S3_ACCESS_KEY_ID',
      secretAccessKey: 'S3_SECRET_ACCESS_KEY',
      publicBaseUrl: 'S3_PUBLIC_BASE_URL',
    } as const
    const config: S3Config = {
      endpoint: (this.configService.get<string>(envNames.endpoint) || '').trim().replace(/\/+$/g, ''),
      region: (this.configService.get<string>(envNames.region) || '').trim(),
      bucket: (this.configService.get<string>(envNames.bucket) || '').trim(),
      accessKeyId: (this.configService.get<string>(envNames.accessKeyId) || '').trim(),
      secretAccessKey: (this.configService.get<string>(envNames.secretAccessKey) || '').trim(),
      publicBaseUrl: (this.configService.get<string>(envNames.publicBaseUrl) || '').trim().replace(/\/+$/g, ''),
    }
    const missing = (Object.keys(envNames) as Array<keyof S3Config>)
      .filter((key) => !config[key])
      .map((key) => envNames[key])
    if (missing.length) {
      throw new Error(`STORAGE_DRIVER=s3 requires ${missing.join(', ')}`)
    }
    assertHttpUrl('S3_ENDPOINT', config.endpoint)
    assertHttpUrl('S3_PUBLIC_BASE_URL', config.publicBaseUrl)
    return config
  }

  private getS3Client(config: S3Config) {
    this.s3Client ||= new S3Client(createS3ClientConfig(config))
    return this.s3Client
  }

  private async putS3Object(key: string, body: Buffer, contentType: string) {
    const config = this.getS3Config()
    try {
      await this.getS3Client(config).send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }))
    } catch {
      throw new Error('S3 upload failed')
    }
  }

  private async deleteS3Object(key: string) {
    const config = this.getS3Config()
    try {
      await this.getS3Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    } catch {
      throw new Error('S3 delete failed')
    }
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

export function buildPublicObjectUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/g, '')}/${key.replace(/^\/+/g, '')}`
}

function isSafeStorageKey(key: string) {
  return key.startsWith('products/') && !key.includes('..') && !key.startsWith('/')
}

export function createS3ClientConfig(config: S3Config): S3ClientConfig {
  return {
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // R2 uses the account endpoint and expects the bucket in the request path.
    forcePathStyle: true,
  }
}

function assertHttpUrl(name: string, value: string) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return
  } catch {
    // Fall through to the environment-specific error below.
  }
  throw new Error(`${name} must be an absolute HTTP(S) URL`)
}
