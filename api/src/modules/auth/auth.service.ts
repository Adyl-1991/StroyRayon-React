import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminLoginDto } from './dto/admin-login.dto'
import { signAdminToken } from './jwt.util'
import { verifyPassword } from './password.util'
import { hashPassword } from './password.util'
import { permissionsForRole } from './admin-permissions'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { PasswordMailerService } from './password-mailer.service'
import { createPasswordResetToken, verifyPasswordResetToken } from './password-reset-token.util'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly passwordMailer: PasswordMailerService,
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

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.trim().toLowerCase()
    const admin = await this.prisma.adminUser.findUnique({ where: { email } })
    if (admin?.isActive) {
      const token = createPasswordResetToken({ sub: admin.id, email: admin.email }, this.getJwtSecret(), admin.passwordHash)
      const appUrl = this.configService.get<string>('ADMIN_APP_ORIGIN')
      if (!appUrl) throw new BadRequestException('Password recovery is not configured')
      await this.passwordMailer.sendResetLink(admin.email, `${appUrl.replace(/\/$/, '')}/admin/reset-password?token=${encodeURIComponent(token)}`)
    }
    return { message: 'Если адрес зарегистрирован, ссылка для смены пароля отправлена.' }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const [body] = dto.token.split('.')
    let payload: { sub?: string; email?: string }
    try { payload = JSON.parse(Buffer.from(body, 'base64url').toString()) } catch { throw new BadRequestException('Недействительная или просроченная ссылка') }
    if (!payload.sub || !payload.email) throw new BadRequestException('Недействительная или просроченная ссылка')
    const admin = await this.prisma.adminUser.findFirst({ where: { id: payload.sub, email: payload.email, isActive: true } })
    if (!admin || !verifyPasswordResetToken(dto.token, this.getJwtSecret(), admin.passwordHash)) {
      throw new BadRequestException('Недействительная или просроченная ссылка')
    }
    await this.prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(dto.password) } })
    return { message: 'Пароль изменён. Войдите с новым паролем.' }
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
