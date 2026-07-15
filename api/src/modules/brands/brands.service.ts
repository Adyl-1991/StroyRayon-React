import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto'

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async create(dto: CreateBrandDto) {
    const name = dto.name.trim()
    await this.assertUniqueName(name)

    try {
      return await this.prisma.brand.create({
        data: { name, slug: normalizeBrandSlug(name) },
        include: { _count: { select: { products: true } } },
      })
    } catch (error) {
      this.rethrowUniqueConflict(error)
    }
  }

  async update(id: string, dto: UpdateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Brand not found')

    const name = dto.name.trim()
    await this.assertUniqueName(name, id)

    try {
      return await this.prisma.brand.update({
        where: { id },
        data: { name, slug: normalizeBrandSlug(name) },
        include: { _count: { select: { products: true } } },
      })
    } catch (error) {
      this.rethrowUniqueConflict(error)
    }
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!brand) throw new NotFoundException('Brand not found')
    if (brand._count.products > 0) {
      throw new ConflictException(
        `Brand is used by ${brand._count.products} product(s). Remove or change those product links first.`,
      )
    }

    await this.prisma.brand.delete({ where: { id } })
    return { id }
  }

  private async assertUniqueName(name: string, excludeId?: string) {
    const duplicate = await this.prisma.brand.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (duplicate) throw new ConflictException('A brand with this name already exists')
  }

  private rethrowUniqueConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A brand with this name or slug already exists')
    }
    throw error
  }
}

function normalizeBrandSlug(value: string) {
  const slug = value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)

  if (!slug) throw new ConflictException('Brand name must contain letters or numbers')
  return slug
}
