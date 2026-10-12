import { MAX_PALLETS_PER_RUN } from '../data/layout';
import type { Dock, Forklift, ID, InventoryItem, Shipment, Truck, Timestamp } from '../data/types';
import { isOpen } from '../sim/simulate';
import type { WarehouseState } from './useWarehouseStore';

/**
 * Derived data. Every rule about what counts as delayed, active or low stock
 * lives here, so UI and scene components only render.
 */

export const isDelayed = (s: Shipment, now: Timestamp) => isOpen(s) && now > s.eta;
export const isLowStock = (i: InventoryItem) => i.quantity <= i.reorderPoint;
export const palletsOnHand = (i: InventoryItem) => Math.ceil(i.quantity / i.unitsPerPallet);
/** Pallets drawn in an item's rack run (its share of rack slots is capped). */
export const palletRunLength = (i: InventoryItem) => Math.min(MAX_PALLETS_PER_RUN, palletsOnHand(i));

/** Open shipment carried by a truck (Shipment.truckId owns this relation). */
export const shipmentForTruck = (s: WarehouseState, truckId: ID): Shipment | null => {
  for (const id in s.shipments) {
    const sh = s.shipments[id];
    if (sh.truckId === truckId && isOpen(sh)) return sh;
  }
  return null;
};

export const truckAtDock = (s: WarehouseState, dockId: ID): Truck | null => {
  for (const id in s.trucks) if (s.trucks[id].dockId === dockId) return s.trucks[id];
  return null;
};

export const forkliftsAtDock = (s: WarehouseState, dockId: ID): Forklift[] =>
  Object.values(s.forklifts).filter((f) => f.dockId === dockId);

/** A truck is "away" when it has left with an outbound load for a customer. */
export const isTruckAway = (s: WarehouseState, t: Truck) => {
  if (t.status !== 'in_transit') return false;
  const job = shipmentForTruck(s, t.id);
  return job?.direction === 'outbound' && job.status === 'in_transit';
};

export const truckMatchesFilters = (s: WarehouseState, truckId: ID): boolean => {
  const t = s.trucks[truckId];
  const { truckStatus, delayedOnly } = s.filters;
  if (truckStatus !== 'all' && t.status !== truckStatus) return false;
  if (delayedOnly) {
    const job = shipmentForTruck(s, truckId);
    return !!job && isDelayed(job, s.simTime);
  }
  return true;
};

export const docksOfSite = (s: WarehouseState, siteId: ID): Dock[] =>
  Object.values(s.docks)
    .filter((d) => d.siteId === siteId)
    .sort((a, b) => a.index - b.index);

export const itemsOfSite = (s: WarehouseState, siteId: ID): InventoryItem[] =>
  Object.values(s.inventory).filter((i) => i.siteId === siteId);

export const forkliftsOfSite = (s: WarehouseState, siteId: ID): Forklift[] =>
  Object.values(s.forklifts).filter((f) => f.siteId === siteId);

/** Trucks at or heading to a site, excluding those away delivering to customers. */
export const trucksOfSite = (s: WarehouseState, siteId: ID): Truck[] =>
  Object.values(s.trucks).filter((t) => t.siteId === siteId && !isTruckAway(s, t));

const ON_SITE = new Set(['waiting', 'docking', 'loading', 'unloading', 'departing']);

export interface SiteKpis {
  onTimeRate: number | null;
  deliveredCount: number;
  lateCount: number;
  docksInUse: number;
  docksTotal: number;
  activeTrucks: number;
  trucksOnSite: number;
  trucksArriving: number;
  lowStock: number;
  delayedOpen: number;
  palletsStored: number;
  palletCapacity: number;
}

/** KPIs for one site. Returns primitives only, so it can be read through useShallow. */
export const siteKpis = (s: WarehouseState, siteId: ID): SiteKpis => {
  let deliveredCount = 0;
  let lateCount = 0;
  let delayedOpen = 0;
  for (const id in s.shipments) {
    const sh = s.shipments[id];
    if (sh.siteId !== siteId) continue;
    if (sh.status === 'delivered') {
      deliveredCount++;
      if ((sh.deliveredAt ?? 0) > sh.eta) lateCount++;
    } else if (s.simTime > sh.eta) {
      delayedOpen++;
    }
  }

  const docks = docksOfSite(s, siteId);
  const docksInUse = docks.filter((d) => truckAtDock(s, d.id)).length;

  let trucksOnSite = 0;
  let trucksArriving = 0;
  for (const t of trucksOfSite(s, siteId)) {
    if (ON_SITE.has(t.status)) trucksOnSite++;
    else if (t.status === 'in_transit') trucksArriving++;
  }

  const items = itemsOfSite(s, siteId);
  return {
    onTimeRate: deliveredCount ? (deliveredCount - lateCount) / deliveredCount : null,
    deliveredCount,
    lateCount,
    docksInUse,
    docksTotal: docks.length,
    activeTrucks: trucksOnSite + trucksArriving,
    trucksOnSite,
    trucksArriving,
    lowStock: items.filter(isLowStock).length,
    delayedOpen,
    palletsStored: items.reduce((n, i) => n + palletsOnHand(i), 0),
    palletCapacity: s.sites[siteId].palletCapacity,
  };
};

/** Open shipments of a site, soonest ETA first, honouring the delayed-only filter. */
export const openShipmentsOfSite = (s: WarehouseState, siteId: ID): Shipment[] =>
  Object.values(s.shipments)
    .filter((sh) => sh.siteId === siteId && isOpen(sh) && (!s.filters.delayedOnly || isDelayed(sh, s.simTime)))
    .sort((a, b) => a.eta - b.eta);
