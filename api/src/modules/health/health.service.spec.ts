import assert from 'node:assert/strict'
import test from 'node:test'
import { ServiceUnavailableException } from '@nestjs/common'
import { HealthService } from './health.service'

test('health reports database availability when the query succeeds', async () => {
  const health = new HealthService({
    $queryRaw: async () => [{ result: 1 }],
  } as never)

  assert.deepEqual(await health.getHealth(), {
    status: 'ok',
    database: 'ok',
  })
})

test('health returns a 503-compatible error when the database is unavailable', async () => {
  const health = new HealthService({
    $queryRaw: async () => {
      throw new Error('database unavailable')
    },
  } as never)

  await assert.rejects(
    health.getHealth(),
    (error: unknown) => {
      assert.ok(error instanceof ServiceUnavailableException)
      assert.equal(error.getStatus(), 503)
      assert.deepEqual(error.getResponse(), {
        status: 'error',
        database: 'error',
      })
      return true
    },
  )
})
