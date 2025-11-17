// src/data/settingsRepo.ts
import { db } from './db';
import type { Frequency, Settings } from '../domain/settings';

export async function getSettings(): Promise<Settings> {
    const d = await db();
    const s = await d.get('settings', 'settings');
    if (!s) throw new Error('settings missing');
    return s;
}

export async function setFrequency(freq: Frequency) {
    const d = await db();
    const s = await getSettings();
    s.frequency = freq;
    await d.put('settings', s);
    return s;
}
