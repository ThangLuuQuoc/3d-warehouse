import type { Pose, Site } from './types';

/**
 * Site-relative layout. Every site has the same floor plan, anchored at
 * site.origin (centre of the dock face). Local +z points from the building
 * towards the yard and the road; the building occupies local z ∈ [-depth, 0].
 *
 * These pure functions are shared by the seed data, the simulation (where to
 * park a truck) and the 3D scene (where to draw a dock or a rack).
 */

const HEADING = {
  east: 0,
  north: Math.PI / 2, // towards −z (into the building)
  west: Math.PI,
  south: -Math.PI / 2, // towards +z (towards the road)
} as const;

export const DOCKS_PER_SITE = 6;
export const DOCK_SPACING = 10;
export const DOCK_DOOR = { width: 4, height: 4.3 };

export const BAY_WIDTH = 2.6;
const ROW_SPACING = 5.2;
const FIRST_ROW_Z = -14;
export const LEVEL_HEIGHT = 1.55;
export const RACK_DEPTH = 1.4;
/** Pallets one inventory item may show in its rack run. */
export const MAX_PALLETS_PER_RUN = 6;

/** Two-lane road shared by all sites, running along x. */
export const ROAD = { inboundZ: 37, outboundZ: 43, minX: -240, maxX: 240, width: 14 };
/** Lot footprint in local coordinates. */
export const LOT = { minX: -50, maxX: 50, minZ: -40, maxZ: 31 };
/** Camera target limits in world coordinates. */
export const MAP_BOUNDS = { minX: -195, maxX: 195, minZ: -45, maxZ: 55 };

const pose = (site: Site, x: number, z: number, heading: number): Pose => ({
  x: site.origin.x + x,
  z: site.origin.z + z,
  heading,
});

export const dockLocalX = (index: number) => (index - (DOCKS_PER_SITE - 1) / 2) * DOCK_SPACING;

/** Centre of the dock door on the building's front face. */
export const dockDoorPose = (site: Site, index: number): Pose => pose(site, dockLocalX(index), 0, HEADING.south);

/** Truck backed onto a dock, cab facing the yard. */
export const truckDockPose = (site: Site, index: number): Pose =>
  pose(site, dockLocalX(index), 5.8, HEADING.south);

export const YARD_SLOTS = 6;
/** Yard queue in front of the docks. */
export const truckYardPose = (site: Site, slot: number): Pose => pose(site, -30 + slot * 12, 21, HEADING.south);

export const PARKING_SLOTS = 2;
/** Maintenance bays at the right edge of the lot. */
export const truckParkingPose = (site: Site, slot: number): Pose => pose(site, 40 + slot * 5, 6, HEADING.south);

export const EXIT_SLOTS = 3;
/** Exit lane between the yard and the road. */
export const truckExitPose = (site: Site, slot: number): Pose => pose(site, 18 + slot * 12, 29, HEADING.east);

export const ROAD_SLOTS = 5;
/** Queue on the inbound lane, upstream of the site entrance. */
export const truckApproachPose = (site: Site, slot: number): Pose => ({
  x: site.origin.x - 22 - slot * 12,
  z: ROAD.inboundZ,
  heading: HEADING.east,
});

/** Outbound lane, downstream of the site exit: trucks delivering to customers. */
export const truckAwayPose = (site: Site, slot: number): Pose => ({
  x: site.origin.x + 22 + slot * 12,
  z: ROAD.outboundZ,
  heading: HEADING.east,
});

/** Forklift just inside the dock door, facing the trailer. */
export const forkliftDockPose = (site: Site, dockIndex: number): Pose =>
  pose(site, dockLocalX(dockIndex), -3, HEADING.south);

export const CHARGER_SLOTS = 4;
export const forkliftChargerPose = (site: Site, slot: number): Pose =>
  pose(site, -31, -8 - slot * 4.5, HEADING.west);

export const FORKLIFT_IDLE_SLOTS = 6;
export const forkliftIdlePose = (site: Site, slot: number): Pose =>
  pose(site, 24 + (slot % 2) * 5, -10 - Math.floor(slot / 2) * 6, HEADING.north);

/** World position of the centre of a rack bay at floor level. */
export const rackBayPosition = (site: Site, row: number, bay: number) => ({
  x: site.origin.x + (bay - (site.racks.bays - 1) / 2) * BAY_WIDTH,
  z: site.origin.z + FIRST_ROW_Z - row * ROW_SPACING,
});

export const levelY = (level: number) => 0.12 + level * LEVEL_HEIGHT;

export const rowLabel = (row: number) => String.fromCharCode(65 + row); // A, B, C…
