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
import { buildSubwayPlatform } from './templates/SubwayPlatform';
import { buildServerRoom } from './templates/ServerRoom';
import { buildLiminalClassroom } from './templates/LiminalClassroom';
import { buildParkingGarage } from './templates/ParkingGarage';
import { buildLaundromat } from './templates/Laundromat';
import { buildWaitingRoom } from './templates/WaitingRoom';
import { buildElevatorBank } from './templates/ElevatorBank';
import { buildLivingRoom } from './templates/LivingRoom';

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
 * Rooms 1–15 all have full curated builders.
 */
const BUILDER_REGISTRY: Record<string, CuratedBuilderFn> = {
  infinite_hallway: buildInfiniteHallway,
  empty_pool: buildEmptyPool,
  backrooms_office: buildBackroomsOffice,
  stairwell_nowhere: buildStairwellNowhere,
  hotel_corridor: buildHotelCorridor,
  mall_atrium: buildMallAtrium,
  bathroom: buildBathroom,
  subway_platform: buildSubwayPlatform,
  server_room: buildServerRoom,
  liminal_classroom: buildLiminalClassroom,
  parking_garage: buildParkingGarage,
  laundromat: buildLaundromat,
  waiting_room: buildWaitingRoom,
  elevator_bank: buildElevatorBank,
  living_room: buildLivingRoom,
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
