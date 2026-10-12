import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { unitBox } from './models';

/** One instance: centre position, size (scale of the base geometry), optional yaw and colour. */
export interface Part {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
  color?: string;
}

interface Props {
  parts: Part[];
  /** Instance slots to allocate. Defaults to parts.length; set higher when the list can grow. */
  capacity?: number;
  geometry?: THREE.BufferGeometry;
  color?: string;
  roughness?: number;
  emissiveIntensity?: number;
  flatShading?: boolean;
  /** Unlit material that shows per-part colours at full strength (lamps, indicators). */
  unlit?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Called with the index of the clicked part. Drags (camera pans) are ignored. */
  onPick?: (index: number) => void;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** Draws many copies of one geometry in a single draw call. */
export function InstancedParts({
  parts,
  capacity = parts.length,
  geometry = unitBox,
  color = '#ffffff',
  roughness = 0.85,
  emissiveIntensity = 0,
  flatShading = false,
  unlit = false,
  castShadow = false,
  receiveShadow = false,
  onPick,
}: Props) {
  const ref = useRef<THREE.InstancedMesh>(null!);

  const material = useMemo(
    () =>
      unlit
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshStandardMaterial({
            color,
            roughness,
            flatShading,
            emissive: emissiveIntensity ? color : '#000000',
            emissiveIntensity,
          }),
    [unlit, color, roughness, flatShading, emissiveIntensity],
  );
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    const n = Math.min(parts.length, capacity);
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ry ?? 0, 0);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (p.color) mesh.setColorAt(i, tmpColor.set(p.color));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Bounds drive both frustum culling and raycasting; refresh them after moving instances.
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    // geometry/material are in deps because changing args makes R3F build a new mesh.
  }, [parts, capacity, geometry, material]);

  const handlers = useMemo(
    () =>
      onPick && {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 4 || e.instanceId === undefined) return;
          e.stopPropagation();
          onPick(e.instanceId);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          document.body.style.cursor = '';
        },
      },
    [onPick],
  );

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, capacity]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...handlers}
    />
  );
}
