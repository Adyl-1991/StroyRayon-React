import { Module } from '@nestjs/common'
import { AdminAuthGuard } from './admin-auth.guard'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PasswordMailerService } from './password-mailer.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard, PasswordMailerService],
  exports: [AuthService, AdminAuthGuard],
})
export class AuthModule {}
