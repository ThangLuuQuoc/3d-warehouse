import { create } from 'zustand';
import { createSeedWorld } from '../data/seed';
import type { ID, TruckStatus, World } from '../data/types';
import { mulberry32, simulateTick } from '../sim/simulate';

export type Selection =
  | { kind: 'site'; id: ID }
  | { kind: 'dock'; id: ID }
  | { kind: 'truck'; id: ID }
  | { kind: 'forklift'; id: ID }
  | { kind: 'item'; id: ID }
  | { kind: 'rack'; id: ID; row: number };

export interface Filters {
  delayedOnly: boolean;
  truckStatus: TruckStatus | 'all';
}

/** A request for the camera to glide to a world point. seq changes on every request. */
interface CameraFocus {
  x: number;
  z: number;
  zoom: number | null;
  seq: number;
}

interface UiState {
  activeSiteId: ID;
  selection: Selection | null;
  filters: Filters;
  cameraFocus: CameraFocus;
}

export type CameraPreset = 'overview' | 'docks' | 'racks' | 'reset';

interface Actions {
  tick: () => void;
  setActiveSite: (siteId: ID) => void;
  /** Make a site active and show its details (clicking a building or its tag). */
  showSite: (siteId: ID) => void;
  select: (selection: Selection | null, focus?: { x: number; z: number }) => void;
  focusPreset: (preset: CameraPreset) => void;
  setDelayedOnly: (on: boolean) => void;
  setTruckStatusFilter: (status: Filters['truckStatus']) => void;
}

export type WarehouseState = World & UiState & Actions;

const rng = mulberry32(20261012);
const seed = createSeedWorld();
const firstSite = Object.values(seed.sites)[0];

/** Zoom used when flying to a site. */
export const SITE_ZOOM = 6.5;

/** Camera presets, relative to the active site's dock face (overview: the whole network). */
const PRESETS: Record<CameraPreset, { dx: number; dz: number; zoom: number; network?: boolean }> = {
  overview: { dx: 0, dz: 0, zoom: 3.6, network: true },
  docks: { dx: 0, dz: 8, zoom: 11 },
  racks: { dx: 0, dz: -21, zoom: 13 },
  reset: { dx: 0, dz: 0, zoom: SITE_ZOOM },
};

export const useWarehouseStore = create<WarehouseState>()((set, get) => ({
  ...seed,
  activeSiteId: firstSite.id,
  selection: null,
  filters: { delayedOnly: false, truckStatus: 'all' },
  cameraFocus: { x: firstSite.origin.x, z: firstSite.origin.z, zoom: SITE_ZOOM, seq: 0 },

  tick: () => set(simulateTick(get(), rng)),

  setActiveSite: (siteId) => {
    const site = get().sites[siteId];
    if (!site) return;
    set((s) => ({
      activeSiteId: siteId,
      selection: null,
      cameraFocus: { x: site.origin.x, z: site.origin.z, zoom: SITE_ZOOM, seq: s.cameraFocus.seq + 1 },
    }));
  },

  showSite: (siteId) => {
    if (siteId !== get().activeSiteId) get().setActiveSite(siteId);
    set({ selection: { kind: 'site', id: siteId } });
  },

  select: (selection, focus) =>
    set((s) => ({
      selection,
      ...(focus && { cameraFocus: { x: focus.x, z: focus.z, zoom: null, seq: s.cameraFocus.seq + 1 } }),
    })),

  focusPreset: (preset) =>
    set((s) => {
      const p = PRESETS[preset];
      const origin = p.network ? { x: 0, z: 0 } : s.sites[s.activeSiteId].origin;
      return { cameraFocus: { x: origin.x + p.dx, z: origin.z + p.dz, zoom: p.zoom, seq: s.cameraFocus.seq + 1 } };
    }),

  setDelayedOnly: (delayedOnly) => set((s) => ({ filters: { ...s.filters, delayedOnly } })),
  setTruckStatusFilter: (truckStatus) => set((s) => ({ filters: { ...s.filters, truckStatus } })),
}));
