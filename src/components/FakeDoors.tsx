/**
 * FakeDoors Component
 *
 * Renders sealed doorway frames on walls — doors that lead nowhere.
 * Part of the wrongness system: at deeper levels, rooms sprout
 * doorframes that are bricked up, too small, too tall, or placed
 * at wrong heights. The unsettling feeling of a door that shouldn't exist.
 */

import * as THREE from 'three';
import { SeededRandom } from '../utils/seededRandom';
import type { DoorwayPlacement, RoomDimensions } from '../types/room';
import { Wall, WrongnessLevel } from '../types/room';

interface FakeDoorsProps {
  fakeDoors: DoorwayPlacement[];
  roomDimensions: RoomDimensions;
  wrongnessLevel: number;
  seed: number;
}

// Muted, wrong-feeling colors for fake door frames
const FAKE_DOOR_COLORS = [
  '#2a2845', // Dark bruise purple
  '#3d2b2b', // Dried blood
  '#1f2f1f', // Institutional green-black
  '#2b2b3d', // Void adjacent
];

/**
 * Calculate world position and rotation for a doorway placement on a wall
 */
function getDoorwayTransform(
  placement: DoorwayPlacement,
  dimensions: RoomDimensions
): { position: THREE.Vector3; rotation: THREE.Euler } {
  const { width, depth } = dimensions;

  switch (placement.wall) {
    case Wall.NORTH:
      return {
        position: new THREE.Vector3(
          (placement.position - 0.5) * width,
          placement.height / 2,
          -depth / 2 + 0.02
        ),
        rotation: new THREE.Euler(0, 0, 0),
      };
    case Wall.SOUTH:
      return {
        position: new THREE.Vector3(
          (placement.position - 0.5) * width,
          placement.height / 2,
          depth / 2 - 0.02
        ),
        rotation: new THREE.Euler(0, Math.PI, 0),
      };
    case Wall.EAST:
      return {
        position: new THREE.Vector3(
          width / 2 - 0.02,
          placement.height / 2,
          (placement.position - 0.5) * depth
        ),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
      };
    case Wall.WEST:
      return {
        position: new THREE.Vector3(
          -width / 2 + 0.02,
          placement.height / 2,
          (placement.position - 0.5) * depth
        ),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
      };
    default:
      return {
        position: new THREE.Vector3(0, placement.height / 2, 0),
        rotation: new THREE.Euler(0, 0, 0),
      };
  }
}

/**
 * Single fake door — a doorframe outline with a sealed surface behind it
 */
function FakeDoor({
  placement,
  roomDimensions,
  wrongnessLevel,
  seed,
}: {
  placement: DoorwayPlacement;
  roomDimensions: RoomDimensions;
  wrongnessLevel: number;
  seed: number;
}) {
  const rng = new SeededRandom(seed);
  const { position, rotation } = getDoorwayTransform(placement, roomDimensions);

  const frameColor = rng.pick(FAKE_DOOR_COLORS);
  const frameThickness = 0.08;

  // At higher wrongness, the door might be slightly off-level or wrong height
  const tiltZ = wrongnessLevel >= WrongnessLevel.UNSETTLING
    ? rng.range(-0.03, 0.03)
    : 0;

  // The sealed surface — slightly recessed from the wall
  const panelDepth = 0.04;

  const doorWidth = placement.width;
  const doorHeight = placement.height;

  return (
    <group position={position} rotation={rotation}>
      {/* Slight wrongness tilt */}
      <group rotation={[0, 0, tiltZ]}>
        {/* Sealed door panel — flat surface where the opening should be */}
        <mesh position={[0, 0, -panelDepth]}>
          <planeGeometry args={[doorWidth, doorHeight]} />
          <meshStandardMaterial
            color={frameColor}
            roughness={0.9}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Door frame — four strips around the door */}
        {/* Top frame */}
        <mesh position={[0, doorHeight / 2 + frameThickness / 2, 0]}>
          <boxGeometry args={[doorWidth + frameThickness * 2, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color="#1a1525" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Bottom frame (threshold) */}
        <mesh position={[0, -doorHeight / 2 - frameThickness / 2, 0]}>
          <boxGeometry args={[doorWidth + frameThickness * 2, frameThickness, frameThickness * 2]} />
          <meshStandardMaterial color="#1a1525" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Left frame */}
        <mesh position={[-doorWidth / 2 - frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, doorHeight, frameThickness * 2]} />
          <meshStandardMaterial color="#1a1525" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* Right frame */}
        <mesh position={[doorWidth / 2 + frameThickness / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, doorHeight, frameThickness * 2]} />
          <meshStandardMaterial color="#1a1525" roughness={0.7} metalness={0.1} />
        </mesh>

        {/* At high wrongness: a doorknob that shouldn't be there */}
        {wrongnessLevel >= WrongnessLevel.NOTICEABLE && (
          <mesh position={[doorWidth / 2 - 0.15, 0, 0.03]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color="#444" roughness={0.3} metalness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function FakeDoors({
  fakeDoors,
  roomDimensions,
  wrongnessLevel,
  seed,
}: FakeDoorsProps) {
  return (
    <group>
      {fakeDoors.map((door, index) => (
        <FakeDoor
          key={`fake-door-${index}`}
          placement={door}
          roomDimensions={roomDimensions}
          wrongnessLevel={wrongnessLevel}
          seed={seed + index * 777}
        />
      ))}
    </group>
  );
}

export default FakeDoors;
