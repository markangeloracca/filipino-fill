import type { EstablishmentCategory, EstablishmentRow, OpeningHours, PhotoRow } from '../database/database.types.js';

export interface EstablishmentSummary {
  id: string;
  slug: string;
  name: string;
  category: EstablishmentCategory;
  tagline: string | null;
  neighbourhood: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  isFilipinoOwned: boolean;
  coverPhotoUrl: string | null;
}

export interface EstablishmentPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export interface EstablishmentDetail extends EstablishmentSummary {
  description: string;
  city: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: OpeningHours;
  tags: string[];
  establishedYear: number | null;
  photos: EstablishmentPhoto[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export type SummaryRow = Pick<
  EstablishmentRow,
  | 'id'
  | 'slug'
  | 'name'
  | 'category'
  | 'tagline'
  | 'neighbourhood'
  | 'address'
  | 'latitude'
  | 'longitude'
  | 'rating'
  | 'review_count'
  | 'price_level'
  | 'is_filipino_owned'
> & { cover_photo_url: string | null };

export function toSummary(row: SummaryRow): EstablishmentSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    tagline: row.tagline,
    neighbourhood: row.neighbourhood,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    rating: row.rating === null ? null : Number(row.rating),
    reviewCount: row.review_count,
    priceLevel: row.price_level,
    isFilipinoOwned: row.is_filipino_owned,
    coverPhotoUrl: row.cover_photo_url,
  };
}

export function toDetail(row: EstablishmentRow, photos: PhotoRow[], commentCount: number): EstablishmentDetail {
  return {
    ...toSummary({ ...row, cover_photo_url: photos[0]?.url ?? null }),
    description: row.description,
    city: row.city,
    postalCode: row.postal_code,
    phone: row.phone,
    email: row.email,
    website: row.website,
    hours: row.hours,
    tags: row.tags,
    establishedYear: row.established_year,
    photos: photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption })),
    commentCount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
