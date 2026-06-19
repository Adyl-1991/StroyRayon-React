import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AdminRequest } from './admin-auth.guard'

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AdminRequest>().admin,
)
