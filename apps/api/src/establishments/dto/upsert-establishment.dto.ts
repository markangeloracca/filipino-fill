import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ESTABLISHMENT_CATEGORIES, type EstablishmentCategory } from '../../database/database.types.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const HOURS_PATTERN = /^(closed|([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-4]):[0-5]\d)$/;
const HOURS_MESSAGE = 'must be "closed" or a range like "09:00-17:00"';

export class OpeningHoursDto {
  @IsOptional() @Matches(HOURS_PATTERN, { message: `mon ${HOURS_MESSAGE}` }) mon?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `tue ${HOURS_MESSAGE}` }) tue?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `wed ${HOURS_MESSAGE}` }) wed?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `thu ${HOURS_MESSAGE}` }) thu?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `fri ${HOURS_MESSAGE}` }) fri?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `sat ${HOURS_MESSAGE}` }) sat?: string;
  @IsOptional() @Matches(HOURS_PATTERN, { message: `sun ${HOURS_MESSAGE}` }) sun?: string;
}

export class PhotoInputDto {
  /** Absolute https URL, or one of the app's generated mock photos. */
  @IsString()
  @MaxLength(1000)
  @Matches(/^(https:\/\/|\/mock-photos\/)/, { message: 'url must be an https URL or a /mock-photos/ path' })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

export class CreateEstablishmentDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @IsIn(ESTABLISHMENT_CATEGORIES)
  category!: EstablishmentCategory;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  tagline?: string;

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(4000)
  description!: string;

  @Transform(trim) @IsString() @MinLength(3) @MaxLength(200)
  address!: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  neighbourhood!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, { message: 'postalCode must be a Canadian postal code' })
  postalCode?: string;

  @Type(() => Number) @IsLatitude() @Min(50.8) @Max(51.25)
  latitude!: number;

  @Type(() => Number) @IsLongitude() @Min(-114.35) @Max(-113.85)
  longitude!: number;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @IsEmail() @MaxLength(320)
  email?: string;

  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) @MaxLength(300)
  website?: string;

  @IsOptional() @ValidateNested() @Type(() => OpeningHoursDto)
  hours?: OpeningHoursDto;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4)
  priceLevel?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional() @IsBoolean()
  isFilipinoOwned?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2100)
  establishedYear?: number;

  /** Omit to auto-generate mock photos. */
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => PhotoInputDto)
  photos?: PhotoInputDto[];
}

export class UpdateEstablishmentDto extends PartialType(CreateEstablishmentDto) {}
