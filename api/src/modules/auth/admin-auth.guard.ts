import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { verifyAdminToken } from './jwt.util'

export type AdminRequest = Request & {
  admin?: { id: string; email: string; role: string }
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>()
    const [scheme, token] = request.headers.authorization?.split(' ') || []
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Authentication required')

    const payload = verifyAdminToken(token, this.authService.getJwtSecret())
    if (!payload) throw new UnauthorizedException('Authentication required')

    request.admin = { id: payload.sub, email: payload.email, role: payload.role }
    return true
  }
}
