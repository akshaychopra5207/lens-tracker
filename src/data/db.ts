// src/data/db.ts (bump version to 2 and add a settings store)
import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { LensEvent } from '../domain/events';
import type { Settings } from '../domain/settings';
import { defaultSettings } from '../domain/settings';

interface LTDB extends DBSchema {
    events: {
        key: string;
        value: LensEvent;
        indexes: { 'by-at': string };
    };
    settings: {
        key: 'settings';
        value: Settings;
    };
}

let dbPromise: Promise<IDBPDatabase<LTDB>> | null = null;

export function db() {
    if (!dbPromise) {
        dbPromise = openDB<LTDB>('lens-tracker-db', 2, {
            upgrade(d, oldVersion) {
                if (oldVersion < 1) {
                    const store = d.createObjectStore('events', { keyPath: 'id' });
                    store.createIndex('by-at', 'at');
                }
                if (oldVersion < 2) {
                    d.createObjectStore('settings', { keyPath: 'id' });
                }
            }
        }).then(async (db) => {
            // seed settings if absent
            const existing = await db.get('settings', 'settings');
            if (!existing) await db.put('settings', defaultSettings);
            return db;
        }).catch(err => {
            console.error("Failed to open DB", err);
            throw err;
        });
    }
    return dbPromise;
}
