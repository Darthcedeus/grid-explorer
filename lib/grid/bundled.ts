import power from '@/data/energy-power.json';
import flows from '@/data/energy-flows.json';
import { normalizePair } from './domain';
import type {Envelope} from './types';
export function bundled(){return normalizePair(power as Envelope,flows as Envelope,'2026-09-18T07:14:37Z','bundled');}
