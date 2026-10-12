import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DOCK_DOOR, dockDoorPose } from '../data/layout';
import { truckAtDock } from '../store/selectors';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { InstancedParts, type Part } from './InstancedParts';
import { DOCK_LIGHT, SCENE } from './theme';

/** All dock doors of all sites as a handful of instanced meshes. Colours follow occupancy. */
export const Docks = memo(function Docks() {
  const docks = useWarehouseStore(useShallow((s) => Object.values(s.docks)));
  const sites = useWarehouseStore((s) => s.sites);
  // One boolean per dock; useShallow keeps the array stable until occupancy actually changes.
  const occupied = useWarehouseStore(useShallow((s) => docks.map((d) => truckAtDock(s, d.id) !== null)));

  const { frames, plates, doorParts, lights } = useMemo(() => {
    const frames: Part[] = [];
    const plates: Part[] = [];
    const doorParts: Part[] = [];
    const lights: Part[] = [];
    const { width: w, height: h } = DOCK_DOOR;
    docks.forEach((d, i) => {
      const p = dockDoorPose(sites[d.siteId], d.index);
      const busy = occupied[i];
      frames.push(
        { x: p.x - w / 2 - 0.15, y: h / 2, z: p.z + 0.35, sx: 0.3, sy: h, sz: 0.3 },
        { x: p.x + w / 2 + 0.15, y: h / 2, z: p.z + 0.35, sx: 0.3, sy: h, sz: 0.3 },
        { x: p.x, y: h + 0.15, z: p.z + 0.35, sx: w + 0.6, sy: 0.3, sz: 0.3 },
      );
      plates.push({ x: p.x, y: 0.1, z: p.z + 1.2, sx: w - 0.4, sy: 0.08, sz: 2.2 });
      // Roll-up door: closed when free, rolled up under the header when a truck is in.
      doorParts.push(
        busy
          ? { x: p.x, y: h - 0.35, z: p.z - 0.05, sx: w, sy: 0.7, sz: 0.2 }
          : { x: p.x, y: h / 2, z: p.z - 0.05, sx: w, sy: h, sz: 0.2 },
      );
      lights.push({
        x: p.x + w / 2 + 0.7,
        y: h - 0.4,
        z: p.z + 0.35,
        sx: 0.4,
        sy: 0.4,
        sz: 0.3,
        color: d.outOfService ? DOCK_LIGHT.outOfService : busy ? DOCK_LIGHT.occupied : DOCK_LIGHT.available,
      });
    });
    return { frames, plates, doorParts, lights };
  }, [docks, sites, occupied]);

  const pick = useCallback(
    (perDock: number) => (i: number) => {
      const dock = docks[Math.floor(i / perDock)];
      useWarehouseStore.getState().select({ kind: 'dock', id: dock.id });
    },
    [docks],
  );
  const pickFrame = useMemo(() => pick(3), [pick]);
  const pickOne = useMemo(() => pick(1), [pick]);

  return (
    <group>
      <InstancedParts parts={frames} color={SCENE.doorFrame} roughness={0.6} castShadow onPick={pickFrame} />
      <InstancedParts parts={plates} color={SCENE.plate} roughness={0.5} receiveShadow onPick={pickOne} />
      <InstancedParts parts={doorParts} color={SCENE.doorPanel} roughness={0.7} castShadow onPick={pickOne} />
      <InstancedParts parts={lights} unlit onPick={pickOne} />
    </group>
  );
});
