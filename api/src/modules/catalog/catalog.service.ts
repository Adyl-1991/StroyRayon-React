import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

const catalogNodeInclude = {
  children: {
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { titleKg: 'asc' }],
  },
} satisfies Prisma.CatalogNodeInclude

type CatalogNodeRecord = Prisma.CatalogNodeGetPayload<Record<string, never>>

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree() {
    const nodes = await this.prisma.catalogNode.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { titleKg: 'asc' }],
    })

    return this.buildTree(nodes)
  }

  getNodeByPath(path?: string) {
    const normalizedPath = String(path || '').replace(/^\/+|\/+$/g, '')

    return this.prisma.catalogNode.findUnique({
      where: { path: normalizedPath },
      include: catalogNodeInclude,
    })
  }

  private buildTree(nodes: CatalogNodeRecord[]) {
    const nodeMap = new Map<string, CatalogNodeRecord & { children: CatalogNodeRecord[] }>()
    const roots: Array<CatalogNodeRecord & { children: CatalogNodeRecord[] }> = []

    nodes.forEach((node) => nodeMap.set(node.id, { ...node, children: [] }))

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }
}
