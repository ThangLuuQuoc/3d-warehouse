import { Grid } from '@react-three/drei';
import { memo, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  DOCK_DOOR,
  DOCKS_PER_SITE,
  DOCK_SPACING,
  LOT,
  ROAD,
  YARD_SLOTS,
  dockLocalX,
  forkliftChargerPose,
  CHARGER_SLOTS,
  truckYardPose,
} from '../data/layout';
import type { ID, Site } from '../data/types';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { InstancedParts, type Part } from './InstancedParts';
import { clearLabelAnchor, setLabelAnchor, siteLabelId } from './labelAnchors';
import { SCENE } from './theme';

/** Thin slab lying on the ground. */
const slab = (x: number, z: number, sx: number, sz: number, y: number, color?: string): Part => ({
  x, y, z, sx, sy: 0.04, sz, color,
});

function buildPavement(sites: Site[]): Part[] {
  const parts: Part[] = [slab((ROAD.minX + ROAD.maxX) / 2, (ROAD.inboundZ + ROAD.outboundZ) / 2, ROAD.maxX - ROAD.minX, ROAD.width, 0.02, SCENE.road)];
  for (const s of sites) {
    const { x, z } = s.origin;
    parts.push(
      slab(x + (LOT.minX + LOT.maxX) / 2, z + (LOT.minZ + LOT.maxZ) / 2, LOT.maxX - LOT.minX, LOT.maxZ - LOT.minZ, 0.03, SCENE.lot),
      slab(x - 38, z + 32.5, 14, 3.5, 0.03, SCENE.lot), // entrance
      slab(x + 32, z + 32.5, 14, 3.5, 0.03, SCENE.lot), // exit
      slab(x, z - s.building.depth / 2, s.building.width, s.building.depth, 0.05, SCENE.floor),
    );
  }
  return parts;
}

function buildMarkings(sites: Site[]): Part[] {
  const y = 0.09;
  const line = (x: number, z: number, sx: number, sz: number, color: string): Part => ({ x, y, z, sx, sy: 0.02, sz, color });
  const parts: Part[] = [];
  const roadMid = (ROAD.inboundZ + ROAD.outboundZ) / 2;
  for (let x = ROAD.minX + 4; x < ROAD.maxX; x += 8) parts.push(line(x, roadMid, 3.5, 0.22, SCENE.roadLine));
  for (const edge of [roadMid - ROAD.width / 2 + 0.6, roadMid + ROAD.width / 2 - 0.6]) {
    parts.push(line((ROAD.minX + ROAD.maxX) / 2, edge, ROAD.maxX - ROAD.minX, 0.18, SCENE.markingDim));
  }
  for (const s of sites) {
    const { x, z } = s.origin;
    // Dock bay dividers in front of the dock face.
    for (let i = 0; i <= DOCKS_PER_SITE; i++) {
      parts.push(line(x + dockLocalX(i) - DOCK_SPACING / 2, z + 6.5, 0.22, 13, SCENE.marking));
    }
    // Yard queue slots.
    for (let i = 0; i < YARD_SLOTS; i++) {
      const p = truckYardPose(s, i);
      parts.push(line(p.x - 2, p.z, 0.16, 11.5, SCENE.markingDim), line(p.x + 2, p.z, 0.16, 11.5, SCENE.markingDim));
    }
    // Forklift aisle inside the building, along the dock face.
    for (const az of [-6, -10]) parts.push(line(x, z + az, s.building.width - 4, 0.16, SCENE.marking));
    // Charging pads.
    for (let i = 0; i < CHARGER_SLOTS; i++) {
      const p = forkliftChargerPose(s, i);
      parts.push({ x: p.x, y: 0.085, z: p.z, sx: 2.6, sy: 0.02, sz: 1.9, color: '#3b2f5c' });
    }
  }
  return parts;
}

/** Walls of each building with gaps for the dock doors. Returns the site of every part for click mapping. */
function buildWalls(sites: Site[]) {
  const walls: Part[] = [];
  const trims: Part[] = [];
  const owner: ID[] = [];
  const t = 0.5;
  for (const s of sites) {
    const { width: w, depth: d, height: h } = s.building;
    const { x, z } = s.origin;
    const wall = (cx: number, cz: number, sx: number, sz: number, cy = h / 2, sy = h) => {
      walls.push({ x: x + cx, y: cy, z: z + cz, sx, sy, sz });
      owner.push(s.id);
    };
    wall(0, -d, w + t, t); // back
    wall(-w / 2, -d / 2, t, d); // left
    wall(w / 2, -d / 2, t, d); // right
    // Front: solid pieces between door openings, plus a header above each door.
    const half = DOCK_DOOR.width / 2;
    let left = -w / 2;
    for (let i = 0; i < DOCKS_PER_SITE; i++) {
      const dx = dockLocalX(i);
      wall((left + dx - half) / 2, 0, dx - half - left, t);
      wall(dx, 0, DOCK_DOOR.width, t, (h + DOCK_DOOR.height) / 2, h - DOCK_DOOR.height);
      left = dx + half;
    }
    wall((left + w / 2) / 2, 0, w / 2 - left, t);

    const trim = (cx: number, cz: number, sx: number, sz: number) =>
      trims.push({ x: x + cx, y: h + 0.12, z: z + cz, sx, sy: 0.24, sz });
    trim(0, -d, w + 0.7, 0.7);
    trim(0, 0, w + 0.7, 0.7);
    trim(-w / 2, -d / 2, 0.7, d);
    trim(w / 2, -d / 2, 0.7, d);
  }
  return { walls, trims, owner };
}

/** Deterministic tree positions along the road and around the lots. */
function buildTrees(sites: Site[]) {
  const trunks: Part[] = [];
  const crowns: Part[] = [];
  const hash = (n: number) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const plant = (x: number, z: number, k: number) => {
    const size = 1.6 + hash(k) * 1.2;
    trunks.push({ x, y: 0.7, z, sx: 0.35, sy: 1.4, sz: 0.35 });
    crowns.push({ x, y: 1.4 + size * 0.8, z, sx: size, sy: size * 1.25, sz: size, ry: hash(k + 7) * 3, color: hash(k + 3) > 0.5 ? SCENE.foliage : '#3a6a45' });
  };
  let k = 0;
  for (let x = ROAD.minX + 6; x < ROAD.maxX; x += 10) {
    plant(x + hash(++k) * 4, 53 + hash(++k) * 3, ++k);
    if (hash(++k) > 0.4) plant(x + 3 + hash(++k) * 4, 59 + hash(++k) * 4, ++k);
  }
  for (const s of sites) {
    for (let x = LOT.minX; x <= LOT.maxX; x += 9) plant(s.origin.x + x + hash(++k) * 3, s.origin.z + LOT.minZ - 5 - hash(++k) * 5, ++k);
  }
  // Belts between neighbouring lots.
  const xs = sites.map((s) => s.origin.x).sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    const mid = (xs[i] + xs[i + 1]) / 2;
    for (let z = LOT.minZ; z <= LOT.maxZ; z += 7) plant(mid + (hash(++k) - 0.5) * 8, z + hash(++k) * 3, ++k);
  }
  return { trunks, crowns };
}

const crownGeometry = new THREE.IcosahedronGeometry(0.6, 0);

/** Everything that never changes: ground, grid, roads, lots, building shells, trees. */
export const Environment = memo(function Environment() {
  const sitesById = useWarehouseStore((s) => s.sites);
  const sites = useMemo(() => Object.values(sitesById), [sitesById]);

  const pavement = useMemo(() => buildPavement(sites), [sites]);
  const markings = useMemo(() => buildMarkings(sites), [sites]);
  const { walls, trims, owner } = useMemo(() => buildWalls(sites), [sites]);
  const { trunks, crowns } = useMemo(() => buildTrees(sites), [sites]);

  const pickWall = useCallback((i: number) => useWarehouseStore.getState().showSite(owner[i]), [owner]);

  // Anchor each site's name tag above the back-left corner of its building.
  useEffect(() => {
    for (const s of sites) {
      setLabelAnchor(siteLabelId(s.id), s.origin.x - s.building.width / 2 + 6, s.building.height + 1.5, s.origin.z - s.building.depth);
    }
    return () => sites.forEach((s) => clearLabelAnchor(siteLabelId(s.id)));
  }, [sites]);


  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[900, 400]} />
        <meshStandardMaterial color={SCENE.ground} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.005, 5]}
        args={[560, 240]}
        cellSize={2}
        cellThickness={0.6}
        cellColor={SCENE.gridCell}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={SCENE.gridSection}
        fadeDistance={900}
        fadeStrength={0.6}
      />
      <InstancedParts parts={pavement} roughness={0.95} receiveShadow />
      <InstancedParts parts={markings} roughness={0.6} />
      <InstancedParts parts={walls} color={SCENE.wall} roughness={0.8} castShadow receiveShadow onPick={pickWall} />
      <InstancedParts parts={trims} color={SCENE.trim} emissiveIntensity={0.25} />
      <InstancedParts parts={trunks} color={SCENE.trunk} castShadow />
      <InstancedParts parts={crowns} geometry={crownGeometry} flatShading castShadow />
    </group>
  );
});
