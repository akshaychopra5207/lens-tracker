// src/domain/settings.ts
export type Frequency = 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export const FREQ_TO_CYCLE_DAYS: Record<Frequency, number> = {
    DAILY: 1, MONTHLY: 30, QUARTERLY: 90, YEARLY: 365
};

export interface Settings {
    id: 'settings';
    frequency: Frequency;       // one global frequency
    createdAt: string;          // ISO
}
export const defaultSettings: Settings = {
    id: 'settings',
    frequency: 'MONTHLY',
    createdAt: new Date().toISOString()
};
