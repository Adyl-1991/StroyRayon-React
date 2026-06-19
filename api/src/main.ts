import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development'
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173'
  const corsOrigins = corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
  const host = configService.get<string>('HOST') || '0.0.0.0'
  const port = Number(configService.get<string>('PORT') || 4000)
  const adminJwtSecret = configService.get<string>('ADMIN_JWT_SECRET')
  if (!adminJwtSecret || adminJwtSecret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters')
  }
  const invalidProductionOrigin = corsOrigins.some(
    (origin) =>
      !origin.startsWith('https://') &&
      !origin.startsWith('http://localhost:') &&
      !origin.startsWith('http://127.0.0.1:'),
  )
  if (
    nodeEnv === 'production' &&
    (!corsOrigins.length || corsOrigins.includes('*') || invalidProductionOrigin)
  ) {
    throw new Error('Production CORS_ORIGIN must contain explicit HTTPS frontend origins')
  }

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  await app.listen(port, host)
}

bootstrap()
