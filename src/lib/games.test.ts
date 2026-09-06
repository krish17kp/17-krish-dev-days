import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGamesFiltered,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterCatalog(db: Database): Promise<{
    strategy: { id: number };
    puzzle: { id: number };
    pubOne: { id: number };
    pubTwo: { id: number };
}> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'Strategic choices' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'Brain teasers' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'A first publisher' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'A second publisher' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'Strategy game',
            starRating: 4.1,
            categoryId: strategy.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Beta Puzzle',
            description: 'Puzzle game',
            starRating: 4.4,
            categoryId: puzzle.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Gamma Strategy',
            description: 'Another strategy game',
            starRating: 3.8,
            categoryId: strategy.id,
            publisherId: pubTwo.id,
        },
    ]);

    return { strategy, puzzle, pubOne, pubTwo };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by a single category', async () => {
        const catalog = await seedFilterCatalog(db);
        const results = await getAllGamesFiltered(db, { categoryIds: [catalog.strategy.id] });

        expect(results.map((game) => game.title)).toEqual(['Alpha Strategy', 'Gamma Strategy']);
    });

    it('filters games by publisher', async () => {
        const catalog = await seedFilterCatalog(db);
        const results = await getAllGamesFiltered(db, { publisherIds: [catalog.pubOne.id] });

        expect(results.map((game) => game.title)).toEqual(['Alpha Strategy', 'Beta Puzzle']);
    });

    it('combines category and publisher filters', async () => {
        const catalog = await seedFilterCatalog(db);
        const results = await getAllGamesFiltered(db, {
            categoryIds: [catalog.strategy.id],
            publisherIds: [catalog.pubOne.id],
        });

        expect(results.map((game) => game.title)).toEqual(['Alpha Strategy']);
    });

    it('returns no games when filters match nothing', async () => {
        const catalog = await seedFilterCatalog(db);
        const results = await getAllGamesFiltered(db, {
            categoryIds: [catalog.puzzle.id],
            publisherIds: [catalog.pubTwo.id],
        });

        expect(results).toEqual([]);
    });
});
