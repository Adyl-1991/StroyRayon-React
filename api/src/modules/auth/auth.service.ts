import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { signAdminToken } from './jwt.util'
import { verifyPassword } from './password.util'
import { permissionsForRole } from './admin-permissions'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    })
    const valid = admin?.isActive
      ? await verifyPassword(dto.password, admin.passwordHash)
      : false

    if (!admin || !valid) {
      throw new UnauthorizedException('Invalid email or password')
    }

    return {
      accessToken: signAdminToken(
        { sub: admin.id, email: admin.email, role: admin.role },
        this.getJwtSecret(),
        Number(this.configService.get<string>('ADMIN_JWT_EXPIRES_SECONDS') || 28800),
      ),
      admin: this.publicProfile(admin),
    }
  }

  async getProfile(adminId: string) {
    const admin = await this.prisma.adminUser.findFirst({
      where: { id: adminId, isActive: true },
    })
    if (!admin) throw new UnauthorizedException('Admin account is unavailable')
    return this.publicProfile(admin)
  }

  getJwtSecret() {
    const secret = this.configService.get<string>('ADMIN_JWT_SECRET')
    if (!secret || secret.length < 32) {
      throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters')
    }
    return secret
  }

  private publicProfile(admin: { id: string; email: string; name: string; role: string }) {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: permissionsForRole(admin.role),
    }
  }
}
