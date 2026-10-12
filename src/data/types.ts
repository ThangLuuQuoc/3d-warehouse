/**
 * WareTrack domain model.
 *
 * Entities reference each other by ID only (no nested objects), so the store
 * can update one entity without touching the others. Each relation has a single
 * owning side; reverse lookups are derived in selectors.
 */

export type ID = string;
/** Epoch milliseconds on the simulation clock. */
export type Timestamp = number;

/** Ground-plane pose in world metres. heading is a rotation about +Y; 0 faces +X. */
export interface Pose {
  x: number;
  z: number;
  heading: number;
}

// ─── Site ────────────────────────────────────────────────────────────────────

export type SiteKind = 'distribution_center' | 'cold_storage' | 'cross_dock';

export interface Site {
  id: ID; // "WH-01"
  name: string;
  kind: SiteKind;
  address: string;
  /** World-space centre of the dock face. Docks, racks and yard slots are laid out from here. */
  origin: { x: number; z: number };
  building: { width: number; depth: number; height: number };
  /** Pallet-rack grid inside the building. */
  racks: { rows: number; bays: number; levels: number };
  palletCapacity: number;
}

// ─── Dock ────────────────────────────────────────────────────────────────────

export type DockDirection = 'inbound' | 'outbound' | 'flex';

export interface Dock {
  id: ID; // "WH-01-D1"
  siteId: ID;
  label: string; // "D1"
  /** 0-based slot along the dock face, left to right. */
  index: number;
  direction: DockDirection;
  outOfService: boolean;
  // Occupancy is owned by Truck.dockId.
}

// ─── Truck ───────────────────────────────────────────────────────────────────

export type TruckStatus =
  | 'in_transit' // on the road, heading to a site or a customer
  | 'waiting' // in the yard, queued for a dock
  | 'docking' // reversing onto a dock
  | 'loading'
  | 'unloading'
  | 'departing' // leaving the yard
  | 'maintenance';

export interface Truck {
  id: ID; // "TRK-2205"
  plate: string;
  carrier: string;
  driver: string;
  capacityPallets: number;
  /** Site the truck is at or heading to. */
  siteId: ID;
  dockId: ID | null;
  status: TruckStatus;
  /** Load / unload progress at the dock, 0–1. */
  progress: number;
  pose: Pose;
  updatedAt: Timestamp;
  // The truck's current shipment is owned by Shipment.truckId.
}

// ─── Forklift ────────────────────────────────────────────────────────────────

export type ForkliftStatus = 'idle' | 'moving' | 'loading' | 'unloading' | 'charging';

export interface Forklift {
  id: ID; // "FL-01"
  model: string;
  siteId: ID;
  /** Dock the forklift is working or driving to. */
  dockId: ID | null;
  status: ForkliftStatus;
  /** Battery charge, 0–100. */
  battery: number;
  pose: Pose;
  updatedAt: Timestamp;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export type InventoryCategory =
  | 'packaging'
  | 'electronics'
  | 'ppe'
  | 'furniture'
  | 'hardware'
  | 'frozen'
  | 'chilled'
  | 'beverage';

export interface RackLocation {
  row: number;
  level: number;
  /** First bay of the item's run; pallets fill consecutive bays from here. */
  bay: number;
}

export interface InventoryItem {
  id: ID; // "INV-001"
  sku: string;
  name: string;
  category: InventoryCategory;
  siteId: ID;
  unit: string;
  unitsPerPallet: number;
  quantity: number;
  /** At or below this quantity the item raises a low-stock alert. */
  reorderPoint: number;
  location: RackLocation;
  updatedAt: Timestamp;
}

// ─── Shipment ────────────────────────────────────────────────────────────────

export type ShipmentDirection = 'inbound' | 'outbound';

/**
 * inbound:  in_transit → at_dock → delivered
 * outbound: scheduled → at_dock → in_transit → delivered
 */
export type ShipmentStatus = 'scheduled' | 'in_transit' | 'at_dock' | 'delivered';

export interface ShipmentLine {
  itemId: ID;
  quantity: number;
}

export interface Shipment {
  id: ID; // "SHP-78442"
  direction: ShipmentDirection;
  /** Warehouse the goods arrive at (inbound) or leave from (outbound). */
  siteId: ID;
  /** Assigned truck; null while waiting for a truck. */
  truckId: ID | null;
  /** Supplier (inbound) or customer (outbound). */
  counterparty: string;
  city: string;
  lines: ShipmentLine[];
  pallets: number;
  status: ShipmentStatus;
  createdAt: Timestamp;
  /** Promised arrival at the destination: the site for inbound, the customer for outbound. */
  eta: Timestamp;
  deliveredAt: Timestamp | null;
}

/** Whole world as held by the store and advanced by the simulation. */
export interface World {
  simTime: Timestamp;
  sites: Record<ID, Site>;
  docks: Record<ID, Dock>;
  trucks: Record<ID, Truck>;
  forklifts: Record<ID, Forklift>;
  inventory: Record<ID, InventoryItem>;
  shipments: Record<ID, Shipment>;
  /** Next number for generated shipment IDs. */
  nextShipmentNo: number;
}
