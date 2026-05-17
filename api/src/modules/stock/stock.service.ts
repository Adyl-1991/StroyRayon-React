import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveProduct(productId: string, quantity: number) {
    // Backend v1 skeleton: next phase should wrap this in a transaction
    // and check available quantity before reserving stock.
    return this.prisma.stock.update({
      where: { productId },
      data: {
        reservedQuantity: {
          increment: quantity,
        },
      },
    })
  }
}
