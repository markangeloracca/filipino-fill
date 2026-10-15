import { Inject, Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../common/errors/domain.exceptions.js';
import { DB, type Db } from '../database/database.module.js';
import type { EstablishmentCategory, EstablishmentUpdate } from '../database/database.types.js';
import type { CreateEstablishmentDto, PhotoInputDto, UpdateEstablishmentDto } from './dto/upsert-establishment.dto.js';
import { toDetail, toSummary, type EstablishmentDetail, type EstablishmentSummary } from './establishment.model.js';
import { EstablishmentsRepository, type NewPhoto } from './establishments.repository.js';
import { buildPrefixTsQuery } from './search-query.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_SCENES: ReadonlyArray<{ scene: string; caption: (name: string) => string }> = [
  { scene: 'exterior', caption: (name) => `${name} storefront` },
  { scene: 'interior', caption: () => 'Inside the space' },
  { scene: 'signature', caption: () => 'House specialty' },
  { scene: 'festive', caption: () => 'Community fiesta vibes' },
];

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'establishment';
}

function mockPhotos(name: string, category: EstablishmentCategory): NewPhoto[] {
  const seed = Math.floor(Math.random() * 9000) + 1;
  return MOCK_SCENES.map(({ scene, caption }, i) => {
    const params = new URLSearchParams({ c: category, n: name, s: String(seed + i) });
    return { url: `/mock-photos/${scene}?${params.toString()}`, caption: caption(name) };
  });
}

const toNewPhotos = (photos: PhotoInputDto[]): NewPhoto[] => photos.map((p) => ({ url: p.url, caption: p.caption ?? null }));

@Injectable()
export class EstablishmentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly repo: EstablishmentsRepository,
  ) {}

  async search(params: { q?: string; category?: EstablishmentCategory; limit: number }): Promise<EstablishmentSummary[]> {
    const text = params.q?.trim() || undefined;
    const tsQuery = text ? buildPrefixTsQuery(text) : null;
    // Query had only punctuation: nothing can match, so don't fall back to "everything".
    if (text && !tsQuery) return [];
    const criteria = { text, tsQuery, category: params.category, limit: params.limit };
    let rows = await this.repo.search({ ...criteria, mode: 'fts' });
    // Typo fallback only when full-text finds nothing, so fuzzy noise never dilutes good matches.
    if (!rows.length && text) rows = await this.repo.search({ ...criteria, mode: 'fuzzy' });
    return rows.map(toSummary);
  }

  async getById(id: string): Promise<EstablishmentDetail> {
    if (!UUID.test(id)) throw new EntityNotFoundException('Establishment', id);
    const row = await this.repo.findLiveById(id);
    if (!row) throw new EntityNotFoundException('Establishment', id);
    const [photos, commentCount] = await Promise.all([this.repo.photosFor(id), this.repo.liveCommentCount(id)]);
    return toDetail(row, photos, commentCount);
  }

  /** Throws 404 unless the establishment exists and is live. */
  async assertExists(id: string): Promise<void> {
    if (!UUID.test(id) || !(await this.repo.findLiveById(id))) throw new EntityNotFoundException('Establishment', id);
  }

  async create(dto: CreateEstablishmentDto): Promise<EstablishmentDetail> {
    const id = await this.db.transaction().execute(async (trx) => {
      const base = slugify(dto.name);
      const taken = await this.repo.slugsStartingWith(base, trx);
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

      const row = await this.repo.insert(
        {
          slug,
          name: dto.name,
          category: dto.category,
          tagline: dto.tagline ?? null,
          description: dto.description,
          address: dto.address,
          neighbourhood: dto.neighbourhood,
          postal_code: dto.postalCode ?? null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          website: dto.website ?? null,
          hours: JSON.stringify(dto.hours ?? {}),
          price_level: dto.priceLevel ?? null,
          tags: dto.tags ?? [],
          is_filipino_owned: dto.isFilipinoOwned ?? true,
          established_year: dto.establishedYear ?? null,
        },
        trx,
      );

      const photos = dto.photos?.length ? toNewPhotos(dto.photos) : mockPhotos(dto.name, dto.category);
      await this.repo.replacePhotos(row.id, photos, trx);
      return row.id;
    });
    return this.getById(id);
  }

  async update(id: string, dto: UpdateEstablishmentDto): Promise<EstablishmentDetail> {
    if (!UUID.test(id)) throw new EntityNotFoundException('Establishment', id);

    const patch: EstablishmentUpdate = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.tagline !== undefined) patch.tagline = dto.tagline || null;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.neighbourhood !== undefined) patch.neighbourhood = dto.neighbourhood;
    if (dto.postalCode !== undefined) patch.postal_code = dto.postalCode || null;
    if (dto.latitude !== undefined) patch.latitude = dto.latitude;
    if (dto.longitude !== undefined) patch.longitude = dto.longitude;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.email !== undefined) patch.email = dto.email || null;
    if (dto.website !== undefined) patch.website = dto.website || null;
    if (dto.hours !== undefined) patch.hours = JSON.stringify(dto.hours);
    if (dto.priceLevel !== undefined) patch.price_level = dto.priceLevel;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.isFilipinoOwned !== undefined) patch.is_filipino_owned = dto.isFilipinoOwned;
    if (dto.establishedYear !== undefined) patch.established_year = dto.establishedYear;

    await this.db.transaction().execute(async (trx) => {
      const existing = await this.repo.findLiveById(id, trx);
      if (!existing) throw new EntityNotFoundException('Establishment', id);
      if (Object.keys(patch).length) await this.repo.update(id, patch, trx);
      if (dto.photos !== undefined) {
        const photos = dto.photos.length ? toNewPhotos(dto.photos) : mockPhotos(patch.name ?? existing.name, patch.category ?? existing.category);
        await this.repo.replacePhotos(id, photos, trx);
      }
    });
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    if (!UUID.test(id) || !(await this.repo.softDelete(id))) throw new EntityNotFoundException('Establishment', id);
  }
}
