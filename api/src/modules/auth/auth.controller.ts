import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AdminAuthGuard } from './admin-auth.guard'
import { AuthService } from './auth.service'
import { CurrentAdmin } from './current-admin.decorator'
import { AdminLoginDto } from './dto/admin-login.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto)
  }

  @Post('password-reset/request')
  @HttpCode(200)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto)
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto)
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  profile(@CurrentAdmin() admin: { id: string }) {
    return this.authService.getProfile(admin.id)
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  @HttpCode(204)
  logout() {
    return undefined
  }
}
