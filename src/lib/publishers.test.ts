import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { publishers } from '../../db/schema';
import type { Database } from './db';
import { getAllPublishers } from './publishers';

async function seedPublishers(db: Database, names: string[]): Promise<void> {
    for (const name of names) {
        await db.insert(publishers).values({
            name,
            description: `Description for ${name}`,
        });
    }
}

describe('publishers data-access helper', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns an empty array when no publishers exist', async () => {
        await expect(getAllPublishers(db)).resolves.toEqual([]);
    });

    it('returns publisher ids and names from the database', async () => {
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Arcade Forge', description: 'Indie dev studio' })
            .returning({ id: publishers.id, name: publishers.name });

        const all = await getAllPublishers(db);

        expect(all).toEqual([{ id: publisher.id, name: 'Arcade Forge' }]);
    });

    it('returns publishers in stable alphabetical order by name', async () => {
        await seedPublishers(db, ['Zenith Games', 'Alpha Arc', 'Beta Byte']);

        const all = await getAllPublishers(db);

        expect(all.map((publisher) => publisher.name)).toEqual([
            'Alpha Arc',
            'Beta Byte',
            'Zenith Games',
        ]);
    });
});
