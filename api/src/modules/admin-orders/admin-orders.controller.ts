import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { AdminAuthGuard } from '../auth/admin-auth.guard'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { AdminOrdersService } from './admin-orders.service'
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto'
import { UpdateOrderNoteDto } from './dto/update-order-note.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'

@Controller('admin/orders')
@UseGuards(AdminAuthGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  list(@Query() query: AdminOrdersQueryDto) {
    return this.adminOrdersService.list(query)
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.adminOrdersService.detail(id)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentAdmin() admin: { id: string },
  ) {
    return this.adminOrdersService.updateStatus(id, dto.status, admin.id)
  }

  @Patch(':id/note')
  updateNote(@Param('id') id: string, @Body() dto: UpdateOrderNoteDto) {
    return this.adminOrdersService.updateNote(id, dto.note)
  }
}
