import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import type { Pose } from '../data/types';
import { SELECTION_LABEL, clearLabelAnchor, setLabelAnchor } from './labelAnchors';

/**
 * Click + hover handlers for a selectable object. Drags (camera pans) do not
 * count as clicks. Returns whether the pointer is over the object.
 */
export function usePick(onPick: () => void) {
  const latest = useRef(onPick);
  latest.current = onPick;
  const [hovered, setHovered] = useState(false);
  // An object that unmounts while hovered (e.g. filtered out) must not leave the pointer cursor behind.
  useEffect(() => () => void (document.body.style.cursor = ''), []);
  const handlers = useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        latest.current();
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHovered(true);
      },
      onPointerOut: () => {
        document.body.style.cursor = '';
        setHovered(false);
      },
    }),
    [],
  );
  return { handlers, hovered };
}

/**
 * Eases a group towards a target pose every frame. Purely visual; the store
 * holds the real pose. When labelHeight is set, the selection label follows
 * the animated position.
 */
export function useSmoothPose(ref: React.RefObject<THREE.Group | null>, pose: Pose, speed: number, labelHeight: number | null) {
  const placed = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (labelHeight === null) return;
    return () => clearLabelAnchor(SELECTION_LABEL);
  }, [labelHeight]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) {
      if (labelHeight !== null) clearLabelAnchor(SELECTION_LABEL);
      return;
    }
    if (placed.current !== g) {
      // First frame for this group: snap instead of sliding in from the origin.
      g.position.set(pose.x, 0, pose.z);
      g.rotation.y = pose.heading;
      placed.current = g;
    } else {
      const dx = pose.x - g.position.x;
      const dz = pose.z - g.position.z;
      let dh = pose.heading - g.rotation.y;
      dh = ((((dh + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      if (Math.abs(dx) + Math.abs(dz) + Math.abs(dh) > 1e-3) {
        const k = 1 - Math.exp(-dt * speed);
        g.position.x += dx * k;
        g.position.z += dz * k;
        g.rotation.y += dh * k;
      }
    }
    if (labelHeight !== null) setLabelAnchor(SELECTION_LABEL, g.position.x, labelHeight, g.position.z);
  });
}
