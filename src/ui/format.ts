import { SITE_TIME_ZONE } from '../data/seed';
import type { DockDirection, ForkliftStatus, ShipmentStatus, SiteKind, Timestamp, TruckStatus } from '../data/types';

export const TRUCK_STATUS_LABEL: Record<TruckStatus, string> = {
  in_transit: 'In transit',
  waiting: 'Waiting',
  docking: 'Docking',
  loading: 'Loading',
  unloading: 'Unloading',
  departing: 'Departing',
  maintenance: 'Maintenance',
};

export const FORKLIFT_STATUS_LABEL: Record<ForkliftStatus, string> = {
  idle: 'Idle',
  moving: 'Moving',
  loading: 'Loading',
  unloading: 'Unloading',
  charging: 'Charging',
};

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  scheduled: 'Scheduled',
  in_transit: 'In transit',
  at_dock: 'At dock',
  delivered: 'Delivered',
};

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  distribution_center: 'Distribution center',
  cold_storage: 'Cold storage',
  cross_dock: 'Cross-dock',
};

export const DOCK_DIRECTION_LABEL: Record<DockDirection, string> = {
  inbound: 'Inbound',
  outbound: 'Outbound',
  flex: 'Flex',
};

const clock = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SITE_TIME_ZONE });

/** "09:41" in site local time. */
export const formatClock = (t: Timestamp) => clock.format(t);

const minutesBetween = (a: Timestamp, b: Timestamp) => Math.round((a - b) / 60_000);

/** "in 5 min", "8 min late" — for ETAs. */
export function formatEta(eta: Timestamp, now: Timestamp) {
  const m = minutesBetween(eta, now);
  if (m > 0) return `in ${formatMinutes(m)}`;
  if (m === 0) return 'due now';
  return `${formatMinutes(-m)} late`;
}

/** "just now", "3 min ago". */
export function formatAgo(t: Timestamp, now: Timestamp) {
  const m = minutesBetween(now, t);
  return m <= 0 ? 'just now' : `${formatMinutes(m)} ago`;
}

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const formatPercent = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
export const formatNumber = (n: number) => n.toLocaleString('en-US');
