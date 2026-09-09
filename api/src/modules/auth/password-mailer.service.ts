import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

@Injectable()
export class PasswordMailerService {
  constructor(private readonly config: ConfigService) {}

  async sendResetLink(to: string, resetUrl: string) {
    const host = this.config.get<string>('SMTP_HOST')
    const user = this.config.get<string>('SMTP_USER')
    const pass = this.config.get<string>('SMTP_PASS')
    const from = this.config.get<string>('SMTP_FROM') || user
    if (!host || !user || !pass || !from) {
      throw new ServiceUnavailableException('Password recovery email is not configured')
    }
    const port = Number(this.config.get<string>('SMTP_PORT') || 587)
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    await transporter.sendMail({
      from: `StroyRayon CRM <${from}>`,
      to,
      subject: 'Восстановление пароля StroyRayon CRM',
      text: `Для смены пароля откройте ссылку в течение 15 минут: ${resetUrl}\n\nЕсли вы не запрашивали смену пароля, проигнорируйте это письмо.`,
    })
  }
}
