// src/domain/utilCycle.ts
import { FREQ_TO_CYCLE_DAYS, type Frequency } from './settings';
export function getCycleDays(freq: Frequency) { return FREQ_TO_CYCLE_DAYS[freq]; }
