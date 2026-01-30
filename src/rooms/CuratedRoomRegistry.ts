/**
 * Curated Room Builder Registry
 *
 * Maps templateId strings to their corresponding builder functions.
 * Builder functions construct the full Three.js scene for a curated room.
 */

import * as THREE from 'three';
import type { AudioData } from '../systems/AudioReactiveSystem';
import { buildInfiniteHallway } from './templates/InfiniteHallway';
import { buildEmptyPool } from './templates/EmptyPool';
import { buildBackroomsOffice } from './templates/BackroomsOffice';
import { buildStairwellNowhere } from './templates/StairwellNowhere';
import { buildHotelCorridor } from './templates/HotelCorridor';
import { buildMallAtrium } from './templates/MallAtrium';
import { buildBathroom } from './templates/Bathroom';

/** Common interface for all curated room builder results */
export interface CuratedRoomResult {
  mesh: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  update: (audioData: AudioData, delta: number) => void;
  dispose: () => void;
}

/** Builder function signature: takes an optional seed, returns a curated room */
export type CuratedBuilderFn = (seed?: number) => CuratedRoomResult;

/**
 * Registry mapping templateId to builder functions.
 * Only rooms 1–7 have full curated builders; rooms 8–15 have template data
 * (palette, furniture, etc.) but no builder — they use procedural generation
 * with curated palettes applied.
 */
const BUILDER_REGISTRY: Record<string, CuratedBuilderFn> = {
  infinite_hallway: buildInfiniteHallway,
  empty_pool: buildEmptyPool,
  backrooms_office: buildBackroomsOffice,
  stairwell_nowhere: buildStairwellNowhere,
  hotel_corridor: buildHotelCorridor,
  mall_atrium: buildMallAtrium,
  bathroom: buildBathroom,
};

/**
 * Get the curated builder function for a given templateId.
 *
 * @param templateId - The template identifier (e.g. 'infinite_hallway')
 * @returns The builder function, or undefined if no builder exists for this template
 */
export function getCuratedBuilder(templateId: string): CuratedBuilderFn | undefined {
  return BUILDER_REGISTRY[templateId];
}
