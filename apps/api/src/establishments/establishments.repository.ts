import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DB, type Db } from '../database/database.module.js';
import type {
  EstablishmentCategory,
  EstablishmentRow,
  EstablishmentUpdate,
  NewEstablishment,
  PhotoRow,
} from '../database/database.types.js';
import type { SummaryRow } from './establishment.model.js';

export interface SearchCriteria {
  text?: string;
  tsQuery: string | null;
  category?: EstablishmentCategory;
  limit: number;
  /** 'fts' = prefix full-text match; 'fuzzy' = trigram similarity on the name (typo fallback). */
  mode: 'fts' | 'fuzzy';
}

export interface NewPhoto {
  url: string;
  caption: string | null;
}

/** Minimum trigram word-similarity for typo-tolerant name matches ("adbo" → "Adobo" scores 0.40). */
const FUZZY_THRESHOLD = 0.4;

@Injectable()
export class EstablishmentsRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async search(criteria: SearchCriteria): Promise<SummaryRow[]> {
    let query = this.db
      .selectFrom('establishments as e')
      .leftJoinLateral(
        (eb) =>
          eb
            .selectFrom('establishment_photos as p')
            .select('p.url')
            .whereRef('p.establishment_id', '=', 'e.id')
            .orderBy('p.sort_order')
            .limit(1)
            .as('cover'),
        (join) => join.onTrue(),
      )
      .select([
        'e.id',
        'e.slug',
        'e.name',
        'e.category',
        'e.tagline',
        'e.neighbourhood',
        'e.address',
        'e.latitude',
        'e.longitude',
        'e.rating',
        'e.review_count',
        'e.price_level',
        'e.is_filipino_owned',
        'cover.url as cover_photo_url',
      ])
      .where('e.deleted_at', 'is', null)
      .limit(criteria.limit);

    if (criteria.category) query = query.where('e.category', '=', criteria.category);

    if (criteria.mode === 'fts' && criteria.tsQuery) {
      const tsq = sql`to_tsquery('simple', ${criteria.tsQuery})`;
      query = query
        .where(sql<boolean>`e.search_vector @@ ${tsq}`)
        .orderBy(sql`ts_rank(e.search_vector, ${tsq})`, 'desc')
        .orderBy('e.name');
    } else if (criteria.mode === 'fuzzy' && criteria.text) {
      const similarity = sql<number>`extensions.word_similarity(${criteria.text}, e.name)`;
      query = query.where(similarity, '>=', FUZZY_THRESHOLD).orderBy(similarity, 'desc').orderBy('e.name');
    } else {
      query = query.orderBy('e.name');
    }

    return query.execute();
  }

  findLiveById(id: string, executor: Db = this.db): Promise<EstablishmentRow | undefined> {
    return executor
      .selectFrom('establishments')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  photosFor(establishmentId: string, executor: Db = this.db): Promise<PhotoRow[]> {
    return executor
      .selectFrom('establishment_photos')
      .selectAll()
      .where('establishment_id', '=', establishmentId)
      .orderBy('sort_order')
      .execute();
  }

  async liveCommentCount(establishmentId: string): Promise<number> {
    const row = await this.db
      .selectFrom('comments')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('establishment_id', '=', establishmentId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
    return row.count;
  }

  async slugsStartingWith(base: string, executor: Db = this.db): Promise<Set<string>> {
    const rows = await executor
      .selectFrom('establishments')
      .select('slug')
      .where((eb) => eb.or([eb('slug', '=', base), eb('slug', 'like', `${base}-%`)]))
      .execute();
    return new Set(rows.map((r) => r.slug));
  }

  insert(values: NewEstablishment, executor: Db): Promise<EstablishmentRow> {
    return executor.insertInto('establishments').values(values).returningAll().executeTakeFirstOrThrow();
  }

  update(id: string, values: EstablishmentUpdate, executor: Db): Promise<EstablishmentRow | undefined> {
    return executor
      .updateTable('establishments')
      .set(values)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .updateTable('establishments')
      .set({ deleted_at: new Date() })
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return result.numUpdatedRows > 0n;
  }

  async replacePhotos(establishmentId: string, photos: NewPhoto[], executor: Db): Promise<void> {
    await executor.deleteFrom('establishment_photos').where('establishment_id', '=', establishmentId).execute();
    if (!photos.length) return;
    await executor
      .insertInto('establishment_photos')
      .values(photos.map((p, i) => ({ establishment_id: establishmentId, url: p.url, caption: p.caption, sort_order: i })))
      .execute();
  }
}
