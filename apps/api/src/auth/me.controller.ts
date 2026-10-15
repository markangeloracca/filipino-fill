import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ProfilesRepository } from '../profiles/profiles.repository.js';
import { AuthGuard } from './auth.guard.js';
import type { AuthenticatedUser } from './auth.types.js';
import { AllowUnverified, CurrentUser } from './decorators.js';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(60)
  displayName?: string;
}

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly profiles: ProfilesRepository) {}

  @Get()
  @AllowUnverified()
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto): Promise<AuthenticatedUser> {
    const row = await this.profiles.updateDisplayName(user.id, dto.displayName ?? null);
    return { ...user, displayName: row.display_name };
  }
}
