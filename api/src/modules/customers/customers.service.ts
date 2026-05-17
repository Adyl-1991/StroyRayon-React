import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findOrCreateByPhone(data: { name: string; phone: string; region?: string; address?: string }) {
    return this.prisma.customer.upsert({
      where: { phone: data.phone },
      update: {
        name: data.name,
        region: data.region,
        address: data.address,
      },
      create: data,
    })
  }
}
