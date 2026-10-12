import {
  DOCKS_PER_SITE,
  forkliftChargerPose,
  forkliftDockPose,
  forkliftIdlePose,
  truckApproachPose,
  truckDockPose,
  truckParkingPose,
  truckYardPose,
} from './layout';
import type {
  Dock,
  DockDirection,
  Forklift,
  ForkliftStatus,
  ID,
  InventoryCategory,
  InventoryItem,
  Pose,
  Shipment,
  ShipmentDirection,
  ShipmentStatus,
  Site,
  Timestamp,
  Truck,
  TruckStatus,
  World,
} from './types';

/** Simulation clock start: Mon 12 Oct 2026, 09:30 New York time. */
const SEED_TIME: Timestamp = Date.UTC(2026, 9, 12, 13, 30);
export const SITE_TIME_ZONE = 'America/New_York';

const min = (m: number): Timestamp => SEED_TIME + m * 60_000;

const byId = <T extends { id: ID }>(list: T[]): Record<ID, T> =>
  Object.fromEntries(list.map((x) => [x.id, x]));

// ─── Sites ───────────────────────────────────────────────────────────────────

const RACKS = { rows: 4, bays: 12, levels: 3 };
const BUILDING = { width: 72, depth: 34, height: 6 };

export const sites: Site[] = [
  {
    id: 'WH-01',
    name: 'Riverside Hub',
    kind: 'distribution_center',
    address: '12 Riverside Dr, Newark NJ',
    origin: { x: -130, z: 0 },
    building: BUILDING,
    racks: RACKS,
    palletCapacity: 144,
  },
  {
    id: 'WH-02',
    name: 'Northgate DC',
    kind: 'cross_dock',
    address: '480 Northgate Blvd, Newark NJ',
    origin: { x: 0, z: 0 },
    building: BUILDING,
    racks: RACKS,
    palletCapacity: 144,
  },
  {
    id: 'WH-03',
    name: 'Eastport Cold Chain',
    kind: 'cold_storage',
    address: '7 Harbor Way, Elizabeth NJ',
    origin: { x: 130, z: 0 },
    building: BUILDING,
    racks: RACKS,
    palletCapacity: 144,
  },
];
const site = (id: ID) => sites.find((s) => s.id === id)!;

// ─── Docks: 6 per site ───────────────────────────────────────────────────────

const DOCK_PLAN: DockDirection[] = ['inbound', 'inbound', 'inbound', 'outbound', 'outbound', 'flex'];
const OUT_OF_SERVICE = new Set(['WH-03-D6']);

export const docks: Dock[] = sites.flatMap((s) =>
  Array.from({ length: DOCKS_PER_SITE }, (_, i): Dock => {
    const id = `${s.id}-D${i + 1}`;
    return { id, siteId: s.id, label: `D${i + 1}`, index: i, direction: DOCK_PLAN[i], outOfService: OUT_OF_SERVICE.has(id) };
  }),
);

// ─── Inventory: 40 items ─────────────────────────────────────────────────────

type CatalogRow = [name: string, sku: string, category: InventoryCategory, unit: string, unitsPerPallet: number, quantity: number, reorderPoint: number];

const CATALOG: Record<ID, CatalogRow[]> = {
  'WH-01': [
    ['Cardboard Box (M)', 'PKG-BOX-M', 'packaging', 'units', 400, 1906, 600],
    ['Plastic Container', 'PKG-CTN-P', 'packaging', 'units', 120, 297, 150],
    ['Safety Helmet', 'PPE-HLM-Y', 'ppe', 'units', 80, 212, 240],
    ['Packing Tape', 'PKG-TPE-48', 'packaging', 'rolls', 1200, 4448, 1500],
    ['Stretch Wrap', 'PKG-WRP-18', 'packaging', 'rolls', 90, 260, 120],
    ['LED Panel 60×60', 'ELE-LED-6060', 'electronics', 'units', 60, 188, 90],
    ['Nitrile Gloves', 'PPE-GLV-M', 'ppe', 'boxes', 600, 2350, 800],
    ['Office Chair', 'FUR-CHR-ERG', 'furniture', 'units', 24, 74, 30],
    ['Hi-Vis Vest', 'PPE-VST-L', 'ppe', 'units', 300, 140, 200],
    ['Cable Ties 300 mm', 'HDW-TIE-300', 'hardware', 'packs', 800, 3100, 1000],
    ['Shelf Bracket', 'HDW-BRK-12', 'hardware', 'units', 500, 1240, 400],
    ['USB-C Charger 65W', 'ELE-CHG-65', 'electronics', 'units', 200, 620, 250],
    ['Bubble Wrap Roll', 'PKG-BUB-50', 'packaging', 'rolls', 40, 96, 50],
    ['Desk Lamp', 'FUR-LMP-01', 'furniture', 'units', 60, 155, 60],
  ],
  'WH-02': [
    ['LED Panel 60×60', 'ELE-LED-6060', 'electronics', 'units', 400, 1787, 600],
    ['Office Chair', 'FUR-CHR-ERG', 'furniture', 'units', 40, 174, 80],
    ['Cardboard Box (M)', 'PKG-BOX-M', 'packaging', 'units', 400, 993, 1000],
    ['Nitrile Gloves', 'PPE-GLV-M', 'ppe', 'boxes', 1200, 5793, 1500],
    ['Packing Tape', 'PKG-TPE-48', 'packaging', 'rolls', 1200, 2210, 1000],
    ['Monitor Arm', 'ELE-ARM-02', 'electronics', 'units', 90, 310, 120],
    ['Steel Shelving Unit', 'HDW-SHF-5T', 'hardware', 'units', 20, 58, 25],
    ['Printer Paper A4', 'PKG-PPR-A4', 'packaging', 'reams', 1000, 4200, 1500],
    ['Safety Goggles', 'PPE-GOG-CL', 'ppe', 'units', 500, 380, 400],
    ['Power Strip 6-way', 'ELE-PWR-6', 'electronics', 'units', 240, 905, 300],
    ['Filing Cabinet', 'FUR-CAB-3D', 'furniture', 'units', 18, 44, 20],
    ['Pallet Labels 4×6', 'PKG-LBL-46', 'packaging', 'rolls', 300, 1120, 300],
    ['Drill Bit Set', 'HDW-DRL-19', 'hardware', 'sets', 400, 1460, 500],
  ],
  'WH-03': [
    ['Frozen Peas 10 kg', 'FRZ-PEA-10', 'frozen', 'cases', 80, 334, 150],
    ['Spring Water 24-pack', 'BEV-WTR-24', 'beverage', 'packs', 120, 364, 200],
    ['Ice Cream Tubs 4 L', 'FRZ-ICE-4L', 'frozen', 'cases', 90, 140, 160],
    ['Greek Yogurt 1 kg', 'CHL-YOG-1K', 'chilled', 'cases', 100, 410, 180],
    ['Fresh Milk 2 L', 'CHL-MLK-2L', 'chilled', 'crates', 150, 620, 300],
    ['Frozen Berries 5 kg', 'FRZ-BRY-5', 'frozen', 'cases', 100, 455, 150],
    ['Orange Juice 1 L', 'BEV-OJ-1L', 'beverage', 'cases', 140, 512, 250],
    ['Cheddar Block 2 kg', 'CHL-CHD-2K', 'chilled', 'cases', 120, 236, 120],
    ['Frozen Pizza', 'FRZ-PZA-12', 'frozen', 'cases', 110, 590, 200],
    ['Sparkling Water 12-pack', 'BEV-SPK-12', 'beverage', 'packs', 160, 700, 250],
    ['Butter 250 g', 'CHL-BTR-250', 'chilled', 'cases', 200, 180, 220],
    ['Nitrile Gloves', 'PPE-GLV-M', 'ppe', 'boxes', 600, 495, 600],
    ['Plastic Container', 'PKG-CTN-P', 'packaging', 'units', 120, 208, 100],
  ],
};

/** Item i of a site gets its own run: half a rack row on one level. */
const rackRun = (i: number) => ({ row: Math.floor(i / 6), level: Math.floor((i % 6) / 2), bay: (i % 2) * 6 });

let itemNo = 0;
export const inventory: InventoryItem[] = sites.flatMap((s) =>
  CATALOG[s.id].map(([name, sku, category, unit, unitsPerPallet, quantity, reorderPoint], i): InventoryItem => ({
    id: `INV-${String(++itemNo).padStart(3, '0')}`,
    sku,
    name,
    category,
    siteId: s.id,
    unit,
    unitsPerPallet,
    quantity,
    reorderPoint,
    location: rackRun(i),
    updatedAt: min(-15 - ((i * 37) % 180)),
  })),
);
const item = (id: ID) => inventory.find((x) => x.id === id)!;

// ─── Trucks: 12 ──────────────────────────────────────────────────────────────

type Place = { dock: number } | { yard: number } | { approach: number } | { parking: number };

const placeTruck = (s: Site, p: Place): Pose =>
  'dock' in p
    ? truckDockPose(s, p.dock)
    : 'yard' in p
      ? truckYardPose(s, p.yard)
      : 'approach' in p
        ? truckApproachPose(s, p.approach)
        : truckParkingPose(s, p.parking);

const truck = (
  id: ID,
  plate: string,
  carrier: string,
  driver: string,
  capacityPallets: number,
  siteId: ID,
  status: TruckStatus,
  place: Place,
  progress: number,
  updatedMin: number,
): Truck => ({
  id,
  plate,
  carrier,
  driver,
  capacityPallets,
  siteId,
  dockId: 'dock' in place ? `${siteId}-D${place.dock + 1}` : null,
  status,
  progress,
  pose: placeTruck(site(siteId), place),
  updatedAt: min(updatedMin),
});

export const trucks: Truck[] = [
  truck('TRK-2051', 'NJ ZBY-2051', 'WareTrack Freight', 'Marcus Reed', 26, 'WH-01', 'loading', { dock: 3 }, 0.33, -2),
  truck('TRK-2104', 'PA KTL-4410', 'Nordline Logistics', 'Elena Ruiz', 26, 'WH-01', 'unloading', { dock: 0 }, 0.6, -1),
  truck('TRK-2287', 'NJ BPK-2287', 'Bluepeak Transport', 'Owen Park', 22, 'WH-01', 'in_transit', { approach: 0 }, 0, -4),
  truck('TRK-2658', 'NY CGV-6580', 'Cargoviva', 'Priya Nair', 26, 'WH-01', 'waiting', { yard: 0 }, 0, -6),
  truck('TRK-2127', 'NJ ZBY-2127', 'WareTrack Freight', 'Dana Whitfield', 26, 'WH-02', 'loading', { dock: 4 }, 0.55, -1),
  truck('TRK-2148', 'PA BPK-2148', 'Bluepeak Transport', 'Samir Haddad', 22, 'WH-02', 'unloading', { dock: 1 }, 0.4, -3),
  truck('TRK-2471', 'NJ BPK-2471', 'Bluepeak Transport', 'Grace Okafor', 22, 'WH-02', 'docking', { dock: 0 }, 0, 0),
  truck('TRK-2603', 'NY BPK-2603', 'Bluepeak Transport', 'Luis Moreno', 22, 'WH-02', 'in_transit', { approach: 0 }, 0, -5),
  truck('TRK-2205', 'NJ ZBY-5648', 'WareTrack Freight', 'Sam Chen', 26, 'WH-03', 'unloading', { dock: 0 }, 0.5, -2),
  truck('TRK-2229', 'NJ NRD-2229', 'Nordline Logistics', 'Hannah Vogel', 26, 'WH-03', 'loading', { dock: 3 }, 0.5, -1),
  truck('TRK-2307', 'NJ EKT-2697', 'Nordline Logistics', 'Ada Larsen', 26, 'WH-03', 'in_transit', { approach: 0 }, 0, -3),
  truck('TRK-2481', 'NY CGV-2481', 'Cargoviva', 'Tomasz Nowak', 26, 'WH-03', 'maintenance', { parking: 0 }, 0, -48),
];

// ─── Forklifts: 8 ────────────────────────────────────────────────────────────

type ForkliftPlace = { dock: number } | { charger: number } | { idle: number };

const forklift = (
  id: ID,
  siteId: ID,
  status: ForkliftStatus,
  place: ForkliftPlace,
  battery: number,
  updatedMin: number,
): Forklift => {
  const s = site(siteId);
  return {
    id,
    model: 'EF-25 Electric Counterbalance',
    siteId,
    dockId: 'dock' in place ? `${siteId}-D${place.dock + 1}` : null,
    status,
    battery,
    pose:
      'dock' in place
        ? forkliftDockPose(s, place.dock)
        : 'charger' in place
          ? forkliftChargerPose(s, place.charger)
          : forkliftIdlePose(s, place.idle),
    updatedAt: min(updatedMin),
  };
};

export const forklifts: Forklift[] = [
  forklift('FL-01', 'WH-01', 'loading', { dock: 3 }, 75, -1),
  forklift('FL-02', 'WH-01', 'unloading', { dock: 0 }, 64, -2),
  forklift('FL-03', 'WH-01', 'charging', { charger: 0 }, 18, -12),
  forklift('FL-04', 'WH-02', 'loading', { dock: 4 }, 82, -1),
  forklift('FL-05', 'WH-02', 'unloading', { dock: 1 }, 57, -3),
  forklift('FL-06', 'WH-02', 'idle', { idle: 0 }, 91, -7),
  forklift('FL-07', 'WH-03', 'unloading', { dock: 0 }, 78, -2),
  forklift('FL-08', 'WH-03', 'loading', { dock: 3 }, 69, -1),
];

// ─── Shipments: 25 ───────────────────────────────────────────────────────────

/** Pallet count for a set of lines, from each item's units-per-pallet. */
export const palletsFor = (lines: Shipment['lines'], lookup: (id: ID) => InventoryItem) =>
  lines.reduce((n, l) => n + Math.ceil(l.quantity / lookup(l.itemId).unitsPerPallet), 0);

const shipment = (
  id: ID,
  direction: ShipmentDirection,
  siteId: ID,
  truckId: ID | null,
  counterparty: string,
  city: string,
  lines: [itemId: ID, quantity: number][],
  status: ShipmentStatus,
  createdMin: number,
  etaMin: number,
  deliveredMin: number | null = null,
): Shipment => {
  const shipmentLines = lines.map(([itemId, quantity]) => ({ itemId, quantity }));
  return {
    id,
    direction,
    siteId,
    truckId,
    counterparty,
    city,
    lines: shipmentLines,
    pallets: palletsFor(shipmentLines, item),
    status,
    createdAt: min(createdMin),
    eta: min(etaMin),
    deliveredAt: deliveredMin === null ? null : min(deliveredMin),
  };
};

export const shipments: Shipment[] = [
  // Open — on a truck
  shipment('SHP-78442', 'outbound', 'WH-01', 'TRK-2051', 'Keystone Office Supply', 'Philadelphia, PA', [['INV-001', 800], ['INV-004', 1200]], 'at_dock', -120, 95),
  shipment('SHP-78445', 'inbound', 'WH-01', 'TRK-2104', 'Atlas Packaging Co.', 'Allentown, PA', [['INV-002', 240], ['INV-013', 80]], 'at_dock', -300, 8),
  shipment('SHP-78451', 'inbound', 'WH-01', 'TRK-2287', 'SafeGear Industrial', 'Edison, NJ', [['INV-003', 320], ['INV-009', 300]], 'in_transit', -180, 6),
  shipment('SHP-78439', 'inbound', 'WH-01', 'TRK-2658', 'Brightline Electronics', 'Trenton, NJ', [['INV-006', 120], ['INV-012', 200]], 'in_transit', -240, -8),
  shipment('SHP-78446', 'outbound', 'WH-02', 'TRK-2127', 'Hudson Retail Group', 'Jersey City, NJ', [['INV-015', 400], ['INV-016', 40]], 'at_dock', -90, 70),
  shipment('SHP-78448', 'inbound', 'WH-02', 'TRK-2148', 'Midland Paper Mills', 'Scranton, PA', [['INV-022', 2000]], 'at_dock', -260, 12),
  shipment('SHP-78452', 'inbound', 'WH-02', 'TRK-2471', 'Atlas Packaging Co.', 'Allentown, PA', [['INV-017', 1200], ['INV-026', 300]], 'at_dock', -200, 10),
  shipment('SHP-78453', 'inbound', 'WH-02', 'TRK-2603', 'SafeGear Industrial', 'Edison, NJ', [['INV-023', 600], ['INV-018', 1000]], 'in_transit', -210, -3),
  shipment('SHP-78450', 'inbound', 'WH-03', 'TRK-2205', 'Garden State Farms', 'Vineland, NJ', [['INV-030', 160], ['INV-038', 300]], 'at_dock', -230, 13),
  shipment('SHP-78449', 'outbound', 'WH-03', 'TRK-2229', 'Oakridge Market', 'Newark, NJ', [['INV-029', 120], ['INV-032', 200]], 'at_dock', -75, 55),
  shipment('SHP-78456', 'outbound', 'WH-03', 'TRK-2307', 'Sunvale Grocers', 'Hoboken, NJ', [['INV-036', 240], ['INV-033', 150]], 'scheduled', -40, 95),
  // Open — waiting for a truck
  shipment('SHP-78457', 'inbound', 'WH-02', null, 'Brightline Electronics', 'Trenton, NJ', [['INV-024', 300], ['INV-020', 90]], 'scheduled', -30, 40),
  shipment('SHP-78458', 'outbound', 'WH-01', null, 'Metro Facilities Group', 'Newark, NJ', [['INV-007', 600], ['INV-010', 800]], 'scheduled', -20, 150),
  // Delivered today
  shipment('SHP-78420', 'inbound', 'WH-01', 'TRK-2104', 'Atlas Packaging Co.', 'Allentown, PA', [['INV-001', 1200]], 'delivered', -420, -260, -268),
  shipment('SHP-78424', 'outbound', 'WH-01', 'TRK-2051', 'Keystone Office Supply', 'Philadelphia, PA', [['INV-008', 24], ['INV-014', 60]], 'delivered', -380, -200, -215),
  shipment('SHP-78429', 'inbound', 'WH-01', 'TRK-2658', 'Brightline Electronics', 'Trenton, NJ', [['INV-012', 400]], 'delivered', -330, -150, -132),
  shipment('SHP-78434', 'outbound', 'WH-01', 'TRK-2287', 'Hudson Retail Group', 'Jersey City, NJ', [['INV-005', 90]], 'delivered', -240, -80, -86),
  shipment('SHP-78421', 'outbound', 'WH-02', 'TRK-2127', 'Metro Facilities Group', 'Newark, NJ', [['INV-019', 10]], 'delivered', -400, -250, -251),
  shipment('SHP-78425', 'inbound', 'WH-02', 'TRK-2148', 'Midland Paper Mills', 'Scranton, PA', [['INV-022', 1000]], 'delivered', -390, -190, -198),
  shipment('SHP-78431', 'outbound', 'WH-02', 'TRK-2471', 'Oakridge Market', 'Newark, NJ', [['INV-027', 200]], 'delivered', -280, -120, -127),
  shipment('SHP-78436', 'inbound', 'WH-02', 'TRK-2603', 'SafeGear Industrial', 'Edison, NJ', [['INV-023', 500]], 'delivered', -230, -60, -64),
  shipment('SHP-78422', 'inbound', 'WH-03', 'TRK-2205', 'Garden State Farms', 'Vineland, NJ', [['INV-032', 300]], 'delivered', -410, -240, -246),
  shipment('SHP-78427', 'outbound', 'WH-03', 'TRK-2229', 'Sunvale Grocers', 'Hoboken, NJ', [['INV-028', 160]], 'delivered', -350, -170, -151),
  shipment('SHP-78432', 'inbound', 'WH-03', 'TRK-2307', 'Polar Foods Co.', 'Secaucus, NJ', [['INV-035', 330]], 'delivered', -290, -110, -115),
  shipment('SHP-78437', 'outbound', 'WH-03', 'TRK-2205', 'Oakridge Market', 'Newark, NJ', [['INV-037', 320]], 'delivered', -200, -50, -58),
];

/** The complete seeded world. */
export const createSeedWorld = (): World => ({
  simTime: SEED_TIME,
  sites: byId(sites),
  docks: byId(docks),
  trucks: byId(trucks),
  forklifts: byId(forklifts),
  inventory: byId(inventory),
  shipments: byId(shipments),
  nextShipmentNo: 78459,
});
