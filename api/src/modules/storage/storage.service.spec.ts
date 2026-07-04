import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StorageService } from './storage.service'

function config(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as ConfigService
}

test('storage rejects unsupported product image MIME types', () => {
  const service = new StorageService(config({ STORAGE_DRIVER: 'local' }))

  assert.throws(
    () =>
      service.validateProductImage({
        buffer: Buffer.from('not an image'),
        mimetype: 'image/gif',
        originalname: 'bad.gif',
        size: 12,
      }),
    BadRequestException,
  )
})

test('storage rejects product images larger than 5 MB', () => {
  const service = new StorageService(config({ STORAGE_DRIVER: 'local' }))

  assert.throws(
    () =>
      service.validateProductImage({
        buffer: Buffer.alloc(1),
        mimetype: 'image/png',
        originalname: 'large.png',
        size: 5 * 1024 * 1024 + 1,
      }),
    BadRequestException,
  )
})

test('local storage writes a normalized product image object', async () => {
  const root = `tmp-storage-test-${Date.now()}`
  const service = new StorageService(config({
    STORAGE_DRIVER: 'local',
    STORAGE_LOCAL_ROOT: root,
    PUBLIC_API_ORIGIN: 'http://127.0.0.1:4027',
  }))

  const result = await service.uploadProductImage({
    buffer: Buffer.from([137, 80, 78, 71]),
    mimetype: 'image/png',
    originalname: '../My Product Фото.png',
    size: 4,
  })

  assert.equal(result.driver, 'local')
  assert.equal(result.key.startsWith('products/'), true)
  assert.equal(result.src.startsWith('http://127.0.0.1:4027/uploads/products/'), true)
  assert.equal(existsSync(join(process.cwd(), root, result.key)), true)

  await rm(join(process.cwd(), root), { recursive: true, force: true })
})

test('S3 storage fails fast when credentials are incomplete', () => {
  const service = new StorageService(config({
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: 'https://s3.example.test',
    S3_REGION: 'us-east-1',
  }))

  assert.throws(() => service.onModuleInit(), /STORAGE_DRIVER=s3 requires/)
})
