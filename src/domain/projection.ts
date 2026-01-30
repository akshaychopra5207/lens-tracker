// src/domain/projection.ts
import type { LensEvent } from './events';
import { getCycleDays } from './utilCycle'; // helper below
import { type Frequency, defaultSettings } from './settings';

export type Eye = 'LEFT' | 'RIGHT';

export function project(events: LensEvent[], freq: Frequency = defaultSettings.frequency) {
    let invL = 0, invR = 0;
    let lastUseL: Date | null = null, lastUseR: Date | null = null;
    let lastChangeL: Date | null = null, lastChangeR: Date | null = null;
    let lastUseMetaL: any = null;
    let lastUseMetaR: any = null;
    let manualDueDateL: string | null = null;
    let manualDueDateR: string | null = null;

    for (const e of events) {
        switch (e.type) {
            case 'ADD_STOCK': {
                const added = e.qty;
                const eye = (e.meta as any)?.eye ?? 'BOTH';
                if (eye === 'LEFT') invL += added;
                else if (eye === 'RIGHT') invR += added;
                else { invL += Math.floor(added / 2); invR += Math.ceil(added / 2); }
                break;
            }
            case 'USE_LEFT':
                invL -= 1;
                lastUseL = new Date(e.at);
                lastUseMetaL = e.meta;
                manualDueDateL = null; // Reset on new use
                break;
            case 'USE_RIGHT':
                invR -= 1;
                lastUseR = new Date(e.at);
                lastUseMetaR = e.meta;
                manualDueDateR = null; // Reset on new use
                break;
            case 'CHANGE_LEFT':
                lastChangeL = new Date(e.at);
                manualDueDateL = null; // Reset on change
                break;
            case 'CHANGE_RIGHT':
                lastChangeR = new Date(e.at);
                manualDueDateR = null; // Reset on change
                break;
            case 'CORRECTION': {
                // apply to Right by default for simplicity; later let user choose
                invR += e.qty;
                break;
            }
            case 'UPDATE_DUE_DATE': {
                const meta = e.meta as any;
                if (meta?.eye === 'LEFT') manualDueDateL = meta.newDueDateIso;
                if (meta?.eye === 'RIGHT') manualDueDateR = meta.newDueDateIso;
                break;
            }
        }
    }

    const cycle = getCycleDays(freq);

    let nextL = null;
    if (lastUseL) {
        if (manualDueDateL) {
            nextL = new Date(manualDueDateL);
        } else if (lastUseMetaL?.manualDueDate) {
            nextL = new Date(lastUseMetaL.manualDueDate);
        } else {
            nextL = addDays(lastUseL, cycle);
        }
    }

    let nextR = null;
    if (lastUseR) {
        if (manualDueDateR) {
            nextR = new Date(manualDueDateR);
        } else if (lastUseMetaR?.manualDueDate) {
            nextR = new Date(lastUseMetaR.manualDueDate);
        } else {
            nextR = addDays(lastUseR, cycle);
        }
    }

    const dailyPerEye = 1 / cycle;
    const runwayL = invL > 0 ? Math.floor(invL / dailyPerEye) : 0;
    const runwayR = invR > 0 ? Math.floor(invR / dailyPerEye) : 0;

    return {
        inventory: invL + invR,
        invL, invR,
        lastUseL, lastUseR,
        lastChangeL, lastChangeR,
        nextL, nextR,
        runOutDays: Math.min(runwayL, runwayR),
        runwayL, runwayR,
        cycleDays: cycle
    };
}

function addDays(d: Date, days: number) { const t = new Date(d); t.setDate(t.getDate() + days); return t; }
