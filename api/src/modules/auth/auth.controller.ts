import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AdminAuthGuard } from './admin-auth.guard'
import { AuthService } from './auth.service'
import { CurrentAdmin } from './current-admin.decorator'
import { AdminLoginDto } from './dto/admin-login.dto'

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: AdminLoginDto) {
    return this.authService.login(dto)
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
