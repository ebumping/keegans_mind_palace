/**
 * Doorway Component
 *
 * Three.js class component that renders a procedurally generated doorway
 * with glowing frame edges and audio-reactive portal effects.
 */

import * as THREE from 'three';
import {
  DoorwayGenerator,
  type DoorwayConfig,
  type GeneratedDoorway,
  type DoorState,
} from '../generators/DoorwayGenerator';
import type { DoorwayPlacement, DoorwayGeometry, RoomDimensions } from '../types/room';

// Pale-strata color palette
const COLORS = {
  primary: '#c792f5',
  secondary: '#8eecf5',
};

interface AudioLevels {
  bass: number;
  mid: number;
  high: number;
  overall: number;
  transient: boolean;
  transientIntensity: number;
}

export interface DoorwayOptions {
  placement: DoorwayPlacement;
  geometry?: Partial<DoorwayGeometry>;
  roomDimensions: RoomDimensions;
  seed?: number;
  initialState?: DoorState;
  enablePortal?: boolean;
  enableDoorPanel?: boolean;
}

export class Doorway {
  public mesh: THREE.Group;
  public portal: THREE.Mesh | null;
  public doorPanel: THREE.Mesh | null;
  public worldPosition: THREE.Vector3;
  public worldRotation: THREE.Euler;

  private generator: DoorwayGenerator;
  private generatedDoorway: GeneratedDoorway;
  private config: DoorwayConfig;
  private doorState: DoorState;
  private openAmount: number;
  private targetOpenAmount: number;

  constructor(options: DoorwayOptions) {
    const {
      placement,
      geometry = {},
      roomDimensions,
      seed = 42,
      initialState = 'open',
      enablePortal = true,
      enableDoorPanel = true,
    } = options;

    // Complete geometry with defaults
    const fullGeometry: DoorwayGeometry = {
      frameThickness: geometry.frameThickness ?? 0.1,
      archType: geometry.archType ?? 'rectangular',
      glowColor: geometry.glowColor ?? COLORS.primary,
      glowIntensity: geometry.glowIntensity ?? 0.6,
    };

    this.doorState = initialState;
    this.openAmount = initialState === 'open' ? 1 : initialState === 'closed' ? 0 : 0.5;
    this.targetOpenAmount = this.openAmount;

    this.config = {
      placement,
      geometry: fullGeometry,
      roomDimensions,
      state: this.doorState,
      openAmount: this.openAmount,
    };

    this.generator = new DoorwayGenerator({
      enablePortalEffect: enablePortal,
      enableDoorPanel: enableDoorPanel,
    });

    this.generatedDoorway = this.generator.generate(this.config, seed);

    this.mesh = this.generatedDoorway.frame;
    this.portal = this.generatedDoorway.portal;
    this.doorPanel = this.generatedDoorway.doorPanel;
    this.worldPosition = this.generatedDoorway.worldPosition;
    this.worldRotation = this.generatedDoorway.worldRotation;
  }

  /**
   * Get the doorway placement info
   */
  get placement(): DoorwayPlacement {
    return this.config.placement;
  }

  /**
   * Get current door state
   */
  get state(): DoorState {
    return this.doorState;
  }

  /**
   * Set door state with smooth transition
   */
  setState(state: DoorState): void {
    this.doorState = state;
    this.targetOpenAmount = state === 'open' ? 1 : state === 'closed' ? 0 : 0.5;
    // Also update the generated doorway's open amount for proper animation
    this.generatedDoorway.setOpenAmount(this.targetOpenAmount);
  }

  /**
   * Set door open amount directly (0-1)
   */
  setOpenAmount(amount: number): void {
    this.targetOpenAmount = Math.max(0, Math.min(1, amount));
    // Also update the generated doorway's open amount for proper animation
    this.generatedDoorway.setOpenAmount(this.targetOpenAmount);
  }

  /**
   * Get current open amount (0-1)
   */
  getOpenAmount(): number {
    return this.openAmount;
  }

  /**
   * Check if a position is within the doorway bounds
   */
  isInDoorway(position: THREE.Vector3, threshold: number = 0.5): boolean {
    const { placement } = this.config;
    const doorwayCenter = this.worldPosition.clone();
    doorwayCenter.y = placement.height / 2;

    // Distance check in XZ plane
    const horizontalDist = new THREE.Vector2(
      position.x - doorwayCenter.x,
      position.z - doorwayCenter.z
    ).length();

    // Height check
    const withinHeight = position.y >= 0 && position.y <= placement.height;

    return horizontalDist < threshold && withinHeight;
  }

  /**
   * Get the direction vector pointing through the doorway
   */
  getDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(this.worldRotation);
    return direction;
  }

  /**
   * Set portal shimmer effect intensity and color.
   * Used by the variation system to indicate alternate room versions.
   */
  setShimmer(intensity: number, color: THREE.Color): void {
    this.generatedDoorway.setShimmer(intensity, color);
  }

  /**
   * Update doorway animation and audio reactivity
   */
  update(audioLevels: AudioLevels, delta: number, time: number): void {
    // Smooth door opening/closing
    this.openAmount = THREE.MathUtils.lerp(
      this.openAmount,
      this.targetOpenAmount,
      delta * 3
    );

    // Update generated doorway (glow, portal effects)
    this.generatedDoorway.update(audioLevels, delta, time);

    // Update door state based on openAmount
    if (Math.abs(this.openAmount - this.targetOpenAmount) < 0.01) {
      if (this.openAmount < 0.1) {
        this.doorState = 'closed';
      } else if (this.openAmount > 0.9) {
        this.doorState = 'open';
      } else {
        this.doorState = 'partial';
      }
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.generatedDoorway.dispose();
  }
}

/**
 * Factory function to create multiple doorways for a room
 */
export function createDoorwaysForRoom(
  placements: DoorwayPlacement[],
  geometry: DoorwayGeometry,
  roomDimensions: RoomDimensions,
  baseSeed: number,
  options?: {
    enablePortal?: boolean;
    enableDoorPanel?: boolean;
    initialState?: DoorState;
  }
): Doorway[] {
  return placements.map((placement, index) => {
    return new Doorway({
      placement,
      geometry,
      roomDimensions,
      seed: baseSeed + index * 1000,
      initialState: options?.initialState ?? 'open',
      enablePortal: options?.enablePortal ?? true,
      enableDoorPanel: options?.enableDoorPanel ?? true,
    });
  });
}

export default Doorway;
