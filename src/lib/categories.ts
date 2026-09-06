/**
 * Category data-access helpers used by the static Astro pages and tests.
 * These helpers keep category lookups deterministic and easy to reuse in the UI.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Retrieves all categories from the database in alphabetical order.
 *
 * @param db - The database instance used to query categories.
 * @returns A list of categories with their ids and names sorted by name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
    }));
}
