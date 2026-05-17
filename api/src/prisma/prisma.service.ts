import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect()
    } catch {
      // Keep the API process alive so /api/health can report database: "error".
      // Product/catalog endpoints still require a reachable database.
    }
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
