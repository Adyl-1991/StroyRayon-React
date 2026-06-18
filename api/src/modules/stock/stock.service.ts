import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Injectable()
export class StockService {
  async reserveAvailableProduct(
    tx: Prisma.TransactionClient,
    productId: string,
    requestedQuantity: number,
    observedStock: { quantity: number; reservedQuantity: number },
  ) {
    const reservation = await tx.stock.updateMany({
      where: {
        productId,
        quantity: observedStock.quantity,
        reservedQuantity: observedStock.reservedQuantity,
      },
      data: {
        reservedQuantity: {
          increment: requestedQuantity,
        },
      },
    })

    return reservation.count === 1
  }
}
