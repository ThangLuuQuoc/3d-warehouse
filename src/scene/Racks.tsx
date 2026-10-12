import { memo, useCallback, useMemo } from 'react';
import { BAY_WIDTH, LEVEL_HEIGHT, MAX_PALLETS_PER_RUN, RACK_DEPTH, levelY, rackBayPosition } from '../data/layout';
import type { ID, InventoryItem, Site } from '../data/types';
import { isLowStock, palletRunLength } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { InstancedParts, type Part } from './InstancedParts';
import { CATEGORY_COLOR, LOW_STOCK_COLOR, SCENE } from './theme';

const RACK_HEIGHT = levelY(2) + LEVEL_HEIGHT;

interface RackRow {
  siteId: ID;
  row: number;
}

function buildRacks(sites: Site[]) {
  const uprights: Part[] = [];
  const beams: Part[] = [];
  const uprightRow: number[] = [];
  const beamRow: number[] = [];
  const rows: RackRow[] = [];
  for (const s of sites) {
    for (let row = 0; row < s.racks.rows; row++) {
      const r = rows.push({ siteId: s.id, row }) - 1;
      const first = rackBayPosition(s, row, 0);
      const left = first.x - BAY_WIDTH / 2;
      const length = s.racks.bays * BAY_WIDTH;
      for (let b = 0; b <= s.racks.bays; b++) {
        for (const dz of [-RACK_DEPTH / 2, RACK_DEPTH / 2]) {
          uprights.push({ x: left + b * BAY_WIDTH, y: RACK_HEIGHT / 2, z: first.z + dz, sx: 0.12, sy: RACK_HEIGHT, sz: 0.12 });
          uprightRow.push(r);
        }
      }
      for (let level = 1; level <= s.racks.levels; level++) {
        const y = level < s.racks.levels ? levelY(level) - 0.08 : RACK_HEIGHT - 0.05;
        for (const dz of [-RACK_DEPTH / 2, RACK_DEPTH / 2]) {
          beams.push({ x: left + length / 2, y, z: first.z + dz, sx: length, sy: 0.14, sz: 0.1 });
          beamRow.push(r);
        }
      }
    }
  }
  return { uprights, beams, uprightRow, beamRow, rows };
}

/** Capacity for the pallet meshes: every item at its maximum run. */
const palletCapacity = (itemCount: number) => itemCount * MAX_PALLETS_PER_RUN;

function buildPallets(items: InventoryItem[], sites: Record<ID, Site>) {
  const bases: Part[] = [];
  const loads: Part[] = [];
  const owner: ID[] = [];
  for (const item of items) {
    const site = sites[item.siteId];
    const { row, level, bay } = item.location;
    const y = levelY(level);
    const color = isLowStock(item) ? LOW_STOCK_COLOR : CATEGORY_COLOR[item.category];
    const n = palletRunLength(item);
    for (let k = 0; k < n; k++) {
      const p = rackBayPosition(site, row, bay + k);
      bases.push({ x: p.x, y: y + 0.07, z: p.z, sx: 2.0, sy: 0.14, sz: 1.2 });
      loads.push({ x: p.x, y: y + 0.14 + 0.55, z: p.z, sx: 1.9, sy: 1.1, sz: 1.1, color });
      owner.push(item.id);
    }
  }
  return { bases, loads, owner };
}

/** Pallet racking and the pallets stored in it, both instanced across all sites. */
export const Racks = memo(function Racks() {
  const sites = useWarehouseStore((s) => s.sites);
  const inventory = useWarehouseStore((s) => s.inventory);

  const racks = useMemo(() => buildRacks(Object.values(sites)), [sites]);
  const items = useMemo(() => Object.values(inventory), [inventory]);
  const pallets = useMemo(() => buildPallets(items, sites), [items, sites]);
  const capacity = palletCapacity(items.length);

  const selectRow = useCallback(
    (rowIndex: number) => {
      const { siteId, row } = racks.rows[rowIndex];
      useWarehouseStore.getState().select({ kind: 'rack', id: siteId, row });
    },
    [racks],
  );
  const pickUpright = useCallback((i: number) => selectRow(racks.uprightRow[i]), [racks, selectRow]);
  const pickBeam = useCallback((i: number) => selectRow(racks.beamRow[i]), [racks, selectRow]);
  const pickPallet = useCallback(
    (i: number) => useWarehouseStore.getState().select({ kind: 'item', id: pallets.owner[i] }),
    [pallets],
  );

  return (
    <group>
      <InstancedParts parts={racks.uprights} color={SCENE.rackUpright} roughness={0.6} castShadow onPick={pickUpright} />
      <InstancedParts parts={racks.beams} color={SCENE.rackBeam} roughness={0.5} castShadow onPick={pickBeam} />
      <InstancedParts parts={pallets.bases} capacity={capacity} color={SCENE.palletWood} castShadow onPick={pickPallet} />
      <InstancedParts parts={pallets.loads} capacity={capacity} roughness={0.9} castShadow receiveShadow onPick={pickPallet} />
    </group>
  );
});
