import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173'
  const port = Number(configService.get<string>('PORT') || 4000)
  const adminJwtSecret = configService.get<string>('ADMIN_JWT_SECRET')
  if (!adminJwtSecret || adminJwtSecret.length < 32) {
    throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters')
  }

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  await app.listen(port)
}

bootstrap()
