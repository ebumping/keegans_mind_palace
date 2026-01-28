/**
 * ArchetypeRoomGenerator: Creates rooms with specific architectural intent
 *
 * Each archetype is a template for procedural variation.
 * These are not square rooms—they are organisms with specific anatomies.
 *
 * Domestic:
 * - The Living Room That Isn't (L-shaped, furniture facing wrong)
 * - The Kitchen That Doesn't Feed (galley, appliances non-functional)
 * - The Bedroom That Doesn't Rest (bed positioned wrong)
 *
 * Institutional:
 * - The Corridor of Too Many Doors (some fake)
 * - The Waiting Room for Nothing (too many chairs)
 * - The Office That Doesn't Work (identical personal effects)
 *
 * Transitional:
 * - The Stairwell of Wrong Floors (count doesn't match)
 * - The Elevator Bank for No Building (impossible floors)
 *
 * Commercial:
 * - The Store That Sells Nothing (empty packaging)
 * - The Restaurant That Doesn't Serve (food untouched)
 *
 * Void:
 * - The Atrium of Scale (multi-story void)
 * - The Parking Structure of No Cars (low ceiling, columns)
 */

import { SeededRandom } from '../utils/seededRandom';
import {
  RoomArchetype,
  RoomShape,
  VerticalElementType,
  WrongnessLevel,
} from '../types/room';
import type {
  RoomShapeConfig,
  RoomDimensions,
  VerticalElement,
  Point2D,
} from '../types/room';
import { getRoomShapeGenerator } from './RoomShapeGenerator';

// Archetype specification
export interface ArchetypeSpec {
  name: string;
  description: string;
  preferredShapes: RoomShape[];
  dimensionRanges: {
    width: [number, number];
    height: [number, number];
    depth: [number, number];
  };
  furnitureDensity: 'none' | 'sparse' | 'moderate' | 'high' | 'crowded';
  verticalComplexity: 'none' | 'low' | 'medium' | 'high';
  wrongnessGradient: string[]; // 5 levels of wrongness description
}

// Archetype specifications - scaled up for proper first-person scale
const ARCHETYPE_SPECS: Record<RoomArchetype, ArchetypeSpec> = {
  living_room: {
    name: 'The Living Room That Isn\'t',
    description: 'L-shaped with alcove, furniture facing wrong',
    preferredShapes: [RoomShape.L_SHAPE, RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [20, 35],
      height: [6, 10],
      depth: [20, 35],
    },
    furnitureDensity: 'high',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'Photos on wall are all the same person',
      'Furniture arranged for audience watching blank wall',
      'TV playing, facing away from seating',
      'Furniture on ceiling, gravity confused',
      'Multiple instances of same room visible through doors',
    ],
  },
  kitchen: {
    name: 'The Kitchen That Doesn\'t Feed',
    description: 'Galley or open plan, appliances non-functional',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.L_SHAPE],
    dimensionRanges: {
      width: [12, 20],
      height: [6, 8],
      depth: [15, 30],
    },
    furnitureDensity: 'moderate',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'Clock shows time that doesn\'t match windows',
      'Stove positioned facing wall',
      'All cabinet doors slightly open',
      'Multiple sinks in same room',
      'Kitchen is upside down',
    ],
  },
  bedroom: {
    name: 'The Bedroom That Doesn\'t Rest',
    description: 'Bed positioned wrong, chair facing bed',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [15, 25],
      height: [6, 9],
      depth: [15, 25],
    },
    furnitureDensity: 'sparse',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'Pillow indentation with no sleeper',
      'Bed in corner, only one side accessible',
      'Multiple beds in sequence down the room',
      'Bed is in the ceiling, room is tall',
      'You\'re in the bed, looking at yourself entering',
    ],
  },
  bathroom: {
    name: 'The Bathroom of Exposure',
    description: 'Privacy architecture wrong, fixtures facing wrong',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [10, 18],
      height: [6, 8],
      depth: [10, 18],
    },
    furnitureDensity: 'moderate',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'Mirror shows room from wrong angle',
      'Toilet facing the door',
      'No door, just an opening',
      'Multiple mirrors, each showing different angle',
      'You\'re already in the mirror, watching yourself enter',
    ],
  },
  corridor_of_doors: {
    name: 'The Corridor of Too Many Doors',
    description: 'Long with doors at intervals, some fake',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [8, 12],
      height: [6, 10],
      depth: [50, 150],
    },
    furnitureDensity: 'sparse',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'Door numbers don\'t follow sequence',
      'Some doors open, all lead to same room',
      'Corridor gets narrower as you progress',
      'Corridor curves but you end up where you started',
      'You pass yourself going the other direction',
    ],
  },
  waiting_room: {
    name: 'The Waiting Room for Nothing',
    description: 'Too many chairs, reception with no one',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.HEXAGON],
    dimensionRanges: {
      width: [20, 40],
      height: [8, 12],
      depth: [18, 35],
    },
    furnitureDensity: 'crowded',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'All magazines same date',
      'Number board shows impossible numbers',
      'Chairs arranged in spiral toward center',
      'Reception window opens to another waiting room',
      'You\'re behind the reception desk, watching yourself wait',
    ],
  },
  office: {
    name: 'The Office That Doesn\'t Work',
    description: 'Open plan with cubicles, identical personal effects',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.L_SHAPE],
    dimensionRanges: {
      width: [35, 60],
      height: [8, 12],
      depth: [35, 60],
    },
    furnitureDensity: 'high',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'All monitors show same screensaver',
      'Personal effects are identical across desks',
      'One desk has candles arranged for ritual',
      'Cubicle walls extend to ceiling, creating maze',
      'You find your desk, with your things, and you\'re there',
    ],
  },
  stairwell: {
    name: 'The Stairwell of Wrong Floors',
    description: 'Step count wrong, floor numbers skip',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [12, 18],
      height: [15, 40],
      depth: [12, 18],
    },
    furnitureDensity: 'none',
    verticalComplexity: 'high',
    wrongnessGradient: [
      'Floor numbers skip',
      'More steps between some floors than others',
      'Stairs lead down but you arrive higher',
      'Multiple staircases share the void, impossible geometry',
      'The stairwell contains you, watching you climb',
    ],
  },
  elevator_bank: {
    name: 'The Elevator Bank for No Building',
    description: 'Multiple elevator doors, indicators show impossible floors',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [15, 25],
      height: [6, 9],
      depth: [10, 18],
    },
    furnitureDensity: 'sparse',
    verticalComplexity: 'none',
    wrongnessGradient: [
      'One elevator always shows "arriving" but never does',
      'Indicators show impossible floors (basement 7, floor 40)',
      'Elevator opens to solid wall',
      'Elevator interior is another room entirely',
      'You\'re already in the elevator, have been this whole time',
    ],
  },
  store: {
    name: 'The Store That Sells Nothing',
    description: 'Shelves of empty packaging, no one attending',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [30, 50],
      height: [10, 15],
      depth: [40, 70],
    },
    furnitureDensity: 'high',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'All products are same item',
      'Prices are wrong (too high, too low, impossible)',
      'Aisles don\'t lead to each other logically',
      'Store is larger inside than storefront suggests',
      'You work here. You\'ve always worked here.',
    ],
  },
  restaurant: {
    name: 'The Restaurant That Doesn\'t Serve',
    description: 'Tables set, food untouched, no staff',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.L_SHAPE],
    dimensionRanges: {
      width: [35, 55],
      height: [8, 12],
      depth: [30, 50],
    },
    furnitureDensity: 'high',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'All tables set but no one seated',
      'Food on tables, untouched, not decaying',
      'Kitchen sounds with no one cooking',
      'Tables arranged in pattern (spiral, rows facing center)',
      'You\'re seated at a table, eating, watching yourself enter',
    ],
  },
  atrium: {
    name: 'The Atrium of Scale',
    description: 'Multi-story void, looking up shows impossibility',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.HEXAGON],
    dimensionRanges: {
      width: [50, 100],
      height: [30, 80],
      depth: [50, 100],
    },
    furnitureDensity: 'sparse',
    verticalComplexity: 'high',
    wrongnessGradient: [
      'Bottom is too far down',
      'Top is not visible',
      'Other people on other levels, but they\'re you',
      'The void is not empty—something is in it',
      'You\'re falling through the void, have been the whole time',
    ],
  },
  parking: {
    name: 'The Parking Structure of No Cars',
    description: 'Low ceiling, columns, all spaces empty',
    preferredShapes: [RoomShape.RECTANGLE],
    dimensionRanges: {
      width: [100, 200],
      height: [5, 7],
      depth: [100, 200],
    },
    furnitureDensity: 'none',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'All spaces empty',
      'One car, always the same car',
      'Level numbers are wrong',
      'Ramps lead up but you go down',
      'You\'re in the one car, have been parked here forever',
    ],
  },
  generic: {
    name: 'Generic Room',
    description: 'No specific archetype',
    preferredShapes: [RoomShape.RECTANGLE, RoomShape.L_SHAPE, RoomShape.IRREGULAR],
    dimensionRanges: {
      width: [15, 40],
      height: [6, 12],
      depth: [15, 40],
    },
    furnitureDensity: 'moderate',
    verticalComplexity: 'low',
    wrongnessGradient: [
      'Something feels off',
      'This isn\'t quite right',
      'You\'ve been here before',
      'This shouldn\'t exist',
      'You shouldn\'t be here',
    ],
  },
};

/**
 * Select archetype based on depth and abnormality
 */
export function selectArchetype(
  _depth: number,
  abnormality: number,
  rng: SeededRandom
): RoomArchetype {
  // Weight archetypes based on depth
  const weights: [RoomArchetype, number][] = [];

  // Domestic types - more common early
  const domesticWeight = Math.max(0.1, 0.4 - abnormality * 0.3);
  weights.push([RoomArchetype.LIVING_ROOM, domesticWeight * 0.3]);
  weights.push([RoomArchetype.KITCHEN, domesticWeight * 0.25]);
  weights.push([RoomArchetype.BEDROOM, domesticWeight * 0.25]);
  weights.push([RoomArchetype.BATHROOM, domesticWeight * 0.2]);

  // Institutional - mid-range
  const institutionalWeight = 0.2 + abnormality * 0.1;
  weights.push([RoomArchetype.CORRIDOR_OF_DOORS, institutionalWeight * 0.35]);
  weights.push([RoomArchetype.WAITING_ROOM, institutionalWeight * 0.35]);
  weights.push([RoomArchetype.OFFICE, institutionalWeight * 0.3]);

  // Transitional - increases with depth
  const transitionalWeight = abnormality * 0.2;
  weights.push([RoomArchetype.STAIRWELL, transitionalWeight * 0.5]);
  weights.push([RoomArchetype.ELEVATOR_BANK, transitionalWeight * 0.5]);

  // Commercial - consistent
  const commercialWeight = 0.15;
  weights.push([RoomArchetype.STORE, commercialWeight * 0.5]);
  weights.push([RoomArchetype.RESTAURANT, commercialWeight * 0.5]);

  // Void - more common deeper
  const voidWeight = abnormality * 0.3;
  weights.push([RoomArchetype.ATRIUM, voidWeight * 0.6]);
  weights.push([RoomArchetype.PARKING, voidWeight * 0.4]);

  // Generic fallback
  weights.push([RoomArchetype.GENERIC, 0.1]);

  // Select based on weights
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;

  for (const [archetype, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return archetype;
  }

  return RoomArchetype.GENERIC;
}

export class ArchetypeRoomGenerator {
  /**
   * Get archetype specification
   */
  getSpec(archetype: RoomArchetype): ArchetypeSpec {
    return ARCHETYPE_SPECS[archetype];
  }

  /**
   * Generate room dimensions based on archetype
   */
  generateDimensions(
    archetype: RoomArchetype,
    abnormality: number,
    rng: SeededRandom
  ): RoomDimensions {
    const spec = ARCHETYPE_SPECS[archetype];
    const ranges = spec.dimensionRanges;

    // Base dimensions from ranges
    let width = rng.range(ranges.width[0], ranges.width[1]);
    let height = rng.range(ranges.height[0], ranges.height[1]);
    let depth = rng.range(ranges.depth[0], ranges.depth[1]);

    // Apply abnormality scaling
    const scale = 1 + abnormality * rng.range(-0.3, 0.5);
    width *= scale;
    height *= 1 + abnormality * rng.range(-0.2, 0.3);
    depth *= scale;

    return { width, height, depth };
  }

  /**
   * Generate room shape based on archetype
   */
  generateShape(
    archetype: RoomArchetype,
    dimensions: RoomDimensions,
    abnormality: number,
    seed: number
  ): RoomShapeConfig {
    const spec = ARCHETYPE_SPECS[archetype];
    const rng = new SeededRandom(seed);

    // Select shape from preferred shapes
    let shapeType = rng.pick(spec.preferredShapes);

    // Higher abnormality can override to irregular
    if (abnormality > 0.6 && rng.chance(abnormality * 0.5)) {
      shapeType = RoomShape.IRREGULAR;
    }

    const shapeGenerator = getRoomShapeGenerator();
    return shapeGenerator.generate(shapeType, dimensions, abnormality, seed);
  }

  /**
   * Generate vertical elements based on archetype
   */
  generateVerticalElements(
    archetype: RoomArchetype,
    dimensions: RoomDimensions,
    abnormality: number,
    seed: number
  ): VerticalElement[] {
    const spec = ARCHETYPE_SPECS[archetype];
    const rng = new SeededRandom(seed);
    const elements: VerticalElement[] = [];

    if (spec.verticalComplexity === 'none') {
      return elements;
    }

    // Probability based on complexity level
    const complexityChance =
      spec.verticalComplexity === 'low' ? 0.2 :
      spec.verticalComplexity === 'medium' ? 0.5 :
      0.8;

    if (!rng.chance(complexityChance + abnormality * 0.2)) {
      return elements;
    }

    // Generate appropriate elements for archetype
    switch (archetype) {
      case RoomArchetype.STAIRWELL:
        // Stairwell gets shaft/split elements
        elements.push({
          type: VerticalElementType.SHAFT,
          footprint: this.generateFootprint(dimensions, 0.7, rng),
          heightDelta: dimensions.height * rng.range(1.5, 3),
          hasRail: true,
          accessible: true,
          connectsVia: 'stairs',
        });
        break;

      case RoomArchetype.ATRIUM:
        // Atrium gets mezzanines and pits
        if (rng.chance(0.7)) {
          elements.push({
            type: VerticalElementType.MEZZANINE,
            footprint: this.generateFootprint(dimensions, 0.3, rng),
            heightDelta: dimensions.height * 0.4,
            hasRail: true,
            accessible: true,
            connectsVia: 'stairs',
          });
        }
        if (rng.chance(0.5)) {
          elements.push({
            type: VerticalElementType.PIT,
            footprint: this.generateFootprint(dimensions, 0.2, rng),
            heightDelta: -dimensions.height * rng.range(0.5, 1.5),
            hasRail: true,
            accessible: false,
            connectsVia: 'none',
          });
        }
        break;

      case RoomArchetype.LIVING_ROOM:
        // Living room gets sunken conversation area
        if (rng.chance(0.6)) {
          elements.push({
            type: VerticalElementType.SUNKEN,
            footprint: this.generateFootprint(dimensions, 0.25, rng),
            heightDelta: -0.3,
            hasRail: false,
            accessible: true,
            connectsVia: 'step',
          });
        }
        break;

      case RoomArchetype.STORE:
        // Store gets raised display areas
        if (rng.chance(0.5)) {
          elements.push({
            type: VerticalElementType.RAISED,
            footprint: this.generateFootprint(dimensions, 0.15, rng),
            heightDelta: 0.4,
            hasRail: false,
            accessible: true,
            connectsVia: 'step',
          });
        }
        break;

      case RoomArchetype.RESTAURANT:
        // Restaurant gets split levels
        if (rng.chance(0.4)) {
          elements.push({
            type: VerticalElementType.SPLIT,
            footprint: this.generateFootprint(dimensions, 0.4, rng),
            heightDelta: 0.25,
            hasRail: false,
            accessible: true,
            connectsVia: 'step',
          });
        }
        break;

      case RoomArchetype.PARKING:
        // Parking gets ramps
        if (rng.chance(0.6)) {
          elements.push({
            type: VerticalElementType.SPLIT,
            footprint: this.generateFootprint(dimensions, 0.3, rng),
            heightDelta: rng.range(0.5, 1.5),
            hasRail: false,
            accessible: true,
            connectsVia: 'ramp',
          });
        }
        break;

      default:
        // Generic split level
        if (spec.verticalComplexity !== 'low' && spec.verticalComplexity !== 'medium' && spec.verticalComplexity !== 'high' && rng.chance(0.3)) {
          elements.push({
            type: VerticalElementType.SPLIT,
            footprint: this.generateFootprint(dimensions, 0.3, rng),
            heightDelta: rng.range(0.2, 0.5),
            hasRail: false,
            accessible: true,
            connectsVia: 'step',
          });
        }
    }

    return elements;
  }

  /**
   * Generate a simple rectangular footprint
   */
  private generateFootprint(
    dimensions: RoomDimensions,
    sizeFactor: number,
    rng: SeededRandom
  ): Point2D[] {
    const hw = (dimensions.width * sizeFactor) / 2;
    const hd = (dimensions.depth * sizeFactor) / 2;

    // Random offset from center
    const offsetX = rng.range(-dimensions.width * 0.2, dimensions.width * 0.2);
    const offsetY = rng.range(-dimensions.depth * 0.2, dimensions.depth * 0.2);

    return [
      { x: offsetX - hw, y: offsetY - hd },
      { x: offsetX + hw, y: offsetY - hd },
      { x: offsetX + hw, y: offsetY + hd },
      { x: offsetX - hw, y: offsetY + hd },
    ];
  }

  /**
   * Get wrongness description for archetype at given level
   */
  getWrongnessDescription(
    archetype: RoomArchetype,
    level: WrongnessLevel
  ): string {
    const spec = ARCHETYPE_SPECS[archetype];
    const index = Math.min(level - 1, spec.wrongnessGradient.length - 1);
    return spec.wrongnessGradient[index];
  }
}

// Singleton
let archetypeGeneratorInstance: ArchetypeRoomGenerator | null = null;

export function getArchetypeRoomGenerator(): ArchetypeRoomGenerator {
  if (!archetypeGeneratorInstance) {
    archetypeGeneratorInstance = new ArchetypeRoomGenerator();
  }
  return archetypeGeneratorInstance;
}
