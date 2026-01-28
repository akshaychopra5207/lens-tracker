import { db } from './db';
import type { LensEvent } from '../domain/events';

export async function saveEvent(e: LensEvent) {
    const d = await db();
    await d.put('events', e);
}

export async function listEventsDesc(limit = 1000): Promise<LensEvent[]> {
    const d = await db();
    const tx = d.transaction('events');
    const idx = tx.store.index('by-at');
    const all: LensEvent[] = [];
    let cursor = await idx.openCursor(null, 'prev');
    while (cursor && all.length < limit) {
        all.push(cursor.value);
        cursor = await cursor.continue();
    }
    await tx.done;
    return all;
}

export async function clearAll() {
    const d = await db();
    await d.clear('events');
}

export async function deleteEvent(id: string) {
    const d = await db();
    await d.delete('events', id);
}
