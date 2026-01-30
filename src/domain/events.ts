import { v4 as uuid } from 'uuid';

export type Eye = 'LEFT' | 'RIGHT';
export type EventType =
    | 'ADD_STOCK'
    | 'USE_LEFT'
    | 'USE_RIGHT'
    | 'CHANGE_LEFT'
    | 'CHANGE_RIGHT'
    | 'CORRECTION';

export interface AddStockMeta {
    eye: 'LEFT' | 'RIGHT' | 'BOTH';
    addedDateIso: string; // audit date chosen on form
}

export interface UseMeta {
    manualDueDate?: string; // ISO date string
}

export interface LensEvent {
    id: string;
    type: EventType;
    qty: number;         // +n for add stock, 1 for uses/changes, ±n for correction
    eye?: Eye;           // for use/change events
    lensTypeId: string;  // single type for MVP: 'default'
    at: string;          // ISO UTC timestamp
    note?: string;
    source?: 'PWA' | 'DEVICE' | 'IMPORT';
    meta?: AddStockMeta | UseMeta;
}

export const nowIso = () => new Date().toISOString();

export const ev = {
    addStock: (qty: number, lensTypeId: string, note?: string, meta?: AddStockMeta): LensEvent => ({
        id: uuid(), type: 'ADD_STOCK', qty, lensTypeId, at: nowIso(), note, meta
    }),
    useLeft: (lensTypeId: string, meta?: UseMeta): LensEvent => ({
        id: uuid(), type: 'USE_LEFT', qty: 1, eye: 'LEFT', lensTypeId, at: nowIso(), meta
    }),
    useRight: (lensTypeId: string, meta?: UseMeta): LensEvent => ({
        id: uuid(), type: 'USE_RIGHT', qty: 1, eye: 'RIGHT', lensTypeId, at: nowIso(), meta
    }),
    changeLeft: (lensTypeId: string): LensEvent => ({
        id: uuid(), type: 'CHANGE_LEFT', qty: 1, eye: 'LEFT', lensTypeId, at: nowIso(),
    }),
    changeRight: (lensTypeId: string): LensEvent => ({
        id: uuid(), type: 'CHANGE_RIGHT', qty: 1, eye: 'RIGHT', lensTypeId, at: nowIso(),
    }),
    correction: (delta: number, lensTypeId: string, note?: string): LensEvent => ({
        id: uuid(), type: 'CORRECTION', qty: delta, lensTypeId, at: nowIso(), note,
    }),

};