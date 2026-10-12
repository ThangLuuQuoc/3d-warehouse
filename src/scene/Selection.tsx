import { Outlines } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { BAY_WIDTH, DOCK_DOOR, LEVEL_HEIGHT, RACK_DEPTH, dockDoorPose, levelY, rackBayPosition } from '../data/layout';
import { palletRunLength } from '../store/selectors';
import { useWarehouseStore, type Selection, type WarehouseState } from '../store/useWarehouseStore';
import { SELECTION_LABEL, clearLabelAnchor, projectLabels, setLabelAnchor } from './labelAnchors';
import { unitBox } from './models';
import { SCENE } from './theme';

/** Pulsing ground ring under the selected vehicle. */
export function SelectionMarker({ radius }: { radius: number }) {
  const ring = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.05;
    ring.current.scale.set(s, s, 1);
  });
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.14}>
      <ringGeometry args={[radius * 0.9, radius, 48]} />
      <meshBasicMaterial color={SCENE.selection} transparent opacity={0.85} toneMapped={false} />
    </mesh>
  );
}

interface Box {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

/** Bounding box of a selection that is drawn with instancing (docks, racks, pallets, buildings). */
function boxFor(sel: Selection, s: WarehouseState): Box | null {
  switch (sel.kind) {
    case 'dock': {
      const dock = s.docks[sel.id];
      const p = dockDoorPose(s.sites[dock.siteId], dock.index);
      return { x: p.x, y: DOCK_DOOR.height / 2 + 0.2, z: p.z + 0.4, sx: DOCK_DOOR.width + 0.8, sy: DOCK_DOOR.height + 0.4, sz: 0.9 };
    }
    case 'rack': {
      const site = s.sites[sel.id];
      const first = rackBayPosition(site, sel.row, 0);
      const length = site.racks.bays * BAY_WIDTH;
      const height = levelY(site.racks.levels - 1) + LEVEL_HEIGHT;
      return { x: first.x - BAY_WIDTH / 2 + length / 2, y: height / 2, z: first.z, sx: length + 0.2, sy: height + 0.1, sz: RACK_DEPTH + 0.3 };
    }
    case 'item': {
      const item = s.inventory[sel.id];
      const site = s.sites[item.siteId];
      const { row, level, bay } = item.location;
      const a = rackBayPosition(site, row, bay);
      const b = rackBayPosition(site, row, bay + Math.max(1, palletRunLength(item)) - 1);
      return { x: (a.x + b.x) / 2, y: levelY(level) + 0.65, z: a.z, sx: b.x - a.x + 2.2, sy: 1.35, sz: 1.4 };
    }
    case 'site': {
      const site = s.sites[sel.id];
      const { width, depth, height } = site.building;
      return { x: site.origin.x, y: height / 2, z: site.origin.z - depth / 2, sx: width + 1, sy: height + 0.4, sz: depth + 1 };
    }
    default:
      return null; // vehicles outline themselves
  }
}

/** Outline for the selected instanced object, and the anchor for its label. */
export function SelectionOverlay() {
  const selection = useWarehouseStore((s) => s.selection);
  // Inventory only matters for item selections (run length follows stock).
  const item = useWarehouseStore((s) => (s.selection?.kind === 'item' ? s.inventory[s.selection.id] : null));
  const box = useMemo(
    () => (selection ? boxFor(selection, useWarehouseStore.getState()) : null),
    [selection, item],
  );

  useEffect(() => {
    if (!box) return;
    setLabelAnchor(SELECTION_LABEL, box.x, box.y + box.sy / 2 + 1, box.z);
    return () => clearLabelAnchor(SELECTION_LABEL);
  }, [box]);

  if (!box) return null;
  return (
    <mesh geometry={unitBox} position={[box.x, box.y, box.z]} scale={[box.sx, box.sy, box.sz]}>
      <meshBasicMaterial color={SCENE.selection} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      <Outlines thickness={3} color={SCENE.selection} />
    </mesh>
  );
}

/** Moves the HTML labels to their anchors once per frame. */
export function LabelProjector() {
  useFrame(({ camera, size }) => projectLabels(camera, size.width, size.height));
  return null;
}
