import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { SetupService, type SetupStatus } from './setup.service.js';

@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  status(): Promise<SetupStatus> {
    return this.setup.status();
  }

  @Post('super-admin')
  @UseGuards(AuthGuard)
  claim(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return this.setup.claimSuperAdmin(user);
  }
}
