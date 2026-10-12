import {
  EXIT_SLOTS,
  FORKLIFT_IDLE_SLOTS,
  PARKING_SLOTS,
  ROAD_SLOTS,
  YARD_SLOTS,
  CHARGER_SLOTS,
  forkliftChargerPose,
  forkliftDockPose,
  forkliftIdlePose,
  truckApproachPose,
  truckAwayPose,
  truckDockPose,
  truckExitPose,
  truckParkingPose,
  truckYardPose,
} from '../data/layout';
import { palletsFor } from '../data/seed';
import type { Dock, Forklift, ID, InventoryItem, Pose, Shipment, Site, Truck, World } from '../data/types';

/** Simulated time that passes per tick (one tick every 2 s of real time). */
const TICK_MS = 60_000;
const MIN = 60_000;
/** Minutes an inbound truck plans for docking and unloading before its ETA. */
const INBOUND_HANDLING = 12;
/** Delivered shipments kept in memory; older ones are dropped. */
const MAX_DELIVERED = 120;

export type Rng = () => number;

/** Small deterministic PRNG so a run can be replayed from a seed. */
export const mulberry32 = (seed: number): Rng => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];

const SUPPLIERS = [
  ['Atlas Packaging Co.', 'Allentown, PA'],
  ['SafeGear Industrial', 'Edison, NJ'],
  ['Brightline Electronics', 'Trenton, NJ'],
  ['Midland Paper Mills', 'Scranton, PA'],
  ['Garden State Farms', 'Vineland, NJ'],
  ['Polar Foods Co.', 'Secaucus, NJ'],
] as const;
const CUSTOMERS = [
  ['Keystone Office Supply', 'Philadelphia, PA'],
  ['Hudson Retail Group', 'Jersey City, NJ'],
  ['Oakridge Market', 'Newark, NJ'],
  ['Sunvale Grocers', 'Hoboken, NJ'],
  ['Metro Facilities Group', 'Newark, NJ'],
] as const;

export const isOpen = (s: Shipment) => s.status !== 'delivered';

/**
 * Copy-on-write view of the world for one tick. Only entities that change are
 * replaced, so unchanged trucks, forklifts and items keep their identity and
 * their React subscribers do not re-render.
 */
class Tick {
  readonly now: number;
  sites: Record<ID, Site>;
  docks: Record<ID, Dock>;
  trucks: Record<ID, Truck>;
  forklifts: Record<ID, Forklift>;
  inventory: Record<ID, InventoryItem>;
  shipments: Record<ID, Shipment>;
  nextShipmentNo: number;
  private copied = new Set<string>();

  constructor(
    prev: World,
    readonly rng: Rng,
  ) {
    this.now = prev.simTime + TICK_MS;
    this.sites = prev.sites;
    this.docks = prev.docks;
    this.trucks = prev.trucks;
    this.forklifts = prev.forklifts;
    this.inventory = prev.inventory;
    this.shipments = prev.shipments;
    this.nextShipmentNo = prev.nextShipmentNo;
  }

  private own<K extends 'trucks' | 'forklifts' | 'inventory' | 'shipments'>(key: K): World[K] {
    const self = this as unknown as Pick<World, K>; // the four maps share World's field names
    if (!this.copied.has(key)) {
      this.copied.add(key);
      self[key] = { ...self[key] };
    }
    return self[key];
  }

  truck(id: ID, patch: Partial<Truck>) {
    const map = this.own('trucks');
    map[id] = { ...map[id], ...patch, updatedAt: this.now };
  }
  forklift(id: ID, patch: Partial<Forklift>) {
    const map = this.own('forklifts');
    map[id] = { ...map[id], ...patch, updatedAt: this.now };
  }
  item(id: ID, patch: Partial<InventoryItem>) {
    const map = this.own('inventory');
    map[id] = { ...map[id], ...patch, updatedAt: this.now };
  }
  shipment(id: ID, patch: Partial<Shipment>) {
    const map = this.own('shipments');
    map[id] = { ...map[id], ...patch };
  }
  removeShipment(id: ID) {
    delete this.own('shipments')[id];
  }

  result(): World {
    return {
      simTime: this.now,
      sites: this.sites,
      docks: this.docks,
      trucks: this.trucks,
      forklifts: this.forklifts,
      inventory: this.inventory,
      shipments: this.shipments,
      nextShipmentNo: this.nextShipmentNo,
    };
  }
}

// ─── Queries over the tick state ─────────────────────────────────────────────

const jobOf = (t: Tick, truckId: ID) =>
  Object.values(t.shipments).find((s) => s.truckId === truckId && isOpen(s)) ?? null;

const truckAtDock = (t: Tick, dockId: ID) => Object.values(t.trucks).find((tr) => tr.dockId === dockId) ?? null;

const samePlace = (a: Pose, b: Pose) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01;

/** First slot whose pose no other vehicle currently occupies. */
const freeSlot = (poses: Pose[], count: number, poseAt: (slot: number) => Pose): Pose => {
  for (let i = 0; i < count; i++) {
    const p = poseAt(i);
    if (!poses.some((q) => samePlace(p, q))) return p;
  }
  return poseAt(count - 1);
};
const truckSlot = (t: Tick, selfId: ID, count: number, poseAt: (slot: number) => Pose) =>
  freeSlot(
    Object.values(t.trucks).filter((x) => x.id !== selfId).map((x) => x.pose),
    count,
    poseAt,
  );
const forkliftSlot = (t: Tick, selfId: ID, count: number, poseAt: (slot: number) => Pose) =>
  freeSlot(
    Object.values(t.forklifts).filter((x) => x.id !== selfId).map((x) => x.pose),
    count,
    poseAt,
  );

const freeDockFor = (t: Tick, job: Shipment): Dock | null =>
  Object.values(t.docks)
    .filter((d) => d.siteId === job.siteId && !d.outOfService && (d.direction === job.direction || d.direction === 'flex'))
    .sort((a, b) => (a.direction === 'flex' ? 1 : 0) - (b.direction === 'flex' ? 1 : 0) || a.index - b.index)
    .find((d) => !truckAtDock(t, d.id)) ?? null;

// ─── Truck lifecycle ─────────────────────────────────────────────────────────

/** Create a shipment for a site that has nothing waiting for a truck. Inbound restocks low items first. */
function createShipment(t: Tick): Shipment {
  const { rng, now } = t;
  const site = pick(rng, Object.values(t.sites));
  const items = Object.values(t.inventory).filter((i) => i.siteId === site.id);
  const low = items.filter((i) => i.quantity <= i.reorderPoint);
  const direction = rng() < (low.length ? 0.6 : 0.45) ? 'inbound' : 'outbound';

  const pool = direction === 'inbound' && low.length ? low : items;
  const chosen = [...new Set([pick(rng, pool), pick(rng, items)])].slice(0, 1 + Math.floor(rng() * 2));
  const lines = chosen.map((i) => ({
    itemId: i.id,
    quantity:
      direction === 'inbound'
        ? i.unitsPerPallet * (1 + Math.floor(rng() * 3))
        : Math.max(1, Math.round(i.unitsPerPallet * (0.5 + rng() * 1.5))),
  }));
  const [counterparty, city] = direction === 'inbound' ? pick(rng, SUPPLIERS) : pick(rng, CUSTOMERS);

  const shipment: Shipment = {
    id: `SHP-${t.nextShipmentNo++}`,
    direction,
    siteId: site.id,
    truckId: null,
    counterparty,
    city,
    lines,
    pallets: palletsFor(lines, (id) => t.inventory[id]),
    status: 'scheduled',
    createdAt: now,
    // Inbound ETA = ready at the dock (travel + unloading); outbound ETA = at the customer.
    eta: now + (direction === 'inbound' ? 18 + Math.floor(rng() * 12) : 30 + Math.floor(rng() * 25)) * MIN,
    deliveredAt: null,
  };
  t.shipment(shipment.id, shipment);
  return shipment;
}

/** Give a free truck its next job and send it onto the road towards that site. */
function dispatch(t: Tick, truck: Truck) {
  const waiting = Object.values(t.shipments)
    .filter((s) => s.status === 'scheduled' && s.truckId === null)
    .sort((a, b) => a.eta - b.eta);
  const job = waiting[0] ?? createShipment(t);
  t.shipment(job.id, { truckId: truck.id, status: job.direction === 'inbound' ? 'in_transit' : 'scheduled' });
  const site = t.sites[job.siteId];
  t.truck(truck.id, {
    siteId: site.id,
    status: 'in_transit',
    dockId: null,
    progress: 0,
    pose: truckSlot(t, truck.id, ROAD_SLOTS, (i) => truckApproachPose(site, i)),
  });
}

function moveToDockOrYard(t: Tick, truck: Truck, job: Shipment) {
  const site = t.sites[job.siteId];
  const dock = freeDockFor(t, job);
  if (dock) {
    t.truck(truck.id, { status: 'docking', dockId: dock.id, pose: truckDockPose(site, dock.index) });
    t.shipment(job.id, { status: 'at_dock' });
  } else if (truck.status !== 'waiting') {
    t.truck(truck.id, { status: 'waiting', pose: truckSlot(t, truck.id, YARD_SLOTS, (i) => truckYardPose(site, i)) });
  }
}

function adjustStock(t: Tick, job: Shipment, sign: 1 | -1) {
  for (const line of job.lines) {
    const item = t.inventory[line.itemId];
    if (item) t.item(item.id, { quantity: Math.max(0, item.quantity + sign * line.quantity) });
  }
}

function finishAtDock(t: Tick, truck: Truck, job: Shipment) {
  const site = t.sites[truck.siteId];
  if (job.direction === 'inbound') {
    adjustStock(t, job, 1);
    t.shipment(job.id, { status: 'delivered', deliveredAt: t.now });
  } else {
    adjustStock(t, job, -1);
    t.shipment(job.id, { status: 'in_transit' });
  }
  t.truck(truck.id, {
    status: 'departing',
    dockId: null,
    progress: 0,
    pose: truckSlot(t, truck.id, EXIT_SLOTS, (i) => truckExitPose(site, i)),
  });
}

function stepTruck(t: Tick, id: ID) {
  const { rng, now } = t;
  const truck = t.trucks[id];
  const job = jobOf(t, id);
  const site = t.sites[truck.siteId];

  switch (truck.status) {
    case 'maintenance':
      if (rng() < 0.03) dispatch(t, truck);
      return;

    case 'in_transit': {
      if (!job) return dispatch(t, truck);
      const deliveringToCustomer = job.direction === 'outbound' && job.status === 'in_transit';
      if (deliveringToCustomer) {
        if (now >= job.eta - 8 * MIN && rng() < 0.4) {
          t.shipment(job.id, { status: 'delivered', deliveredAt: now });
          if (rng() < 0.08) {
            t.truck(id, { status: 'maintenance', pose: truckSlot(t, id, PARKING_SLOTS, (i) => truckParkingPose(site, i)) });
          } else {
            dispatch(t, t.trucks[id]);
          }
        }
        return;
      }
      // Approaching the site. Inbound trucks aim to arrive with time to unload before the ETA, but can run late.
      const arrives = job.direction === 'inbound' ? now >= job.eta - INBOUND_HANDLING * MIN && rng() < 0.45 : rng() < 0.35;
      if (arrives) moveToDockOrYard(t, truck, job);
      return;
    }

    case 'waiting':
      if (job) moveToDockOrYard(t, truck, job);
      return;

    case 'docking':
      if (!job) return;
      t.truck(id, { status: job.direction === 'inbound' ? 'unloading' : 'loading', progress: 0 });
      return;

    case 'loading':
    case 'unloading': {
      if (!job) return;
      const crewed = Object.values(t.forklifts).some((f) => f.dockId === truck.dockId && (f.status === 'loading' || f.status === 'unloading'));
      const progress = Math.min(1, truck.progress + (crewed ? 0.1 + rng() * 0.1 : 0.02));
      if (progress >= 1) finishAtDock(t, truck, job);
      else t.truck(id, { progress });
      return;
    }

    case 'departing':
      if (job) {
        // Loaded outbound: head off to the customer.
        t.truck(id, { status: 'in_transit', pose: truckSlot(t, id, ROAD_SLOTS, (i) => truckAwayPose(site, i)) });
      } else {
        dispatch(t, truck);
      }
      return;
  }
}

// ─── Forklift lifecycle ──────────────────────────────────────────────────────

function sendForkliftHome(t: Tick, f: Forklift, site: Site) {
  t.forklift(f.id, {
    status: 'moving',
    dockId: null,
    pose: forkliftSlot(t, f.id, FORKLIFT_IDLE_SLOTS, (i) => forkliftIdlePose(site, i)),
  });
}

function stepForklift(t: Tick, id: ID) {
  const { rng } = t;
  const f = t.forklifts[id];
  const site = t.sites[f.siteId];
  const drain = (amount: number) => Math.max(0, +(f.battery - amount).toFixed(1));

  if (f.status === 'charging') {
    const battery = Math.min(100, f.battery + 6);
    if (battery >= 96) t.forklift(id, { status: 'idle', battery });
    else t.forklift(id, { battery });
    return;
  }

  if (f.battery <= 15) {
    t.forklift(id, {
      status: 'charging',
      dockId: null,
      pose: forkliftSlot(t, id, CHARGER_SLOTS, (i) => forkliftChargerPose(site, i)),
    });
    return;
  }

  const dockTruck = f.dockId ? truckAtDock(t, f.dockId) : null;
  const truckWorking = dockTruck && (dockTruck.status === 'loading' || dockTruck.status === 'unloading');

  switch (f.status) {
    case 'loading':
    case 'unloading':
      if (truckWorking) {
        t.forklift(id, { status: dockTruck.status as 'loading' | 'unloading', battery: drain(1 + rng()) });
      } else {
        sendForkliftHome(t, f, site);
      }
      return;

    case 'moving':
      // Arrived. If the truck is still docking, wait at the dock (idle, dockId kept).
      if (truckWorking) t.forklift(id, { status: dockTruck.status as 'loading' | 'unloading', battery: drain(0.5) });
      else t.forklift(id, { status: 'idle', battery: drain(0.5) });
      return;

    case 'idle': {
      if (f.dockId) {
        if (truckWorking) t.forklift(id, { status: dockTruck.status as 'loading' | 'unloading' });
        else if (!dockTruck) sendForkliftHome(t, f, site);
        return;
      }
      const needsCrew = Object.values(t.trucks).find(
        (tr) =>
          tr.siteId === site.id &&
          tr.dockId &&
          (tr.status === 'loading' || tr.status === 'unloading' || tr.status === 'docking') &&
          !Object.values(t.forklifts).some((o) => o.dockId === tr.dockId),
      );
      if (needsCrew?.dockId) {
        const dock = t.docks[needsCrew.dockId];
        t.forklift(id, { status: 'moving', dockId: dock.id, pose: forkliftDockPose(site, dock.index), battery: drain(0.5) });
      } else if (rng() < 0.12) {
        sendForkliftHome(t, f, site);
      }
      return;
    }
  }
}

// ─── Tick ────────────────────────────────────────────────────────────────────

function pruneHistory(t: Tick) {
  const delivered = Object.values(t.shipments)
    .filter((s) => s.status === 'delivered')
    .sort((a, b) => (a.deliveredAt ?? 0) - (b.deliveredAt ?? 0));
  for (const s of delivered.slice(0, Math.max(0, delivered.length - MAX_DELIVERED))) t.removeShipment(s.id);
}

/** Advance the world by one tick. Pure apart from the injected RNG. */
export function simulateTick(world: World, rng: Rng): World {
  const t = new Tick(world, rng);
  for (const id of Object.keys(world.trucks)) stepTruck(t, id);
  for (const id of Object.keys(world.forklifts)) stepForklift(t, id);
  pruneHistory(t);
  return t.result();
}
