import type { ForkliftStatus, InventoryCategory, TruckStatus } from '../data/types';

/** Scene palette: dark industrial with amber accents. Shared with the UI via CSS variables of the same values. */
export const SCENE = {
  background: '#0b0d10',
  ground: '#171b21',
  gridCell: '#232932',
  gridSection: '#343c48',
  lot: '#22262d',
  road: '#14171b',
  roadLine: '#5b626c',
  floor: '#2a2f37',
  wall: '#77808d',
  trim: '#f5a524',
  marking: '#c98a17',
  markingDim: '#5d636c',
  rackUpright: '#5d6878',
  rackBeam: '#e07b1a',
  palletWood: '#7a5c3a',
  doorFrame: '#d9a21b',
  doorPanel: '#3c434d',
  plate: '#3a4049',
  trunk: '#3b2f25',
  foliage: '#2f5a3d',
  selection: '#ffb020',
  hover: '#9c6a14',
} as const;

const CARRIER_COLOR: Record<string, string> = {
  'WareTrack Freight': '#f5a524',
  'Nordline Logistics': '#2bb3a3',
  'Bluepeak Transport': '#4c8dff',
  Cargoviva: '#ff6a3d',
};
export const carrierColor = (carrier: string) => CARRIER_COLOR[carrier] ?? '#9aa3af';

export const DOCK_LIGHT = { available: '#3ccf91', occupied: '#f5a524', outOfService: '#ff5d5d' } as const;

export const CATEGORY_COLOR: Record<InventoryCategory, string> = {
  packaging: '#b48a5a',
  electronics: '#8c9bb0',
  ppe: '#d2b04c',
  furniture: '#9b7b62',
  hardware: '#7f8790',
  frozen: '#9cc7e6',
  chilled: '#d9e2ea',
  beverage: '#5a9bd6',
};
export const LOW_STOCK_COLOR = '#ff5d4a';

/** Status colours used by both the badges in the UI and markers in the scene. */
export const TRUCK_STATUS_COLOR: Record<TruckStatus, string> = {
  in_transit: '#5aa9ff',
  waiting: '#c084fc',
  docking: '#7dd3fc',
  loading: '#f5a524',
  unloading: '#3ccf91',
  departing: '#a3a3a3',
  maintenance: '#ff5d5d',
};

export const FORKLIFT_STATUS_COLOR: Record<ForkliftStatus, string> = {
  idle: '#a3a3a3',
  moving: '#5aa9ff',
  loading: '#f5a524',
  unloading: '#3ccf91',
  charging: '#c084fc',
};
