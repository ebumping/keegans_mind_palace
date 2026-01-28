# Navigation System Specification

## Overview

The navigation system provides first-person movement through Keegan's Mind Palace, including keyboard/mouse controls, collision detection, doorway transitions, and audio-reactive camera effects that enhance the liminal atmosphere.

---

## Control Scheme

### Desktop Controls

| Input | Action |
|-------|--------|
| W / Up Arrow | Move forward |
| S / Down Arrow | Move backward |
| A / Left Arrow | Strafe left |
| D / Right Arrow | Strafe right |
| Mouse Move | Look around (when locked) |
| Click | Lock pointer / Interact |
| Escape | Unlock pointer |
| Shift (held) | Sprint (1.5x speed) |
| Space | Not used (no jump - enhances dread) |

### Mobile Controls (Fallback)

| Input | Action |
|-------|--------|
| Left joystick (virtual) | Movement |
| Right side drag | Look around |
| Tap doorway | Transition to room |

---

## Movement System

### Movement Parameters

```typescript
interface MovementConfig {
  // Base speeds (units per second)
  walkSpeed: number;        // 3.0
  sprintSpeed: number;      // 4.5
  strafeSpeed: number;      // 2.5

  // Acceleration
  acceleration: number;     // 15.0 - How fast to reach target speed
  deceleration: number;     // 10.0 - How fast to stop
  airControl: number;       // 0.3 - Not used (no jumping)

  // Camera
  lookSensitivity: number;  // 0.002
  lookSmoothness: number;   // 0.1 - Interpolation factor
  maxPitch: number;         // 85 degrees (prevents gimbal lock)

  // Physics
  playerHeight: number;     // 1.7 meters (eye level)
  playerRadius: number;     // 0.3 meters (collision capsule)
  gravity: number;          // 0 (no gravity in liminal space)
}

const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  walkSpeed: 3.0,
  sprintSpeed: 4.5,
  strafeSpeed: 2.5,
  acceleration: 15.0,
  deceleration: 10.0,
  airControl: 0.3,
  lookSensitivity: 0.002,
  lookSmoothness: 0.1,
  maxPitch: 85,
  playerHeight: 1.7,
  playerRadius: 0.3,
  gravity: 0
};
```

### Movement State

```typescript
interface MovementState {
  // Position
  position: THREE.Vector3;
  velocity: THREE.Vector3;

  // Rotation
  yaw: number;    // Horizontal rotation (radians)
  pitch: number;  // Vertical rotation (radians)

  // Input state
  forward: number;   // -1 to 1
  strafe: number;    // -1 to 1
  sprinting: boolean;

  // Status
  isGrounded: boolean;  // Always true (no jumping)
  isMoving: boolean;
}
```

### Movement Update Loop

```typescript
function updateMovement(
  state: MovementState,
  input: InputState,
  config: MovementConfig,
  delta: number,
  room: GeneratedRoom
): void {
  // === Input Processing ===
  state.forward = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  state.strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  state.sprinting = input.sprint && state.forward > 0;

  // === Calculate Target Velocity ===
  const speed = state.sprinting ? config.sprintSpeed : config.walkSpeed;
  const strafeSpeed = config.strafeSpeed;

  // Direction vectors
  const forward = new THREE.Vector3(0, 0, -1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
  const right = new THREE.Vector3(1, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);

  const targetVelocity = new THREE.Vector3()
    .addScaledVector(forward, state.forward * speed)
    .addScaledVector(right, state.strafe * strafeSpeed);

  // === Acceleration / Deceleration ===
  const accel = targetVelocity.length() > 0.01
    ? config.acceleration
    : config.deceleration;

  state.velocity.lerp(targetVelocity, 1 - Math.exp(-accel * delta));

  // === Apply Movement ===
  const movement = state.velocity.clone().multiplyScalar(delta);

  // === Collision Detection ===
  const newPosition = state.position.clone().add(movement);
  const collisionResult = checkCollision(newPosition, config.playerRadius, room);

  if (collisionResult.collided) {
    // Slide along wall
    const slideMovement = movement.clone()
      .projectOnPlane(collisionResult.normal)
      .multiplyScalar(0.8); // Friction
    state.position.add(slideMovement);
  } else {
    state.position.copy(newPosition);
  }

  // === Update Status ===
  state.isMoving = state.velocity.length() > 0.1;
}
```

---

## Camera System

### Camera Configuration

```typescript
interface CameraConfig {
  fov: number;           // 75 degrees
  near: number;          // 0.1
  far: number;           // 1000
  eyeHeight: number;     // 1.7 meters

  // Audio-reactive effects
  swayEnabled: boolean;
  swayIntensity: number; // Multiplier for audio-driven sway
  fovPulseEnabled: boolean;
  fovPulseIntensity: number;
}
```

### Pointer Lock Integration

```typescript
class PointerLockController {
  private element: HTMLElement;
  private isLocked: boolean = false;
  private onLock: () => void;
  private onUnlock: () => void;

  constructor(element: HTMLElement) {
    this.element = element;

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === element;
      if (this.isLocked) this.onLock?.();
      else this.onUnlock?.();
    });
  }

  lock(): void {
    this.element.requestPointerLock();
  }

  unlock(): void {
    document.exitPointerLock();
  }

  onMouseMove(event: MouseEvent): { deltaX: number; deltaY: number } {
    if (!this.isLocked) return { deltaX: 0, deltaY: 0 };

    return {
      deltaX: event.movementX,
      deltaY: event.movementY
    };
  }
}
```

### Look Controls

```typescript
function updateLook(
  state: MovementState,
  mouseInput: { deltaX: number; deltaY: number },
  config: MovementConfig
): void {
  // Apply sensitivity
  const yawDelta = -mouseInput.deltaX * config.lookSensitivity;
  const pitchDelta = -mouseInput.deltaY * config.lookSensitivity;

  // Update rotation
  state.yaw += yawDelta;
  state.pitch = THREE.MathUtils.clamp(
    state.pitch + pitchDelta,
    -config.maxPitch * THREE.MathUtils.DEG2RAD,
    config.maxPitch * THREE.MathUtils.DEG2RAD
  );
}
```

### Audio-Reactive Camera Effects

```typescript
interface CameraEffects {
  // Subtle sway based on audio
  sway: THREE.Vector2;

  // FOV pulse on transients
  fovOffset: number;

  // Shake from Growl
  shake: THREE.Vector3;
}

function updateCameraEffects(
  effects: CameraEffects,
  audioLevels: AudioLevels,
  growlIntensity: number,
  time: number,
  delta: number
): void {
  // === Audio Sway ===
  // Subtle disorientation when music is playing
  const swayX = Math.sin(time * 0.5) * audioLevels.mid * 0.003;
  const swayY = Math.cos(time * 0.7) * audioLevels.bass * 0.002;
  effects.sway.set(swayX, swayY);

  // === FOV Pulse ===
  // Slight FOV increase on bass hits
  const targetFovOffset = audioLevels.transient ? 5 : audioLevels.bass * 2;
  effects.fovOffset = THREE.MathUtils.lerp(
    effects.fovOffset,
    targetFovOffset,
    delta * 10
  );

  // === Growl Shake ===
  // Increasing camera shake as Growl intensifies
  if (growlIntensity > 0.5) {
    const shakeIntensity = (growlIntensity - 0.5) * 0.01;
    effects.shake.set(
      (Math.random() - 0.5) * shakeIntensity,
      (Math.random() - 0.5) * shakeIntensity,
      0
    );
  } else {
    effects.shake.set(0, 0, 0);
  }
}
```

---

## Collision Detection

### Room Boundary Collision

```typescript
interface CollisionResult {
  collided: boolean;
  normal: THREE.Vector3;
  penetration: number;
}

function checkCollision(
  position: THREE.Vector3,
  radius: number,
  room: GeneratedRoom
): CollisionResult {
  const result: CollisionResult = {
    collided: false,
    normal: new THREE.Vector3(),
    penetration: 0
  };

  const { width, height, depth } = room.dimensions;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  // Check each wall
  const walls = [
    { axis: 'x', sign: 1, limit: halfWidth },   // East wall
    { axis: 'x', sign: -1, limit: halfWidth },  // West wall
    { axis: 'z', sign: 1, limit: halfDepth },   // North wall
    { axis: 'z', sign: -1, limit: halfDepth }   // South wall
  ];

  for (const wall of walls) {
    const posValue = position[wall.axis as keyof THREE.Vector3] as number;
    const limit = wall.limit * wall.sign;
    const distance = wall.sign > 0
      ? limit - posValue
      : posValue - (-limit);

    if (distance < radius) {
      result.collided = true;
      result.penetration = Math.max(result.penetration, radius - distance);
      result.normal[wall.axis as 'x' | 'y' | 'z'] = -wall.sign;
    }
  }

  // Check doorway openings (allow passage)
  for (const doorway of room.doorways) {
    if (isInDoorwayBounds(position, doorway, radius)) {
      // In doorway - no collision with this wall section
      result.collided = false;
      break;
    }
  }

  result.normal.normalize();
  return result;
}
```

### Doorway Bounds Check

```typescript
function isInDoorwayBounds(
  position: THREE.Vector3,
  doorway: DoorwayPlacement,
  radius: number
): boolean {
  // Calculate doorway world position and bounds
  const doorwayCenter = getDoorwayWorldPosition(doorway);
  const doorwayBounds = {
    minX: doorwayCenter.x - doorway.width / 2 - radius,
    maxX: doorwayCenter.x + doorway.width / 2 + radius,
    minY: 0,
    maxY: doorway.height + radius,
    minZ: doorwayCenter.z - 0.5,
    maxZ: doorwayCenter.z + 0.5
  };

  return (
    position.x >= doorwayBounds.minX &&
    position.x <= doorwayBounds.maxX &&
    position.y >= doorwayBounds.minY &&
    position.y <= doorwayBounds.maxY &&
    position.z >= doorwayBounds.minZ &&
    position.z <= doorwayBounds.maxZ
  );
}
```

---

## Room Transition System

### Transition Detection

```typescript
interface TransitionTrigger {
  doorway: DoorwayPlacement;
  direction: 'entering' | 'exiting';
  progress: number;  // 0-1 how far through doorway
}

function checkTransitionTrigger(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  room: GeneratedRoom
): TransitionTrigger | null {
  for (const doorway of room.doorways) {
    const doorwayPos = getDoorwayWorldPosition(doorway);
    const distance = position.distanceTo(doorwayPos);

    // Within transition zone
    if (distance < 1.5) {
      // Check if moving towards doorway
      const towardsDoorway = new THREE.Vector3()
        .subVectors(doorwayPos, position)
        .normalize();
      const movingTowards = velocity.dot(towardsDoorway) > 0;

      if (movingTowards) {
        return {
          doorway,
          direction: 'entering',
          progress: 1 - (distance / 1.5)
        };
      }
    }
  }

  return null;
}
```

### Transition Execution

```typescript
interface TransitionState {
  active: boolean;
  progress: number;     // 0-1
  fromRoom: number;
  toRoom: number;
  effect: TransitionEffect;
}

type TransitionEffect = 'fade' | 'warp' | 'dissolve' | 'impossible';

async function executeTransition(
  transitionState: TransitionState,
  roomPool: RoomPool,
  navigation: NavigationSystem
): Promise<void> {
  transitionState.active = true;
  transitionState.progress = 0;

  // Determine effect based on abnormality
  const abnormality = getAbnormalityFactor(transitionState.toRoom);
  transitionState.effect = selectTransitionEffect(abnormality);

  // Animate transition
  const duration = 0.8; // seconds
  const startTime = performance.now();

  return new Promise((resolve) => {
    function animate() {
      const elapsed = (performance.now() - startTime) / 1000;
      transitionState.progress = Math.min(elapsed / duration, 1);

      if (transitionState.progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Complete transition
        roomPool.currentIndex = transitionState.toRoom;
        navigation.teleportToRoomEntry(transitionState.toRoom);
        transitionState.active = false;
        resolve();
      }
    }

    animate();
  });
}

function selectTransitionEffect(abnormality: number): TransitionEffect {
  const roll = Math.random();

  if (abnormality < 0.2) return 'fade';
  if (abnormality < 0.5) return roll < 0.7 ? 'fade' : 'warp';
  if (abnormality < 0.8) return roll < 0.5 ? 'warp' : 'dissolve';
  return roll < 0.3 ? 'dissolve' : 'impossible';
}
```

### Transition Effects Shader Integration

```typescript
function applyTransitionEffect(
  effect: TransitionEffect,
  progress: number,
  material: THREE.ShaderMaterial
): void {
  switch (effect) {
    case 'fade':
      // Simple fade to black and back
      material.uniforms.u_transitionFade.value =
        progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      break;

    case 'warp':
      // Zoom/distort effect
      material.uniforms.u_transitionWarp.value = Math.sin(progress * Math.PI);
      break;

    case 'dissolve':
      // Noise-based dissolve
      material.uniforms.u_transitionDissolve.value = progress;
      break;

    case 'impossible':
      // Multiple effects combined with color shift
      material.uniforms.u_transitionWarp.value = Math.sin(progress * Math.PI * 2);
      material.uniforms.u_transitionColorShift.value = progress;
      break;
  }
}
```

---

## Input Handling

### Input State Management

```typescript
interface InputState {
  // Movement
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;

  // Mouse
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;

  // Touch (mobile)
  touchMoveX: number;
  touchMoveY: number;
  touchLookX: number;
  touchLookY: number;
}

function createInputManager(): InputManager {
  const state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    mouseX: 0,
    mouseY: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
    touchMoveX: 0,
    touchMoveY: 0,
    touchLookX: 0,
    touchLookY: 0
  };

  // Keyboard handlers
  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        state.sprint = true;
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        state.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        state.sprint = false;
        break;
    }
  });

  return { state, reset: () => { /* Reset state */ } };
}
```

---

## React Three Fiber Integration

### Navigation Hook

```typescript
function useNavigation(config?: Partial<MovementConfig>): NavigationHook {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [movementState, setMovementState] = useState<MovementState>(createInitialState());
  const inputManager = useMemo(() => createInputManager(), []);
  const pointerLock = useRef<PointerLockController | null>(null);

  const fullConfig = { ...DEFAULT_MOVEMENT_CONFIG, ...config };

  // Initialize pointer lock
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      pointerLock.current = new PointerLockController(canvas);
    }
  }, []);

  // Frame update
  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    // Update movement
    updateMovement(
      movementState,
      inputManager.state,
      fullConfig,
      delta,
      currentRoom
    );

    // Update look
    updateLook(
      movementState,
      {
        deltaX: inputManager.state.mouseDeltaX,
        deltaY: inputManager.state.mouseDeltaY
      },
      fullConfig
    );

    // Reset mouse delta
    inputManager.state.mouseDeltaX = 0;
    inputManager.state.mouseDeltaY = 0;

    // Apply to camera
    cameraRef.current.position.copy(movementState.position);
    cameraRef.current.position.y = fullConfig.eyeHeight;

    cameraRef.current.rotation.order = 'YXZ';
    cameraRef.current.rotation.y = movementState.yaw;
    cameraRef.current.rotation.x = movementState.pitch;
  });

  return {
    cameraRef,
    position: movementState.position,
    isMoving: movementState.isMoving,
    lockPointer: () => pointerLock.current?.lock()
  };
}
```

---

## Mobile Touch Controls

### Virtual Joystick

```typescript
interface VirtualJoystick {
  position: { x: number; y: number };
  active: boolean;
  value: { x: number; y: number };  // -1 to 1
}

function createVirtualJoystick(
  side: 'left' | 'right',
  onUpdate: (value: { x: number; y: number }) => void
): VirtualJoystick {
  const joystick: VirtualJoystick = {
    position: { x: 0, y: 0 },
    active: false,
    value: { x: 0, y: 0 }
  };

  const container = document.createElement('div');
  container.className = `virtual-joystick ${side}`;
  // ... touch event handling
  // Updates joystick.value and calls onUpdate

  return joystick;
}
```

---

## Files

| File | Purpose |
|------|---------|
| `src/systems/NavigationSystem.ts` | Core movement and collision |
| `src/systems/TransitionSystem.ts` | Room transition handling |
| `src/hooks/useNavigation.ts` | React hook for navigation |
| `src/hooks/usePointerLock.ts` | Pointer lock management |
| `src/components/UI/MobileControls.tsx` | Touch joysticks |
| `src/utils/input.ts` | Input state management |
