import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile } from '@nestjs/common'
import { Response } from 'express'
import { CreateOrderDto } from './dto/create-order.dto'
import { OrderPdfService } from './order-pdf.service'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderPdfService: OrderPdfService,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto)
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id') id: string,
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.orderPdfService.createPublicPdf(id, token)
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Disposition', `inline; filename="${result.filename}"`)
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    return new StreamableFile(result.buffer)
  }
}
