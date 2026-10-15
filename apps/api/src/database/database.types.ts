import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type NullableTimestamp = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;

export type UserRole = 'user' | 'admin' | 'super_admin';

export const ESTABLISHMENT_CATEGORIES = [
  'restaurant',
  'bakery',
  'grocery',
  'cafe',
  'remittance',
  'beauty',
  'church',
  'community',
  'services',
  'health',
  'retail',
] as const;
export type EstablishmentCategory = (typeof ESTABLISHMENT_CATEGORIES)[number];

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type OpeningHours = Partial<Record<Weekday, string>>;

export interface ProfilesTable {
  id: string;
  email: string;
  display_name: string | null;
  role: ColumnType<UserRole, UserRole | undefined, UserRole>;
  email_verified_at: NullableTimestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface EstablishmentsTable {
  id: Generated<string>;
  slug: string;
  name: string;
  category: EstablishmentCategory;
  tagline: string | null;
  description: string;
  address: string;
  neighbourhood: string;
  city: ColumnType<string, string | undefined, string>;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: ColumnType<OpeningHours, string | undefined, string>;
  price_level: number | null;
  // numeric comes back from pg as a string
  rating: ColumnType<string | null, number | null | undefined, number | null>;
  review_count: ColumnType<number, number | undefined, number>;
  tags: ColumnType<string[], string[] | undefined, string[]>;
  is_filipino_owned: ColumnType<boolean, boolean | undefined, boolean>;
  established_year: number | null;
  search_vector: ColumnType<string | null, never, never>;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: NullableTimestamp;
}

export interface EstablishmentPhotosTable {
  id: Generated<string>;
  establishment_id: string;
  url: string;
  caption: string | null;
  sort_order: ColumnType<number, number | undefined, number>;
  created_at: Timestamp;
}

export interface CommentsTable {
  id: Generated<string>;
  establishment_id: string;
  user_id: string;
  body: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: NullableTimestamp;
}

export interface Database {
  profiles: ProfilesTable;
  establishments: EstablishmentsTable;
  establishment_photos: EstablishmentPhotosTable;
  comments: CommentsTable;
}

export type ProfileRow = Selectable<ProfilesTable>;
export type EstablishmentRow = Selectable<EstablishmentsTable>;
export type NewEstablishment = Insertable<EstablishmentsTable>;
export type EstablishmentUpdate = Updateable<EstablishmentsTable>;
export type PhotoRow = Selectable<EstablishmentPhotosTable>;
