/**
 * Navigation System
 *
 * First-person navigation for Keegan's Mind Palace with:
 * - WASD/arrow key movement with smooth acceleration
 * - Mouse look controls via pointer lock
 * - Capsule collision detection (upgraded from AABB)
 * - Step climbing for stairs and obstacles
 * - Doorway detection and room transition triggers
 * - Audio-reactive camera sway for disorientation effect
 * - Audio-movement binding (bass = weight, transients = stumble)
 * - Camera drift for subtle unease
 *
 * Per surreal-game-design skill: Movement should feel almost right,
 * with subtle wrongness that unsettles without breaking immersion.
 */

import * as THREE from 'three';
import type { RoomConfig, DoorwayPlacement, Wall, RoomDimensions } from '../types/room';
import {
  getCollisionManager,
  type CapsuleCollider,
  DEFAULT_CAPSULE,
} from './CollisionManager';

// ============================================
// Types and Interfaces
// ============================================

export interface MovementConfig {
  // Base speeds (units per second)
  walkSpeed: number;
  sprintSpeed: number;
  strafeSpeed: number;
  backwardSpeedMultiplier: number; // Asymmetric traversal - backward feels slower

  // Acceleration
  acceleration: number;
  deceleration: number;

  // Camera
  lookSensitivity: number;
  maxPitch: number; // Degrees

  // Physics
  playerHeight: number; // Eye level
  playerRadius: number; // Collision capsule radius
  capsuleHeight: number; // Full capsule height

  // Audio influence (surreal movement)
  audioInfluence: number; // How much audio affects movement (0-0.3)
  transientStumbleIntensity: number; // Camera jolt on audio transients
  transientCooldown: number; // Seconds between transient responses

  // Camera drift (subtle autonomous movement)
  driftIntensity: number; // Base drift amount (0-0.002)
  driftGrowlMultiplier: number; // How much Growl increases drift
}

export interface MovementState {
  // Position
  position: THREE.Vector3;
  velocity: THREE.Vector3;

  // Rotation (radians)
  yaw: number;
  pitch: number;

  // Input state
  forward: number; // -1 to 1
  strafe: number; // -1 to 1
  sprinting: boolean;

  // Status
  isMoving: boolean;
}

export interface InputState {
  // Movement keys
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;

  // Mouse
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export interface CollisionResult {
  collided: boolean;
  normal: THREE.Vector3;
  penetration: number;
  inDoorway: boolean;
  doorway: DoorwayPlacement | null;
}

export interface TransitionTrigger {
  doorway: DoorwayPlacement;
  direction: 'entering' | 'exiting';
  progress: number; // 0-1 how far through doorway
}

export interface CameraEffects {
  // Audio-reactive sway
  swayOffset: THREE.Vector2;
  // FOV pulse on bass
  fovOffset: number;
  // Camera roll (for transient stumbles)
  rollOffset: number;
  // Autonomous drift (subtle wrongness)
  driftOffset: THREE.Vector2;
}

export interface AudioLevelsInput {
  bass: number;
  mid: number;
  high: number;
  transient: boolean;
  transientIntensity?: number; // 0-1 for more nuanced response
}

export interface MovementModifiers {
  // Current transient cooldown timer
  transientCooldownTimer: number;
  // Recovery from transient stumble
  stumbleRecovery: number;
  // Growl intensity for drift scaling
  growlIntensity: number;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  walkSpeed: 3.0,
  sprintSpeed: 4.5,
  strafeSpeed: 2.5,
  backwardSpeedMultiplier: 0.85, // Backward movement 15% slower (asymmetric traversal)
  acceleration: 15.0,
  deceleration: 10.0,
  lookSensitivity: 0.002,
  maxPitch: 85,
  playerHeight: 1.7,
  playerRadius: 0.3,
  capsuleHeight: 1.8,

  // Audio influence defaults
  audioInfluence: 0.15, // 15% movement weight from bass
  transientStumbleIntensity: 0.02, // Camera roll jolt
  transientCooldown: 0.3, // 300ms between stumbles

  // Camera drift defaults
  driftIntensity: 0.001, // Very subtle autonomous movement
  driftGrowlMultiplier: 2.0, // Doubles at max Growl
};

// ============================================
// Movement State Factory
// ============================================

export function createMovementState(initialPosition?: THREE.Vector3): MovementState {
  return {
    position: initialPosition?.clone() ?? new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    forward: 0,
    strafe: 0,
    sprinting: false,
    isMoving: false,
  };
}

export function createInputState(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  };
}

export function createCameraEffects(): CameraEffects {
  return {
    swayOffset: new THREE.Vector2(),
    fovOffset: 0,
    rollOffset: 0,
    driftOffset: new THREE.Vector2(),
  };
}

export function createMovementModifiers(): MovementModifiers {
  return {
    transientCooldownTimer: 0,
    stumbleRecovery: 0,
    growlIntensity: 0,
  };
}

// ============================================
// Input Processing
// ============================================

/**
 * Process keyboard input into movement direction
 */
export function processMovementInput(state: MovementState, input: InputState): void {
  state.forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  state.strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.sprinting = input.sprint && state.forward > 0; // Only sprint when moving forward
}

/**
 * Process mouse input into look rotation
 */
export function processLookInput(
  state: MovementState,
  input: InputState,
  config: MovementConfig
): void {
  // Apply sensitivity
  const yawDelta = -input.mouseDeltaX * config.lookSensitivity;
  const pitchDelta = -input.mouseDeltaY * config.lookSensitivity;

  // Update rotation
  state.yaw += yawDelta;

  // Clamp pitch to prevent gimbal lock
  const maxPitchRad = config.maxPitch * THREE.MathUtils.DEG2RAD;
  state.pitch = THREE.MathUtils.clamp(state.pitch + pitchDelta, -maxPitchRad, maxPitchRad);
}

// ============================================
// Movement Update
// ============================================

// Reusable vectors to avoid allocations
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _targetVelocity = new THREE.Vector3();
const _movement = new THREE.Vector3();
const _newPosition = new THREE.Vector3();
const _capsule: CapsuleCollider = { ...DEFAULT_CAPSULE };

/**
 * Update movement state based on input and apply physics
 * Now uses capsule collision instead of AABB
 * Includes audio-movement binding per surreal-game-design skill
 */
export function updateMovement(
  state: MovementState,
  config: MovementConfig,
  delta: number,
  roomConfig: RoomConfig | null,
  audioLevels?: AudioLevelsInput,
  modifiers?: MovementModifiers
): CollisionResult {
  const collisionManager = getCollisionManager();

  // Update capsule dimensions from config
  _capsule.radius = config.playerRadius;
  _capsule.height = config.capsuleHeight;
  _capsule.offset.set(0, config.capsuleHeight * 0.5, 0);

  // Calculate base speed with asymmetric traversal
  let speed = state.sprinting ? config.sprintSpeed : config.walkSpeed;

  // Backward movement is slower (asymmetric traversal - "the path back feels longer")
  if (state.forward < 0) {
    speed *= config.backwardSpeedMultiplier;
  }

  let strafeSpeed = config.strafeSpeed;

  // Audio-movement binding: bass adds weight
  if (audioLevels && config.audioInfluence > 0) {
    const bassWeight = 1 + audioLevels.bass * config.audioInfluence;
    speed /= bassWeight;
    strafeSpeed /= bassWeight;
  }

  // Calculate direction vectors based on yaw (horizontal rotation only)
  _forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
  _right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

  // Calculate target velocity
  _targetVelocity
    .set(0, 0, 0)
    .addScaledVector(_forward, state.forward * speed)
    .addScaledVector(_right, state.strafe * strafeSpeed);

  // Audio-movement binding: transient causes micro-stumble
  if (audioLevels && modifiers && audioLevels.transient) {
    if (modifiers.transientCooldownTimer <= 0) {
      // Reduce velocity on transient
      state.velocity.multiplyScalar(0.85);
      modifiers.transientCooldownTimer = config.transientCooldown;
      modifiers.stumbleRecovery = 1.0;
    }
  }

  // Update cooldown timer
  if (modifiers && modifiers.transientCooldownTimer > 0) {
    modifiers.transientCooldownTimer -= delta;
  }

  // Apply acceleration/deceleration with exponential smoothing
  const accel = _targetVelocity.lengthSq() > 0.01 ? config.acceleration : config.deceleration;
  const smoothFactor = 1 - Math.exp(-accel * delta);
  state.velocity.lerp(_targetVelocity, smoothFactor);

  // Calculate movement delta
  _movement.copy(state.velocity).multiplyScalar(delta);

  // Calculate new position
  _newPosition.copy(state.position).add(_movement);

  // Check collision using capsule
  let collisionResult: CollisionResult = {
    collided: false,
    normal: new THREE.Vector3(),
    penetration: 0,
    inDoorway: false,
    doorway: null,
  };

  if (roomConfig) {
    // Use new capsule collision system
    const fullResult = collisionManager.testMovement(state.position, _newPosition, _capsule);

    collisionResult.collided = fullResult.collided;
    collisionResult.normal = fullResult.normal;
    collisionResult.penetration = fullResult.penetration;
    collisionResult.inDoorway = fullResult.inDoorway;
    collisionResult.doorway = fullResult.doorway;

    if (fullResult.collided && !fullResult.inDoorway) {
      // Try step climbing first
      const stepResult = collisionManager.attemptStep(state.position, _movement, _capsule);

      if (stepResult.success) {
        state.position.copy(stepResult.newPosition);
      } else {
        // Slide along surface
        const slideMovement = collisionManager.slideAlongSurface(
          state.position,
          _movement,
          fullResult.normal,
          _capsule
        );
        state.position.add(slideMovement);

        // Reduce velocity in collision direction
        const dot = state.velocity.dot(fullResult.normal);
        if (dot < 0) {
          state.velocity.sub(fullResult.normal.clone().multiplyScalar(dot));
        }
      }
    } else {
      // No collision - apply full movement
      state.position.copy(_newPosition);
    }

    // Apply breathing wall push
    if (fullResult.pushVector.lengthSq() > 0) {
      state.position.add(fullResult.pushVector);
      // Also affect velocity slightly for physical feel
      state.velocity.add(fullResult.pushVector.clone().multiplyScalar(0.5));
    }

    // Safety clamp: ensure player stays within room bounds
    // But allow passage through doorways by not clamping near door openings
    const halfWidth = roomConfig.dimensions.width / 2 - config.playerRadius;
    const halfDepth = roomConfig.dimensions.depth / 2 - config.playerRadius;

    // Check if the player is currently in a doorway trigger zone
    const inDoorwayZone = collisionManager.isInDoorway(state.position, config.playerRadius);

    if (!inDoorwayZone) {
      state.position.x = THREE.MathUtils.clamp(state.position.x, -halfWidth, halfWidth);
      state.position.z = THREE.MathUtils.clamp(state.position.z, -halfDepth, halfDepth);
    }
  } else {
    // No room config - allow free movement (fallback to legacy)
    collisionResult = checkCollision(_newPosition, config.playerRadius, roomConfig!);

    if (collisionResult.collided && !collisionResult.inDoorway) {
      const slideMovement = _movement
        .clone()
        .projectOnPlane(collisionResult.normal)
        .multiplyScalar(0.8);

      state.position.add(slideMovement);
      state.velocity.projectOnPlane(collisionResult.normal);
    } else {
      state.position.copy(_newPosition);
    }
  }

  // Update moving status
  state.isMoving = state.velocity.lengthSq() > 0.01;

  return collisionResult;
}

// ============================================
// Collision Detection
// ============================================

/**
 * Check collision against room boundaries
 */
export function checkCollision(
  position: THREE.Vector3,
  radius: number,
  roomConfig: RoomConfig
): CollisionResult {
  const result: CollisionResult = {
    collided: false,
    normal: new THREE.Vector3(),
    penetration: 0,
    inDoorway: false,
    doorway: null,
  };

  const { width, depth } = roomConfig.dimensions;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  // Define wall boundaries
  const walls = [
    { axis: 'x' as const, sign: 1, limit: halfWidth, wall: 'east' as Wall },
    { axis: 'x' as const, sign: -1, limit: halfWidth, wall: 'west' as Wall },
    { axis: 'z' as const, sign: 1, limit: halfDepth, wall: 'south' as Wall },
    { axis: 'z' as const, sign: -1, limit: halfDepth, wall: 'north' as Wall },
  ];

  for (const wallDef of walls) {
    const posValue = wallDef.axis === 'x' ? position.x : position.z;
    const limit = wallDef.limit * wallDef.sign;
    const distance = wallDef.sign > 0 ? limit - posValue : posValue - -limit;

    if (distance < radius) {
      // Check if we're in a doorway on this wall
      const doorway = checkDoorwayBounds(position, radius, wallDef.wall, roomConfig);

      if (doorway) {
        // In doorway - no collision
        result.inDoorway = true;
        result.doorway = doorway;
        continue;
      }

      // Collision with wall
      result.collided = true;
      result.penetration = Math.max(result.penetration, radius - distance);

      // Add to normal
      if (wallDef.axis === 'x') {
        result.normal.x -= wallDef.sign;
      } else {
        result.normal.z -= wallDef.sign;
      }
    }
  }

  if (result.collided) {
    result.normal.normalize();
  }

  return result;
}

/**
 * Check if position is within a doorway on the specified wall
 */
function checkDoorwayBounds(
  position: THREE.Vector3,
  radius: number,
  wall: Wall,
  roomConfig: RoomConfig
): DoorwayPlacement | null {
  const { dimensions, doorways } = roomConfig;

  for (const doorway of doorways) {
    if (doorway.wall !== wall) continue;

    const doorwayPos = getDoorwayWorldPosition(doorway, dimensions);
    const halfWidth = doorway.width / 2 + radius;

    // Check if within horizontal bounds of doorway
    const inHorizontalBounds =
      wall === 'north' || wall === 'south'
        ? Math.abs(position.x - doorwayPos.x) < halfWidth
        : Math.abs(position.z - doorwayPos.z) < halfWidth;

    // Check if within vertical bounds (0 to doorway height)
    const inVerticalBounds = position.y >= 0 && position.y < doorway.height + radius;

    if (inHorizontalBounds && inVerticalBounds) {
      return doorway;
    }
  }

  return null;
}

/**
 * Get doorway position in world space
 */
export function getDoorwayWorldPosition(
  doorway: DoorwayPlacement,
  dimensions: RoomDimensions
): THREE.Vector3 {
  const { width, depth } = dimensions;
  const pos = new THREE.Vector3();

  switch (doorway.wall) {
    case 'north':
      pos.x = (doorway.position - 0.5) * width;
      pos.z = -depth / 2;
      break;
    case 'south':
      pos.x = (doorway.position - 0.5) * width;
      pos.z = depth / 2;
      break;
    case 'east':
      pos.x = width / 2;
      pos.z = (doorway.position - 0.5) * depth;
      break;
    case 'west':
      pos.x = -width / 2;
      pos.z = (doorway.position - 0.5) * depth;
      break;
  }

  pos.y = doorway.height / 2; // Center of doorway
  return pos;
}

// ============================================
// Doorway Detection and Transitions
// ============================================

/**
 * Check if player is approaching/entering a doorway
 */
export function checkTransitionTrigger(
  state: MovementState,
  roomConfig: RoomConfig | null,
  transitionThreshold: number = 1.5
): TransitionTrigger | null {
  if (!roomConfig) return null;

  for (const doorway of roomConfig.doorways) {
    const doorwayPos = getDoorwayWorldPosition(doorway, roomConfig.dimensions);

    // Calculate distance to doorway (horizontal only)
    const dx = state.position.x - doorwayPos.x;
    const dz = state.position.z - doorwayPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if within transition zone
    if (distance < transitionThreshold) {
      // Calculate direction to doorway
      const towardsDoorway = new THREE.Vector3()
        .subVectors(doorwayPos, state.position)
        .setY(0)
        .normalize();

      // Check if moving towards doorway (relaxed threshold for easier triggering)
      const velocityDir = state.velocity.clone().setY(0).normalize();
      const movingTowards = velocityDir.dot(towardsDoorway) > 0.1;

      if (movingTowards && state.isMoving) {
        // Calculate progress through doorway
        const progress = 1 - distance / transitionThreshold;

        return {
          doorway,
          direction: 'entering',
          progress: Math.min(progress, 1),
        };
      }
    }
  }

  return null;
}

/**
 * Get the opposite wall for entry positioning
 */
export function getOppositeWall(wall: Wall): Wall {
  const opposites: Record<Wall, Wall> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
  };
  return opposites[wall];
}

/**
 * Calculate starting position when entering a room from a doorway
 */
export function calculateEntryPosition(
  entryWall: Wall,
  entryPosition: number,
  dimensions: RoomDimensions,
  playerRadius: number
): THREE.Vector3 {
  const position = new THREE.Vector3();
  const { width, depth } = dimensions;
  const offset = playerRadius + 0.5; // Stand slightly inside the room

  switch (entryWall) {
    case 'north':
      position.x = (entryPosition - 0.5) * width;
      position.z = -depth / 2 + offset;
      break;
    case 'south':
      position.x = (entryPosition - 0.5) * width;
      position.z = depth / 2 - offset;
      break;
    case 'east':
      position.x = width / 2 - offset;
      position.z = (entryPosition - 0.5) * depth;
      break;
    case 'west':
      position.x = -width / 2 + offset;
      position.z = (entryPosition - 0.5) * depth;
      break;
  }

  position.y = 0;
  return position;
}

/**
 * Calculate yaw to face into the room from entry point
 */
export function calculateEntryYaw(entryWall: Wall): number {
  const yawMap: Record<Wall, number> = {
    north: 0, // Facing south (into room)
    south: Math.PI, // Facing north
    east: Math.PI / 2, // Facing west
    west: -Math.PI / 2, // Facing east
  };
  return yawMap[entryWall];
}

// ============================================
// Audio-Reactive Camera Effects
// ============================================

/**
 * Update camera effects based on audio levels
 * Creates subtle disorientation when music is playing
 * Includes camera drift for autonomous wrongness
 */
export function updateCameraEffects(
  effects: CameraEffects,
  audioLevels: AudioLevelsInput,
  time: number,
  delta: number,
  config?: MovementConfig,
  modifiers?: MovementModifiers
): void {
  // Audio-driven sway - subtle oscillation based on frequencies
  const targetSwayX = Math.sin(time * 0.5) * audioLevels.mid * 0.003;
  const targetSwayY = Math.cos(time * 0.7) * audioLevels.bass * 0.002;

  // Smooth interpolation
  effects.swayOffset.x = THREE.MathUtils.lerp(effects.swayOffset.x, targetSwayX, delta * 5);
  effects.swayOffset.y = THREE.MathUtils.lerp(effects.swayOffset.y, targetSwayY, delta * 5);

  // FOV pulse on bass hits
  const targetFovOffset = audioLevels.transient ? 5 : audioLevels.bass * 2;
  effects.fovOffset = THREE.MathUtils.lerp(effects.fovOffset, targetFovOffset, delta * 10);

  // Transient stumble - camera roll jolt
  if (modifiers && modifiers.stumbleRecovery > 0) {
    const stumbleIntensity = config?.transientStumbleIntensity || 0.02;
    const targetRoll = (Math.random() - 0.5) * stumbleIntensity * modifiers.stumbleRecovery;
    effects.rollOffset = THREE.MathUtils.lerp(effects.rollOffset, targetRoll, delta * 8);
    modifiers.stumbleRecovery -= delta * 3; // Recover over ~0.33 seconds
  } else {
    // Slowly return roll to zero
    effects.rollOffset = THREE.MathUtils.lerp(effects.rollOffset, 0, delta * 5);
  }

  // Camera drift - subtle autonomous movement
  // Increases with Growl intensity per surreal-game-design skill
  if (config) {
    const growlLevel = modifiers?.growlIntensity || 0;
    const driftIntensity = config.driftIntensity * (1 + growlLevel * config.driftGrowlMultiplier);

    // Slow, somewhat unpredictable drift using multiple frequencies
    const targetDriftX = Math.sin(time * 0.3) * driftIntensity +
                         Math.sin(time * 0.17) * driftIntensity * 0.5;
    const targetDriftY = Math.cos(time * 0.2) * driftIntensity * 0.5 +
                         Math.cos(time * 0.13) * driftIntensity * 0.3;

    effects.driftOffset.x = THREE.MathUtils.lerp(effects.driftOffset.x, targetDriftX, delta * 2);
    effects.driftOffset.y = THREE.MathUtils.lerp(effects.driftOffset.y, targetDriftY, delta * 2);
  }
}

/**
 * Apply camera effects to rotation
 * Now includes roll and drift for subtle wrongness
 */
export function applyCameraEffects(
  baseYaw: number,
  basePitch: number,
  effects: CameraEffects
): { yaw: number; pitch: number; roll: number } {
  return {
    yaw: baseYaw + effects.swayOffset.x + effects.driftOffset.x,
    pitch: basePitch + effects.swayOffset.y + effects.driftOffset.y,
    roll: effects.rollOffset,
  };
}

// ============================================
// Touch Input Manager (for mobile controls)
// ============================================

export interface TouchInputState {
  // Movement joystick (-1 to 1)
  moveX: number;
  moveY: number;
  // Look delta (accumulated per frame)
  lookDeltaX: number;
  lookDeltaY: number;
  // Sprint button
  sprint: boolean;
  // Active state
  isActive: boolean;
}

export function createTouchInputState(): TouchInputState {
  return {
    moveX: 0,
    moveY: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    sprint: false,
    isActive: false,
  };
}

export class TouchInputManager {
  private state: TouchInputState;

  constructor() {
    this.state = createTouchInputState();
  }

  setMovement(x: number, y: number): void {
    this.state.moveX = THREE.MathUtils.clamp(x, -1, 1);
    this.state.moveY = THREE.MathUtils.clamp(y, -1, 1);
    this.state.isActive = true;
  }

  addLookDelta(deltaX: number, deltaY: number): void {
    this.state.lookDeltaX += deltaX;
    this.state.lookDeltaY += deltaY;
    this.state.isActive = true;
  }

  setSprint(sprinting: boolean): void {
    this.state.sprint = sprinting;
  }

  getState(): TouchInputState {
    return this.state;
  }

  resetLookDelta(): void {
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
  }

  reset(): void {
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.lookDeltaX = 0;
    this.state.lookDeltaY = 0;
    this.state.sprint = false;
  }

  isActive(): boolean {
    return this.state.isActive;
  }
}

// Singleton touch input manager for global access
let touchInputManagerInstance: TouchInputManager | null = null;

export function getTouchInputManager(): TouchInputManager {
  if (!touchInputManagerInstance) {
    touchInputManagerInstance = new TouchInputManager();
  }
  return touchInputManagerInstance;
}

// ============================================
// Keyboard Input Manager
// ============================================

export class KeyboardInputManager {
  private state: InputState;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.state = createInputState();

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Ignore if typing in input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = true;
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.sprint = false;
        break;
    }
  }

  getState(): InputState {
    return this.state;
  }

  resetMouseDelta(): void {
    this.state.mouseDeltaX = 0;
    this.state.mouseDeltaY = 0;
  }

  addMouseDelta(deltaX: number, deltaY: number): void {
    this.state.mouseDeltaX += deltaX;
    this.state.mouseDeltaY += deltaY;
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
    }
  }
}

// ============================================
// Pointer Lock Manager
// ============================================

export class PointerLockManager {
  private element: HTMLElement | null = null;
  private isLocked: boolean = false;
  private onLockChange: ((locked: boolean) => void) | null = null;
  private boundLockChange: () => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private inputManager: KeyboardInputManager | null = null;

  constructor() {
    this.boundLockChange = this.handleLockChange.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this.boundLockChange);
      document.addEventListener('mousemove', this.boundMouseMove);
    }
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  setInputManager(manager: KeyboardInputManager): void {
    this.inputManager = manager;
  }

  setOnLockChange(callback: (locked: boolean) => void): void {
    this.onLockChange = callback;
  }

  private handleLockChange(): void {
    // Check if any element has pointer lock (not just our specific element)
    // This avoids reference comparison issues when lock is requested from different sources
    this.isLocked = document.pointerLockElement !== null;
    this.onLockChange?.(this.isLocked);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isLocked || !this.inputManager) return;

    this.inputManager.addMouseDelta(e.movementX, e.movementY);
  }

  lock(): void {
    if (this.element) {
      this.element.requestPointerLock();
    }
  }

  unlock(): void {
    if (typeof document !== 'undefined') {
      document.exitPointerLock();
    }
  }

  getIsLocked(): boolean {
    return this.isLocked;
  }

  dispose(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this.boundLockChange);
      document.removeEventListener('mousemove', this.boundMouseMove);
    }
  }
}

// ============================================
// Singleton Navigation System
// ============================================

let navigationSystemInstance: NavigationSystem | null = null;

export function getNavigationSystem(): NavigationSystem {
  if (!navigationSystemInstance) {
    navigationSystemInstance = new NavigationSystem();
  }
  return navigationSystemInstance;
}

export function disposeNavigationSystem(): void {
  if (navigationSystemInstance) {
    navigationSystemInstance.dispose();
    navigationSystemInstance = null;
  }
}

export class NavigationSystem {
  private movementState: MovementState;
  private config: MovementConfig;
  private inputManager: KeyboardInputManager;
  private pointerLock: PointerLockManager;
  private cameraEffects: CameraEffects;
  private movementModifiers: MovementModifiers;
  private roomConfig: RoomConfig | null = null;
  private onTransition: ((trigger: TransitionTrigger) => void) | null = null;

  constructor(config?: Partial<MovementConfig>) {
    this.config = { ...DEFAULT_MOVEMENT_CONFIG, ...config };
    this.movementState = createMovementState();
    this.inputManager = new KeyboardInputManager();
    this.pointerLock = new PointerLockManager();
    this.cameraEffects = createCameraEffects();
    this.movementModifiers = createMovementModifiers();

    this.pointerLock.setInputManager(this.inputManager);
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.pointerLock.setElement(canvas);

    // Lock pointer on click
    canvas.addEventListener('click', () => {
      if (!this.pointerLock.getIsLocked()) {
        this.pointerLock.lock();
      }
    });
  }

  setRoomConfig(config: RoomConfig | null): void {
    this.roomConfig = config;
    // Update collision manager with new room
    if (config) {
      const collisionManager = getCollisionManager();
      collisionManager.setRoom(config);
    }
  }

  setGrowlIntensity(intensity: number): void {
    this.movementModifiers.growlIntensity = intensity;
  }

  setOnTransition(callback: (trigger: TransitionTrigger) => void): void {
    this.onTransition = callback;
  }

  setPosition(position: THREE.Vector3): void {
    this.movementState.position.copy(position);
    this.movementState.velocity.set(0, 0, 0);
  }

  setYaw(yaw: number): void {
    this.movementState.yaw = yaw;
  }

  getPosition(): THREE.Vector3 {
    return this.movementState.position;
  }

  getYaw(): number {
    return this.movementState.yaw;
  }

  getPitch(): number {
    return this.movementState.pitch;
  }

  isMoving(): boolean {
    return this.movementState.isMoving;
  }

  isPointerLocked(): boolean {
    return this.pointerLock.getIsLocked();
  }

  update(delta: number, audioLevels?: AudioLevelsInput, time?: number): CollisionResult {
    // Process keyboard input
    processMovementInput(this.movementState, this.inputManager.getState());
    processLookInput(this.movementState, this.inputManager.getState(), this.config);

    // Reset mouse delta after processing
    this.inputManager.resetMouseDelta();

    // Process touch input (overrides keyboard if active)
    const touchInput = getTouchInputManager();
    const touchState = touchInput.getState();
    if (touchState.isActive) {
      // Touch movement (joystick maps to forward/strafe)
      if (Math.abs(touchState.moveX) > 0.01 || Math.abs(touchState.moveY) > 0.01) {
        this.movementState.strafe = touchState.moveX;
        this.movementState.forward = -touchState.moveY; // Invert Y for natural joystick feel
      }

      // Touch sprint
      this.movementState.sprinting = touchState.sprint && this.movementState.forward > 0;

      // Touch look (apply sensitivity and update yaw/pitch)
      if (Math.abs(touchState.lookDeltaX) > 0.01 || Math.abs(touchState.lookDeltaY) > 0.01) {
        const lookSensitivity = this.config.lookSensitivity * 0.5; // Slightly lower for touch
        const yawDelta = -touchState.lookDeltaX * lookSensitivity;
        const pitchDelta = -touchState.lookDeltaY * lookSensitivity;

        this.movementState.yaw += yawDelta;

        const maxPitchRad = this.config.maxPitch * THREE.MathUtils.DEG2RAD;
        this.movementState.pitch = THREE.MathUtils.clamp(
          this.movementState.pitch + pitchDelta,
          -maxPitchRad,
          maxPitchRad
        );
      }

      // Reset touch look delta after processing
      touchInput.resetLookDelta();
    }

    // Update movement with audio-movement binding
    const collisionResult = updateMovement(
      this.movementState,
      this.config,
      delta,
      this.roomConfig,
      audioLevels,
      this.movementModifiers
    );

    // Update camera effects with drift and stumble
    if (audioLevels && time !== undefined) {
      updateCameraEffects(
        this.cameraEffects,
        audioLevels,
        time,
        delta,
        this.config,
        this.movementModifiers
      );
    }

    // Check for transition triggers
    const trigger = checkTransitionTrigger(this.movementState, this.roomConfig);
    if (trigger && trigger.progress >= 0.6) {
      this.onTransition?.(trigger);
    }

    return collisionResult;
  }

  getCameraTransform(): {
    position: THREE.Vector3;
    yaw: number;
    pitch: number;
    roll: number;
    fovOffset: number;
  } {
    const { yaw, pitch, roll } = applyCameraEffects(
      this.movementState.yaw,
      this.movementState.pitch,
      this.cameraEffects
    );

    const position = this.movementState.position.clone();
    position.y = this.config.playerHeight;

    return {
      position,
      yaw,
      pitch,
      roll,
      fovOffset: this.cameraEffects.fovOffset,
    };
  }

  dispose(): void {
    this.inputManager.dispose();
    this.pointerLock.dispose();
  }
}

export default NavigationSystem;
